var assert = require("assert");
var vim = require("./vim.js");

var passed = 0;
var failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log("  PASS " + name);
    } catch (e) {
        failed++;
        console.log("  FAIL " + name + ": " + e.message);
    }
}

function makeState(lines, row, col) {
    return { lines: lines, cursorRow: row, cursorCol: col };
}

// --- moveDown ---

console.log("\nmoveDown");

test("moves down one row", function () {
    assert.strictEqual(vim.moveDown(0, 5), 1);
});

test("stops at last row", function () {
    assert.strictEqual(vim.moveDown(4, 5), 4);
});

test("moves from middle", function () {
    assert.strictEqual(vim.moveDown(2, 5), 3);
});

// --- moveUp ---

console.log("\nmoveUp");

test("moves up one row", function () {
    assert.strictEqual(vim.moveUp(3), 2);
});

test("stops at row 0", function () {
    assert.strictEqual(vim.moveUp(0), 0);
});

// --- gotoLine ---

console.log("\ngotoLine");

test("goes to target line", function () {
    assert.strictEqual(vim.gotoLine(4, 10), 4);
});

test("clamps below 0", function () {
    assert.strictEqual(vim.gotoLine(-1, 10), 0);
});

test("clamps above last line", function () {
    assert.strictEqual(vim.gotoLine(15, 10), 9);
});

// --- gotoParagraphUp / gotoParagraphDown ---

console.log("\ngotoParagraphUp / gotoParagraphDown");

var PARA_LINES = [
    "first paragraph line one",
    "first paragraph line two",
    "",
    "second paragraph line one",
    "second paragraph line two",
    "",
    "third paragraph",
];

test("paragraph up from middle of second para lands on blank line", function () {
    assert.strictEqual(vim.gotoParagraphUp(4, PARA_LINES), 2);
});

test("paragraph up from first para stops at row 0", function () {
    assert.strictEqual(vim.gotoParagraphUp(1, PARA_LINES), 0);
});

test("paragraph down from middle of first para lands on blank line", function () {
    assert.strictEqual(vim.gotoParagraphDown(1, PARA_LINES), 2);
});

test("paragraph down from last para stops at last row", function () {
    assert.strictEqual(vim.gotoParagraphDown(6, PARA_LINES), 6);
});

// --- moveLeft / moveRight ---

console.log("\nmoveLeft / moveRight");

test("moves left", function () {
    assert.strictEqual(vim.moveLeft(3), 2);
});

test("stops at col 0", function () {
    assert.strictEqual(vim.moveLeft(0), 0);
});

test("moves right", function () {
    assert.strictEqual(vim.moveRight(2, 10), 3);
});

test("stops at last col", function () {
    assert.strictEqual(vim.moveRight(9, 10), 9);
});

// --- gotoLineStart / gotoLineEnd ---

console.log("\ngotoLineStart / gotoLineEnd");

test("line start is always 0", function () {
    assert.strictEqual(vim.gotoLineStart(), 0);
});

test("line end is last index", function () {
    assert.strictEqual(vim.gotoLineEnd(10), 9);
});

test("line end of length 1 is 0", function () {
    assert.strictEqual(vim.gotoLineEnd(1), 0);
});

test("line end of length 0 clamps to 0", function () {
    assert.strictEqual(vim.gotoLineEnd(0), 0);
});

// --- gotoNextWordStart ---

console.log("\ngotoNextWordStart");

var WORD_LINE = "hello world foo";

test("w from start of word jumps to next word", function () {
    assert.strictEqual(vim.gotoNextWordStart(0, WORD_LINE), 6);
});

test("w from middle of word jumps to next word", function () {
    assert.strictEqual(vim.gotoNextWordStart(2, WORD_LINE), 6);
});

test("w from last word stays put", function () {
    assert.strictEqual(vim.gotoNextWordStart(12, WORD_LINE), 14);
});

// --- gotoWordEnd ---

console.log("\ngotoWordEnd");

test("e from start of word goes to end of word", function () {
    assert.strictEqual(vim.gotoWordEnd(0, WORD_LINE), 4);
});

test("e from end of word jumps to end of next word", function () {
    assert.strictEqual(vim.gotoWordEnd(4, WORD_LINE), 10);
});

