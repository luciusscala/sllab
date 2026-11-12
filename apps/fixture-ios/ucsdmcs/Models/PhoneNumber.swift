import Foundation

/// US numbers only at launch. The database stores digits with the country
/// code (`14155550100`), Supabase Auth wants E.164 (`+14155550100`), and a
/// person wants to read `(415) 555-0100`.
enum PhoneNumber {
    /// E.164 for ten digits, or eleven starting with 1; nil otherwise.
    static func e164(from raw: String) -> String? {
        let digits = raw.filter(\.isNumber)
        if digits.count == 10 { return "+1\(digits)" }
        if digits.count == 11, digits.hasPrefix("1") { return "+\(digits)" }
        return nil
    }

    /// `(415) 555-0100` for a stored US number; anything else with a plus.
    static func display(_ stored: String) -> String {
        let digits = stored.filter(\.isNumber)
        guard digits.count == 11, digits.hasPrefix("1") else { return "+\(digits)" }
        let area = digits.dropFirst().prefix(3)
        let exchange = digits.dropFirst(4).prefix(3)
        let line = digits.suffix(4)
        return "(\(area)) \(exchange)-\(line)"
    }
}
