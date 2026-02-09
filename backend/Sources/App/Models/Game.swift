import Fluent
import Vapor

enum GameStatus: String, Codable {
    case scheduled
    case inProgress = "in_progress"
    case final_ = "final"
    case suspended, cancelled
}

final class Game: Model, Content, @unchecked Sendable {
    static let schema = "games"

    @ID(key: .id) var id: UUID?
    @Parent(key: "team_id") var team: Team
    @OptionalParent(key: "season_id") var season: Season?
    @Field(key: "opponent_name") var opponentName: String
    @Field(key: "game_date") var gameDate: Date
    @OptionalField(key: "game_time") var gameTime: Date?
    @OptionalField(key: "location") var location: String?
    @Field(key: "is_home") var isHome: Bool
    @Field(key: "innings_count") var inningsCount: Int
    @Field(key: "status") var status: GameStatus
    @Field(key: "our_score") var ourScore: Int
    @Field(key: "opponent_score") var opponentScore: Int
    @Field(key: "current_inning") var currentInning: Int
    @Field(key: "is_top_of_inning") var isTopOfInning: Bool
    @Field(key: "outs_in_current_inning") var outsInCurrentInning: Int
    @OptionalField(key: "notes") var notes: String?
    @Children(for: \.$game) var atBats: [AtBat]
    @Children(for: \.$game) var lineupEntries: [LineupEntry]
    @Children(for: \.$game) var pitchingAppearances: [PitchingAppearance]
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?
    @Timestamp(key: "updated_at", on: .update) var updatedAt: Date?

    init() {}

    init(id: UUID? = nil, teamID: UUID, seasonID: UUID? = nil,
         opponentName: String, gameDate: Date, isHome: Bool = true,
         inningsCount: Int = 9) {
        self.id = id
        self.$team.id = teamID
        if let seasonID { self.$season.id = seasonID }
        self.opponentName = opponentName
        self.gameDate = gameDate
        self.isHome = isHome
        self.inningsCount = inningsCount
        self.status = .scheduled
        self.ourScore = 0
        self.opponentScore = 0
        self.currentInning = 1
        self.isTopOfInning = true
        self.outsInCurrentInning = 0
    }
}

struct CreateGame: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("games")
            .id()
            .field("team_id", .uuid, .required, .references("teams", "id", onDelete: .cascade))
            .field("season_id", .uuid, .references("seasons", "id", onDelete: .setNull))
            .field("opponent_name", .string, .required)
            .field("game_date", .date, .required)
            .field("game_time", .time)
            .field("location", .string)
            .field("is_home", .bool, .required, .sql(.default(true)))
            .field("innings_count", .int, .required, .sql(.default(9)))
            .field("status", .string, .required, .sql(.default("scheduled")))
            .field("our_score", .int, .required, .sql(.default(0)))
            .field("opponent_score", .int, .required, .sql(.default(0)))
            .field("current_inning", .int, .required, .sql(.default(1)))
            .field("is_top_of_inning", .bool, .required, .sql(.default(true)))
            .field("outs_in_current_inning", .int, .required, .sql(.default(0)))
            .field("notes", .string)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("games").delete()
    }
}