// --- gotoPrevWordStart ---

console.log("\ngotoPrevWordStart");

test("b from middle of word goes to start of word", function () {
    assert.strictEqual(vim.gotoPrevWordStart(8, WORD_LINE), 6);
});

test("b from start of word goes to start of previous word", function () {
    assert.strictEqual(vim.gotoPrevWordStart(6, WORD_LINE), 0);
});

test("b at col 0 stays at 0", function () {
    assert.strictEqual(vim.gotoPrevWordStart(0, WORD_LINE), 0);
});

// --- findCharForward / findCharBackward ---

console.log("\nfindCharForward / findCharBackward");

var FIND_LINE = "hello world";

test("f finds char forward", function () {
    assert.strictEqual(vim.findCharForward(0, FIND_LINE, "o"), 4);
});

test("f skips current position", function () {
    assert.strictEqual(vim.findCharForward(4, FIND_LINE, "o"), 7);
});

test("f returns same col when char not found", function () {
    assert.strictEqual(vim.findCharForward(0, FIND_LINE, "z"), 0);
});

test("F finds char backward", function () {
    assert.strictEqual(vim.findCharBackward(10, FIND_LINE, "o"), 7);
});

test("F returns same col when char not found", function () {
    assert.strictEqual(vim.findCharBackward(3, FIND_LINE, "z"), 3);
});

// --- tillCharForward / tillCharBackward ---

console.log("\ntillCharForward / tillCharBackward");

test("t stops one before found char", function () {
    assert.strictEqual(vim.tillCharForward(0, FIND_LINE, "o"), 3);
});

test("t returns same col when char not found", function () {
    assert.strictEqual(vim.tillCharForward(0, FIND_LINE, "z"), 0);
});

test("T stops one after found char (backward)", function () {
    assert.strictEqual(vim.tillCharBackward(10, FIND_LINE, "o"), 8);
});

test("T returns same col when char not found", function () {
    assert.strictEqual(vim.tillCharBackward(5, FIND_LINE, "z"), 5);
});

// --- parseCommand ---

console.log("\nparseCommand");

test("empty string is incomplete", function () {
    var cmd = vim.parseCommand("");
    assert.strictEqual(cmd.complete, false);
    assert.strictEqual(cmd.action, null);
});

test("j is down with count 1", function () {
    var cmd = vim.parseCommand("j");
    assert.strictEqual(cmd.complete, true);
    assert.strictEqual(cmd.action, "down");
    assert.strictEqual(cmd.count, 1);
});

test("3j is down with count 3", function () {
    var cmd = vim.parseCommand("3j");
    assert.strictEqual(cmd.complete, true);
    assert.strictEqual(cmd.action, "down");
    assert.strictEqual(cmd.count, 3);
});

test("k is up", function () {
    var cmd = vim.parseCommand("k");
    assert.strictEqual(cmd.action, "up");
    assert.strictEqual(cmd.count, 1);
});

test("h is left", function () {
    var cmd = vim.parseCommand("h");
    assert.strictEqual(cmd.action, "left");
});

test("l is right", function () {
    var cmd = vim.parseCommand("l");
    assert.strictEqual(cmd.action, "right");
});

test("w is word_next", function () {
    var cmd = vim.parseCommand("w");
    assert.strictEqual(cmd.action, "word_next");
});

test("5w is word_next with count 5", function () {
    var cmd = vim.parseCommand("5w");
    assert.strictEqual(cmd.action, "word_next");
    assert.strictEqual(cmd.count, 5);
});

test("e is word_end", function () {
    var cmd = vim.parseCommand("e");
    assert.strictEqual(cmd.action, "word_end");
});

test("b is word_prev", function () {
    var cmd = vim.parseCommand("b");
    assert.strictEqual(cmd.action, "word_prev");
});

test("$ is line_end", function () {
    var cmd = vim.parseCommand("$");
    assert.strictEqual(cmd.action, "line_end");
    assert.strictEqual(cmd.count, null);
});

test("0 is line_start", function () {
    var cmd = vim.parseCommand("0");
    assert.strictEqual(cmd.action, "line_start");
    assert.strictEqual(cmd.count, null);
});

