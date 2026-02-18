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

var noMash = false;
var lastKey = "";
var startingSpawnInterval = 4000;
var speedMultiplier = 1;
var noTopWalls = false;
var noBottomWalls = false;
var noLeftWalls = false;

var state = {
    lines: TEXT_LINES,
    cursorRow: 8,
    cursorCol: Math.floor(TEXT_LINES[8].length / 2),
    desiredCol: Math.floor(TEXT_LINES[8].length / 2),
    pendingKeys: "",
    walls: [],
    score: 0,
    gameOver: false,
    nextWallId: 0,
    lastWallSpawn: 0,
    spawnInterval: startingSpawnInterval,
    pressedKeyTimer: null,
    positionHistory: [],
    hint: "",
    marks: {},
    jumpMark: null,
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

// --- Input Handling ---

function handleKeyDown(event, gameState) {
    if (gameState.gameOver) {
        if (event.key === "r") {
            restartGame();
        }
        return;
    }

    var key = event.key;

    if (noMash && key === lastKey && key !== "g") {
        return;
    }
    lastKey = key;

    var waitingForChar = isWaitingForChar(gameState.pendingKeys);

    var isVimKey = (
        key === "j" || key === "k" || key === "h" || key === "l" ||
        key === "g" || key === "G" ||
        key === "w" || key === "e" || key === "b" || key === "^" || key === "$" ||
        key === "f" || key === "F" || key === "t" || key === "T" ||
        key === "{" || key === "}" ||
        key === "m" || key === "'" || key === "`" ||
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

    var isVertical = (
        command.action === "down" || command.action === "up" ||
        command.action === "first" || command.action === "last" ||
        command.action === "goto" ||
        command.action === "paragraph_up" || command.action === "paragraph_down"
    );

    executeCommand(command, gameState);
    gameState.pendingKeys = "";

    var lineLen = gameState.lines[gameState.cursorRow].length;
    if (isVertical) {
        if (lineLen === 0) {
            gameState.cursorCol = 0;
        } else {
            gameState.cursorCol = Math.min(gameState.desiredCol, lineLen - 1);
        }
    } else {
        if (lineLen === 0) {
            gameState.cursorCol = 0;
        } else if (gameState.cursorCol >= lineLen) {
            gameState.cursorCol = lineLen - 1;
        }
        gameState.desiredCol = gameState.cursorCol;
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
    if (noLeftWalls) {
        direction = "left";
    }
    var colDirection = Math.random() < 0.5 ? "down" : "up";
    if (noTopWalls && noBottomWalls) {
        colDirection = null;
    } else if (noTopWalls) {
        colDirection = "up";
    } else if (noBottomWalls) {
        colDirection = "down";
    }

    var patterns = buildPatternList(score, totalLines, lastRow);
    if (colDirection === null) {
        var filtered = [];
        for (var i = 0; i < patterns.length; i++) {
            if (patterns[i].type.indexOf("col_") !== 0) {
                filtered.push(patterns[i]);
            }
        }
        patterns = filtered;
    }
    var pattern = pickPattern(patterns);
    pattern.speed = pattern.speed * speedMultiplier;

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
            var rampedInterval = (startingSpawnInterval - state.score * 50) / speedMultiplier;
            var floor = Math.min(startingSpawnInterval, 2500) / speedMultiplier;
            state.spawnInterval = Math.max(floor, rampedInterval);
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
    state.desiredCol = Math.floor(TEXT_LINES[8].length / 2);
    state.pendingKeys = "";
    state.walls = [];
    state.score = 0;
    state.gameOver = false;
    state.lastWallSpawn = 0;
    state.spawnInterval = startingSpawnInterval / speedMultiplier;
    state.positionHistory = [];
    state.hint = "";
    state.marks = {};
    state.jumpMark = null;
    lastTimestamp = null;
}

function applyCustomText(text) {
    var rawLines = text.split("\n");
    if (rawLines.length === 0 || (rawLines.length === 1 && rawLines[0] === "")) {
        return;
    }
    while (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
        rawLines.pop();
    }

    TEXT_LINES = rawLines;

    LONGEST_LINE = 0;
    for (var i = 0; i < TEXT_LINES.length; i++) {
        if (TEXT_LINES[i].length > LONGEST_LINE) {
            LONGEST_LINE = TEXT_LINES[i].length;
        }
    }
    TOTAL_COLS = GUTTER_CHARS + LONGEST_LINE;

    canvas.width = 2 * WALL_MARGIN + PADDING_LEFT * 2 + TOTAL_COLS * CHAR_WIDTH;
    canvas.height = 2 * WALL_MARGIN + PADDING_TOP * 2 + TEXT_LINES.length * LINE_HEIGHT + 24;

    PARAGRAPH_BREAKS = [];
    for (var i = 0; i < TEXT_LINES.length; i++) {
        if (TEXT_LINES[i].trim() === "") {
            PARAGRAPH_BREAKS.push(i);
        }
    }

    state.lines = TEXT_LINES;
    var startRow = Math.min(8, TEXT_LINES.length - 1);
    state.cursorRow = startRow;
    state.cursorCol = Math.floor(TEXT_LINES[startRow].length / 2);
    state.desiredCol = state.cursorCol;

    restartGame();
}

function initSettings() {
    var colsInput = document.getElementById("cols-val");
    var rowsInput = document.getElementById("rows-val");
    var spawnInput = document.getElementById("spawn-interval-val");
    var noMashInput = document.getElementById("no-mash");
    var speedInput = document.getElementById("speed-val");

    WALL_BLOCK_COLS = parseInt(colsInput.value, 10);
    WALL_BLOCK_ROWS = parseInt(rowsInput.value, 10);
    startingSpawnInterval = parseInt(spawnInput.value, 10);
    noMash = noMashInput.checked;
    speedMultiplier = parseFloat(speedInput.value) || 1;

    colsInput.addEventListener("input", function () {
        WALL_BLOCK_COLS = parseInt(this.value, 10);
    });
    rowsInput.addEventListener("input", function () {
        WALL_BLOCK_ROWS = parseInt(this.value, 10);
    });
    spawnInput.addEventListener("input", function () {
        startingSpawnInterval = parseInt(this.value, 10);
    });
    noMashInput.addEventListener("change", function () {
        noMash = this.checked;
    });
    speedInput.addEventListener("input", function () {
        speedMultiplier = parseFloat(this.value) || 1;
    });

    var noTopInput = document.getElementById("no-top-walls");
    var noBottomInput = document.getElementById("no-bottom-walls");
    var noLeftInput = document.getElementById("no-left-walls");
    noTopWalls = noTopInput.checked;
    noBottomWalls = noBottomInput.checked;
    noLeftWalls = noLeftInput.checked;
    noTopInput.addEventListener("change", function () {
        noTopWalls = this.checked;
    });
    noBottomInput.addEventListener("change", function () {
        noBottomWalls = this.checked;
    });
    noLeftInput.addEventListener("change", function () {
        noLeftWalls = this.checked;
    });

    var customTextInput = document.getElementById("custom-text");
    var applyTextBtn = document.getElementById("apply-text");
    applyTextBtn.addEventListener("click", function () {
        applyCustomText(customTextInput.value);
    });

    var overlay = document.getElementById("settings-overlay");
    var hamburger = document.getElementById("hamburger-btn");
    hamburger.addEventListener("click", function () {
        overlay.classList.toggle("open");
    });
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
            overlay.classList.remove("open");
        }
    });
}

function startGame() {
    var shiftKeyEl = document.querySelector('.kb-key[data-key="Shift"]');
    var shiftedSymbols = {
        "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
        "6": "^", "7": "&", "8": "*", "9": "(", "0": ")",
        "[": "{", "]": "}"
    };
    var allKeys = document.querySelectorAll(".kb-key:not(.kb-shift)");

    function updateKeyLabels(shifted) {
        for (var i = 0; i < allKeys.length; i++) {
            var el = allKeys[i];
            var dataKey = el.getAttribute("data-key");
            if (shiftedSymbols[dataKey]) {
                el.textContent = shifted ? shiftedSymbols[dataKey] : dataKey;
            } else if (dataKey.length === 1 && dataKey >= "a" && dataKey <= "z") {
                el.textContent = shifted ? dataKey.toUpperCase() : dataKey;
            }
        }
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Shift") {
            shiftKeyEl.classList.add("pressed");
            updateKeyLabels(true);
        }
        handleKeyDown(event, state);
    });
    document.addEventListener("keyup", function (event) {
        if (event.key === "Shift") {
            shiftKeyEl.classList.remove("pressed");
            updateKeyLabels(false);
        }
    });

    initSettings();
    requestAnimationFrame(gameLoop);
}

startGame();
