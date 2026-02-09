import Vapor
import Fluent

struct GameController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get(use: listGames)
        routes.post(use: createGame)
        routes.get(":gameID", use: getGame)
        routes.put(":gameID", use: updateGame)
        routes.delete(":gameID", use: deleteGame)

        // Start / end game
        routes.post(":gameID", "start", use: startGame)
        routes.post(":gameID", "end", use: endGame)

        // Lineup
        routes.get(":gameID", "lineup", use: getLineup)
        routes.post(":gameID", "lineup", use: setLineup)

        // At-bats (live scoring)
        routes.get(":gameID", "at-bats", use: listAtBats)
        routes.post(":gameID", "at-bats", use: recordAtBat)
        routes.delete(":gameID", "at-bats", ":atBatID", use: undoAtBat)

        // Pitching appearances
        routes.get(":gameID", "pitching", use: listPitching)
        routes.post(":gameID", "pitching", use: addPitchingAppearance)
        routes.put(":gameID", "pitching", ":pitchingID", use: updatePitchingAppearance)
    }

    // MARK: - Authorization

    private func authorizeGame(_ gameID: UUID, req: Request) async throws -> Game {
        let user = try req.authenticatedUser
        guard let game = try await Game.query(on: req.db)
            .filter(\.$id == gameID)
            .with(\.$team) { $0.with(\.$organization) }
            .first() else {
            throw Abort(.notFound, reason: "Game not found")
        }
        guard game.team.organization.ownerID == user.id else {
            throw Abort(.forbidden)
        }
        return game
    }

    private func authorizeTeamForGame(_ teamID: UUID, req: Request) async throws {
        let user = try req.authenticatedUser
        guard let team = try await Team.query(on: req.db)
            .filter(\.$id == teamID)
            .with(\.$organization)
            .first(),
              team.organization.ownerID == user.id else {
            throw Abort(.forbidden)
        }
    }

    // MARK: - Games CRUD

    func listGames(req: Request) async throws -> [Game] {
        guard let teamIDStr = req.query[String.self, at: "teamId"],
              let teamID = UUID(uuidString: teamIDStr) else {
            throw Abort(.badRequest, reason: "teamId query parameter required")
        }
        try await authorizeTeamForGame(teamID, req: req)

        var query = Game.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .sort(\.$gameDate, .descending)

        if let seasonIDStr = req.query[String.self, at: "seasonId"],
           let seasonID = UUID(uuidString: seasonIDStr) {
            query = query.filter(\.$season.$id == seasonID)
        }

        if let status = req.query[String.self, at: "status"] {
            if let gameStatus = GameStatus(rawValue: status) {
                query = query.filter(\.$status == gameStatus)
            }
        }

        return try await query.all()
    }

    struct CreateGameRequest: Content {
        let teamId: UUID
        let seasonId: UUID?
        let opponentName: String
        let gameDate: Date
        let gameTime: Date?
        let location: String?
        let isHome: Bool?
        let inningsCount: Int?
    }

    func createGame(req: Request) async throws -> Game {
        let input = try req.content.decode(CreateGameRequest.self)
        try await authorizeTeamForGame(input.teamId, req: req)

        // Get team default innings if not specified
        let innings: Int
        if let specified = input.inningsCount {
            innings = specified
        } else if let team = try await Team.find(input.teamId, on: req.db) {
            innings = team.defaultInnings
        } else {
            innings = 9
        }

        let game = Game(
            teamID: input.teamId,
            seasonID: input.seasonId,
            opponentName: input.opponentName,
            gameDate: input.gameDate,
            isHome: input.isHome ?? true,
            inningsCount: innings
        )
        if let time = input.gameTime { game.gameTime = time }
        if let loc = input.location { game.location = loc }

        try await game.save(on: req.db)
        return game
    }

    struct GameDetail: Content {
        let game: Game
        let lineup: [LineupEntry]
        let atBats: [AtBat]
        let pitching: [PitchingAppearance]
    }

    func getGame(req: Request) async throws -> GameDetail {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let game = try await authorizeGame(gameID, req: req)

        let lineup = try await LineupEntry.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .sort(\.$battingOrder)
            .all()

        let atBats = try await AtBat.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .sort(\.$atBatNumberInGame)
            .all()

        let pitching = try await PitchingAppearance.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .sort(\.$appearanceOrder)
            .all()

        return GameDetail(game: game, lineup: lineup, atBats: atBats, pitching: pitching)
    }

    struct UpdateGameRequest: Content {
        let opponentName: String?
        let gameDate: Date?
        let gameTime: Date?
        let location: String?
        let isHome: Bool?
        let inningsCount: Int?
        let ourScore: Int?
        let opponentScore: Int?
        let currentInning: Int?
        let isTopOfInning: Bool?
        let outsInCurrentInning: Int?
        let notes: String?
    }

    func updateGame(req: Request) async throws -> Game {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let game = try await authorizeGame(gameID, req: req)
        let input = try req.content.decode(UpdateGameRequest.self)

        if let name = input.opponentName { game.opponentName = name }
        if let date = input.gameDate { game.gameDate = date }
        if let time = input.gameTime { game.gameTime = time }
        if let loc = input.location { game.location = loc }
        if let home = input.isHome { game.isHome = home }
        if let inn = input.inningsCount { game.inningsCount = inn }
        if let score = input.ourScore { game.ourScore = score }
        if let score = input.opponentScore { game.opponentScore = score }
        if let inn = input.currentInning { game.currentInning = inn }
        if let top = input.isTopOfInning { game.isTopOfInning = top }
        if let outs = input.outsInCurrentInning { game.outsInCurrentInning = outs }
        if let notes = input.notes { game.notes = notes }

        try await game.save(on: req.db)
        return game
    }

    func deleteGame(req: Request) async throws -> HTTPStatus {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let game = try await authorizeGame(gameID, req: req)
        try await game.delete(on: req.db)
        return .noContent
    }

    // MARK: - Start / End Game

    func startGame(req: Request) async throws -> Game {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let game = try await authorizeGame(gameID, req: req)
        guard game.status == .scheduled else {
            throw Abort(.conflict, reason: "Game already started or finished")
        }
        game.status = .inProgress
        game.currentInning = 1
        game.isTopOfInning = true
        game.outsInCurrentInning = 0
        try await game.save(on: req.db)
        return game
    }

    func endGame(req: Request) async throws -> Game {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let game = try await authorizeGame(gameID, req: req)
        guard game.status == .inProgress else {
            throw Abort(.conflict, reason: "Game not in progress")
        }
        game.status = .final_
        try await game.save(on: req.db)
        return game
    }

    // MARK: - Lineup

    func getLineup(req: Request) async throws -> [LineupEntry] {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        _ = try await authorizeGame(gameID, req: req)

        return try await LineupEntry.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .sort(\.$battingOrder)
            .all()
    }

    struct LineupEntryRequest: Content {
        let playerId: UUID
        let battingOrder: Int
        let position: String
        let isStarter: Bool?
    }

    func setLineup(req: Request) async throws -> [LineupEntry] {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        _ = try await authorizeGame(gameID, req: req)

        let entries = try req.content.decode([LineupEntryRequest].self)

        // Remove existing lineup for this game
        try await LineupEntry.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .delete()

        // Create new entries
        var created: [LineupEntry] = []
        for entry in entries {
            let lineupEntry = LineupEntry(
                gameID: gameID,
                playerID: entry.playerId,
                battingOrder: entry.battingOrder,
                position: entry.position,
                isStarter: entry.isStarter ?? true
            )
            try await lineupEntry.save(on: req.db)
            created.append(lineupEntry)
        }

        return created
    }

    // MARK: - At-Bats (Live Scoring)

    func listAtBats(req: Request) async throws -> [AtBat] {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        _ = try await authorizeGame(gameID, req: req)

        return try await AtBat.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .sort(\.$atBatNumberInGame)
            .all()
    }

    struct RecordAtBatRequest: Content {
        let playerId: UUID
        let result: AtBatResult
        let rbi: Int?
        let runnerScored: Bool?
        let pitchCount: Int?
        let stolenBases: Int?
        let caughtStealing: Int?
        let notes: String?
    }

    func recordAtBat(req: Request) async throws -> RecordAtBatResponse {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let game = try await authorizeGame(gameID, req: req)

        guard game.status == .inProgress else {
            throw Abort(.conflict, reason: "Game not in progress")
        }

        let input = try req.content.decode(RecordAtBatRequest.self)

        // Get next at-bat number
        let lastAtBatNumber = try await AtBat.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .sort(\.$atBatNumberInGame, .descending)
            .first()?.atBatNumberInGame ?? 0

        let atBat = AtBat(
            gameID: gameID,
            playerID: input.playerId,
            inning: game.currentInning,
            isTop: game.isTopOfInning,
            atBatNumber: lastAtBatNumber + 1,
            result: input.result,
            rbi: input.rbi ?? 0,
            runnerScored: input.runnerScored ?? false
        )
        if let pc = input.pitchCount { atBat.pitchCount = pc }
        if let sb = input.stolenBases { atBat.stolenBases = sb }
        if let cs = input.caughtStealing { atBat.caughtStealing = cs }
        if let notes = input.notes { atBat.notes = notes }

        try await atBat.save(on: req.db)

        // Update game state
        let outsFromAtBat = input.result.outsProduced
        game.outsInCurrentInning += outsFromAtBat

        // Add RBI to score
        let rbiCount = input.rbi ?? 0
        if game.isTopOfInning {
            // Top of inning = visiting team batting
            // If we're the home team, opponent scores. If away, we score.
            if game.isHome {
                game.opponentScore += rbiCount
            } else {
                game.ourScore += rbiCount
            }
        } else {
            // Bottom of inning = home team batting
            if game.isHome {
                game.ourScore += rbiCount
            } else {
                game.opponentScore += rbiCount
            }
        }

        // Check if runner scored (independent of RBI, e.g. wild pitch)
        if input.runnerScored == true && rbiCount == 0 {
            if game.isTopOfInning {
                if game.isHome { game.opponentScore += 1 } else { game.ourScore += 1 }
            } else {
                if game.isHome { game.ourScore += 1 } else { game.opponentScore += 1 }
            }
        }

        // Advance inning if 3 outs
        if game.outsInCurrentInning >= 3 {
            game.outsInCurrentInning = 0
            if game.isTopOfInning {
                game.isTopOfInning = false
            } else {
                game.isTopOfInning = true
                game.currentInning += 1
            }
        }

        try await game.save(on: req.db)

        return RecordAtBatResponse(atBat: atBat, gameState: GameState(game: game))
    }

    struct RecordAtBatResponse: Content {
        let atBat: AtBat
        let gameState: GameState
    }

    struct GameState: Content {
        let currentInning: Int
        let isTopOfInning: Bool
        let outsInCurrentInning: Int
        let ourScore: Int
        let opponentScore: Int
        let status: GameStatus

        init(game: Game) {
            self.currentInning = game.currentInning
            self.isTopOfInning = game.isTopOfInning
            self.outsInCurrentInning = game.outsInCurrentInning
            self.ourScore = game.ourScore
            self.opponentScore = game.opponentScore
            self.status = game.status
        }
    }

    func undoAtBat(req: Request) async throws -> GameState {
        guard let gameID = req.parameters.get("gameID", as: UUID.self),
              let atBatID = req.parameters.get("atBatID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        let game = try await authorizeGame(gameID, req: req)

        guard let atBat = try await AtBat.query(on: req.db)
            .filter(\.$id == atBatID)
            .filter(\.$game.$id == gameID)
            .first() else {
            throw Abort(.notFound, reason: "At-bat not found")
        }

        // Verify it's the most recent at-bat
        let lastAtBat = try await AtBat.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .sort(\.$atBatNumberInGame, .descending)
            .first()

        guard lastAtBat?.id == atBatID else {
            throw Abort(.conflict, reason: "Can only undo the most recent at-bat")
        }

        // Reverse game state
        let outsToRemove = atBat.result.outsProduced

        // If we had advanced to a new half-inning because of this at-bat's outs,
        // we need to revert that. Check if current outs is 0 and we need to go back.
        if game.outsInCurrentInning == 0 && outsToRemove > 0 {
            // We crossed an inning boundary - revert
            if game.isTopOfInning {
                // Currently top = we moved from bottom of previous inning
                game.isTopOfInning = false
                game.currentInning -= 1
            } else {
                // Currently bottom = we moved from top of this inning
                game.isTopOfInning = true
            }
            game.outsInCurrentInning = 3 - outsToRemove
        } else {
            game.outsInCurrentInning -= outsToRemove
        }

        // Reverse score changes
        let rbiCount = atBat.rbi
        let scoredWithoutRBI = (atBat.runnerScored && rbiCount == 0) ? 1 : 0
        let totalRuns = rbiCount + scoredWithoutRBI

        if atBat.isTop {
            if game.isHome { game.opponentScore -= totalRuns } else { game.ourScore -= totalRuns }
        } else {
            if game.isHome { game.ourScore -= totalRuns } else { game.opponentScore -= totalRuns }
        }

        // Ensure scores don't go negative
        game.ourScore = max(0, game.ourScore)
        game.opponentScore = max(0, game.opponentScore)

        try await game.save(on: req.db)
        try await atBat.delete(on: req.db)

        return GameState(game: game)
    }

    // MARK: - Pitching Appearances

    func listPitching(req: Request) async throws -> [PitchingAppearance] {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        _ = try await authorizeGame(gameID, req: req)

        return try await PitchingAppearance.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .sort(\.$appearanceOrder)
            .all()
    }

    struct AddPitchingRequest: Content {
        let playerId: UUID
        let appearanceOrder: Int?
    }

    func addPitchingAppearance(req: Request) async throws -> PitchingAppearance {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        _ = try await authorizeGame(gameID, req: req)
        let input = try req.content.decode(AddPitchingRequest.self)

        let lastOrder = try await PitchingAppearance.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .sort(\.$appearanceOrder, .descending)
            .first()?.appearanceOrder ?? 0

        let appearance = PitchingAppearance(
            gameID: gameID,
            playerID: input.playerId,
            appearanceOrder: input.appearanceOrder ?? (lastOrder + 1)
        )
        try await appearance.save(on: req.db)
        return appearance
    }

    struct UpdatePitchingRequest: Content {
        let outsRecorded: Int?
        let hitsAllowed: Int?
        let runsAllowed: Int?
        let earnedRuns: Int?
        let walks: Int?
        let strikeouts: Int?
        let homeRunsAllowed: Int?
        let pitchesThrown: Int?
        let strikesThrown: Int?
        let ballsThrown: Int?
        let hitBatters: Int?
        let wildPitches: Int?
        let balks: Int?
        let isWinner: Bool?
        let isLoser: Bool?
        let isSave: Bool?
        let isHold: Bool?
        let notes: String?
    }

    func updatePitchingAppearance(req: Request) async throws -> PitchingAppearance {
        guard let gameID = req.parameters.get("gameID", as: UUID.self),
              let pitchingID = req.parameters.get("pitchingID", as: UUID.self) else {
            throw Abort(.badRequest)
        }
        _ = try await authorizeGame(gameID, req: req)

        guard let appearance = try await PitchingAppearance.query(on: req.db)
            .filter(\.$id == pitchingID)
            .filter(\.$game.$id == gameID)
            .first() else {
            throw Abort(.notFound, reason: "Pitching appearance not found")
        }

        let input = try req.content.decode(UpdatePitchingRequest.self)
        if let v = input.outsRecorded { appearance.outsRecorded = v }
        if let v = input.hitsAllowed { appearance.hitsAllowed = v }
        if let v = input.runsAllowed { appearance.runsAllowed = v }
        if let v = input.earnedRuns { appearance.earnedRuns = v }
        if let v = input.walks { appearance.walks = v }
        if let v = input.strikeouts { appearance.strikeouts = v }
        if let v = input.homeRunsAllowed { appearance.homeRunsAllowed = v }
        if let v = input.pitchesThrown { appearance.pitchesThrown = v }
        if let v = input.strikesThrown { appearance.strikesThrown = v }
        if let v = input.ballsThrown { appearance.ballsThrown = v }
        if let v = input.hitBatters { appearance.hitBatters = v }
        if let v = input.wildPitches { appearance.wildPitches = v }
        if let v = input.balks { appearance.balks = v }
        if let v = input.isWinner { appearance.isWinner = v }
        if let v = input.isLoser { appearance.isLoser = v }
        if let v = input.isSave { appearance.isSave = v }
        if let v = input.isHold { appearance.isHold = v }
        if let v = input.notes { appearance.notes = v }

        try await appearance.save(on: req.db)
        return appearance
    }
}
