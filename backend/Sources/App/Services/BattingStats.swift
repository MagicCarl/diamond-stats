import Vapor

// MARK: - Input

struct BattingStatsInput {
    let atBats: Int
    let plateAppearances: Int
    let hits: Int
    let singles: Int
    let doubles: Int
    let triples: Int
    let homeRuns: Int
    let walks: Int
    let hitByPitch: Int
    let strikeouts: Int
    let sacrificeFlies: Int
    let sacrificeBunts: Int
    let stolenBases: Int
    let caughtStealing: Int
    let gidp: Int
    let runs: Int
    let rbi: Int
    let games: Int
}

// MARK: - Output

struct BattingStatsOutput: Content {
    // Counting stats
    let games: Int
    let pa: Int
    let ab: Int
    let h: Int
    let singles: Int
    let doubles: Int
    let triples: Int
    let hr: Int
    let rbi: Int
    let r: Int
    let bb: Int
    let k: Int
    let hbp: Int
    let sb: Int
    let cs: Int
    let tb: Int

    // Rate stats (nil when denominator is 0)
    let avg: Double?
    let obp: Double?
    let slg: Double?
    let ops: Double?
    let iso: Double?
    let babip: Double?
    let kPercent: Double?
    let bbPercent: Double?
    let sbPercent: Double?

    // Display-formatted strings
    let avgDisplay: String
    let obpDisplay: String
    let slgDisplay: String
    let opsDisplay: String
}

// MARK: - Calculator

struct BattingStatsCalculator {

    static func calculate(_ input: BattingStatsInput) -> BattingStatsOutput {
        let tb = input.singles + (2 * input.doubles) + (3 * input.triples) + (4 * input.homeRuns)

        // AVG = H / AB
        let avg = safeDivide(Double(input.hits), Double(input.atBats))

        // OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
        let obpNum = Double(input.hits + input.walks + input.hitByPitch)
        let obpDen = Double(input.atBats + input.walks + input.hitByPitch + input.sacrificeFlies)
        let obp = safeDivide(obpNum, obpDen)

        // SLG = TB / AB
        let slg = safeDivide(Double(tb), Double(input.atBats))

        // OPS = OBP + SLG
        let ops: Double? = (obp != nil && slg != nil) ? obp! + slg! : nil

        // ISO = SLG - AVG
        let iso: Double? = (slg != nil && avg != nil) ? slg! - avg! : nil

        // BABIP = (H - HR) / (AB - K - HR + SF)
        let babipNum = Double(input.hits - input.homeRuns)
        let babipDen = Double(input.atBats - input.strikeouts - input.homeRuns + input.sacrificeFlies)
        let babip = safeDivide(babipNum, babipDen)

        // K% = K / PA
        let kPercent = safeDivide(Double(input.strikeouts), Double(input.plateAppearances))

        // BB% = BB / PA
        let bbPercent = safeDivide(Double(input.walks), Double(input.plateAppearances))

        // SB% = SB / (SB + CS)
        let sbPercent = safeDivide(Double(input.stolenBases), Double(input.stolenBases + input.caughtStealing))

        return BattingStatsOutput(
            games: input.games,
            pa: input.plateAppearances,
            ab: input.atBats,
            h: input.hits,
            singles: input.singles,
            doubles: input.doubles,
            triples: input.triples,
            hr: input.homeRuns,
            rbi: input.rbi,
            r: input.runs,
            bb: input.walks,
            k: input.strikeouts,
            hbp: input.hitByPitch,
            sb: input.stolenBases,
            cs: input.caughtStealing,
            tb: tb,
            avg: avg,
            obp: obp,
            slg: slg,
            ops: ops,
            iso: iso,
            babip: babip,
            kPercent: kPercent,
            bbPercent: bbPercent,
            sbPercent: sbPercent,
            avgDisplay: formatAvg(avg),
            obpDisplay: formatAvg(obp),
            slgDisplay: formatAvg(slg),
            opsDisplay: formatAvg(ops)
        )
    }

    /// Format batting average style: .345 (3 decimals, leading dot)
    private static func formatAvg(_ value: Double?) -> String {
        guard let value else { return "---" }
        let formatted = String(format: "%.3f", value)
        // Remove leading zero: "0.345" -> ".345"
        if formatted.hasPrefix("0.") {
            return String(formatted.dropFirst())
        }
        return formatted
    }
}