test("gg is first line", function () {
    var cmd = vim.parseCommand("gg");
    assert.strictEqual(cmd.action, "first");
});

test("5gg is goto line 5", function () {
    var cmd = vim.parseCommand("5gg");
    assert.strictEqual(cmd.action, "goto");
    assert.strictEqual(cmd.count, 5);
});

test("G is last line", function () {
    var cmd = vim.parseCommand("G");
    assert.strictEqual(cmd.action, "last");
});

test("5G is goto line 5", function () {
    var cmd = vim.parseCommand("5G");
    assert.strictEqual(cmd.action, "goto");
    assert.strictEqual(cmd.count, 5);
});

test("g alone is incomplete", function () {
    var cmd = vim.parseCommand("g");
    assert.strictEqual(cmd.complete, false);
    assert.strictEqual(cmd.action, null);
});

test("{ is paragraph_up", function () {
    var cmd = vim.parseCommand("{");
    assert.strictEqual(cmd.action, "paragraph_up");
});

test("} is paragraph_down", function () {
    var cmd = vim.parseCommand("}");
    assert.strictEqual(cmd.action, "paragraph_down");
});

test("f alone is incomplete", function () {
    var cmd = vim.parseCommand("f");
    assert.strictEqual(cmd.complete, false);
});

test("fa is find_forward a", function () {
    var cmd = vim.parseCommand("fa");
    assert.strictEqual(cmd.action, "find_forward");
    assert.strictEqual(cmd.char, "a");
    assert.strictEqual(cmd.count, 1);
});

test("Fb is find_backward b", function () {
    var cmd = vim.parseCommand("Fb");
    assert.strictEqual(cmd.action, "find_backward");
    assert.strictEqual(cmd.char, "b");
});

test("tc is till_forward c", function () {
    var cmd = vim.parseCommand("tc");
    assert.strictEqual(cmd.action, "till_forward");
    assert.strictEqual(cmd.char, "c");
});

test("Td is till_backward d", function () {
    var cmd = vim.parseCommand("Td");
    assert.strictEqual(cmd.action, "till_backward");
    assert.strictEqual(cmd.char, "d");
});

test("2fo is find_forward o with count 2", function () {
    var cmd = vim.parseCommand("2fo");
    assert.strictEqual(cmd.action, "find_forward");
    assert.strictEqual(cmd.count, 2);
    assert.strictEqual(cmd.char, "o");
});

test("unrecognized key is invalid", function () {
    var cmd = vim.parseCommand("x");
    assert.strictEqual(cmd.action, "invalid");
});

// --- isWaitingForChar ---

console.log("\nisWaitingForChar");

test("empty string is not waiting", function () {
    assert.strictEqual(vim.isWaitingForChar(""), false);
});

test("f alone is waiting", function () {
    assert.strictEqual(vim.isWaitingForChar("f"), true);
});

test("F alone is waiting", function () {
    assert.strictEqual(vim.isWaitingForChar("F"), true);
});

test("t alone is waiting", function () {
    assert.strictEqual(vim.isWaitingForChar("t"), true);
});

test("T alone is waiting", function () {
    assert.strictEqual(vim.isWaitingForChar("T"), true);
});

test("j is not waiting", function () {
    assert.strictEqual(vim.isWaitingForChar("j"), false);
});

test("2f is waiting", function () {
    assert.strictEqual(vim.isWaitingForChar("2f"), true);
});

// --- executeCommand ---

console.log("\nexecuteCommand");

var EXEC_LINES = [
    "hello world",
    "foo bar baz",
    "",
    "last line here",
];

test("down moves cursor row", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "down", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 1);
});

test("down with count 2", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "down", count: 2 }, s);
    assert.strictEqual(s.cursorRow, 2);
});

test("down clamps at last row", function () {
    var s = makeState(EXEC_LINES, 3, 0);
    vim.executeCommand({ action: "down", count: 5 }, s);
    assert.strictEqual(s.cursorRow, 3);
});

