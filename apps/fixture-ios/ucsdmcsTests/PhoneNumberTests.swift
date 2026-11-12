import Testing
@testable import ucsdmcs

struct PhoneNumberTests {

    @Test func tenDigitsBecomeUSE164() {
        #expect(PhoneNumber.e164(from: "(415) 555-0100") == "+14155550100")
        #expect(PhoneNumber.e164(from: "4155550100") == "+14155550100")
    }

    @Test func elevenDigitsWithLeadingOneAreAccepted() {
        #expect(PhoneNumber.e164(from: "1 415 555 0100") == "+14155550100")
        #expect(PhoneNumber.e164(from: "+14155550100") == "+14155550100")
    }

    @Test func otherLengthsAreRejected() {
        #expect(PhoneNumber.e164(from: "555-0100") == nil)
        #expect(PhoneNumber.e164(from: "24155550100") == nil)
        #expect(PhoneNumber.e164(from: "") == nil)
    }

    @Test func displaysStoredUSNumber() {
        #expect(PhoneNumber.display("14155550100") == "(415) 555-0100")
        #expect(PhoneNumber.display("+14155550100") == "(415) 555-0100")
    }

    @Test func displaysOtherNumbersWithPlus() {
        #expect(PhoneNumber.display("447700900123") == "+447700900123")
    }
}
