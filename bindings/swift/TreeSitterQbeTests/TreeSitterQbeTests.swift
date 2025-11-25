import XCTest
import SwiftTreeSitter
import TreeSitterQbe

final class TreeSitterQbeTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_qbe())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading QBE grammar")
    }
}
