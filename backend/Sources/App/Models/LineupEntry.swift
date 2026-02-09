import Fluent
import Vapor

final class LineupEntry: Model, Content, @unchecked Sendable {
    static let schema = "lineup_entries"

    @ID(key: .id) var id: UUID?
    @Parent(key: "game_id") var game: Game
    @Parent(key: "player_id") var player: Player
    @Field(key: "batting_order") var battingOrder: Int
    @Field(key: "position") var position: String
    @Field(key: "is_starter") var isStarter: Bool
    @OptionalField(key: "entered_game_inning") var enteredGameInning: Int?
    @OptionalField(key: "exited_game_inning") var exitedGameInning: Int?
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?

    init() {}

    init(id: UUID? = nil, gameID: UUID, playerID: UUID,
         battingOrder: Int, position: String, isStarter: Bool = true) {
        self.id = id
        self.$game.id = gameID
        self.$player.id = playerID
        self.battingOrder = battingOrder
        self.position = position
        self.isStarter = isStarter
    }
}

struct CreateLineupEntry: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("lineup_entries")
            .id()
            .field("game_id", .uuid, .required, .references("games", "id", onDelete: .cascade))
            .field("player_id", .uuid, .required, .references("players", "id", onDelete: .cascade))
            .field("batting_order", .int, .required)
            .field("position", .string, .required)
            .field("is_starter", .bool, .required, .sql(.default(true)))
            .field("entered_game_inning", .int)
            .field("exited_game_inning", .int)
            .field("created_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("lineup_entries").delete()
    }
}
