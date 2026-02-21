import XCTest
@testable import wishliste

final class PasswordValidatorTests: XCTestCase {

    func testEmptyPassword() {
        let r = PasswordValidator.validate("")
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.errors.contains("Минимум 8 символов"))
    }

    func testTooShort() {
        let r = PasswordValidator.validate("Ab1!")
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.errors.contains { $0.contains("8 символов") })
    }

    func testNoUppercase() {
        let r = PasswordValidator.validate("password123!")
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.errors.contains { $0.contains("заглавная") })
    }

    func testNoLowercase() {
        let r = PasswordValidator.validate("PASSWORD123!")
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.errors.contains { $0.contains("строчная") })
    }

    func testNoDigit() {
        let r = PasswordValidator.validate("Password!")
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.errors.contains { $0.contains("цифра") })
    }

    func testNoSpecialChar() {
        let r = PasswordValidator.validate("Password123")
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.errors.contains { $0.contains("спецсимвол") })
    }

    func testValidPassword() {
        let r = PasswordValidator.validate("Password1!")
        XCTAssertTrue(r.isValid)
        XCTAssertTrue(r.errors.isEmpty)
    }

    func testValidWithDifferentSpecialChars() {
        XCTAssertTrue(PasswordValidator.isValid("Abcdef1@"))
        XCTAssertTrue(PasswordValidator.isValid("Test123#"))
        XCTAssertTrue(PasswordValidator.isValid("MyPwd99!"))
    }

    func testTooLong() {
        let long = String(repeating: "a", count: 200)
        let r = PasswordValidator.validate("A" + long + "1!")
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.errors.contains { $0.contains("Максимум") })
    }

    func testIsValidHelper() {
        XCTAssertFalse(PasswordValidator.isValid("short"))
        XCTAssertTrue(PasswordValidator.isValid("ValidPass1!"))
    }
}
