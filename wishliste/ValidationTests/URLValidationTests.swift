import XCTest
@testable import wishliste

final class URLValidationTests: XCTestCase {

    func testEmptyString() {
        let r = URLValidation.validateURL("")
        XCTAssertTrue(r.isValid)
        XCTAssertNil(r.normalized)
        XCTAssertNil(r.error)
    }

    func testWhitespaceOnly() {
        let r = URLValidation.validateURL("   ")
        XCTAssertTrue(r.isValid)
        XCTAssertNil(r.normalized)
    }

    func testValidHttps() {
        let r = URLValidation.validateURL("https://example.com")
        XCTAssertTrue(r.isValid)
        XCTAssertEqual(r.normalized, "https://example.com")
    }

    func testValidHttp() {
        let r = URLValidation.validateURL("http://test.ru")
        XCTAssertTrue(r.isValid)
        XCTAssertEqual(r.normalized, "http://test.ru")
    }

    func testAddsHttpsPrefix() {
        let r = URLValidation.validateURL("example.com")
        XCTAssertTrue(r.isValid)
        XCTAssertEqual(r.normalized, "https://example.com")
    }

    func testAddsHttpsToWww() {
        let r = URLValidation.validateURL("www.ozon.ru")
        XCTAssertTrue(r.isValid)
        XCTAssertEqual(r.normalized, "https://www.ozon.ru")
    }

    func testInvalidNoHost() {
        let r = URLValidation.validateURL("https://")
        XCTAssertFalse(r.isValid)
        XCTAssertNotNil(r.error)
    }

    func testInvalidScheme() {
        let r = URLValidation.validateURL("ftp://example.com")
        XCTAssertFalse(r.isValid)
    }

    func testInvalidFormat() {
        let r = URLValidation.validateURL("not a url at all")
        XCTAssertFalse(r.isValid)
    }

    func testTrimsWhitespace() {
        let r = URLValidation.validateURL("  https://x1k.ru  ")
        XCTAssertTrue(r.isValid)
        XCTAssertEqual(r.normalized, "https://x1k.ru")
    }

    func testTooLong() {
        let long = "https://" + String(repeating: "a", count: 3000)
        let r = URLValidation.validateURL(long)
        XCTAssertFalse(r.isValid)
        XCTAssertTrue(r.error?.contains("длинная") ?? false)
    }

    func testSafeUsername() {
        XCTAssertEqual(URLValidation.safeUsername("user_123"), "user_123")
        XCTAssertEqual(URLValidation.safeUsername("Test-User"), "Test-User")
        XCTAssertNil(URLValidation.safeUsername(""))
        XCTAssertNil(URLValidation.safeUsername("a"))
        XCTAssertNil(URLValidation.safeUsername("user@name"))
    }

    func testSafeShareToken() {
        XCTAssertNotNil(URLValidation.safeShareToken("abc123"))
        XCTAssertNil(URLValidation.safeShareToken(""))
    }

    func testSafeURL() {
        XCTAssertEqual(URLValidation.safeURL("https://ok.ru"), "https://ok.ru")
        XCTAssertEqual(URLValidation.safeURL("wildberries.ru"), "https://wildberries.ru")
        XCTAssertNil(URLValidation.safeURL("!!!"))
    }
}
