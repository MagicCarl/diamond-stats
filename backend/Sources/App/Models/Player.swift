import Fluent
import Vapor

enum BatsType: String, Codable {
    case left, right
    case switchHitter = "switch"
}

enum ThrowsType: String, Codable {
    case left, right
}

final class Player: Model, Content, @unchecked Sendable {
    static let schema = "players"

    @ID(key: .id) var id: UUID?
    @Parent(key: "team_id") var team: Team
    @Field(key: "first_name") var firstName: String
    @Field(key: "last_name") var lastName: String
    @OptionalField(key: "jersey_number") var jerseyNumber: Int?
    @Field(key: "bats") var bats: BatsType
    @Field(key: "throws") var throwsHand: ThrowsType
    @OptionalField(key: "primary_position") var primaryPosition: String?
    @OptionalField(key: "secondary_position") var secondaryPosition: String?
    @Field(key: "is_active") var isActive: Bool
    @OptionalField(key: "graduation_year") var graduationYear: Int?
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?
    @Timestamp(key: "updated_at", on: .update) var updatedAt: Date?

    init() {}

    init(id: UUID? = nil, teamID: UUID, firstName: String, lastName: String,
         jerseyNumber: Int? = nil, bats: BatsType = .right,
         throwsHand: ThrowsType = .right, primaryPosition: String? = nil) {
        self.id = id
        self.$team.id = teamID
        self.firstName = firstName
        self.lastName = lastName
        self.jerseyNumber = jerseyNumber
        self.bats = bats
        self.throwsHand = throwsHand
        self.primaryPosition = primaryPosition
        self.isActive = true
    }
}

struct CreatePlayer: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("players")
            .id()
            .field("team_id", .uuid, .required, .references("teams", "id", onDelete: .cascade))
            .field("first_name", .string, .required)
            .field("last_name", .string, .required)
            .field("jersey_number", .int)
            .field("bats", .string, .required, .sql(.default("right")))
            .field("throws", .string, .required, .sql(.default("right")))
            .field("primary_position", .string)
            .field("secondary_position", .string)
            .field("is_active", .bool, .required, .sql(.default(true)))
            .field("graduation_year", .int)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("players").delete()
    }
}
