import Vapor
import Fluent

struct StatsController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.get("batting", use: teamBattingStats)
        routes.get("pitching", use: teamPitchingStats)
        routes.get("team", use: teamRecordStats)
        routes.get("player", ":playerID", "batting", use: playerBattingStats)
        routes.get("player", ":playerID", "pitching", use: playerPitchingStats)
        routes.get("game", ":gameID", "boxscore", use: boxScore)
    }

    // MARK: - Authorization

    private func authorizeTeamAccess(_ teamID: UUID, req: Request) async throws -> Team {
        let user = try req.authenticatedUser
        guard let team = try await Team.query(on: req.db)
            .filter(\.$id == teamID)
            .with(\.$organization)
            .first(),
              team.organization.ownerID == user.id else {
            throw Abort(.forbidden)
        }
        return team
    }

    // MARK: - Team Batting Stats

    struct PlayerBattingLine: Content {
        let playerId: UUID
        let playerName: String
        let jerseyNumber: Int?
        let stats: BattingStatsOutput
    }

    func teamBattingStats(req: Request) async throws -> [PlayerBattingLine] {
        guard let teamIDStr = req.query[String.self, at: "teamId"],
              let teamID = UUID(uuidString: teamIDStr) else {
            throw Abort(.badRequest, reason: "teamId required")
        }
        let team = try await authorizeTeamAccess(teamID, req: req)

        let players = try await Player.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .filter(\.$isActive == true)
            .all()

        // Build season filter for at-bats
        let seasonID: UUID?
        if let sidStr = req.query[String.self, at: "seasonId"] {
            seasonID = UUID(uuidString: sidStr)
        } else {
            seasonID = nil
        }

        // Get all games for this team (optionally filtered by season)
        var gameQuery = Game.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .filter(\.$status == .final_)
        if let sid = seasonID {
            gameQuery = gameQuery.filter(\.$season.$id == sid)
        }
        let games = try await gameQuery.all()
        let gameIDs = games.compactMap(\.id)

        guard !gameIDs.isEmpty else { return [] }

        // Get all at-bats for these games
        let allAtBats = try await AtBat.query(on: req.db)
            .filter(\.$game.$id ~~ gameIDs)
            .all()

        var results: [PlayerBattingLine] = []

        for player in players {
            guard let playerID = player.id else { continue }
            let playerAtBats = allAtBats.filter { $0.$player.id == playerID }
            guard !playerAtBats.isEmpty else { continue }

            let input = buildBattingInput(from: playerAtBats, games: games, playerID: playerID, team: team)
            let output = BattingStatsCalculator.calculate(input)

            results.append(PlayerBattingLine(
                playerId: playerID,
                playerName: "\(player.firstName) \(player.lastName)",
                jerseyNumber: player.jerseyNumber,
                stats: output
            ))
        }

        // Sort by plate appearances descending
        return results.sorted { $0.stats.pa > $1.stats.pa }
    }

    // MARK: - Team Pitching Stats

    struct PlayerPitchingLine: Content {
        let playerId: UUID
        let playerName: String
        let jerseyNumber: Int?
        let stats: PitchingStatsOutput
    }

    func teamPitchingStats(req: Request) async throws -> [PlayerPitchingLine] {
        guard let teamIDStr = req.query[String.self, at: "teamId"],
              let teamID = UUID(uuidString: teamIDStr) else {
            throw Abort(.badRequest, reason: "teamId required")
        }
        let team = try await authorizeTeamAccess(teamID, req: req)

        let seasonID: UUID?
        if let sidStr = req.query[String.self, at: "seasonId"] {
            seasonID = UUID(uuidString: sidStr)
        } else {
            seasonID = nil
        }

        var gameQuery = Game.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .filter(\.$status == .final_)
        if let sid = seasonID {
            gameQuery = gameQuery.filter(\.$season.$id == sid)
        }
        let games = try await gameQuery.all()
        let gameIDs = games.compactMap(\.id)

        guard !gameIDs.isEmpty else { return [] }

        let allAppearances = try await PitchingAppearance.query(on: req.db)
            .filter(\.$game.$id ~~ gameIDs)
            .with(\.$player)
            .all()

        // Group by player
        let grouped = Dictionary(grouping: allAppearances) { $0.$player.id }

        var results: [PlayerPitchingLine] = []

        for (playerID, appearances) in grouped {
            guard let firstApp = appearances.first else { continue }
            let player = firstApp.player

            let input = buildPitchingInput(from: appearances, team: team)
            let output = PitchingStatsCalculator.calculate(input)

            results.append(PlayerPitchingLine(
                playerId: playerID,
                playerName: "\(player.firstName) \(player.lastName)",
                jerseyNumber: player.jerseyNumber,
                stats: output
            ))
        }

        // Sort by innings pitched descending
        return results.sorted { $0.stats.outsRecorded > $1.stats.outsRecorded }
    }

    // MARK: - Team Record

    func teamRecordStats(req: Request) async throws -> TeamStatsOutput {
        guard let teamIDStr = req.query[String.self, at: "teamId"],
              let teamID = UUID(uuidString: teamIDStr) else {
            throw Abort(.badRequest, reason: "teamId required")
        }
        _ = try await authorizeTeamAccess(teamID, req: req)

        let seasonID: UUID?
        if let sidStr = req.query[String.self, at: "seasonId"] {
            seasonID = UUID(uuidString: sidStr)
        } else {
            seasonID = nil
        }

        var gameQuery = Game.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .filter(\.$status == .final_)
        if let sid = seasonID {
            gameQuery = gameQuery.filter(\.$season.$id == sid)
        }
        let games = try await gameQuery.all()

        var wins = 0, losses = 0, ties = 0, rs = 0, ra = 0
        for game in games {
            rs += game.ourScore
            ra += game.opponentScore
            if game.ourScore > game.opponentScore { wins += 1 }
            else if game.ourScore < game.opponentScore { losses += 1 }
            else { ties += 1 }
        }

        let input = TeamStatsInput(
            wins: wins,
            losses: losses,
            ties: ties,
            runsScored: rs,
            runsAllowed: ra,
            gamesPlayed: games.count
        )

        return TeamStatsCalculator.calculate(input)
    }

    // MARK: - Individual Player Stats

    func playerBattingStats(req: Request) async throws -> BattingStatsOutput {
        guard let playerID = req.parameters.get("playerID", as: UUID.self) else {
            throw Abort(.badRequest)
        }

        let user = try req.authenticatedUser
        guard let player = try await Player.query(on: req.db)
            .filter(\.$id == playerID)
            .with(\.$team) { $0.with(\.$organization) }
            .first(),
              player.team.organization.ownerID == user.id else {
            throw Abort(.forbidden)
        }

        let seasonID: UUID?
        if let sidStr = req.query[String.self, at: "seasonId"] {
            seasonID = UUID(uuidString: sidStr)
        } else {
            seasonID = nil
        }

        // Get finished games for this player's team
        var gameQuery = Game.query(on: req.db)
            .filter(\.$team.$id == player.$team.id)
            .filter(\.$status == .final_)
        if let sid = seasonID {
            gameQuery = gameQuery.filter(\.$season.$id == sid)
        }
        let games = try await gameQuery.all()
        let gameIDs = games.compactMap(\.id)

        let atBats = try await AtBat.query(on: req.db)
            .filter(\.$player.$id == playerID)
            .filter(\.$game.$id ~~ gameIDs)
            .all()

        let input = buildBattingInput(from: atBats, games: games, playerID: playerID, team: player.team)
        return BattingStatsCalculator.calculate(input)
    }

    func playerPitchingStats(req: Request) async throws -> PitchingStatsOutput {
        guard let playerID = req.parameters.get("playerID", as: UUID.self) else {
            throw Abort(.badRequest)
        }

        let user = try req.authenticatedUser
        guard let player = try await Player.query(on: req.db)
            .filter(\.$id == playerID)
            .with(\.$team) { $0.with(\.$organization) }
            .first(),
              player.team.organization.ownerID == user.id else {
            throw Abort(.forbidden)
        }

        let seasonID: UUID?
        if let sidStr = req.query[String.self, at: "seasonId"] {
            seasonID = UUID(uuidString: sidStr)
        } else {
            seasonID = nil
        }

        var gameQuery = Game.query(on: req.db)
            .filter(\.$team.$id == player.$team.id)
            .filter(\.$status == .final_)
        if let sid = seasonID {
            gameQuery = gameQuery.filter(\.$season.$id == sid)
        }
        let games = try await gameQuery.all()
        let gameIDs = games.compactMap(\.id)

        let appearances = try await PitchingAppearance.query(on: req.db)
            .filter(\.$player.$id == playerID)
            .filter(\.$game.$id ~~ gameIDs)
            .all()

        let input = buildPitchingInput(from: appearances, team: player.team)
        return PitchingStatsCalculator.calculate(input)
    }

    // MARK: - Box Score

    struct BoxScoreResponse: Content {
        let game: Game
        let linescore: LinescoreData
        let batting: [PlayerBattingLine]
        let pitching: [PlayerPitchingLine]
    }

    struct LinescoreData: Content {
        let innings: [InningScore]
        let ourTotal: RunsHitsErrors
        let opponentTotal: RunsHitsErrors
    }

    struct InningScore: Content {
        let inning: Int
        let ourRuns: Int
        let opponentRuns: Int
    }

    struct RunsHitsErrors: Content {
        let r: Int
        let h: Int
        let e: Int
    }

    func boxScore(req: Request) async throws -> BoxScoreResponse {
        guard let gameID = req.parameters.get("gameID", as: UUID.self) else {
            throw Abort(.badRequest)
        }

        let user = try req.authenticatedUser
        guard let game = try await Game.query(on: req.db)
            .filter(\.$id == gameID)
            .with(\.$team) { $0.with(\.$organization) }
            .first(),
              game.team.organization.ownerID == user.id else {
            throw Abort(.forbidden)
        }

        let allAtBats = try await AtBat.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .all()

        let allPitching = try await PitchingAppearance.query(on: req.db)
            .filter(\.$game.$id == gameID)
            .with(\.$player)
            .all()

        // Build linescore by inning
        var inningScores: [Int: (our: Int, opp: Int)] = [:]
        for ab in allAtBats {
            let inning = ab.inning
            var current = inningScores[inning] ?? (our: 0, opp: 0)
            let runs = ab.rbi + (ab.runnerScored && ab.rbi == 0 ? 1 : 0)
            if ab.isTop {
                if game.isHome { current.opp += runs } else { current.our += runs }
            } else {
                if game.isHome { current.our += runs } else { current.opp += runs }
            }
            inningScores[inning] = current
        }

        let innings = (1...game.inningsCount).map { inn in
            let score = inningScores[inn] ?? (our: 0, opp: 0)
            return InningScore(inning: inn, ourRuns: score.our, opponentRuns: score.opp)
        }

        let ourHits = allAtBats.filter { ab in
            let isOurAtBat = ab.isTop ? !game.isHome : game.isHome
            return isOurAtBat && ab.result.isHit
        }.count

        let oppHits = allAtBats.filter { ab in
            let isOppAtBat = ab.isTop ? game.isHome : !game.isHome
            return isOppAtBat && ab.result.isHit
        }.count

        let ourErrors = allAtBats.filter { ab in
            let isOppAtBat = ab.isTop ? game.isHome : !game.isHome
            return isOppAtBat && ab.result == .reachedOnError
        }.count

        let oppErrors = allAtBats.filter { ab in
            let isOurAtBat = ab.isTop ? !game.isHome : game.isHome
            return isOurAtBat && ab.result == .reachedOnError
        }.count

        let linescore = LinescoreData(
            innings: innings,
            ourTotal: RunsHitsErrors(r: game.ourScore, h: ourHits, e: ourErrors),
            opponentTotal: RunsHitsErrors(r: game.opponentScore, h: oppHits, e: oppErrors)
        )

        // Build per-player batting lines for this game
        let battingByPlayer = Dictionary(grouping: allAtBats) { $0.$player.id }
        var battingLines: [PlayerBattingLine] = []
        for (playerID, abs) in battingByPlayer {
            guard let firstAB = abs.first else { continue }
            let player = firstAB.player
            let input = buildBattingInput(from: abs, games: [game], playerID: playerID, team: game.team)
            let output = BattingStatsCalculator.calculate(input)
            battingLines.append(PlayerBattingLine(
                playerId: playerID,
                playerName: "\(player.firstName) \(player.lastName)",
                jerseyNumber: player.jerseyNumber,
                stats: output
            ))
        }

        // Build per-player pitching lines
        var pitchingLines: [PlayerPitchingLine] = []
        for appearance in allPitching {
            let input = buildPitchingInput(from: [appearance], team: game.team)
            let output = PitchingStatsCalculator.calculate(input)
            pitchingLines.append(PlayerPitchingLine(
                playerId: appearance.$player.id,
                playerName: "\(appearance.player.firstName) \(appearance.player.lastName)",
                jerseyNumber: appearance.player.jerseyNumber,
                stats: output
            ))
        }

        return BoxScoreResponse(
            game: game,
            linescore: linescore,
            batting: battingLines.sorted { $0.stats.pa > $1.stats.pa },
            pitching: pitchingLines.sorted { $0.stats.outsRecorded > $1.stats.outsRecorded }
        )
    }

    // MARK: - Helpers

    private func buildBattingInput(from atBats: [AtBat], games: [Game], playerID: UUID, team: Team) -> BattingStatsInput {
        var pa = 0, ab = 0, hits = 0, singles = 0, doubles = 0, triples = 0, hr = 0
        var bb = 0, hbp = 0, k = 0, sf = 0, sac = 0, sb = 0, cs = 0, gidp = 0
        var runs = 0, rbi = 0

        for atBat in atBats {
            pa += 1
            if atBat.result.countsAsAtBat { ab += 1 }
            if atBat.result.isHit { hits += 1 }
            if atBat.result == .single { singles += 1 }
            if atBat.result == .double { doubles += 1 }
            if atBat.result == .triple { triples += 1 }
            if atBat.result == .homeRun { hr += 1 }
            if atBat.result.isWalk { bb += 1 }
            if atBat.result == .hitByPitch { hbp += 1 }
            if atBat.result.isStrikeout { k += 1 }
            if atBat.result == .sacrificeFly { sf += 1 }
            if atBat.result == .sacrificeBunt { sac += 1 }
            if atBat.result == .doublePlay { gidp += 1 }
            sb += atBat.stolenBases
            cs += atBat.caughtStealing
            rbi += atBat.rbi
            if atBat.runnerScored { runs += 1 }
        }

        // Count games played (games where this player had at least one PA)
        let gameIDsWithPA = Set(atBats.map { $0.$game.id })
        let gamesPlayed = gameIDsWithPA.count

        return BattingStatsInput(
            atBats: ab,
            plateAppearances: pa,
            hits: hits,
            singles: singles,
            doubles: doubles,
            triples: triples,
            homeRuns: hr,
            walks: bb,
            hitByPitch: hbp,
            strikeouts: k,
            sacrificeFlies: sf,
            sacrificeBunts: sac,
            stolenBases: sb,
            caughtStealing: cs,
            gidp: gidp,
            runs: runs,
            rbi: rbi,
            games: gamesPlayed
        )
    }

    private func buildPitchingInput(from appearances: [PitchingAppearance], team: Team) -> PitchingStatsInput {
        var outs = 0, h = 0, r = 0, er = 0, bb = 0, k = 0, hr = 0, hbp = 0
        var pitches: Int? = 0, strikes: Int? = 0
        var wins = 0, losses = 0, saves = 0, holds = 0
        var games = 0, gamesStarted = 0

        for app in appearances {
            games += 1
            if app.appearanceOrder == 1 { gamesStarted += 1 }
            outs += app.outsRecorded
            h += app.hitsAllowed
            r += app.runsAllowed
            er += app.earnedRuns
            bb += app.walks
            k += app.strikeouts
            hr += app.homeRunsAllowed
            hbp += app.hitBatters

            if let pt = app.pitchesThrown {
                pitches = (pitches ?? 0) + pt
            } else {
                pitches = nil
            }
            if let st = app.strikesThrown {
                strikes = (strikes ?? 0) + st
            } else {
                strikes = nil
            }

            if app.isWinner == true { wins += 1 }
            if app.isLoser == true { losses += 1 }
            if app.isSave == true { saves += 1 }
            if app.isHold == true { holds += 1 }
        }

        return PitchingStatsInput(
            outsRecorded: outs,
            hitsAllowed: h,
            runsAllowed: r,
            earnedRuns: er,
            walks: bb,
            strikeouts: k,
            homeRunsAllowed: hr,
            hitBatters: hbp,
            pitchesThrown: pitches,
            strikesThrown: strikes,
            wins: wins,
            losses: losses,
            saves: saves,
            holds: holds,
            games: games,
            gamesStarted: gamesStarted,
            gameInnings: team.sport == .softball ? 7 : 9
        )
    }
}
