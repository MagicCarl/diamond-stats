import Vapor
import Fluent

struct TeamController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        // Teams
        routes.get(use: listTeams)
        routes.post(use: createTeam)
        routes.get(":teamID", use: getTeam)
        routes.put(":teamID", use: updateTeam)
        routes.delete(":teamID", use: deleteTeam)

        // Players (nested under team)
        routes.get(":teamID", "players", use: listPlayers)
        routes.post(":teamID", "players", use: createPlayer)
        routes.put(":teamID", "players", ":playerID", use: updatePlayer)
        routes.delete(":teamID", "players", ":playerID", use: deletePlayer)

        // Seasons (nested under team)
        routes.get(":teamID", "seasons", use: listSeasons)
        routes.post(":teamID", "seasons", use: createSeason)
        routes.put(":teamID", "seasons", ":seasonID", use: updateSeason)
    }

    // MARK: - Authorization Helper

    /// Verify the authenticated user owns the organization that owns this team
    private func authorizeTeam(_ teamID: UUID, req: Request) async throws -> Team {
        let user = try req.authenticatedUser
        guard let team = try await Team.query(on: req.db)
            .filter(\.$id == teamID)
            .with(\.$organization)
            .first() else {
            throw Abort(.notFound, reason: "Team not found")
        }
        guard team.organization.ownerID == user.id else {
            throw Abort(.forbidden, reason: "Not authorized for this team")
        }
        return team
    }

    // MARK: - Teams

    func listTeams(req: Request) async throws -> [Team] {
        let user = try req.authenticatedUser
        let orgs = try await Organization.query(on: req.db)
            .filter(\.$ownerID == user.id)
            .all()
        let orgIDs = orgs.compactMap(\.id)

        return try await Team.query(on: req.db)
            .filter(\.$organization.$id ~~ orgIDs)
            .with(\.$organization)
            .sort(\.$name)
            .all()
    }

    struct CreateTeamRequest: Content {
        let name: String
        let sport: SportType?
        let level: TeamLevel?
        let defaultInnings: Int?
        let organizationId: UUID?
        let organizationName: String?
    }

    func createTeam(req: Request) async throws -> Team {
        let user = try req.authenticatedUser
        let input = try req.content.decode(CreateTeamRequest.self)

        // Find or create organization
        let orgID: UUID
        if let existingOrgID = input.organizationId {
            // Verify ownership
            guard let org = try await Organization.find(existingOrgID, on: req.db),
                  org.ownerID == user.id else {
                throw Abort(.forbidden, reason: "Not authorized for this organization")
            }
            orgID = existingOrgID
        } else {
            // Auto-create org for user
            let orgName = input.organizationName ?? "\(user.email ?? "My") Organization"
            if let existing = try await Organization.query(on: req.db)
                .filter(\.$ownerID == user.id)
                .first() {
                orgID = existing.id!
            } else {
                let org = Organization(name: orgName, ownerID: user.id)
                try await org.save(on: req.db)
                orgID = org.id!
            }
        }

        let team = Team(
            organizationID: orgID,
            name: input.name,
            sport: input.sport ?? .baseball,
            level: input.level ?? .highSchool,
            defaultInnings: input.defaultInnings ?? (input.sport == .softball ? 7 : 9)
        )
        try await team.save(on: req.db)
        return team
    }

    struct TeamDetail: Content {
        let team: Team
        let players: [Player]
        let seasons: [Season]
        let gameCount: Int
    }

    func getTeam(req: Request) async throws -> TeamDetail {
        guard let teamID = req.parameters.get("teamID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid team ID")
        }
        let team = try await authorizeTeam(teamID, req: req)

        let players = try await Player.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .filter(\.$isActive == true)
            .sort(\.$jerseyNumber)
            .all()

        let seasons = try await Season.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .sort(\.$isActive, .descending)
            .sort(\.$name)
            .all()

        let gameCount = try await Game.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .count()

        return TeamDetail(team: team, players: players, seasons: seasons, gameCount: gameCount)
    }

    struct UpdateTeamRequest: Content {
        let name: String?
        let sport: SportType?
        let level: TeamLevel?
        let defaultInnings: Int?
        let logoURL: String?
    }

    func updateTeam(req: Request) async throws -> Team {
        guard let teamID = req.parameters.get("teamID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid team ID")
        }
        let team = try await authorizeTeam(teamID, req: req)
        let input = try req.content.decode(UpdateTeamRequest.self)

        if let name = input.name { team.name = name }
        if let sport = input.sport { team.sport = sport }
        if let level = input.level { team.level = level }
        if let innings = input.defaultInnings { team.defaultInnings = innings }
        if let logo = input.logoURL { team.logoURL = logo }

        try await team.save(on: req.db)
        return team
    }

    func deleteTeam(req: Request) async throws -> HTTPStatus {
        guard let teamID = req.parameters.get("teamID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid team ID")
        }
        let team = try await authorizeTeam(teamID, req: req)
        try await team.delete(on: req.db)
        return .noContent
    }

    // MARK: - Players

    func listPlayers(req: Request) async throws -> [Player] {
        guard let teamID = req.parameters.get("teamID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid team ID")
        }
        _ = try await authorizeTeam(teamID, req: req)

        return try await Player.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .sort(\.$jerseyNumber)
            .all()
    }

    struct CreatePlayerRequest: Content {
        let firstName: String
        let lastName: String
        let jerseyNumber: Int?
        let bats: BatsType?
        let throwsHand: ThrowsType?
        let primaryPosition: String?
        let secondaryPosition: String?
        let graduationYear: Int?
    }

    func createPlayer(req: Request) async throws -> Player {
        guard let teamID = req.parameters.get("teamID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid team ID")
        }
        _ = try await authorizeTeam(teamID, req: req)
        let input = try req.content.decode(CreatePlayerRequest.self)

        let player = Player(
            teamID: teamID,
            firstName: input.firstName,
            lastName: input.lastName,
            jerseyNumber: input.jerseyNumber,
            bats: input.bats ?? .right,
            throwsHand: input.throwsHand ?? .right,
            primaryPosition: input.primaryPosition
        )
        if let secondary = input.secondaryPosition { player.secondaryPosition = secondary }
        if let gradYear = input.graduationYear { player.graduationYear = gradYear }

        try await player.save(on: req.db)
        return player
    }

    struct UpdatePlayerRequest: Content {
        let firstName: String?
        let lastName: String?
        let jerseyNumber: Int?
        let bats: BatsType?
        let throwsHand: ThrowsType?
        let primaryPosition: String?
        let secondaryPosition: String?
        let isActive: Bool?
        let graduationYear: Int?
    }

    func updatePlayer(req: Request) async throws -> Player {
        guard let teamID = req.parameters.get("teamID", as: UUID.self),
              let playerID = req.parameters.get("playerID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid IDs")
        }
        _ = try await authorizeTeam(teamID, req: req)

        guard let player = try await Player.query(on: req.db)
            .filter(\.$id == playerID)
            .filter(\.$team.$id == teamID)
            .first() else {
            throw Abort(.notFound, reason: "Player not found")
        }

        let input = try req.content.decode(UpdatePlayerRequest.self)
        if let firstName = input.firstName { player.firstName = firstName }
        if let lastName = input.lastName { player.lastName = lastName }
        if let jersey = input.jerseyNumber { player.jerseyNumber = jersey }
        if let bats = input.bats { player.bats = bats }
        if let throwsHand = input.throwsHand { player.throwsHand = throwsHand }
        if let pos = input.primaryPosition { player.primaryPosition = pos }
        if let pos = input.secondaryPosition { player.secondaryPosition = pos }
        if let active = input.isActive { player.isActive = active }
        if let year = input.graduationYear { player.graduationYear = year }

        try await player.save(on: req.db)
        return player
    }

    func deletePlayer(req: Request) async throws -> HTTPStatus {
        guard let teamID = req.parameters.get("teamID", as: UUID.self),
              let playerID = req.parameters.get("playerID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid IDs")
        }
        _ = try await authorizeTeam(teamID, req: req)

        guard let player = try await Player.query(on: req.db)
            .filter(\.$id == playerID)
            .filter(\.$team.$id == teamID)
            .first() else {
            throw Abort(.notFound, reason: "Player not found")
        }
        try await player.delete(on: req.db)
        return .noContent
    }

    // MARK: - Seasons

    func listSeasons(req: Request) async throws -> [Season] {
        guard let teamID = req.parameters.get("teamID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid team ID")
        }
        _ = try await authorizeTeam(teamID, req: req)

        return try await Season.query(on: req.db)
            .filter(\.$team.$id == teamID)
            .sort(\.$isActive, .descending)
            .sort(\.$name)
            .all()
    }

    struct CreateSeasonRequest: Content {
        let name: String
        let startDate: Date?
        let endDate: Date?
    }

    func createSeason(req: Request) async throws -> Season {
        guard let teamID = req.parameters.get("teamID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid team ID")
        }
        _ = try await authorizeTeam(teamID, req: req)
        let input = try req.content.decode(CreateSeasonRequest.self)

        let season = Season(teamID: teamID, name: input.name)
        if let start = input.startDate { season.startDate = start }
        if let end = input.endDate { season.endDate = end }

        try await season.save(on: req.db)
        return season
    }

    struct UpdateSeasonRequest: Content {
        let name: String?
        let startDate: Date?
        let endDate: Date?
        let isActive: Bool?
    }

    func updateSeason(req: Request) async throws -> Season {
        guard let teamID = req.parameters.get("teamID", as: UUID.self),
              let seasonID = req.parameters.get("seasonID", as: UUID.self) else {
            throw Abort(.badRequest, reason: "Invalid IDs")
        }
        _ = try await authorizeTeam(teamID, req: req)

        guard let season = try await Season.query(on: req.db)
            .filter(\.$id == seasonID)
            .filter(\.$team.$id == teamID)
            .first() else {
            throw Abort(.notFound, reason: "Season not found")
        }

        let input = try req.content.decode(UpdateSeasonRequest.self)
        if let name = input.name { season.name = name }
        if let start = input.startDate { season.startDate = start }
        if let end = input.endDate { season.endDate = end }
        if let active = input.isActive { season.isActive = active }

        try await season.save(on: req.db)
        return season
    }
}
