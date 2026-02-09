import Fluent
import Vapor

final class Organization: Model, Content, @unchecked Sendable {
    static let schema = "organizations"

    @ID(key: .id) var id: UUID?
    @Field(key: "name") var name: String
    @Field(key: "owner_id") var ownerID: UUID
    @Children(for: \.$organization) var teams: [Team]
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?
    @Timestamp(key: "updated_at", on: .update) var updatedAt: Date?

    init() {}

    init(id: UUID? = nil, name: String, ownerID: UUID) {
        self.id = id
        self.name = name
        self.ownerID = ownerID
    }
}

struct CreateOrganization: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("organizations")
            .id()
            .field("name", .string, .required)
            .field("owner_id", .uuid, .required)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("organizations").delete()
    }
}
