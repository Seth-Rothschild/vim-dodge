// --- Movement Functions ---

function moveDown(cursorRow, totalLines) {
    if (cursorRow < totalLines - 1) {
        return cursorRow + 1;
    }
    return cursorRow;
}

function moveUp(cursorRow) {
    if (cursorRow > 0) {
        return cursorRow - 1;
    }
    return cursorRow;
}

function gotoLine(lineNumber, totalLines) {
    return Math.max(0, Math.min(lineNumber, totalLines - 1));
}

function gotoParagraphUp(cursorRow, lines) {
    var row = cursorRow - 1;
    while (row > 0 && lines[row].trim() !== "") {
        row = row - 1;
    }
    return Math.max(0, row);
}

function gotoParagraphDown(cursorRow, lines) {
    var row = cursorRow + 1;
    while (row < lines.length - 1 && lines[row].trim() !== "") {
        row = row + 1;
    }
    return Math.min(lines.length - 1, row);
}

function moveLeft(cursorCol) {
    if (cursorCol > 0) {
        return cursorCol - 1;
    }
    return cursorCol;
}

function moveRight(cursorCol, lineLength) {
    if (cursorCol < lineLength - 1) {
        return cursorCol + 1;
    }
    return cursorCol;
}

function gotoLineStart() {
    return 0;
}

function gotoLineEnd(lineLength) {
    return Math.max(0, lineLength - 1);
}

function gotoNextWordStart(cursorCol, line, cursorRow, lines) {
    var col = cursorCol;
    var row = cursorRow;
    while (col < line.length - 1 && line[col] !== " ") {
        col = col + 1;
    }
    while (col < line.length - 1 && line[col] === " ") {
        col = col + 1;
    }
    if (col >= line.length - 1 && lines && row < lines.length - 1) {
        row = row + 1;
        var nextLine = lines[row];
        if (nextLine.length === 0) {
            return { col: 0, row: row };
        }
        col = firstNonBlankCol(nextLine);
        return { col: col, row: row };
    }
    if (lines) {
        return { col: col, row: row };
    }
    return col;
}

function gotoWordEnd(cursorCol, line, cursorRow, lines) {
    var col = cursorCol;
    var row = cursorRow;
    if (col < line.length - 1) {
        col = col + 1;
    }
    while (col < line.length - 1 && line[col] === " ") {
        col = col + 1;
    }
    if (col >= line.length - 1 && lines && row < lines.length - 1) {
        row = row + 1;
        var nextLine = lines[row];
        if (nextLine.length === 0) {
            return { col: 0, row: row };
        }
        col = firstNonBlankCol(nextLine);
        line = nextLine;
    }
    while (col < line.length - 1 && line[col + 1] !== " ") {
        col = col + 1;
    }
    if (lines) {
        return { col: col, row: row };
    }
    return col;
}

function gotoPrevWordStart(cursorCol, line, cursorRow, lines) {
    var col = cursorCol;
    var row = cursorRow;
    if (col > 0) {
        col = col - 1;
    }
    while (col > 0 && line[col] === " ") {
        col = col - 1;
    }
    if (col === 0 && lines && row > 0) {
        row = row - 1;
        var prevLine = lines[row];
        if (prevLine.length === 0) {
            return { col: 0, row: row };
        }
        col = Math.max(0, prevLine.length - 1);
        line = prevLine;
    }
    while (col > 0 && line[col - 1] !== " ") {
        col = col - 1;
    }
    if (lines) {
        return { col: col, row: row };
    }
    return col;
}

function findCharForward(cursorCol, line, ch) {
    for (var i = cursorCol + 1; i < line.length; i++) {
        if (line[i] === ch) {
            return i;
        }
    }
    return cursorCol;
}

function findCharBackward(cursorCol, line, ch) {
    for (var i = cursorCol - 1; i >= 0; i--) {
        if (line[i] === ch) {
            return i;
        }
    }
    return cursorCol;
}

function tillCharForward(cursorCol, line, ch) {
    var found = findCharForward(cursorCol, line, ch);
    if (found !== cursorCol) {
        return found - 1;
    }
    return cursorCol;
}

function tillCharBackward(cursorCol, line, ch) {
    var found = findCharBackward(cursorCol, line, ch);
    if (found !== cursorCol) {
        return found + 1;
    }
    return cursorCol;
}

function firstNonBlankCol(line) {
    var col = 0;
    while (col < line.length - 1 && line[col] === " ") {
        col = col + 1;
    }
    return col;
}

// --- Command Parsing ---