test("up moves cursor row", function () {
    var s = makeState(EXEC_LINES, 2, 0);
    vim.executeCommand({ action: "up", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 1);
});

test("first goes to row 0", function () {
    var s = makeState(EXEC_LINES, 3, 0);
    vim.executeCommand({ action: "first", count: null }, s);
    assert.strictEqual(s.cursorRow, 0);
});

test("last goes to last row", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "last", count: null }, s);
    assert.strictEqual(s.cursorRow, 3);
});

test("goto goes to 1-indexed line", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "goto", count: 2 }, s);
    assert.strictEqual(s.cursorRow, 1);
});

test("right moves cursor col", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "right", count: 3 }, s);
    assert.strictEqual(s.cursorCol, 3);
});

test("left moves cursor col", function () {
    var s = makeState(EXEC_LINES, 0, 5);
    vim.executeCommand({ action: "left", count: 2 }, s);
    assert.strictEqual(s.cursorCol, 3);
});

test("line_start sets col to 0", function () {
    var s = makeState(EXEC_LINES, 0, 7);
    vim.executeCommand({ action: "line_start", count: null }, s);
    assert.strictEqual(s.cursorCol, 0);
});

test("line_end sets col to last char", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "line_end", count: null }, s);
    assert.strictEqual(s.cursorCol, 10);
});

test("word_next advances to next word", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "word_next", count: 1 }, s);
    assert.strictEqual(s.cursorCol, 6);
});

test("find_forward finds char on current line", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "find_forward", count: 1, char: "o" }, s);
    assert.strictEqual(s.cursorCol, 4);
});

test("till_forward stops one before char", function () {
    var s = makeState(EXEC_LINES, 0, 0);
    vim.executeCommand({ action: "till_forward", count: 1, char: "o" }, s);
    assert.strictEqual(s.cursorCol, 3);
});

// --- firstNonBlankCol ---

console.log("\nfirstNonBlankCol");

test("no leading spaces returns 0", function () {
    assert.strictEqual(vim.firstNonBlankCol("hello"), 0);
});

test("leading spaces skipped", function () {
    assert.strictEqual(vim.firstNonBlankCol("   hello"), 3);
});

test("empty line returns 0", function () {
    assert.strictEqual(vim.firstNonBlankCol(""), 0);
});

test("all spaces returns last index", function () {
    assert.strictEqual(vim.firstNonBlankCol("   "), 2);
});

// --- parseCommand: marks ---

console.log("\nparseCommand: marks");

test("m alone is incomplete", function () {
    var cmd = vim.parseCommand("m");
    assert.strictEqual(cmd.complete, false);
    assert.strictEqual(cmd.action, null);
});

test("ma is set_mark a", function () {
    var cmd = vim.parseCommand("ma");
    assert.strictEqual(cmd.complete, true);
    assert.strictEqual(cmd.action, "set_mark");
    assert.strictEqual(cmd.char, "a");
    assert.strictEqual(cmd.count, null);
});

test("mz is set_mark z", function () {
    var cmd = vim.parseCommand("mz");
    assert.strictEqual(cmd.action, "set_mark");
    assert.strictEqual(cmd.char, "z");
});

test("m1 is invalid", function () {
    var cmd = vim.parseCommand("m1");
    assert.strictEqual(cmd.action, "invalid");
});

test("' alone is incomplete", function () {
    var cmd = vim.parseCommand("'");
    assert.strictEqual(cmd.complete, false);
    assert.strictEqual(cmd.action, null);
});

test("'a is jump_to_mark_line a", function () {
    var cmd = vim.parseCommand("'a");
    assert.strictEqual(cmd.complete, true);
    assert.strictEqual(cmd.action, "jump_to_mark_line");
    assert.strictEqual(cmd.char, "a");
});

test("'' is jump_prev_line", function () {
    var cmd = vim.parseCommand("''");
    assert.strictEqual(cmd.complete, true);
    assert.strictEqual(cmd.action, "jump_prev_line");
});

test("backtick alone is incomplete", function () {
    var cmd = vim.parseCommand("`");
    assert.strictEqual(cmd.complete, false);
    assert.strictEqual(cmd.action, null);
});

test("backtick-a is jump_to_mark a", function () {
    var cmd = vim.parseCommand("`a");
    assert.strictEqual(cmd.complete, true);
    assert.strictEqual(cmd.action, "jump_to_mark");
    assert.strictEqual(cmd.char, "a");
});

