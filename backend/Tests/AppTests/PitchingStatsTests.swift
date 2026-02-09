import XCTest
@testable import App

final class PitchingStatsTests: XCTestCase {

    // MARK: - Known Pitching Lines

    /// Test a typical starting pitcher: 6 IP, 3 ER, 6 K
    func testTypicalStarterLine() {
        let input = PitchingStatsInput(
            outsRecorded: 18,       // 6.0 IP
            hitsAllowed: 5,
            runsAllowed: 4,
            earnedRuns: 3,
            walks: 2,
            strikeouts: 6,
            homeRunsAllowed: 1,
            hitBatters: 0,
            pitchesThrown: 95,
            strikesThrown: 62,
            wins: 1,
            losses: 0,
            saves: 0,
            holds: 0,
            games: 1,
            gamesStarted: 1,
            gameInnings: 9          // baseball
        )

        let output = PitchingStatsCalculator.calculate(input)

        // ERA = (3 * 9) / 6.0 = 4.50
        XCTAssertEqual(output.era!, 4.50, accuracy: 0.01)

        // WHIP = (2 + 5) / 6.0 = 1.17
        XCTAssertEqual(output.whip!, 7.0 / 6.0, accuracy: 0.01)

        // K/9 = (6 * 9) / 6.0 = 9.00
        XCTAssertEqual(output.kPer9!, 9.0, accuracy: 0.01)

        // BB/9 = (2 * 9) / 6.0 = 3.00
        XCTAssertEqual(output.bbPer9!, 3.0, accuracy: 0.01)

        // K/BB = 6 / 2 = 3.00
        XCTAssertEqual(output.kPerBB!, 3.0, accuracy: 0.01)

        // IP Display
        XCTAssertEqual(output.ipDisplay, "6.0")

        // Strike%
        XCTAssertEqual(output.strikePercent!, 62.0 / 95.0, accuracy: 0.01)

        // Counting
        XCTAssertEqual(output.games, 1)
        XCTAssertEqual(output.gamesStarted, 1)
        XCTAssertEqual(output.wins, 1)
        XCTAssertEqual(output.er, 3)
    }

    /// Test softball ERA uses x7 multiplier
    func testSoftballERA() {
        let input = PitchingStatsInput(
            outsRecorded: 21,       // 7.0 IP (complete game)
            hitsAllowed: 6,
            runsAllowed: 3,
            earnedRuns: 2,
            walks: 1,
            strikeouts: 8,
            homeRunsAllowed: 0,
            hitBatters: 1,
            pitchesThrown: nil,
            strikesThrown: nil,
            wins: 1,
            losses: 0,
            saves: 0,
            holds: 0,
            games: 1,
            gamesStarted: 1,
            gameInnings: 7          // softball
        )

        let output = PitchingStatsCalculator.calculate(input)

        // ERA = (2 * 7) / 7.0 = 2.00
        XCTAssertEqual(output.era!, 2.00, accuracy: 0.01)

        // Pitches/strikes should be nil
        XCTAssertNil(output.pitches)
        XCTAssertNil(output.strikes)
        XCTAssertNil(output.strikePercent)
    }

    // MARK: - IP Display Notation

    /// 16 outs = 5.1 (5 and 1/3)
    func testIPDisplay_5_1() {
        let input = makePitchingInput(outsRecorded: 16)
        let output = PitchingStatsCalculator.calculate(input)
        XCTAssertEqual(output.ipDisplay, "5.1")
    }

    /// 17 outs = 5.2 (5 and 2/3)
    func testIPDisplay_5_2() {
        let input = makePitchingInput(outsRecorded: 17)
        let output = PitchingStatsCalculator.calculate(input)
        XCTAssertEqual(output.ipDisplay, "5.2")
    }

    /// 18 outs = 6.0
    func testIPDisplay_6_0() {
        let input = makePitchingInput(outsRecorded: 18)
        let output = PitchingStatsCalculator.calculate(input)
        XCTAssertEqual(output.ipDisplay, "6.0")
    }

    /// 1 out = 0.1
    func testIPDisplay_0_1() {
        let input = makePitchingInput(outsRecorded: 1)
        let output = PitchingStatsCalculator.calculate(input)
        XCTAssertEqual(output.ipDisplay, "0.1")
    }

    /// 0 outs = 0.0
    func testIPDisplay_0_0() {
        let input = makePitchingInput(outsRecorded: 0)
        let output = PitchingStatsCalculator.calculate(input)
        XCTAssertEqual(output.ipDisplay, "0.0")
    }

