import XCTest
@testable import App

final class BattingStatsTests: XCTestCase {

    // MARK: - Known Stat Line Tests

    /// Test a realistic batting line: 150 AB, 45 H, .300 AVG
    func testTypicalBattingLine() {
        let input = BattingStatsInput(
            atBats: 150,
            plateAppearances: 175,
            hits: 45,
            singles: 28,
            doubles: 10,
            triples: 2,
            homeRuns: 5,
            walks: 20,
            hitByPitch: 3,
            strikeouts: 35,
            sacrificeFlies: 2,
            sacrificeBunts: 0,
            stolenBases: 8,
            caughtStealing: 3,
            gidp: 4,
            runs: 30,
            rbi: 25,
            games: 40
        )

        let output = BattingStatsCalculator.calculate(input)

        // AVG = 45 / 150 = .300
        XCTAssertEqual(output.avg!, 0.300, accuracy: 0.001)

        // TB = 28 + 2*10 + 3*2 + 4*5 = 28 + 20 + 6 + 20 = 74
        XCTAssertEqual(output.tb, 74)

        // SLG = 74 / 150 = .493
        XCTAssertEqual(output.slg!, 74.0 / 150.0, accuracy: 0.001)

        // OBP = (45 + 20 + 3) / (150 + 20 + 3 + 2) = 68 / 175 = .389
        XCTAssertEqual(output.obp!, 68.0 / 175.0, accuracy: 0.001)

        // OPS = OBP + SLG
        XCTAssertEqual(output.ops!, output.obp! + output.slg!, accuracy: 0.001)

        // ISO = SLG - AVG
        XCTAssertEqual(output.iso!, output.slg! - output.avg!, accuracy: 0.001)

        // K% = 35 / 175 = .200
        XCTAssertEqual(output.kPercent!, 35.0 / 175.0, accuracy: 0.001)

        // BB% = 20 / 175 = .114
        XCTAssertEqual(output.bbPercent!, 20.0 / 175.0, accuracy: 0.001)

        // SB% = 8 / (8 + 3) = .727
        XCTAssertEqual(output.sbPercent!, 8.0 / 11.0, accuracy: 0.001)

        // Display format: .300
        XCTAssertEqual(output.avgDisplay, ".300")

        // Counting stats
        XCTAssertEqual(output.games, 40)
        XCTAssertEqual(output.pa, 175)
        XCTAssertEqual(output.hr, 5)
        XCTAssertEqual(output.rbi, 25)
        XCTAssertEqual(output.r, 30)
    }

    /// Test BABIP calculation
    func testBABIP() {
        let input = BattingStatsInput(
            atBats: 100,
            plateAppearances: 110,
            hits: 30,
            singles: 20,
            doubles: 5,
            triples: 2,
            homeRuns: 3,
            walks: 8,
            hitByPitch: 1,
            strikeouts: 25,
            sacrificeFlies: 1,
            sacrificeBunts: 0,
            stolenBases: 0,
            caughtStealing: 0,
            gidp: 0,
            runs: 15,
            rbi: 12,
            games: 25
        )

        let output = BattingStatsCalculator.calculate(input)

        // BABIP = (H - HR) / (AB - K - HR + SF)
        // = (30 - 3) / (100 - 25 - 3 + 1) = 27 / 73 = .370
        XCTAssertEqual(output.babip!, 27.0 / 73.0, accuracy: 0.001)
    }

    // MARK: - Division by Zero

    /// 0 at-bats should return nil for AVG, SLG
    func testZeroAtBats() {
        let input = BattingStatsInput(
            atBats: 0,
            plateAppearances: 2,
            hits: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            walks: 2,
            hitByPitch: 0,
            strikeouts: 0,
            sacrificeFlies: 0,
            sacrificeBunts: 0,
            stolenBases: 0,
            caughtStealing: 0,
            gidp: 0,
            runs: 0,
            rbi: 0,
            games: 1
        )

        let output = BattingStatsCalculator.calculate(input)

        XCTAssertNil(output.avg)
        XCTAssertNil(output.slg)
        XCTAssertNil(output.iso)
        XCTAssertEqual(output.avgDisplay, "---")
        XCTAssertEqual(output.slgDisplay, "---")

        // OBP should still be calculable: (0 + 2 + 0) / (0 + 2 + 0 + 0) = 1.000
        XCTAssertEqual(output.obp!, 1.0, accuracy: 0.001)
    }

    /// 0 plate appearances should return nil for everything
    func testZeroPlateAppearances() {
        let input = BattingStatsInput(
            atBats: 0,
            plateAppearances: 0,
            hits: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            walks: 0,
            hitByPitch: 0,
            strikeouts: 0,
            sacrificeFlies: 0,
            sacrificeBunts: 0,
            stolenBases: 0,
            caughtStealing: 0,
            gidp: 0,
            runs: 0,
            rbi: 0,
            games: 0
        )

        let output = BattingStatsCalculator.calculate(input)

        XCTAssertNil(output.avg)
        XCTAssertNil(output.obp)
        XCTAssertNil(output.slg)
        XCTAssertNil(output.ops)
        XCTAssertNil(output.kPercent)
        XCTAssertNil(output.bbPercent)
        XCTAssertNil(output.sbPercent)
    }

    // MARK: - Display Formatting

    /// Verify leading zero stripped: 0.345 -> .345
    func testDisplayFormatStripsLeadingZero() {
        let input = BattingStatsInput(
            atBats: 100,
            plateAppearances: 100,
            hits: 35,
            singles: 35,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            walks: 0,
            hitByPitch: 0,
            strikeouts: 0,
            sacrificeFlies: 0,
            sacrificeBunts: 0,
            stolenBases: 0,
            caughtStealing: 0,
            gidp: 0,
            runs: 0,
            rbi: 0,
            games: 20
        )

        let output = BattingStatsCalculator.calculate(input)
        XCTAssertEqual(output.avgDisplay, ".350")
    }

    /// Perfect 1.000 OBP should display as 1.000 (no strip)
    func testPerfectOBP() {
        let input = BattingStatsInput(
            atBats: 0,
            plateAppearances: 5,
            hits: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            walks: 5,
            hitByPitch: 0,
            strikeouts: 0,
            sacrificeFlies: 0,
            sacrificeBunts: 0,
            stolenBases: 0,
            caughtStealing: 0,
            gidp: 0,
            runs: 0,
            rbi: 0,
            games: 1
        )

        let output = BattingStatsCalculator.calculate(input)
        XCTAssertEqual(output.obpDisplay, "1.000")
    }

    // MARK: - Total Bases

    func testTotalBasesCalculation() {
        let input = BattingStatsInput(
            atBats: 50,
            plateAppearances: 55,
            hits: 20,
            singles: 10,  // 10 * 1 = 10
            doubles: 5,   // 5 * 2 = 10
            triples: 2,   // 2 * 3 = 6
            homeRuns: 3,   // 3 * 4 = 12
            walks: 3,
            hitByPitch: 1,
            strikeouts: 10,
            sacrificeFlies: 1,
            sacrificeBunts: 0,
            stolenBases: 0,
            caughtStealing: 0,
            gidp: 0,
            runs: 0,
            rbi: 0,
            games: 10
        )

        let output = BattingStatsCalculator.calculate(input)
        // TB = 10 + 10 + 6 + 12 = 38
        XCTAssertEqual(output.tb, 38)
    }
}
