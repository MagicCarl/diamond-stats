import XCTest
@testable import App

final class TeamStatsTests: XCTestCase {

    func testWinningRecord() {
        let input = TeamStatsInput(
            wins: 12,
            losses: 5,
            ties: 0,
            runsScored: 85,
            runsAllowed: 52,
            gamesPlayed: 17
        )

        let output = TeamStatsCalculator.calculate(input)

        // W% = 12 / 17 = .706
        XCTAssertEqual(output.winPercent!, 12.0 / 17.0, accuracy: 0.001)

        // Run differential
        XCTAssertEqual(output.runDifferential, 33)

        // R/G = 85 / 17 = 5.0
        XCTAssertEqual(output.runsPerGame!, 5.0, accuracy: 0.01)

        // RA/G = 52 / 17 = 3.06
        XCTAssertEqual(output.runsAllowedPerGame!, 52.0 / 17.0, accuracy: 0.01)

        // Record
        XCTAssertEqual(output.record, "12-5")

        // Pythagorean should be non-nil
        XCTAssertNotNil(output.pythagoreanWinPercent)
    }

    func testRecordWithTies() {
        let input = TeamStatsInput(
            wins: 8,
            losses: 6,
            ties: 2,
            runsScored: 60,
            runsAllowed: 55,
            gamesPlayed: 16
        )

        let output = TeamStatsCalculator.calculate(input)

        // Record should include ties
        XCTAssertEqual(output.record, "8-6-2")
    }

    func testZeroGames() {
        let input = TeamStatsInput(
            wins: 0,
            losses: 0,
            ties: 0,
            runsScored: 0,
            runsAllowed: 0,
            gamesPlayed: 0
        )

        let output = TeamStatsCalculator.calculate(input)

        XCTAssertNil(output.winPercent)
        XCTAssertNil(output.pythagoreanWinPercent)
        XCTAssertNil(output.runsPerGame)
        XCTAssertNil(output.runsAllowedPerGame)
        XCTAssertEqual(output.runDifferential, 0)
        XCTAssertEqual(output.record, "0-0")
    }

    func testNegativeRunDifferential() {
        let input = TeamStatsInput(
            wins: 3,
            losses: 10,
            ties: 0,
            runsScored: 25,
            runsAllowed: 70,
            gamesPlayed: 13
        )

        let output = TeamStatsCalculator.calculate(input)

        XCTAssertEqual(output.runDifferential, -45)
    }

    func testPythagoreanWinPercent() {
        // Team scores 100 runs, allows 80
        // Pythag = 100^1.83 / (100^1.83 + 80^1.83)
        let input = TeamStatsInput(
            wins: 10,
            losses: 6,
            ties: 0,
            runsScored: 100,
            runsAllowed: 80,
            gamesPlayed: 16
        )

        let output = TeamStatsCalculator.calculate(input)

        // Pythagorean should be > .500 since RS > RA
        XCTAssertNotNil(output.pythagoreanWinPercent)
        XCTAssertGreaterThan(output.pythagoreanWinPercent!, 0.5)
        XCTAssertLessThan(output.pythagoreanWinPercent!, 1.0)
    }
}
