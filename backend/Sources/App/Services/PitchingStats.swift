import Vapor

// MARK: - Input

struct PitchingStatsInput {
    let outsRecorded: Int       // Stored as total outs, NOT IP notation
    let hitsAllowed: Int
    let runsAllowed: Int
    let earnedRuns: Int
    let walks: Int
    let strikeouts: Int
    let homeRunsAllowed: Int
    let hitBatters: Int
    let pitchesThrown: Int?
    let strikesThrown: Int?
    let wins: Int
    let losses: Int
    let saves: Int
    let holds: Int
    let games: Int
    let gamesStarted: Int
    let gameInnings: Int        // 9 for baseball, 7 for softball
}

// MARK: - Output

struct PitchingStatsOutput: Content {
    // Counting stats
    let games: Int
    let gamesStarted: Int
    let wins: Int
    let losses: Int
    let saves: Int
    let holds: Int
    let outsRecorded: Int
    let ipDisplay: String       // Traditional notation: "5.1"
    let h: Int
    let r: Int
    let er: Int
    let bb: Int
    let k: Int
    let hr: Int
    let hbp: Int
    let pitches: Int?
    let strikes: Int?

    // Rate stats (nil when denominator is 0)
    let era: Double?
    let whip: Double?
    let kPer9: Double?
    let bbPer9: Double?
    let hPer9: Double?
    let kPerBB: Double?
    let fip: Double?

    // Percentages
    let winPercent: Double?
    let strikePercent: Double?

    // Display
    let eraDisplay: String
    let whipDisplay: String
}

// MARK: - Calculator

struct PitchingStatsCalculator {

    static func calculate(_ input: PitchingStatsInput) -> PitchingStatsOutput {
        let ip = inningsFromOuts(input.outsRecorded)
        let gi = Double(input.gameInnings)

        // ERA = (ER × gameInnings) / IP
        let era = safeDivide(Double(input.earnedRuns) * gi, ip)

        // WHIP = (BB + H) / IP
        let whip = safeDivide(Double(input.walks + input.hitsAllowed), ip)

        // K/9 = (K × 9) / IP  (always per-9 even for softball display)
        let kPer9 = safeDivide(Double(input.strikeouts) * 9.0, ip)

        // BB/9 = (BB × 9) / IP
        let bbPer9 = safeDivide(Double(input.walks) * 9.0, ip)

        // H/9 = (H × 9) / IP
        let hPer9 = safeDivide(Double(input.hitsAllowed) * 9.0, ip)

        // K/BB = K / BB
        let kPerBB = safeDivide(Double(input.strikeouts), Double(input.walks))

        // FIP = ((13×HR) + (3×(BB+HBP)) - (2×K)) / IP + cFIP
        // Using approximate cFIP of 3.10 (league average constant)
        let fipNumerator = Double(13 * input.homeRunsAllowed + 3 * (input.walks + input.hitBatters) - 2 * input.strikeouts)
        let fipBase = safeDivide(fipNumerator, ip)
        let fip = fipBase.map { $0 + 3.10 }

        // W% = W / (W + L)
        let winPercent = safeDivide(Double(input.wins), Double(input.wins + input.losses))

        // Strike% = Strikes / Pitches
        let strikePercent: Double?
        if let strikes = input.strikesThrown, let pitches = input.pitchesThrown {
            strikePercent = safeDivide(Double(strikes), Double(pitches))
        } else {
            strikePercent = nil
        }

        return PitchingStatsOutput(
            games: input.games,
            gamesStarted: input.gamesStarted,
            wins: input.wins,
            losses: input.losses,
            saves: input.saves,
            holds: input.holds,
            outsRecorded: input.outsRecorded,
            ipDisplay: formatIP(outsRecorded: input.outsRecorded),
            h: input.hitsAllowed,
            r: input.runsAllowed,
            er: input.earnedRuns,
            bb: input.walks,
            k: input.strikeouts,
            hr: input.homeRunsAllowed,
            hbp: input.hitBatters,
            pitches: input.pitchesThrown,
            strikes: input.strikesThrown,
            era: era,
            whip: whip,
            kPer9: kPer9,
            bbPer9: bbPer9,
            hPer9: hPer9,
            kPerBB: kPerBB,
            fip: fip,
            winPercent: winPercent,
            strikePercent: strikePercent,
            eraDisplay: formatERA(era),
            whipDisplay: formatRate(whip)
        )
    }

    /// Format ERA: 2 decimal places (3.42)
    private static func formatERA(_ value: Double?) -> String {
        guard let value else { return "---" }
        return String(format: "%.2f", value)
    }

    /// Format rate stat: 2 decimal places (1.12)
    private static func formatRate(_ value: Double?) -> String {
        guard let value else { return "---" }
        return String(format: "%.2f", value)
    }
}