function parseCommand(pendingKeys) {
    if (pendingKeys === "") {
        return { complete: false, action: null, count: null };
    }

    var digits = "";
    var rest = "";
    for (var i = 0; i < pendingKeys.length; i++) {
        if (pendingKeys[i] >= "0" && pendingKeys[i] <= "9" && rest === "") {
            digits = digits + pendingKeys[i];
        } else {
            rest = rest + pendingKeys[i];
        }
    }

    var count = digits === "" ? null : parseInt(digits, 10);

    if (rest === "j") {
        return { complete: true, action: "down", count: count || 1 };
    }
    if (rest === "k") {
        return { complete: true, action: "up", count: count || 1 };
    }
    if (rest === "G") {
        if (count !== null) {
            return { complete: true, action: "goto", count: count };
        }
        return { complete: true, action: "last", count: null };
    }
    if (rest === "gg") {
        if (count !== null) {
            return { complete: true, action: "goto", count: count };
        }
        return { complete: true, action: "first", count: null };
    }
    if (rest === "g") {
        return { complete: false, action: null, count: count };
    }
    if (rest === "h") {
        return { complete: true, action: "left", count: count || 1 };
    }
    if (rest === "l") {
        return { complete: true, action: "right", count: count || 1 };
    }
    if (rest === "w") {
        return { complete: true, action: "word_next", count: count || 1 };
    }
    if (rest === "e") {
        return { complete: true, action: "word_end", count: count || 1 };
    }
    if (rest === "b") {
        return { complete: true, action: "word_prev", count: count || 1 };
    }
    if (rest === "^") {
        return { complete: true, action: "first_non_blank", count: null };
    }
    if (rest === "$") {
        return { complete: true, action: "line_end", count: null };
    }
    if (rest === "f" || rest === "F" || rest === "t" || rest === "T") {
        return { complete: false, action: null, count: count };
    }
    if (rest.length === 2 && rest[0] === "f") {
        return { complete: true, action: "find_forward", count: count || 1, char: rest[1] };
    }
    if (rest.length === 2 && rest[0] === "F") {
        return { complete: true, action: "find_backward", count: count || 1, char: rest[1] };
    }
    if (rest.length === 2 && rest[0] === "t") {
        return { complete: true, action: "till_forward", count: count || 1, char: rest[1] };
    }
    if (rest.length === 2 && rest[0] === "T") {
        return { complete: true, action: "till_backward", count: count || 1, char: rest[1] };
    }
if (rest === "{") {
        return { complete: true, action: "paragraph_up", count: count || 1 };
    }
    if (rest === "}") {
        return { complete: true, action: "paragraph_down", count: count || 1 };
    }
    if (rest === "" && digits === "0") {
        return { complete: true, action: "line_start", count: null };
    }
    if (rest === "m") {
        return { complete: false, action: null, count: null };
    }
    if (rest.length === 2 && rest[0] === "m" && rest[1] >= "a" && rest[1] <= "z") {
        return { complete: true, action: "set_mark", count: null, char: rest[1] };
    }
    if (rest === "'") {
        return { complete: false, action: null, count: null };
    }
    if (rest === "''") {
        return { complete: true, action: "jump_prev_line", count: null };
    }
    if (rest.length === 2 && rest[0] === "'" && rest[1] >= "a" && rest[1] <= "z") {
        return { complete: true, action: "jump_to_mark_line", count: null, char: rest[1] };
    }
    if (rest === "`") {
        return { complete: false, action: null, count: null };
    }
    if (rest.length === 2 && rest[0] === "`" && rest[1] >= "a" && rest[1] <= "z") {
        return { complete: true, action: "jump_to_mark", count: null, char: rest[1] };
    }
    if (rest === "") {
        return { complete: false, action: null, count: count };
    }

    return { complete: false, action: "invalid", count: null };
}

function isWaitingForChar(pendingKeys) {
    if (pendingKeys.length === 0) {
        return false;
    }
    var lastChar = pendingKeys[pendingKeys.length - 1];
    return (
        lastChar === "f" || lastChar === "F" ||
        lastChar === "t" || lastChar === "T" ||
        lastChar === "m" || lastChar === "'" || lastChar === "`"
    );
}

// --- Command Execution ---

