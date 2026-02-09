import Vapor

struct TeamStatsInput {
    let wins: Int
    let losses: Int
    let ties: Int
    let runsScored: Int
    let runsAllowed: Int
    let gamesPlayed: Int
}

struct TeamStatsOutput: Content {
    let wins: Int
    let losses: Int
    let ties: Int
    let gamesPlayed: Int
    let runsScored: Int
    let runsAllowed: Int
    let runDifferential: Int
    let winPercent: Double?
    let pythagoreanWinPercent: Double?
    let runsPerGame: Double?
    let runsAllowedPerGame: Double?
    let record: String   // "12-5-0"
}

struct TeamStatsCalculator {

    static func calculate(_ input: TeamStatsInput) -> TeamStatsOutput {
        let runDiff = input.runsScored - input.runsAllowed

        // W% = W / (W + L)
        let winPct = safeDivide(Double(input.wins), Double(input.wins + input.losses))

        // Pythagorean W% = RS^1.83 / (RS^1.83 + RA^1.83)
        let rs = Double(input.runsScored)
        let ra = Double(input.runsAllowed)
        let pythWinPct: Double?
        if rs + ra > 0 {
            let rsExp = pow(rs, 1.83)
            let raExp = pow(ra, 1.83)
            pythWinPct = safeDivide(rsExp, rsExp + raExp)
        } else {
            pythWinPct = nil
        }

        let rpg = safeDivide(Double(input.runsScored), Double(input.gamesPlayed))
        let rapg = safeDivide(Double(input.runsAllowed), Double(input.gamesPlayed))

        let record: String
        if input.ties > 0 {
            record = "\(input.wins)-\(input.losses)-\(input.ties)"
        } else {
            record = "\(input.wins)-\(input.losses)"
        }

        return TeamStatsOutput(
            wins: input.wins,
            losses: input.losses,
            ties: input.ties,
            gamesPlayed: input.gamesPlayed,
            runsScored: input.runsScored,
            runsAllowed: input.runsAllowed,
            runDifferential: runDiff,
            winPercent: winPct,
            pythagoreanWinPercent: pythWinPct,
            runsPerGame: rpg,
            runsAllowedPerGame: rapg,
            record: record
        )
    }
}
