import Fluent
import Vapor

final class PitchingAppearance: Model, Content, @unchecked Sendable {
    static let schema = "pitching_appearances"

    @ID(key: .id) var id: UUID?
    @Parent(key: "game_id") var game: Game
    @Parent(key: "player_id") var player: Player
    @Field(key: "appearance_order") var appearanceOrder: Int
    @Field(key: "outs_recorded") var outsRecorded: Int
    @Field(key: "hits_allowed") var hitsAllowed: Int
    @Field(key: "runs_allowed") var runsAllowed: Int
    @Field(key: "earned_runs") var earnedRuns: Int
    @Field(key: "walks") var walks: Int
    @Field(key: "strikeouts") var strikeouts: Int
    @Field(key: "home_runs_allowed") var homeRunsAllowed: Int
    @OptionalField(key: "pitches_thrown") var pitchesThrown: Int?
    @OptionalField(key: "strikes_thrown") var strikesThrown: Int?
    @OptionalField(key: "balls_thrown") var ballsThrown: Int?
    @Field(key: "hit_batters") var hitBatters: Int
    @Field(key: "wild_pitches") var wildPitches: Int
    @Field(key: "balks") var balks: Int
    @OptionalField(key: "is_winner") var isWinner: Bool?
    @OptionalField(key: "is_loser") var isLoser: Bool?
    @OptionalField(key: "is_save") var isSave: Bool?
    @OptionalField(key: "is_hold") var isHold: Bool?
    @OptionalField(key: "notes") var notes: String?
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?

    init() {}

    init(id: UUID? = nil, gameID: UUID, playerID: UUID, appearanceOrder: Int = 1) {
        self.id = id
        self.$game.id = gameID
        self.$player.id = playerID
        self.appearanceOrder = appearanceOrder
        self.outsRecorded = 0
        self.hitsAllowed = 0
        self.runsAllowed = 0
        self.earnedRuns = 0
        self.walks = 0
        self.strikeouts = 0
        self.homeRunsAllowed = 0
        self.hitBatters = 0
        self.wildPitches = 0
        self.balks = 0
    }
}

struct CreatePitchingAppearance: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("pitching_appearances")
            .id()
            .field("game_id", .uuid, .required, .references("games", "id", onDelete: .cascade))
            .field("player_id", .uuid, .required, .references("players", "id", onDelete: .cascade))
            .field("appearance_order", .int, .required, .sql(.default(1)))
            .field("outs_recorded", .int, .required, .sql(.default(0)))
            .field("hits_allowed", .int, .required, .sql(.default(0)))
            .field("runs_allowed", .int, .required, .sql(.default(0)))
            .field("earned_runs", .int, .required, .sql(.default(0)))
            .field("walks", .int, .required, .sql(.default(0)))
            .field("strikeouts", .int, .required, .sql(.default(0)))
            .field("home_runs_allowed", .int, .required, .sql(.default(0)))
            .field("pitches_thrown", .int)
            .field("strikes_thrown", .int)
            .field("balls_thrown", .int)
            .field("hit_batters", .int, .required, .sql(.default(0)))
            .field("wild_pitches", .int, .required, .sql(.default(0)))
            .field("balks", .int, .required, .sql(.default(0)))
            .field("is_winner", .bool)
            .field("is_loser", .bool)
            .field("is_save", .bool)
            .field("is_hold", .bool)
            .field("notes", .string)
            .field("created_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("pitching_appearances").delete()
    }
}