    // MARK: - Division by Zero

    /// 0 IP = nil ERA, nil WHIP
    func testZeroInningsPitched() {
        let input = PitchingStatsInput(
            outsRecorded: 0,
            hitsAllowed: 3,
            runsAllowed: 5,
            earnedRuns: 4,
            walks: 2,
            strikeouts: 0,
            homeRunsAllowed: 1,
            hitBatters: 0,
            pitchesThrown: 12,
            strikesThrown: 5,
            wins: 0,
            losses: 1,
            saves: 0,
            holds: 0,
            games: 1,
            gamesStarted: 0,
            gameInnings: 9
        )

        let output = PitchingStatsCalculator.calculate(input)

        XCTAssertNil(output.era)
        XCTAssertNil(output.whip)
        XCTAssertNil(output.kPer9)
        XCTAssertNil(output.bbPer9)
        XCTAssertNil(output.fip)
        XCTAssertEqual(output.eraDisplay, "---")
        XCTAssertEqual(output.whipDisplay, "---")
    }

    /// 0 walks = nil K/BB
    func testZeroWalks() {
        let input = PitchingStatsInput(
            outsRecorded: 9,         // 3.0 IP
            hitsAllowed: 2,
            runsAllowed: 0,
            earnedRuns: 0,
            walks: 0,
            strikeouts: 5,
            homeRunsAllowed: 0,
            hitBatters: 0,
            pitchesThrown: nil,
            strikesThrown: nil,
            wins: 0,
            losses: 0,
            saves: 1,
            holds: 0,
            games: 1,
            gamesStarted: 0,
            gameInnings: 9
        )

        let output = PitchingStatsCalculator.calculate(input)

        XCTAssertNil(output.kPerBB)
        // ERA should still work: (0 * 9) / 3.0 = 0.00
        XCTAssertEqual(output.era!, 0.0, accuracy: 0.01)
        XCTAssertEqual(output.eraDisplay, "0.00")
    }

    // MARK: - FIP

    func testFIPCalculation() {
        let input = PitchingStatsInput(
            outsRecorded: 18,       // 6.0 IP
            hitsAllowed: 5,
            runsAllowed: 3,
            earnedRuns: 2,
            walks: 2,
            strikeouts: 7,
            homeRunsAllowed: 1,
            hitBatters: 1,
            pitchesThrown: nil,
            strikesThrown: nil,
            wins: 0,
            losses: 0,
            saves: 0,
            holds: 0,
            games: 1,
            gamesStarted: 1,
            gameInnings: 9
        )

        let output = PitchingStatsCalculator.calculate(input)

        // FIP = ((13*1) + (3*(2+1)) - (2*7)) / 6.0 + 3.10
        // = (13 + 9 - 14) / 6.0 + 3.10
        // = 8 / 6.0 + 3.10 = 1.333 + 3.10 = 4.433
        XCTAssertEqual(output.fip!, 4.433, accuracy: 0.01)
    }

    // MARK: - Win Percentage

    func testWinPercentage() {
        let input = PitchingStatsInput(
            outsRecorded: 180,
            hitsAllowed: 50,
            runsAllowed: 25,
            earnedRuns: 20,
            walks: 15,
            strikeouts: 60,
            homeRunsAllowed: 5,
            hitBatters: 3,
            pitchesThrown: nil,
            strikesThrown: nil,
            wins: 8,
            losses: 4,
            saves: 0,
            holds: 0,
            games: 15,
            gamesStarted: 12,
            gameInnings: 9
        )

        let output = PitchingStatsCalculator.calculate(input)

        // W% = 8 / (8 + 4) = .667
        XCTAssertEqual(output.winPercent!, 8.0 / 12.0, accuracy: 0.001)
    }

    // MARK: - Helper

    private func makePitchingInput(outsRecorded: Int) -> PitchingStatsInput {
        PitchingStatsInput(
            outsRecorded: outsRecorded,
            hitsAllowed: 3,
            runsAllowed: 1,
            earnedRuns: 1,
            walks: 1,
            strikeouts: 4,
            homeRunsAllowed: 0,
            hitBatters: 0,
            pitchesThrown: nil,
            strikesThrown: nil,
            wins: 0,
            losses: 0,
            saves: 0,
            holds: 0,
            games: 1,
            gamesStarted: 1,
            gameInnings: 9
        )
    }
}