// --- isWaitingForChar: marks ---

console.log("\nisWaitingForChar: marks");

test("m is waiting for char", function () {
    assert.strictEqual(vim.isWaitingForChar("m"), true);
});

test("single-quote is waiting for char", function () {
    assert.strictEqual(vim.isWaitingForChar("'"), true);
});

test("backtick is waiting for char", function () {
    assert.strictEqual(vim.isWaitingForChar("`"), true);
});

// --- executeCommand: marks ---

console.log("\nexecuteCommand: marks");

var MARK_LINES = [
    "  hello world",
    "foo bar baz",
    "",
    "last line here",
];

test("set_mark stores current position", function () {
    var s = makeState(MARK_LINES, 1, 4);
    s.marks = {};
    vim.executeCommand({ action: "set_mark", count: null, char: "a" }, s);
    assert.deepStrictEqual(s.marks["a"], { row: 1, col: 4 });
    assert.strictEqual(s.cursorRow, 1);
    assert.strictEqual(s.cursorCol, 4);
});

test("jump_to_mark_line moves to first non-blank of mark row", function () {
    var s = makeState(MARK_LINES, 3, 0);
    s.marks = { a: { row: 0, col: 8 } };
    s.jumpMark = null;
    vim.executeCommand({ action: "jump_to_mark_line", count: null, char: "a" }, s);
    assert.strictEqual(s.cursorRow, 0);
    assert.strictEqual(s.cursorCol, 2);
});

test("jump_to_mark_line saves jumpMark", function () {
    var s = makeState(MARK_LINES, 3, 5);
    s.marks = { a: { row: 0, col: 0 } };
    s.jumpMark = null;
    vim.executeCommand({ action: "jump_to_mark_line", count: null, char: "a" }, s);
    assert.deepStrictEqual(s.jumpMark, { row: 3, col: 5 });
});

test("jump_to_mark_line on unset mark does nothing", function () {
    var s = makeState(MARK_LINES, 2, 0);
    s.marks = {};
    s.jumpMark = null;
    vim.executeCommand({ action: "jump_to_mark_line", count: null, char: "z" }, s);
    assert.strictEqual(s.cursorRow, 2);
    assert.strictEqual(s.jumpMark, null);
});

test("jump_to_mark moves to exact mark position", function () {
    var s = makeState(MARK_LINES, 0, 0);
    s.marks = { b: { row: 3, col: 7 } };
    s.jumpMark = null;
    vim.executeCommand({ action: "jump_to_mark", count: null, char: "b" }, s);
    assert.strictEqual(s.cursorRow, 3);
    assert.strictEqual(s.cursorCol, 7);
});

test("jump_to_mark saves jumpMark", function () {
    var s = makeState(MARK_LINES, 1, 3);
    s.marks = { b: { row: 3, col: 7 } };
    s.jumpMark = null;
    vim.executeCommand({ action: "jump_to_mark", count: null, char: "b" }, s);
    assert.deepStrictEqual(s.jumpMark, { row: 1, col: 3 });
});

test("jump_prev_line jumps to first non-blank of saved row", function () {
    var s = makeState(MARK_LINES, 3, 5);
    s.marks = {};
    s.jumpMark = { row: 0, col: 8 };
    vim.executeCommand({ action: "jump_prev_line", count: null }, s);
    assert.strictEqual(s.cursorRow, 0);
    assert.strictEqual(s.cursorCol, 2);
});

test("jump_prev_line swaps jumpMark so '' toggles", function () {
    var s = makeState(MARK_LINES, 3, 5);
    s.marks = {};
    s.jumpMark = { row: 0, col: 0 };
    vim.executeCommand({ action: "jump_prev_line", count: null }, s);
    assert.deepStrictEqual(s.jumpMark, { row: 3, col: 5 });
});

test("jump_prev_line with no jumpMark does nothing", function () {
    var s = makeState(MARK_LINES, 2, 3);
    s.marks = {};
    s.jumpMark = null;
    vim.executeCommand({ action: "jump_prev_line", count: null }, s);
    assert.strictEqual(s.cursorRow, 2);
    assert.strictEqual(s.cursorCol, 3);
});

