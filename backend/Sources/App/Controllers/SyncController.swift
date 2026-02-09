import Vapor
import Fluent

/// Handles batch sync of offline operations.
/// The frontend queues writes in IndexedDB when offline,
/// then replays them here when connectivity returns.
struct SyncController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        routes.post(use: syncBatch)
    }

    // MARK: - Batch Sync

    enum SyncOperationType: String, Codable {
        case createGame = "create_game"
        case updateGame = "update_game"
        case setLineup = "set_lineup"
        case recordAtBat = "record_at_bat"
        case undoAtBat = "undo_at_bat"
        case addPitching = "add_pitching"
        case updatePitching = "update_pitching"
    }

    struct SyncOperation: Content {
        let id: String                          // Client-generated operation ID for idempotency
        let type: SyncOperationType
        let timestamp: Date
        let payload: AnyCodable                 // Type-specific data
    }

    struct SyncResult: Content {
        let operationId: String
        let success: Bool
        let error: String?
        let serverIds: [String: String]?        // Maps client temp IDs to server UUIDs
    }

    struct SyncBatchRequest: Content {
        let operations: [SyncOperation]
    }

    struct SyncBatchResponse: Content {
        let results: [SyncResult]
        let syncedAt: Date
    }

    func syncBatch(req: Request) async throws -> SyncBatchResponse {
        let batch = try req.content.decode(SyncBatchRequest.self)
        var results: [SyncResult] = []

        // Process operations in order (they were queued chronologically)
        for op in batch.operations.sorted(by: { $0.timestamp < $1.timestamp }) {
            let result = await processOperation(op, req: req)
            results.append(result)
        }

        return SyncBatchResponse(results: results, syncedAt: Date())
    }

    private func processOperation(_ op: SyncOperation, req: Request) async -> SyncResult {
        do {
            switch op.type {
            case .createGame:
                let data = try op.payload.decode(CreateGameSync.self)
                let game = Game(
                    teamID: data.teamId,
                    seasonID: data.seasonId,
                    opponentName: data.opponentName,
                    gameDate: data.gameDate,
                    isHome: data.isHome ?? true,
                    inningsCount: data.inningsCount ?? 9
                )
                try await game.save(on: req.db)
                return SyncResult(
                    operationId: op.id,
                    success: true,
                    error: nil,
                    serverIds: ["gameId": game.id!.uuidString]
                )

            case .updateGame:
                let data = try op.payload.decode(UpdateGameSync.self)
                guard let game = try await Game.find(data.gameId, on: req.db) else {
                    return SyncResult(operationId: op.id, success: false, error: "Game not found", serverIds: nil)
                }
                if let status = data.status { game.status = status }
                if let score = data.ourScore { game.ourScore = score }
                if let score = data.opponentScore { game.opponentScore = score }
                if let inn = data.currentInning { game.currentInning = inn }
                if let top = data.isTopOfInning { game.isTopOfInning = top }
                if let outs = data.outsInCurrentInning { game.outsInCurrentInning = outs }
                try await game.save(on: req.db)
                return SyncResult(operationId: op.id, success: true, error: nil, serverIds: nil)

            case .setLineup:
                let data = try op.payload.decode(SetLineupSync.self)
                try await LineupEntry.query(on: req.db)
                    .filter(\.$game.$id == data.gameId)
                    .delete()
                for entry in data.entries {
                    let le = LineupEntry(
                        gameID: data.gameId,
                        playerID: entry.playerId,
                        battingOrder: entry.battingOrder,
                        position: entry.position,
                        isStarter: entry.isStarter ?? true
                    )
                    try await le.save(on: req.db)
                }
                return SyncResult(operationId: op.id, success: true, error: nil, serverIds: nil)

            case .recordAtBat:
                let data = try op.payload.decode(RecordAtBatSync.self)
                let lastNum = try await AtBat.query(on: req.db)
                    .filter(\.$game.$id == data.gameId)
                    .sort(\.$atBatNumberInGame, .descending)
                    .first()?.atBatNumberInGame ?? 0

                let atBat = AtBat(
                    gameID: data.gameId,
                    playerID: data.playerId,
                    inning: data.inning,
                    isTop: data.isTop,
                    atBatNumber: lastNum + 1,
                    result: data.result,
                    rbi: data.rbi ?? 0,
                    runnerScored: data.runnerScored ?? false
                )
                if let sb = data.stolenBases { atBat.stolenBases = sb }
                if let cs = data.caughtStealing { atBat.caughtStealing = cs }
                try await atBat.save(on: req.db)
                return SyncResult(
                    operationId: op.id,
                    success: true,
                    error: nil,
                    serverIds: ["atBatId": atBat.id!.uuidString]
                )

            case .undoAtBat:
                let data = try op.payload.decode(UndoAtBatSync.self)
                if let atBat = try await AtBat.find(data.atBatId, on: req.db) {
                    try await atBat.delete(on: req.db)
                }
                return SyncResult(operationId: op.id, success: true, error: nil, serverIds: nil)

            case .addPitching:
                let data = try op.payload.decode(AddPitchingSync.self)
                let lastOrder = try await PitchingAppearance.query(on: req.db)
                    .filter(\.$game.$id == data.gameId)
                    .sort(\.$appearanceOrder, .descending)
                    .first()?.appearanceOrder ?? 0

                let appearance = PitchingAppearance(
                    gameID: data.gameId,
                    playerID: data.playerId,
                    appearanceOrder: data.appearanceOrder ?? (lastOrder + 1)
                )
                try await appearance.save(on: req.db)
                return SyncResult(
                    operationId: op.id,
                    success: true,
                    error: nil,
                    serverIds: ["pitchingId": appearance.id!.uuidString]
                )

            case .updatePitching:
                let data = try op.payload.decode(UpdatePitchingSync.self)
                guard let appearance = try await PitchingAppearance.find(data.pitchingId, on: req.db) else {
                    return SyncResult(operationId: op.id, success: false, error: "Pitching appearance not found", serverIds: nil)
                }
                if let v = data.outsRecorded { appearance.outsRecorded = v }
                if let v = data.hitsAllowed { appearance.hitsAllowed = v }
                if let v = data.runsAllowed { appearance.runsAllowed = v }
                if let v = data.earnedRuns { appearance.earnedRuns = v }
                if let v = data.walks { appearance.walks = v }
                if let v = data.strikeouts { appearance.strikeouts = v }
                if let v = data.homeRunsAllowed { appearance.homeRunsAllowed = v }
                if let v = data.pitchesThrown { appearance.pitchesThrown = v }
                if let v = data.strikesThrown { appearance.strikesThrown = v }
                if let v = data.hitBatters { appearance.hitBatters = v }
                try await appearance.save(on: req.db)
                return SyncResult(operationId: op.id, success: true, error: nil, serverIds: nil)
            }
        } catch {
            return SyncResult(operationId: op.id, success: false, error: error.localizedDescription, serverIds: nil)
        }
    }
}