function executeCommand(command, gameState) {
    var totalLines = gameState.lines.length;

    if (command.action === "down") {
        for (var i = 0; i < command.count; i++) {
            gameState.cursorRow = moveDown(gameState.cursorRow, totalLines);
        }
    } else if (command.action === "up") {
        for (var i = 0; i < command.count; i++) {
            gameState.cursorRow = moveUp(gameState.cursorRow);
        }
    } else if (command.action === "first") {
        gameState.jumpMark = { row: gameState.cursorRow, col: gameState.cursorCol };
        gameState.cursorRow = gotoLine(0, totalLines);
    } else if (command.action === "last") {
        gameState.jumpMark = { row: gameState.cursorRow, col: gameState.cursorCol };
        gameState.cursorRow = gotoLine(totalLines - 1, totalLines);
    } else if (command.action === "goto") {
        gameState.jumpMark = { row: gameState.cursorRow, col: gameState.cursorCol };
        gameState.cursorRow = gotoLine(command.count - 1, totalLines);
    } else if (command.action === "paragraph_up") {
        gameState.jumpMark = { row: gameState.cursorRow, col: gameState.cursorCol };
        for (var i = 0; i < command.count; i++) {
            gameState.cursorRow = gotoParagraphUp(gameState.cursorRow, gameState.lines);
        }
    } else if (command.action === "paragraph_down") {
        gameState.jumpMark = { row: gameState.cursorRow, col: gameState.cursorCol };
        for (var i = 0; i < command.count; i++) {
            gameState.cursorRow = gotoParagraphDown(gameState.cursorRow, gameState.lines);
        }
    } else if (command.action === "set_mark") {
        if (!gameState.marks) {
            gameState.marks = {};
        }
        gameState.marks[command.char] = { row: gameState.cursorRow, col: gameState.cursorCol };
    } else if (command.action === "jump_to_mark_line") {
        var mark = gameState.marks && gameState.marks[command.char];
        if (mark) {
            gameState.jumpMark = { row: gameState.cursorRow, col: gameState.cursorCol };
            gameState.cursorRow = mark.row;
            gameState.cursorCol = firstNonBlankCol(gameState.lines[mark.row]);
        }
    } else if (command.action === "jump_to_mark") {
        var mark = gameState.marks && gameState.marks[command.char];
        if (mark) {
            gameState.jumpMark = { row: gameState.cursorRow, col: gameState.cursorCol };
            gameState.cursorRow = mark.row;
            gameState.cursorCol = mark.col;
        }
    } else if (command.action === "jump_prev_line") {
        if (gameState.jumpMark) {
            var savedRow = gameState.cursorRow;
            var savedCol = gameState.cursorCol;
            gameState.cursorRow = gameState.jumpMark.row;
            gameState.cursorCol = firstNonBlankCol(gameState.lines[gameState.jumpMark.row]);
            gameState.jumpMark = { row: savedRow, col: savedCol };
        }
    } else if (command.action === "left") {
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = moveLeft(gameState.cursorCol);
        }
    } else if (command.action === "right") {
        var lineLen = gameState.lines[gameState.cursorRow].length;
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = moveRight(gameState.cursorCol, lineLen);
        }
    } else if (command.action === "first_non_blank") {
        var line = gameState.lines[gameState.cursorRow];
        gameState.cursorCol = firstNonBlankCol(line);
    } else if (command.action === "line_start") {
        gameState.cursorCol = gotoLineStart();
    } else if (command.action === "line_end") {
        var lineLen = gameState.lines[gameState.cursorRow].length;
        gameState.cursorCol = gotoLineEnd(lineLen);
    } else if (command.action === "word_next") {
        for (var i = 0; i < command.count; i++) {
            var line = gameState.lines[gameState.cursorRow];
            var result = gotoNextWordStart(gameState.cursorCol, line, gameState.cursorRow, gameState.lines);
            gameState.cursorCol = result.col;
            gameState.cursorRow = result.row;
        }
    } else if (command.action === "word_end") {
        for (var i = 0; i < command.count; i++) {
            var line = gameState.lines[gameState.cursorRow];
            var result = gotoWordEnd(gameState.cursorCol, line, gameState.cursorRow, gameState.lines);
            gameState.cursorCol = result.col;
            gameState.cursorRow = result.row;
        }
    } else if (command.action === "word_prev") {
        for (var i = 0; i < command.count; i++) {
            var line = gameState.lines[gameState.cursorRow];
            var result = gotoPrevWordStart(gameState.cursorCol, line, gameState.cursorRow, gameState.lines);
            gameState.cursorCol = result.col;
            gameState.cursorRow = result.row;
        }
    } else if (command.action === "find_forward") {
        var line = gameState.lines[gameState.cursorRow];
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = findCharForward(gameState.cursorCol, line, command.char);
        }
    } else if (command.action === "find_backward") {
        var line = gameState.lines[gameState.cursorRow];
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = findCharBackward(gameState.cursorCol, line, command.char);
        }
    } else if (command.action === "till_forward") {
        var line = gameState.lines[gameState.cursorRow];
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = tillCharForward(gameState.cursorCol, line, command.char);
        }
    } else if (command.action === "till_backward") {
        var line = gameState.lines[gameState.cursorRow];
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = tillCharBackward(gameState.cursorCol, line, command.char);
        }
    }
}

if (typeof module !== "undefined") {
    module.exports = {
        moveDown,
        moveUp,
        gotoLine,
        gotoParagraphUp,
        gotoParagraphDown,
        moveLeft,
        moveRight,
        gotoLineStart,
        gotoLineEnd,
        gotoNextWordStart,
        gotoWordEnd,
        gotoPrevWordStart,
        findCharForward,
        findCharBackward,
        tillCharForward,
        tillCharBackward,
        firstNonBlankCol,
        parseCommand,
        isWaitingForChar,
        executeCommand,
    };
}
