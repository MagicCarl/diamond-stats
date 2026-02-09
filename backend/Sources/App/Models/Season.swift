import Fluent
import Vapor

final class Season: Model, Content, @unchecked Sendable {
    static let schema = "seasons"

    @ID(key: .id) var id: UUID?
    @Parent(key: "team_id") var team: Team
    @Field(key: "name") var name: String
    @OptionalField(key: "start_date") var startDate: Date?
    @OptionalField(key: "end_date") var endDate: Date?
    @Field(key: "is_active") var isActive: Bool
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?

    init() {}

    init(id: UUID? = nil, teamID: UUID, name: String, isActive: Bool = true) {
        self.id = id
        self.$team.id = teamID
        self.name = name
        self.isActive = isActive
    }
}

struct CreateSeason: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("seasons")
            .id()
            .field("team_id", .uuid, .required, .references("teams", "id", onDelete: .cascade))
            .field("name", .string, .required)
            .field("start_date", .date)
            .field("end_date", .date)
            .field("is_active", .bool, .required, .sql(.default(true)))
            .field("created_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("seasons").delete()
    }
}