// MARK: - Sync Payload Types

struct CreateGameSync: Codable {
    let teamId: UUID
    let seasonId: UUID?
    let opponentName: String
    let gameDate: Date
    let isHome: Bool?
    let inningsCount: Int?
}

struct UpdateGameSync: Codable {
    let gameId: UUID
    let status: GameStatus?
    let ourScore: Int?
    let opponentScore: Int?
    let currentInning: Int?
    let isTopOfInning: Bool?
    let outsInCurrentInning: Int?
}

struct SetLineupSync: Codable {
    let gameId: UUID
    let entries: [LineupEntrySync]
}

struct LineupEntrySync: Codable {
    let playerId: UUID
    let battingOrder: Int
    let position: String
    let isStarter: Bool?
}

struct RecordAtBatSync: Codable {
    let gameId: UUID
    let playerId: UUID
    let inning: Int
    let isTop: Bool
    let result: AtBatResult
    let rbi: Int?
    let runnerScored: Bool?
    let stolenBases: Int?
    let caughtStealing: Int?
}

struct UndoAtBatSync: Codable {
    let atBatId: UUID
}

struct AddPitchingSync: Codable {
    let gameId: UUID
    let playerId: UUID
    let appearanceOrder: Int?
}

struct UpdatePitchingSync: Codable {
    let pitchingId: UUID
    let outsRecorded: Int?
    let hitsAllowed: Int?
    let runsAllowed: Int?
    let earnedRuns: Int?
    let walks: Int?
    let strikeouts: Int?
    let homeRunsAllowed: Int?
    let pitchesThrown: Int?
    let strikesThrown: Int?
    let hitBatters: Int?
}

// MARK: - AnyCodable Helper

/// Type-erased Codable wrapper for heterogeneous sync payloads
struct AnyCodable: Codable {
    private let value: Any
    private let _encode: (Encoder) throws -> Void

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // Store raw JSON data for later decoding
        let data = try container.decode(JSONData.self)
        self.value = data
        self._encode = { encoder in
            var container = encoder.singleValueContainer()
            try container.encode(data)
        }
    }

    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }

    func decode<T: Decodable>(_ type: T.Type) throws -> T {
        guard let jsonData = value as? JSONData else {
            throw DecodingError.dataCorrupted(
                .init(codingPath: [], debugDescription: "Cannot decode payload")
            )
        }
        return try JSONDecoder().decode(T.self, from: jsonData.rawData)
    }
}

/// Stores raw JSON for deferred decoding
private struct JSONData: Codable {
    let rawData: Data

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        // Decode as dictionary, then re-encode to Data
        if let dict = try? container.decode([String: AnyCodableValue].self) {
            self.rawData = try JSONEncoder().encode(dict)
        } else if let arr = try? container.decode([AnyCodableValue].self) {
            self.rawData = try JSONEncoder().encode(arr)
        } else {
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Unsupported payload type")
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        let value = try JSONDecoder().decode(AnyCodableValue.self, from: rawData)
        try value.encode(to: encoder)
    }
}

/// Recursive type-erased JSON value
private enum AnyCodableValue: Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([AnyCodableValue])
    case dict([String: AnyCodableValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let v = try? container.decode(Bool.self) { self = .bool(v) }
        else if let v = try? container.decode(Int.self) { self = .int(v) }
        else if let v = try? container.decode(Double.self) { self = .double(v) }
        else if let v = try? container.decode(String.self) { self = .string(v) }
        else if let v = try? container.decode([AnyCodableValue].self) { self = .array(v) }
        else if let v = try? container.decode([String: AnyCodableValue].self) { self = .dict(v) }
        else if container.decodeNil() { self = .null }
        else {
            throw DecodingError.dataCorrupted(
                .init(codingPath: decoder.codingPath, debugDescription: "Unsupported value")
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let v): try container.encode(v)
        case .int(let v): try container.encode(v)
        case .double(let v): try container.encode(v)
        case .bool(let v): try container.encode(v)
        case .array(let v): try container.encode(v)
        case .dict(let v): try container.encode(v)
        case .null: try container.encodeNil()
        }
    }
}