test("gg saves jumpMark", function () {
    var s = makeState(MARK_LINES, 3, 4);
    s.marks = {};
    s.jumpMark = null;
    vim.executeCommand({ action: "first", count: null }, s);
    assert.deepStrictEqual(s.jumpMark, { row: 3, col: 4 });
    assert.strictEqual(s.cursorRow, 0);
});

test("G saves jumpMark", function () {
    var s = makeState(MARK_LINES, 0, 2);
    s.marks = {};
    s.jumpMark = null;
    vim.executeCommand({ action: "last", count: null }, s);
    assert.deepStrictEqual(s.jumpMark, { row: 0, col: 2 });
    assert.strictEqual(s.cursorRow, 3);
});

// --- parseCommand: ^ ---

console.log("\nparseCommand: ^");

test("^ is first_non_blank", function () {
    var cmd = vim.parseCommand("^");
    assert.strictEqual(cmd.complete, true);
    assert.strictEqual(cmd.action, "first_non_blank");
});

// --- executeCommand: first_non_blank ---

console.log("\nexecuteCommand: first_non_blank");

test("first_non_blank moves to first non-space char", function () {
    var s = makeState(["   hello world"], 0, 10);
    vim.executeCommand({ action: "first_non_blank", count: null }, s);
    assert.strictEqual(s.cursorCol, 3);
});

test("first_non_blank on line with no leading spaces goes to 0", function () {
    var s = makeState(["hello"], 0, 3);
    vim.executeCommand({ action: "first_non_blank", count: null }, s);
    assert.strictEqual(s.cursorCol, 0);
});

// --- word movement across lines ---

console.log("\nword movement across lines");

var MULTI_LINES = [
    "hello world",
    "foo bar",
    "",
    "baz qux",
];

test("w at end of line wraps to next line", function () {
    var s = makeState(MULTI_LINES, 0, 6);
    vim.executeCommand({ action: "word_next", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 1);
    assert.strictEqual(s.cursorCol, 0);
});

test("w stops at empty line (paragraph break)", function () {
    var s = makeState(MULTI_LINES, 1, 4);
    vim.executeCommand({ action: "word_next", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 2);
    assert.strictEqual(s.cursorCol, 0);
});

test("w on last line last word stays put", function () {
    var s = makeState(MULTI_LINES, 3, 4);
    vim.executeCommand({ action: "word_next", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 3);
    assert.strictEqual(s.cursorCol, 6);
});

test("w with count wraps across multiple lines", function () {
    var s = makeState(MULTI_LINES, 0, 0);
    vim.executeCommand({ action: "word_next", count: 3 }, s);
    assert.strictEqual(s.cursorRow, 1);
    assert.strictEqual(s.cursorCol, 4);
});

test("e at end of line wraps to next line", function () {
    var s = makeState(MULTI_LINES, 0, 10);
    vim.executeCommand({ action: "word_end", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 1);
    assert.strictEqual(s.cursorCol, 2);
});

test("e stops at empty line (paragraph break)", function () {
    var s = makeState(MULTI_LINES, 1, 6);
    vim.executeCommand({ action: "word_end", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 2);
    assert.strictEqual(s.cursorCol, 0);
});

test("b at start of line wraps to previous line", function () {
    var s = makeState(MULTI_LINES, 1, 0);
    vim.executeCommand({ action: "word_prev", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 0);
    assert.strictEqual(s.cursorCol, 6);
});

test("b stops at empty line (paragraph break) going backward", function () {
    var s = makeState(MULTI_LINES, 3, 0);
    vim.executeCommand({ action: "word_prev", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 2);
    assert.strictEqual(s.cursorCol, 0);
});

test("b on first line col 0 stays put", function () {
    var s = makeState(MULTI_LINES, 0, 0);
    vim.executeCommand({ action: "word_prev", count: 1 }, s);
    assert.strictEqual(s.cursorRow, 0);
    assert.strictEqual(s.cursorCol, 0);
});

// --- summary ---

console.log("\n" + passed + " passed, " + failed + " failed");
if (failed > 0) {
    process.exit(1);
}
