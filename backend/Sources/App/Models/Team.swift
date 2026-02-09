import Fluent
import Vapor

enum SportType: String, Codable {
    case baseball, softball
}

enum TeamLevel: String, Codable {
    case littleLeague = "little_league"
    case highSchool = "high_school"
    case college, travel, rec
    case minorLeague = "minor_league"
}

final class Team: Model, Content, @unchecked Sendable {
    static let schema = "teams"

    @ID(key: .id) var id: UUID?
    @Parent(key: "organization_id") var organization: Organization
    @Field(key: "name") var name: String
    @Field(key: "sport") var sport: SportType
    @Field(key: "level") var level: TeamLevel
    @Field(key: "default_innings") var defaultInnings: Int
    @OptionalField(key: "logo_url") var logoURL: String?
    @Children(for: \.$team) var players: [Player]
    @Children(for: \.$team) var seasons: [Season]
    @Children(for: \.$team) var games: [Game]
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?
    @Timestamp(key: "updated_at", on: .update) var updatedAt: Date?

    init() {}

    init(id: UUID? = nil, organizationID: UUID, name: String,
         sport: SportType = .baseball, level: TeamLevel = .highSchool,
         defaultInnings: Int = 9) {
        self.id = id
        self.$organization.id = organizationID
        self.name = name
        self.sport = sport
        self.level = level
        self.defaultInnings = defaultInnings
    }
}

struct CreateTeam: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("teams")
            .id()
            .field("organization_id", .uuid, .required, .references("organizations", "id", onDelete: .cascade))
            .field("name", .string, .required)
            .field("sport", .string, .required, .sql(.default("baseball")))
            .field("level", .string, .required, .sql(.default("high_school")))
            .field("default_innings", .int, .required, .sql(.default(9)))
            .field("logo_url", .string)
            .field("created_at", .datetime)
            .field("updated_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("teams").delete()
    }
}
