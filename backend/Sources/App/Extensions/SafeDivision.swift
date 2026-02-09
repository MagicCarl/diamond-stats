import Foundation

/// Safe division that returns nil when denominator is zero
func safeDivide(_ numerator: Double, _ denominator: Double) -> Double? {
    guard denominator > 0 else { return nil }
    return numerator / denominator
}

/// Format outs recorded as traditional IP notation
/// 16 outs -> "5.1", 17 outs -> "5.2", 18 outs -> "6.0"
func formatIP(outsRecorded: Int) -> String {
    let fullInnings = outsRecorded / 3
    let remainder = outsRecorded % 3
    return "\(fullInnings).\(remainder)"
}

/// Convert outs to decimal innings for calculations
func inningsFromOuts(_ outs: Int) -> Double {
    Double(outs) / 3.0
}
