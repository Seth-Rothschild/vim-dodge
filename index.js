// --- Text Content ---

var TEXT_LINES = [
    "The old lighthouse keeper climbed the spiral staircase every evening",
    "at dusk, carrying a lantern in one hand and a worn leather journal",
    "in the other. He had kept this routine for thirty years without fail.",
    "The sea below crashed against the rocks in a familiar rhythm.",
    "From the top he could see the whole harbour and the boats returning.",
    "",
    "In the village square a market appeared each Saturday morning.",
    "Farmers brought baskets of apples, pears, and dark red cherries.",
    "The baker arrived early to set out fresh loaves on a wooden table.",
    "Children ran between the stalls while their parents haggled over prices.",
    "By noon the square was crowded and loud with conversation and laughter.",
    "",
    "The library on Elm Street had been open since nineteen twenty three.",
    "Its shelves held thousands of books arranged by subject and author.",
    "A large oak reading table sat in the centre beneath a stained glass window.",
    "Students came after school to study and the librarian knew them all by name.",
    "The building smelled of old paper and wood polish and quiet concentration.",
];

// --- Grid Layout Constants ---

var CHAR_WIDTH = 9;
var LINE_HEIGHT = 20;
var GUTTER_CHARS = 4;
var PADDING_TOP = 10;
var PADDING_LEFT = 8;

var WALL_BLOCK_COLS = 5;
var WALL_BLOCK_ROWS = 5;
var WALL_MARGIN = 30;

var LONGEST_LINE = 0;
for (var i = 0; i < TEXT_LINES.length; i++) {
    if (TEXT_LINES[i].length > LONGEST_LINE) {
        LONGEST_LINE = TEXT_LINES[i].length;
    }
}

var TOTAL_COLS = GUTTER_CHARS + LONGEST_LINE;

// --- Canvas Setup ---

var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
canvas.width = 2 * WALL_MARGIN + PADDING_LEFT * 2 + TOTAL_COLS * CHAR_WIDTH;
canvas.height = 2 * WALL_MARGIN + PADDING_TOP * 2 + TEXT_LINES.length * LINE_HEIGHT + 24;

// --- Game State ---

var PARAGRAPH_BREAKS = [];
for (var i = 0; i < TEXT_LINES.length; i++) {
    if (TEXT_LINES[i].trim() === "") {
        PARAGRAPH_BREAKS.push(i);
    }
}

var state = {
    lines: TEXT_LINES,
    cursorRow: 8,
    cursorCol: Math.floor(TEXT_LINES[8].length / 2),
    pendingKeys: "",
    walls: [],
    score: 0,
    gameOver: false,
    nextWallId: 0,
    lastWallSpawn: 0,
    spawnInterval: 4000,
    pressedKeyTimer: null,
    positionHistory: [],
    hint: "",
};

// --- Grid Coordinate Helpers ---

function charX(col) {
    return WALL_MARGIN + PADDING_LEFT + (GUTTER_CHARS + col) * CHAR_WIDTH;
}

function lineY(row) {
    return WALL_MARGIN + PADDING_TOP + row * LINE_HEIGHT;
}

function textAreaLeft() {
    return WALL_MARGIN + PADDING_LEFT + GUTTER_CHARS * CHAR_WIDTH;
}

function textAreaRight() {
    return WALL_MARGIN + PADDING_LEFT + TOTAL_COLS * CHAR_WIDTH;
}

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

function gotoNextWordStart(cursorCol, line) {
    var col = cursorCol;
    while (col < line.length - 1 && line[col] !== " ") {
        col = col + 1;
    }
    while (col < line.length - 1 && line[col] === " ") {
        col = col + 1;
    }
    return col;
}

function gotoWordEnd(cursorCol, line) {
    var col = cursorCol;
    if (col < line.length - 1) {
        col = col + 1;
    }
    while (col < line.length - 1 && line[col] === " ") {
        col = col + 1;
    }
    while (col < line.length - 1 && line[col + 1] !== " ") {
        col = col + 1;
    }
    return col;
}

