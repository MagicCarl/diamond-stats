import Fluent
import Vapor

enum AtBatResult: String, Codable {
    case single, double, triple
    case homeRun = "home_run"
    case walk
    case hitByPitch = "hit_by_pitch"
    case intentionalWalk = "intentional_walk"
    case strikeoutSwinging = "strikeout_swinging"
    case strikeoutLooking = "strikeout_looking"
    case groundOut = "ground_out"
    case flyOut = "fly_out"
    case lineOut = "line_out"
    case popOut = "pop_out"
    case fieldersChoice = "fielders_choice"
    case doublePlay = "double_play"
    case triplePlay = "triple_play"
    case sacrificeFly = "sacrifice_fly"
    case sacrificeBunt = "sacrifice_bunt"
    case reachedOnError = "reached_on_error"
    case catchersInterference = "catchers_interference"

    /// Whether this result counts as an official at-bat
    var countsAsAtBat: Bool {
        switch self {
        case .walk, .hitByPitch, .intentionalWalk,
             .sacrificeFly, .sacrificeBunt, .catchersInterference:
            return false
        default:
            return true
        }
    }

    /// Whether this result counts as a hit
    var isHit: Bool {
        switch self {
        case .single, .double, .triple, .homeRun: return true
        default: return false
        }
    }

    /// Total bases for this result
    var totalBases: Int {
        switch self {
        case .single: return 1
        case .double: return 2
        case .triple: return 3
        case .homeRun: return 4
        default: return 0
        }
    }

    /// Whether this counts as a strikeout
    var isStrikeout: Bool {
        self == .strikeoutSwinging || self == .strikeoutLooking
    }

    /// Whether this counts as a walk
    var isWalk: Bool {
        self == .walk || self == .intentionalWalk
    }

    /// Whether this result produces an out (for game state tracking)
    var isOut: Bool {
        switch self {
        case .strikeoutSwinging, .strikeoutLooking,
             .groundOut, .flyOut, .lineOut, .popOut,
             .fieldersChoice:
            return true
        case .doublePlay:
            return true  // counts as 1 out for the batter's at-bat
        default:
            return false
        }
    }

    /// Number of outs produced by this result
    var outsProduced: Int {
        switch self {
        case .doublePlay: return 2
        case .triplePlay: return 3
        default: return isOut ? 1 : 0
        }
    }
}

final class AtBat: Model, Content, @unchecked Sendable {
    static let schema = "at_bats"

    @ID(key: .id) var id: UUID?
    @Parent(key: "game_id") var game: Game
    @Parent(key: "player_id") var player: Player
    @Field(key: "inning") var inning: Int
    @Field(key: "is_top") var isTop: Bool
    @Field(key: "at_bat_number_in_game") var atBatNumberInGame: Int
    @Field(key: "result") var result: AtBatResult
    @Field(key: "rbi") var rbi: Int
    @Field(key: "runner_scored") var runnerScored: Bool
    @OptionalField(key: "pitch_count") var pitchCount: Int?
    @Field(key: "stolen_bases") var stolenBases: Int
    @Field(key: "caught_stealing") var caughtStealing: Int
    @OptionalField(key: "notes") var notes: String?
    @Timestamp(key: "created_at", on: .create) var createdAt: Date?

    init() {}

    init(id: UUID? = nil, gameID: UUID, playerID: UUID, inning: Int,
         isTop: Bool, atBatNumber: Int, result: AtBatResult,
         rbi: Int = 0, runnerScored: Bool = false) {
        self.id = id
        self.$game.id = gameID
        self.$player.id = playerID
        self.inning = inning
        self.isTop = isTop
        self.atBatNumberInGame = atBatNumber
        self.result = result
        self.rbi = rbi
        self.runnerScored = runnerScored
        self.stolenBases = 0
        self.caughtStealing = 0
    }
}

struct CreateAtBat: AsyncMigration {
    func prepare(on database: Database) async throws {
        try await database.schema("at_bats")
            .id()
            .field("game_id", .uuid, .required, .references("games", "id", onDelete: .cascade))
            .field("player_id", .uuid, .required, .references("players", "id", onDelete: .cascade))
            .field("inning", .int, .required)
            .field("is_top", .bool, .required)
            .field("at_bat_number_in_game", .int, .required)
            .field("result", .string, .required)
            .field("rbi", .int, .required, .sql(.default(0)))
            .field("runner_scored", .bool, .required, .sql(.default(false)))
            .field("pitch_count", .int)
            .field("stolen_bases", .int, .required, .sql(.default(0)))
            .field("caught_stealing", .int, .required, .sql(.default(0)))
            .field("notes", .string)
            .field("created_at", .datetime)
            .create()
    }

    func revert(on database: Database) async throws {
        try await database.schema("at_bats").delete()
    }
}