function gotoPrevWordStart(cursorCol, line) {
    var col = cursorCol;
    if (col > 0) {
        col = col - 1;
    }
    while (col > 0 && line[col] === " ") {
        col = col - 1;
    }
    while (col > 0 && line[col - 1] !== " ") {
        col = col - 1;
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
    return lastChar === "f" || lastChar === "F" || lastChar === "t" || lastChar === "T";
}

// --- Input Handling ---

function handleKeyDown(event, gameState) {
    if (gameState.gameOver) {
        if (event.key === "r") {
            restartGame();
        }
        return;
    }

    var key = event.key;

    var waitingForChar = isWaitingForChar(gameState.pendingKeys);

    var isVimKey = (
        key === "j" || key === "k" || key === "h" || key === "l" ||
        key === "g" || key === "G" ||
        key === "w" || key === "e" || key === "b" || key === "$" ||
        key === "f" || key === "F" || key === "t" || key === "T" ||
        key === "{" || key === "}" ||
        (key >= "0" && key <= "9")
    );

    if (!isVimKey && !waitingForChar) {
        return;
    }

    if (waitingForChar && key.length !== 1) {
        return;
    }

    event.preventDefault();
    flashKey(key);

    gameState.pendingKeys = gameState.pendingKeys + key;
    var command = parseCommand(gameState.pendingKeys);

    if (command.action === "invalid") {
        gameState.pendingKeys = "";
        return;
    }

    if (!command.complete) {
        return;
    }

    executeCommand(command, gameState);
    gameState.pendingKeys = "";

    var lineLen = gameState.lines[gameState.cursorRow].length;
    if (lineLen === 0) {
        gameState.cursorCol = 0;
    } else if (gameState.cursorCol >= lineLen) {
        gameState.cursorCol = lineLen - 1;
    }

    recordPosition(gameState);
}

function recordPosition(gameState) {
    gameState.positionHistory.push({
        row: gameState.cursorRow,
        col: gameState.cursorCol,
    });
    if (gameState.positionHistory.length > 20) {
        gameState.positionHistory.shift();
    }
}

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
        gameState.cursorRow = gotoLine(0, totalLines);
    } else if (command.action === "last") {
        gameState.cursorRow = gotoLine(totalLines - 1, totalLines);
    } else if (command.action === "goto") {
        gameState.cursorRow = gotoLine(command.count - 1, totalLines);
    } else if (command.action === "paragraph_up") {
        for (var i = 0; i < command.count; i++) {
            gameState.cursorRow = gotoParagraphUp(gameState.cursorRow, gameState.lines);
        }
    } else if (command.action === "paragraph_down") {
        for (var i = 0; i < command.count; i++) {
            gameState.cursorRow = gotoParagraphDown(gameState.cursorRow, gameState.lines);
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
    } else if (command.action === "line_start") {
        gameState.cursorCol = gotoLineStart();
    } else if (command.action === "line_end") {
        var lineLen = gameState.lines[gameState.cursorRow].length;
        gameState.cursorCol = gotoLineEnd(lineLen);
    } else if (command.action === "word_next") {
        var line = gameState.lines[gameState.cursorRow];
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = gotoNextWordStart(gameState.cursorCol, line);
        }
    } else if (command.action === "word_end") {
        var line = gameState.lines[gameState.cursorRow];
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = gotoWordEnd(gameState.cursorCol, line);
        }
    } else if (command.action === "word_prev") {
        var line = gameState.lines[gameState.cursorRow];
        for (var i = 0; i < command.count; i++) {
            gameState.cursorCol = gotoPrevWordStart(gameState.cursorCol, line);
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

// --- Keyboard Flash ---

function flashKey(key) {
    var displayKey = key;
    if (key === "{") {
        displayKey = "[";
    } else if (key === "}") {
        displayKey = "]";
    } else if (key === "$") {
        displayKey = "4";
    } else {
        displayKey = key.toLowerCase();
    }
    var keyEl = document.querySelector('.kb-key[data-key="' + displayKey + '"]');
    if (!keyEl) {
        return;
    }

    if (state.pressedKeyTimer) {
        clearTimeout(state.pressedKeyTimer);
        var prevEl = document.querySelector(".kb-key.pressed");
        if (prevEl) {
            prevEl.classList.remove("pressed");
        }
    }

    keyEl.classList.add("pressed");
    state.pressedKeyTimer = setTimeout(function () {
        keyEl.classList.remove("pressed");
        state.pressedKeyTimer = null;
    }, 150);
}

// --- Canvas Rendering ---

function render(gameState) {
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawWalls(gameState);
    drawText(gameState);
    drawCursor(gameState);
    drawStatusBar(gameState);
}

function drawText(gameState) {
    ctx.font = "14px 'Courier New', monospace";
    ctx.textBaseline = "top";

    for (var row = 0; row < gameState.lines.length; row++) {
        var lineNum = String(row + 1);
        while (lineNum.length < 3) {
            lineNum = " " + lineNum;
        }

        var gutterX = PADDING_LEFT;
        var y = lineY(row) + 3;

        ctx.fillStyle = "#555";
        ctx.fillText(lineNum, gutterX, y);

        var line = gameState.lines[row];
        var lineStartX = textAreaLeft();

        for (var col = 0; col < line.length; col++) {
            var x = lineStartX + col * CHAR_WIDTH;
            ctx.fillStyle = "#abb2bf";
            ctx.fillText(line[col], x, y);
        }
    }
}

function drawCursor(gameState) {
    var row = gameState.cursorRow;
    var col = gameState.cursorCol;
    var line = gameState.lines[row];
    var x = charX(col);
    var y = lineY(row);

    ctx.fillStyle = "#98c379";
    ctx.fillRect(x, y, CHAR_WIDTH, LINE_HEIGHT);

    var ch = line[col] || " ";
    ctx.fillStyle = "#1e1e1e";
    ctx.font = "14px 'Courier New', monospace";
    ctx.textBaseline = "top";
    ctx.fillText(ch, x, y + 3);
}

function drawWalls(gameState) {
    for (var w = 0; w < gameState.walls.length; w++) {
        var wall = gameState.walls[w];

        if (wall.type === "column") {
            drawColumnWall(wall);
        } else {
            drawRowWall(wall);
        }
    }
}

function rowWallBlockLeft(wall) {
    var areaLeft = textAreaLeft();
    var areaRight = textAreaRight();
    var areaWidth = areaRight - areaLeft;
    var blockWidth = WALL_BLOCK_COLS * CHAR_WIDTH;
    var fullDistance = areaWidth + blockWidth + 2 * WALL_MARGIN;

    if (wall.direction === "right") {
        return areaLeft - WALL_MARGIN - blockWidth + (wall.progress / 100) * fullDistance;
    }
    return areaRight + WALL_MARGIN - (wall.progress / 100) * fullDistance;
}

function drawRowWall(wall) {
    var blockLeft = rowWallBlockLeft(wall);
    var blockWidth = WALL_BLOCK_COLS * CHAR_WIDTH;

    ctx.fillStyle = "rgba(255, 50, 50, 0.35)";

    for (var row = wall.startRow; row <= wall.endRow; row++) {
        if (wall.safeRow !== null && row === wall.safeRow) {
            continue;
        }
        var y = lineY(row);
        ctx.fillRect(blockLeft, y, blockWidth, LINE_HEIGHT);
    }
}

function colWallBlockTop(wall) {
    var topY = lineY(0);
    var totalHeight = TEXT_LINES.length * LINE_HEIGHT;
    var blockHeight = WALL_BLOCK_ROWS * LINE_HEIGHT;
    var fullDistance = totalHeight + blockHeight + 2 * WALL_MARGIN;

    if (wall.direction === "down") {
        return topY - WALL_MARGIN - blockHeight + (wall.progress / 100) * fullDistance;
    }
    return topY + totalHeight + WALL_MARGIN - (wall.progress / 100) * fullDistance;
}

function drawColumnWall(wall) {
    var blockTop = colWallBlockTop(wall);
    var blockHeight = WALL_BLOCK_ROWS * LINE_HEIGHT;

    ctx.fillStyle = "rgba(100, 100, 255, 0.35)";

    for (var col = wall.startCol; col <= wall.endCol; col++) {
        if (wall.safeCol !== null && col === wall.safeCol) {
            continue;
        }
        var x = charX(col);
        ctx.fillRect(x, blockTop, CHAR_WIDTH, blockHeight);
    }
}

function drawStatusBar(gameState) {
    var y = canvas.height - 20;

    ctx.fillStyle = "#333";
    ctx.fillRect(0, y - 4, canvas.width, 24);

    ctx.font = "13px 'Courier New', monospace";
    ctx.textBaseline = "top";

    ctx.fillStyle = "#e5c07b";
    ctx.fillText(gameState.pendingKeys, PADDING_LEFT, y);

    ctx.fillStyle = "#98c379";
    var scoreText = "Score: " + gameState.score;
    var scoreWidth = ctx.measureText(scoreText).width;
    ctx.fillText(scoreText, canvas.width - PADDING_LEFT - scoreWidth, y);

    if (gameState.hint !== "") {
        ctx.fillStyle = "#61afef";
        var hintText = "try: " + gameState.hint;
        var hintWidth = ctx.measureText(hintText).width;
        ctx.fillText(hintText, (canvas.width - hintWidth) / 2, y);
    }

    if (gameState.gameOver) {
        gameState.hint = "";
        ctx.fillStyle = "#e06c75";
        var msg = "GAME OVER - press r to restart";
        var msgWidth = ctx.measureText(msg).width;
        ctx.fillText(msg, (canvas.width - msgWidth) / 2, y);
    }
}

// --- Position Targeting ---

function recentRow(gameState) {
    if (gameState.positionHistory.length === 0) {
        return gameState.cursorRow;
    }
    var total = 0;
    for (var i = 0; i < gameState.positionHistory.length; i++) {
        total = total + gameState.positionHistory[i].row;
    }
    return Math.round(total / gameState.positionHistory.length);
}

function recentCol(gameState) {
    if (gameState.positionHistory.length === 0) {
        return gameState.cursorCol;
    }
    var total = 0;
    for (var i = 0; i < gameState.positionHistory.length; i++) {
        total = total + gameState.positionHistory[i].col;
    }
    return Math.round(total / gameState.positionHistory.length);
}

function targetedRow(gameState) {
    if (Math.random() < 0.67) {
        var avg = recentRow(gameState);
        var offset = Math.floor(Math.random() * 3) - 1;
        return Math.max(0, Math.min(avg + offset, TEXT_LINES.length - 1));
    }
    return Math.floor(Math.random() * TEXT_LINES.length);
}

function targetedCol(gameState) {
    if (Math.random() < 0.67) {
        var avg = recentCol(gameState);
        var offset = Math.floor(Math.random() * 5) - 2;
        return Math.max(0, Math.min(avg + offset, LONGEST_LINE - 1));
    }
    return Math.floor(Math.random() * LONGEST_LINE);
}

// --- Hint System ---

function countParagraphJumpsDown(fromRow, targetRow, lines) {
    var row = fromRow;
    var jumps = 0;
    while (row < targetRow) {
        var nextRow = gotoParagraphDown(row, lines);
        jumps = jumps + 1;
        if (nextRow === row) {
            return -1;
        }
        row = nextRow;
    }
    if (row !== targetRow) {
        return -1;
    }
    return jumps;
}

function countParagraphJumpsUp(fromRow, targetRow, lines) {
    var row = fromRow;
    var jumps = 0;
    while (row > targetRow) {
        var nextRow = gotoParagraphUp(row, lines);
        jumps = jumps + 1;
        if (nextRow === row) {
            return -1;
        }
        row = nextRow;
    }
    if (row !== targetRow) {
        return -1;
    }
    return jumps;
}

function hintForWall(wall, gameState) {
    if (wall.type === "row") {
        return hintForRowWall(wall, gameState);
    }
    return hintForColumnWall(wall, gameState);
}

function hintForRowWall(wall, gameState) {
    var cursorRow = gameState.cursorRow;
    var isCovered = (cursorRow >= wall.startRow && cursorRow <= wall.endRow);
    if (wall.safeRow !== null && cursorRow === wall.safeRow) {
        isCovered = false;
    }
    if (!isCovered) {
        return "";
    }

    if (wall.safeRow !== null) {
        if (wall.safeRow === 0) {
            return "gg";
        }
        if (wall.safeRow === TEXT_LINES.length - 1) {
            return "G";
        }
        for (var i = 0; i < PARAGRAPH_BREAKS.length; i++) {
            if (PARAGRAPH_BREAKS[i] === wall.safeRow) {
                if (wall.safeRow < cursorRow) {
                    var jumps = countParagraphJumpsUp(cursorRow, wall.safeRow, gameState.lines);
                    if (jumps < 0) {
                        return (wall.safeRow + 1) + "gg";
                    }
                    return jumps > 1 ? jumps + "{" : "{";
                }
                var jumps = countParagraphJumpsDown(cursorRow, wall.safeRow, gameState.lines);
                if (jumps < 0) {
                    return (wall.safeRow + 1) + "gg";
                }
                return jumps > 1 ? jumps + "}" : "}";
            }
        }
        return (wall.safeRow + 1) + "gg";
    }

    if (wall.startRow > 0) {
        return "gg";
    }
    if (wall.endRow < TEXT_LINES.length - 1) {
        return "G";
    }
    return "";
}

function hintForColumnWall(wall, gameState) {
    var cursorCol = gameState.cursorCol;
    var isCovered = (cursorCol >= wall.startCol && cursorCol <= wall.endCol);
    if (wall.safeCol !== null && cursorCol === wall.safeCol) {
        isCovered = false;
    }
    if (!isCovered) {
        return "";
    }

    if (wall.startCol > 0) {
        return "0";
    }
    if (wall.endCol < LONGEST_LINE - 1) {
        return "$";
    }
    return "";
}

function updateHint(gameState) {
    for (var i = 0; i < gameState.walls.length; i++) {
        var wall = gameState.walls[i];
        if (wall.progress < 60) {
            var hint = hintForWall(wall, gameState);
            if (hint !== "") {
                gameState.hint = hint;
                return;
            }
        }
    }
    gameState.hint = "";
}

// --- Wall Patterns ---

function createRowWall(gameState, startRow, endRow, safeRow, speed, direction) {
    var wall = {
        type: "row",
        id: gameState.nextWallId,
        startRow: startRow,
        endRow: endRow,
        safeRow: safeRow,
        direction: direction,
        speed: speed,
        progress: 0,
        scored: false,
    };
    gameState.nextWallId = gameState.nextWallId + 1;
    gameState.walls.push(wall);
}

function createColumnWall(gameState, startCol, endCol, safeCol, speed, direction) {
    var wall = {
        type: "column",
        id: gameState.nextWallId,
        startCol: startCol,
        endCol: endCol,
        safeCol: safeCol,
        direction: direction,
        speed: speed,
        progress: 0,
        scored: false,
    };
    gameState.nextWallId = gameState.nextWallId + 1;
    gameState.walls.push(wall);
}

// --- Difficulty & Spawning ---

function spawnWall(gameState) {
    var score = gameState.score;
    var totalLines = TEXT_LINES.length;
    var lastRow = totalLines - 1;
    var direction = Math.random() < 0.5 ? "left" : "right";
    var colDirection = Math.random() < 0.5 ? "down" : "up";

    var patterns = buildPatternList(score, totalLines, lastRow);
    var pattern = pickPattern(patterns);

    if (pattern.type === "row_single") {
        var row = targetedRow(gameState);
        createRowWall(gameState, row, row, null, pattern.speed, direction);

    } else if (pattern.type === "row_paragraph") {
        var paragraphIdx = Math.floor(Math.random() * 3);
        var pStart;
        var pEnd;
        if (paragraphIdx === 0) {
            pStart = 0;
            pEnd = PARAGRAPH_BREAKS[0] - 1;
        } else if (paragraphIdx === 1) {
            pStart = PARAGRAPH_BREAKS[0] + 1;
            pEnd = PARAGRAPH_BREAKS[1] - 1;
        } else {
            pStart = PARAGRAPH_BREAKS[1] + 1;
            pEnd = lastRow;
        }
        createRowWall(gameState, pStart, pEnd, null, pattern.speed, direction);

    } else if (pattern.type === "row_all_safe_first") {
        createRowWall(gameState, 0, lastRow, 0, pattern.speed, direction);

    } else if (pattern.type === "row_all_safe_last") {
        createRowWall(gameState, 0, lastRow, lastRow, pattern.speed, direction);

    } else if (pattern.type === "row_all_safe_paragraph") {
        var safeRow = PARAGRAPH_BREAKS[Math.floor(Math.random() * PARAGRAPH_BREAKS.length)];
        createRowWall(gameState, 0, lastRow, safeRow, pattern.speed, direction);

    } else if (pattern.type === "col_single") {
        var col = targetedCol(gameState);
        createColumnWall(gameState, col, col, null, pattern.speed, colDirection);

    } else if (pattern.type === "col_wide") {
        var center = targetedCol(gameState);
        var half = 3 + Math.floor(Math.random() * 4);
        var startCol = Math.max(0, center - half);
        var endCol = Math.min(LONGEST_LINE - 1, center + half);
        createColumnWall(gameState, startCol, endCol, null, pattern.speed, colDirection);

    } else if (pattern.type === "col_all_safe_start") {
        createColumnWall(gameState, 0, LONGEST_LINE - 1, 0, pattern.speed, colDirection);

    } else if (pattern.type === "col_all_safe_end") {
        var safeCol = LONGEST_LINE - 1;
        createColumnWall(gameState, 0, LONGEST_LINE - 1, safeCol, pattern.speed, colDirection);

    } else if (pattern.type === "row_small_group") {
        var center = targetedRow(gameState);
        var startRow = Math.max(0, center - 1);
        var endRow = Math.min(lastRow, center + 1);
        createRowWall(gameState, startRow, endRow, null, pattern.speed, direction);
    }
}

function buildPatternList(score, totalLines, lastRow) {
    var patterns = [];

    patterns.push({ type: "row_single", speed: 20, weight: 3 });

    if (score >= 1) {
        patterns.push({ type: "row_all_safe_first", speed: 15, weight: 2 });
        patterns.push({ type: "row_all_safe_last", speed: 15, weight: 2 });
    }

    if (score >= 2) {
        patterns.push({ type: "col_single", speed: 20, weight: 2 });
    }

    if (score >= 3) {
        patterns.push({ type: "row_all_safe_paragraph", speed: 15, weight: 2 });
        patterns.push({ type: "row_paragraph", speed: 20, weight: 2 });
    }

    if (score >= 5) {
        patterns.push({ type: "col_wide", speed: 18, weight: 2 });
        patterns.push({ type: "row_small_group", speed: 25, weight: 2 });
    }

    if (score >= 7) {
        patterns.push({ type: "col_all_safe_start", speed: 18, weight: 1 });
        patterns.push({ type: "col_all_safe_end", speed: 18, weight: 1 });
    }

    if (score >= 10) {
        patterns.push({ type: "row_single", speed: 30, weight: 2 });
        patterns.push({ type: "col_single", speed: 30, weight: 2 });
    }

    if (score >= 15) {
        patterns.push({ type: "row_small_group", speed: 35, weight: 2 });
        patterns.push({ type: "col_wide", speed: 28, weight: 2 });
    }

    return patterns;
}

function pickPattern(patterns) {
    var totalWeight = 0;
    for (var i = 0; i < patterns.length; i++) {
        totalWeight = totalWeight + patterns[i].weight;
    }
    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    for (var i = 0; i < patterns.length; i++) {
        cumulative = cumulative + patterns[i].weight;
        if (roll < cumulative) {
            return patterns[i];
        }
    }
    return patterns[patterns.length - 1];
}

// --- Wall Updates & Collision ---

function updateWalls(gameState, deltaMs) {
    var remaining = [];
    for (var i = 0; i < gameState.walls.length; i++) {
        var wall = gameState.walls[i];
        wall.progress = wall.progress + (wall.speed * deltaMs) / 1000;

        if (wall.progress >= 100 && !wall.scored) {
            gameState.score = gameState.score + 1;
            wall.scored = true;
        }

        if (wall.progress < 130) {
            remaining.push(wall);
        }
    }
    gameState.walls = remaining;
}

function checkCollision(gameState) {
    var cursorRow = gameState.cursorRow;
    var cursorCol = gameState.cursorCol;
    var cursorPixelX = charX(cursorCol);
    var cursorPixelY = lineY(cursorRow);

    for (var i = 0; i < gameState.walls.length; i++) {
        var wall = gameState.walls[i];

        if (wall.type === "row") {
            if (checkRowCollision(wall, cursorRow, cursorPixelX)) {
                return true;
            }
        } else {
            if (checkColumnCollision(wall, cursorCol, cursorPixelY)) {
                return true;
            }
        }
    }
    return false;
}

function checkRowCollision(wall, cursorRow, cursorPixelX) {
    if (wall.safeRow !== null && cursorRow === wall.safeRow) {
        return false;
    }

    var rowHit = (cursorRow >= wall.startRow && cursorRow <= wall.endRow);
    if (!rowHit) {
        return false;
    }

    var blockLeft = rowWallBlockLeft(wall);
    var blockRight = blockLeft + WALL_BLOCK_COLS * CHAR_WIDTH;

    var cursorLeft = cursorPixelX;
    var cursorRight = cursorPixelX + CHAR_WIDTH;
    return (cursorRight > blockLeft && cursorLeft < blockRight);
}

function checkColumnCollision(wall, cursorCol, cursorPixelY) {
    if (wall.safeCol !== null && cursorCol === wall.safeCol) {
        return false;
    }

    var lineLen = state.lines[state.cursorRow].length;
    if (lineLen === 0) {
        return false;
    }

    var colHit = (cursorCol >= wall.startCol && cursorCol <= wall.endCol);
    if (!colHit) {
        return false;
    }

    var blockTop = colWallBlockTop(wall);
    var blockBottom = blockTop + WALL_BLOCK_ROWS * LINE_HEIGHT;

    var cursorTop = cursorPixelY;
    var cursorBottom = cursorPixelY + LINE_HEIGHT;
    return (cursorBottom > blockTop && cursorTop < blockBottom);
}

// --- Game Loop ---

var lastTimestamp = null;

function gameLoop(timestamp) {
    if (lastTimestamp === null) {
        lastTimestamp = timestamp;
    }
    var deltaMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (!state.gameOver) {
        updateWalls(state, deltaMs);
        updateHint(state);

        if (timestamp - state.lastWallSpawn > state.spawnInterval) {
            spawnWall(state);
            state.lastWallSpawn = timestamp;
            state.spawnInterval = Math.max(2500, 4000 - state.score * 50);
        }

        if (checkCollision(state)) {
            state.gameOver = true;
        }
    }

    render(state);
    requestAnimationFrame(gameLoop);
}

function restartGame() {
    state.cursorRow = 8;
    state.cursorCol = Math.floor(TEXT_LINES[8].length / 2);
    state.pendingKeys = "";
    state.walls = [];
    state.score = 0;
    state.gameOver = false;
    state.lastWallSpawn = 0;
    state.spawnInterval = 4000;
    state.positionHistory = [];
    state.hint = "";
    lastTimestamp = null;
}

function startGame() {
    document.addEventListener("keydown", function (event) {
        handleKeyDown(event, state);
    });

    requestAnimationFrame(gameLoop);
}

startGame();
