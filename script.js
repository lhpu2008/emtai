/* ==========================================================================
   STAR CHECKERS PRO - CORE GAME ENGINE & AI BRAIN
   ========================================================================== */

// Geometry Constants
const SPACER = 26; // Distance between adjacent hole centers in pixels
const H = SPACER * Math.sqrt(3) / 2; // Vertical distance between adjacent rows

// 121 Valid Holes Row Layout on Chinese Checkers star board
const BOARD_ROWS = [
    { r: 0, cols: [0] },
    { r: 1, cols: [-0.5, 0.5] },
    { r: 2, cols: [-1, 0, 1] },
    { r: 3, cols: [-1.5, -0.5, 0.5, 1.5] },
    { r: 4, cols: [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] },
    { r: 5, cols: [-5.5, -4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.5, 5.5] },
    { r: 6, cols: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] },
    { r: 7, cols: [-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.5] },
    { r: 8, cols: [-4, -3, -2, -1, 0, 1, 2, 3, 4] },
    { r: 9, cols: [-4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.5] },
    { r: 10, cols: [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5] },
    { r: 11, cols: [-5.5, -4.5, -3.5, -2.5, -1.5, -0.5, 0.5, 1.5, 2.5, 3.5, 4.5, 5.5] },
    { r: 12, cols: [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6] },
    { r: 13, cols: [-1.5, -0.5, 0.5, 1.5] },
    { r: 14, cols: [-1, 0, 1] },
    { r: 15, cols: [-0.5, 0.5] },
    { r: 16, cols: [0] }
];

// Map of 6 Players Starting/Target Zones, Colors, and Tips
const PLAYER_CONFIGS = {
    1: { name: '红色 (顶部)', color: 'var(--color-p1)', startZone: 1, targetZone: 4, tip: { r: 0, c: 0 }, targetTip: { r: 16, c: 0 }, gradient: 'url(#grad-p1)', glow: 'var(--color-p1-glow)' },
    2: { name: '橙色 (右上)', color: 'var(--color-p2)', startZone: 2, targetZone: 5, tip: { r: 7, c: 4.5 }, targetTip: { r: 9, c: -4.5 }, gradient: 'url(#grad-p2)', glow: 'var(--color-p2-glow)' },
    3: { name: '绿色 (右下)', color: 'var(--color-p3)', startZone: 3, targetZone: 6, tip: { r: 12, c: 4.5 }, targetTip: { r: 4, c: -4.5 }, gradient: 'url(#grad-p3)', glow: 'var(--color-p3-glow)' },
    4: { name: '蓝色 (底部)', color: 'var(--color-p4)', startZone: 4, targetZone: 1, tip: { r: 16, c: 0 }, targetTip: { r: 0, c: 0 }, gradient: 'url(#grad-p4)', glow: 'var(--color-p4-glow)' },
    5: { name: '紫色 (左下)', color: 'var(--color-p5)', startZone: 5, targetZone: 2, tip: { r: 9, c: -4.5 }, targetTip: { r: 7, c: 4.5 }, gradient: 'url(#grad-p5)', glow: 'var(--color-p5-glow)' },
    6: { name: '粉色 (左上)', color: 'var(--color-p6)', startZone: 6, targetZone: 3, tip: { r: 4, c: -4.5 }, targetTip: { r: 12, c: 4.5 }, gradient: 'url(#grad-p6)', glow: 'var(--color-p6-glow)' }
};

// 6 Hexagonal Directions offsets in grid coordinate space
const DIRECTIONS = [
    { dr: 0, dc: 1, dx: SPACER, dy: 0 },         // East
    { dr: 0, dc: -1, dx: -SPACER, dy: 0 },       // West
    { dr: -1, dc: 0.5, dx: SPACER/2, dy: -H },   // Northeast
    { dr: 1, dc: -0.5, dx: -SPACER/2, dy: H },   // Southwest
    { dr: -1, dc: -0.5, dx: -SPACER/2, dy: -H }, // Northwest
    { dr: 1, dc: 0.5, dx: SPACER/2, dy: H }      // Southeast
];

// Game State Storage
let holesList = [];      // 121 valid hole objects: { r, c, x, y, zone }
let holesMap = new Map(); // key 'r,c' -> hole object
let boardState = {};    // key 'r,c' -> player ID (1-6) or 0 (empty)
let seats = {};         // player ID (1-6) -> 'human' | 'ai-easy' | 'ai-medium' | 'ai-hard' | 'none'
let activePlayer = 1;   // Currently active turn player ID (1/Red defaults)
let selectedMarble = null; // selected coordinate { r, c }
let validMoves = [];    // list of valid moves for selection: { r, c, path }
let gameStarted = false;
let winners = [];       // array of player IDs who won
let moveHistory = [];   // Undo states
let turnTimer = null;
let timeLeft = 20;
let soundEnabled = true;
let jumpRule = 'standard'; // 'standard' | 'super' (Long jump)

// Web Audio API Synthesizer Context
let audioCtx = null;

// Initialize when DOM loads
window.addEventListener("DOMContentLoaded", () => {
    initHoles();
    renderBoardBase();
    loadSeats();
    bindEvents();
    updateLobbyStatus("就绪", "online");
});

// Synthesize custom sound effects using Web Audio API
function playSound(type) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (type === 'select') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.start(now);
            osc.stop(now + 0.07);
        } else if (type === 'hop') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(450, now);
            osc.frequency.exponentialRampToValueAtTime(900, now + 0.08);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc.start(now);
            osc.stop(now + 0.09);
        } else if (type === 'win') {
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6 Chord
            notes.forEach((freq, i) => {
                const subOsc = audioCtx.createOscillator();
                const subGain = audioCtx.createGain();
                subOsc.connect(subGain);
                subGain.connect(audioCtx.destination);
                
                subOsc.type = 'sine';
                subOsc.frequency.setValueAtTime(freq, now + i * 0.1);
                subGain.gain.setValueAtTime(0.1, now + i * 0.1);
                subGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
                
                subOsc.start(now + i * 0.1);
                subOsc.stop(now + i * 0.1 + 0.45);
            });
        } else if (type === 'reset') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, now);
            osc.frequency.linearRampToValueAtTime(300, now + 0.25);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.26);
        }
    } catch (e) {
        console.warn("Audio Context init failed or blocked:", e);
    }
}

// Generate the 121 valid star board holes with Cartesian coordinates
function initHoles() {
    holesList = [];
    holesMap.clear();

    BOARD_ROWS.forEach(row => {
        const r = row.r;
        row.cols.forEach(c => {
            const x = c * SPACER;
            const y = (r - 8) * H; // Center vertically at row 8
            const zone = getHoleZone(r, c);

            const hole = { r, c, x, y, zone };
            holesList.push(hole);
            holesMap.set(`${r},${c}`, hole);
        });
    });
}

// Determine which of the 6 star points or the central hexagon a hole belongs to
function getHoleZone(r, c) {
    if (r >= 0 && r <= 3) return 1; // Top star point
    if (r >= 13 && r <= 16) return 4; // Bottom star point
    if (r >= 4 && r <= 7) {
        if (c <= -0.5 * r - 1) return 6; // Upper Left star point
        if (c >= 0.5 * r + 1) return 2;  // Upper Right star point
    }
    if (r >= 9 && r <= 12) {
        if (c <= 0.5 * r - 9) return 5;  // Lower Left star point
        if (c >= -0.5 * r + 9) return 3; // Lower Right star point
    }
    return 0; // Central Hexagon
}

// Draw the grid connection lines and hole elements inside the SVG
function renderBoardBase() {
    const connectionsG = document.getElementById("board-connections");
    const holesG = document.getElementById("board-holes");

    connectionsG.innerHTML = "";
    holesG.innerHTML = "";

    // 1. Draw connection lattice lines (East, Southeast, Southwest neighbors only to avoid overlap)
    holesList.forEach(h => {
        const neighbors = [
            { dr: 0, dc: 1 },    // East
            { dr: 1, dc: 0.5 },  // Southeast
            { dr: 1, dc: -0.5 }  // Southwest
        ];

        neighbors.forEach(n => {
            const nr = h.r + n.dr;
            const nc = h.c + n.dc;
            const target = holesMap.get(`${nr},${nc}`);
            if (target) {
                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", h.x);
                line.setAttribute("y1", h.y);
                line.setAttribute("x2", target.x);
                line.setAttribute("y2", target.y);
                line.setAttribute("class", "board-line");
                connectionsG.appendChild(line);
            }
        });
    });

    // 2. Draw circular holes
    holesList.forEach(h => {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", h.x);
        circle.setAttribute("cy", h.y);
        circle.setAttribute("r", 9.5);
        circle.setAttribute("class", "board-hole");
        circle.setAttribute("data-key", `${h.r},${h.c}`);

        // Custom stroke highlight for player base areas
        if (h.zone > 0) {
            const config = PLAYER_CONFIGS[h.zone];
            circle.style.stroke = config.color;
            circle.style.strokeWidth = "1.5px";
        }

        holesG.appendChild(circle);
    });
}

// Read configurations of seats from HTML select elements
function loadSeats() {
    for (let p = 1; p <= 6; p++) {
        const select = document.getElementById(`seat-${p}`);
        seats[p] = select.value;
    }
}

// Bind UI controls events listeners
function bindEvents() {
    document.getElementById("btn-start-game").addEventListener("click", startGame);
    document.getElementById("btn-reset-game").addEventListener("click", resetBoard);
    document.getElementById("btn-undo").addEventListener("click", undoMove);
    document.getElementById("btn-sound").addEventListener("click", toggleSound);
    document.getElementById("btn-rules").addEventListener("click", () => toggleModal(true));
    document.getElementById("btn-close-modal").addEventListener("click", () => toggleModal(false));
    document.getElementById("btn-modal-close-ok").addEventListener("click", () => toggleModal(false));
    
    // Autoplay toggle
    document.getElementById("btn-autoplay").addEventListener("click", toggleAutoplay);

    // Rule selectors
    const ruleRadio = document.getElementsByName("jump-rule");
    ruleRadio.forEach(radio => {
        radio.addEventListener("change", (e) => {
            jumpRule = e.target.value;
            logSystem(`规则已更新：当前使用 [${jumpRule === 'standard' ? '标准相邻跳' : '超视距空投跳'}] 规则`);
        });
    });

    // Seat changes immediately sync
    for (let p = 1; p <= 6; p++) {
        const select = document.getElementById(`seat-${p}`);
        select.addEventListener("change", () => {
            loadSeats();
            updateSeatStyling();
            updateLeaderboard();
        });
    }
}

// Toggle sound control
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById("btn-sound");
    if (soundEnabled) {
        btn.classList.remove("active-tool");
        btn.querySelector(".tool-icon").innerText = "🔊";
        btn.querySelector(".tool-lbl").innerText = "音效";
    } else {
        btn.classList.add("active-tool");
        btn.querySelector(".tool-icon").innerText = "🔇";
        btn.querySelector(".tool-lbl").innerText = "静音";
    }
}

// Toggle rule modal overlay
function toggleModal(open) {
    const modal = document.getElementById("modal-rules-overlay");
    if (open) {
        modal.classList.add("open");
    } else {
        modal.classList.remove("open");
    }
}

// Autoplay (Full AI Simulation mode toggle)
let autoplayActive = false;
function toggleAutoplay() {
    autoplayActive = !autoplayActive;
    const btn = document.getElementById("btn-autoplay");
    if (autoplayActive) {
        btn.classList.add("active-tool");
        logSystem("🤖 全自动 AI 代理对战已开启，大厅进入高能对攻态势！");
        if (gameStarted) triggerAITurn();
    } else {
        btn.classList.remove("active-tool");
        logSystem("🤖 AI 代理已关闭，席位控制权回归人类。");
    }
}

// Start Game and place marbles into their starting triangles
function startGame() {
    loadSeats();
    
    // Count active seats (seats != 'none')
    let activeSeatsCount = 0;
    for (let p = 1; p <= 6; p++) {
        if (seats[p] !== 'none') activeSeatsCount++;
    }

    if (activeSeatsCount < 2) {
        showToast("至少需要两个活动席位！");
        return;
    }

    playSound('reset');
    
    // Reset core states
    boardState = {};
    winners = [];
    moveHistory = [];
    selectedMarble = null;
    validMoves = [];
    
    // Generate valid empty state
    holesList.forEach(h => {
        boardState[`${h.r},${h.c}`] = 0;
    });

    // Populate active players starting marbles
    for (let p = 1; p <= 6; p++) {
        if (seats[p] !== 'none') {
            holesList.forEach(h => {
                if (h.zone === p) {
                    boardState[`${h.r},${h.c}`] = p; // Occupied by player p
                }
            });
        }
    }

    gameStarted = true;
    
    // Determine who goes first: search clockwise from Player 1 (Red / Top)
    activePlayer = 1;
    if (seats[activePlayer] === 'none') {
        activePlayer = getNextPlayer(1);
    }

    // Sync active seat configuration visuals
    updateSeatStyling();

    // Pulse active Turn banner visual updates instantly on game start
    const activeDot = document.getElementById("active-turn-dot");
    const activeText = document.getElementById("active-turn-text");
    const config = PLAYER_CONFIGS[activePlayer];
    activeDot.className = `active-badge player-${activePlayer}-bg`;
    const isAI = isPlayerAI(activePlayer);
    activeText.innerText = `${config.name} (${isAI ? seats[activePlayer].replace('ai-', 'AI-').toUpperCase() : '人类'}) 的回合`;

    logSystem(`⚔️ 极光争霸开局！首轮由 [${config.name}] 掷子出发。`);
    updateLobbyStatus("激烈对局中", "busy");
    
    renderBoard();
    updateLeaderboard();
    startTurnTimer();

    // Trigger first move if active player is AI or Autoplay is active
    if (isPlayerAI(activePlayer) || autoplayActive) {
        setTimeout(triggerAITurn, 600);
    }
}

// Update lobby network status badge
function updateLobbyStatus(text, type) {
    const label = document.getElementById("lobby-status");
    const indicator = label.previousElementSibling;
    label.innerText = text;
    indicator.className = `status-indicator ${type}`;
}

// Stylize configure panel active seat indicators
function updateSeatStyling() {
    for (let p = 1; p <= 6; p++) {
        const item = document.querySelector(`.seat-item[data-player="${p}"]`);
        if (gameStarted && p === activePlayer) {
            item.classList.add("active-play");
        } else {
            item.classList.remove("active-play");
        }
    }
}

// Reset Board back to blank state
function resetBoard() {
    gameStarted = false;
    autoplayActive = false;
    clearInterval(turnTimer);
    document.getElementById("btn-autoplay").classList.remove("active-tool");
    
    boardState = {};
    winners = [];
    moveHistory = [];
    selectedMarble = null;
    validMoves = [];

    holesList.forEach(h => {
        boardState[`${h.r},${h.c}`] = 0;
    });

    renderBoard();
    updateSeatStyling();
    updateLeaderboard();
    
    document.getElementById("turn-banner").className = "active-turn-alert";
    document.getElementById("active-turn-dot").className = "active-badge player-1-bg";
    document.getElementById("active-turn-text").innerText = "请配置席位并开始对局";
    document.getElementById("timer-sec").innerText = "20";
    
    updateLobbyStatus("大厅空闲中", "online");
    logSystem("🔄 大厅战棋重置完成。清空星盘，等待再次开战。");
}

// Helper to check if a hole contains a marble
function hasMarble(r, c) {
    return boardState[`${r},${c}`] > 0;
}

// Helper to check if coordinates are within the 121 valid star holes list
function isValidHole(r, c) {
    return holesMap.has(`${r},${c}`);
}

// Check if a seat is played by AI
function isPlayerAI(player) {
    const role = seats[player];
    return role && role.startsWith('ai');
}

// Core Render method: Redraw marbles, active paths, and highlights on the SVG
function renderBoard() {
    const marblesG = document.getElementById("board-marbles");
    const indicatorsG = document.getElementById("board-indicators");

    marblesG.innerHTML = "";
    indicatorsG.innerHTML = "";

    // 1. Draw Marbles
    holesList.forEach(h => {
        const p = boardState[`${h.r},${h.c}`];
        if (p > 0) {
            const config = PLAYER_CONFIGS[p];
            const isSelectable = gameStarted && (activePlayer === p) && !isPlayerAI(p) && !autoplayActive;

            if (activePlayer === p && !isSelectable && gameStarted) {
                console.warn(`[DEBUG] activePlayer ${activePlayer} marble at (${h.r}, ${h.c}) is NOT selectable. p=${p}, isPlayerAI(p)=${isPlayerAI(p)}, autoplayActive=${autoplayActive}, seats=${JSON.stringify(seats)}`);
            }

            const marbleG = document.createElementNS("http://www.w3.org/2000/svg", "g");
            marbleG.setAttribute("class", "marble-group");

            const marble = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            marble.setAttribute("cx", h.x);
            marble.setAttribute("cy", h.y);
            marble.setAttribute("r", 9);
            marble.setAttribute("fill", config.gradient);
            
            // Marble glow colors variables
            marble.style.setProperty("--glow-color", config.glow);
            
            let marbleClass = "marble";
            if (!isSelectable && gameStarted) {
                marbleClass += " inactive-marble";
            }
            if (selectedMarble && selectedMarble.r === h.r && selectedMarble.c === h.c) {
                marbleClass += " selected";
                marble.setAttribute("filter", "url(#glow-filter)");
            }
            marble.setAttribute("class", marbleClass);

            // Marble Events (Only trigger for human on their turns)
            if (isSelectable) {
                marble.addEventListener("click", (e) => {
                    e.stopPropagation();
                    selectMarble(h.r, h.c);
                });
            }

            marbleG.appendChild(marble);
            marblesG.appendChild(marbleG);
        }
    });

    // 2. Draw active indicators & Jump paths
    if (selectedMarble && validMoves.length > 0) {
        validMoves.forEach(mv => {
            const targetHole = holesMap.get(`${mv.r},${mv.c}`);
            if (targetHole) {
                // Outer dotted ring visual helper
                const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                ring.setAttribute("cx", targetHole.x);
                ring.setAttribute("cy", targetHole.y);
                ring.setAttribute("r", 9.5);
                ring.setAttribute("class", "valid-indicator");
                
                // Color ring based on active player
                const playerColor = PLAYER_CONFIGS[activePlayer].color;
                ring.style.stroke = playerColor;

                // Click target indicator to move!
                ring.addEventListener("click", (e) => {
                    e.stopPropagation();
                    executeMove(selectedMarble, { r: mv.r, c: mv.c }, mv.path);
                });

                indicatorsG.appendChild(ring);

                // Draw connecting jumping arc helper paths if jump count > 0
                if (mv.path.length > 1) {
                    const travelPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
                    let pathD = "";
                    mv.path.forEach((ptStr, idx) => {
                        const pt = holesMap.get(ptStr);
                        if (pt) {
                            if (idx === 0) pathD += `M ${pt.x} ${pt.y}`;
                            else {
                                // Draw arched cubic bezier curves to look beautiful
                                const prev = holesMap.get(mv.path[idx - 1]);
                                const midX = (prev.x + pt.x) / 2;
                                const midY = (prev.y + pt.y) / 2 - 18; // arch up slightly
                                pathD += ` Q ${midX} ${midY}, ${pt.x} ${pt.y}`;
                            }
                        }
                    });
                    
                    // Final segment to landing dot
                    const prev = holesMap.get(mv.path[mv.path.length - 1]);
                    const midX = (prev.x + targetHole.x) / 2;
                    const midY = (prev.y + targetHole.y) / 2 - 18;
                    pathD += ` Q ${midX} ${midY}, ${targetHole.x} ${targetHole.y}`;

                    travelPath.setAttribute("d", pathD);
                    travelPath.setAttribute("class", "path-travel");
                    travelPath.style.stroke = playerColor;
                    indicatorsG.appendChild(travelPath);
                }
            }
        });
    }
}

// Select a marble to display valid hops
function selectMarble(r, c) {
    if (!gameStarted) return;
    
    playSound('select');

    if (selectedMarble && selectedMarble.r === r && selectedMarble.c === c) {
        selectedMarble = null;
        validMoves = [];
    } else {
        selectedMarble = { r, c };
        validMoves = calculateValidMoves(r, c);
    }
    renderBoard();
}

// Compute all valid landing locations for a marble
function calculateValidMoves(r, c) {
    const moves = [];

    // 1. Single Step adjacent moves (East, West, Northeast, Southwest, Northwest, Southeast)
    DIRECTIONS.forEach(d => {
        const nr = r + d.dr;
        const nc = c + d.dc;
        
        if (isValidHole(nr, nc) && !hasMarble(nr, nc)) {
            // Verify anti-retrograde rule: if a marble is already inside its TARGET camp, it should try NOT to leave
            if (isEnteringOrStayingInTarget(activePlayer, r, c, nr, nc)) {
                moves.push({ r: nr, c: nc, path: [`${r},${c}`] });
            }
        }
    });

    // 2. Jump moves (BFS recursive exploration)
    const visited = new Set();
    const jumpTargets = getValidJumps(r, c, visited);
    
    jumpTargets.forEach(jt => {
        if (isEnteringOrStayingInTarget(activePlayer, r, c, jt.r, jt.c)) {
            moves.push(jt);
        }
    });

    return moves;
}

// Anti-retrograde rule safeguarding: once in target camp, don't jump out back to hex center
function isEnteringOrStayingInTarget(player, fromR, fromC, toR, toC) {
    const config = PLAYER_CONFIGS[player];
    const fromHole = holesMap.get(`${fromR},${fromC}`);
    const toHole = holesMap.get(`${toR},${toC}`);

    if (!fromHole || !toHole) return false;

    // If starting from outside target zone, moving into target is always fine
    if (fromHole.zone !== config.targetZone) {
        return true;
    }
    
    // If starting inside target zone, target landing spot MUST also be inside target zone!
    return toHole.zone === config.targetZone;
}

// Breadth-First-Search standard jump paths logic
function getValidJumps(r, c, visited = new Set(), currentPath = []) {
    let jumps = [];
    const key = `${r},${c}`;
    
    if (currentPath.length === 0) {
        currentPath.push(key);
    }
    visited.add(key);

    if (jumpRule === 'standard') {
        // Standard Chinese Checkers: jump over exactly 1 adjacent marble
        DIRECTIONS.forEach(d => {
            const stepR = r + d.dr;
            const stepC = c + d.dc;
            const jumpR = r + 2 * d.dr;
            const jumpC = c + 2 * d.dc;

            if (hasMarble(stepR, stepC) && isValidHole(jumpR, jumpC) && !hasMarble(jumpR, jumpC)) {
                const jumpKey = `${jumpR},${jumpC}`;
                if (!visited.has(jumpKey)) {
                    const newPath = [...currentPath];
                    jumps.push({ r: jumpR, c: jumpC, path: newPath });
                    
                    // Recursive multi-step search
                    const subJumps = getValidJumps(jumpR, jumpC, visited, [...newPath, jumpKey]);
                    jumps = jumps.concat(subJumps);
                }
            }
        });
    } else {
        // Super/Long Jump Chinese Checkers rule: jump over marble at any distance symmetrical
        DIRECTIONS.forEach(d => {
            let step = 1;
            let foundObstacle = null;
            let spacesAfterObstacle = 0;

            // Search along the straight direction
            while (true) {
                const tr = r + step * d.dr;
                const tc = c + step * d.dc;

                if (!isValidHole(tr, tc)) break;

                const occupied = hasMarble(tr, tc);
                if (occupied) {
                    if (foundObstacle) {
                        // Found a second marble along path, block super jump
                        break;
                    } else {
                        // Found first obstacle marble!
                        foundObstacle = { r: tr, c: tc, dist: step };
                    }
                } else {
                    if (foundObstacle) {
                        // Count empty spaces after our jump target
                        spacesAfterObstacle++;
                        // Symmetrical match check: distance from start to marble must equal distance from marble to empty landing hole
                        if (spacesAfterObstacle === foundObstacle.dist) {
                            const jumpKey = `${tr},${tc}`;
                            if (!visited.has(jumpKey)) {
                                const newPath = [...currentPath];
                                jumps.push({ r: tr, c: tc, path: newPath });
                                
                                const subJumps = getValidJumps(tr, tc, visited, [...newPath, jumpKey]);
                                jumps = jumps.concat(subJumps);
                            }
                            break; // Stop evaluating further along this ray
                        }
                    }
                }
                step++;
            }
        });
    }

    return jumps;
}

// Move Execution trigger
function executeMove(from, to, path) {
    // 1. Record history state for Undo
    moveHistory.push({
        board: JSON.parse(JSON.stringify(boardState)),
        activePlayer: activePlayer,
        winners: [...winners]
    });

    // 2. Perform the leap
    const p = boardState[`${from.r},${from.c}`];
    boardState[`${from.r},${from.c}`] = 0;
    boardState[`${to.r},${to.c}`] = p;

    // 3. Play sound effects
    if (path.length > 2) {
        // Double consecutive jump sound
        playSound('hop');
        setTimeout(() => playSound('hop'), 150);
    } else {
        playSound('hop');
    }

    logMove(p, from, to, path.length > 1);

    // 4. Reset select flags
    selectedMarble = null;
    validMoves = [];
    
    renderBoard();

    // 5. Check if active player won
    checkPlayerWinning(p);

    // 6. Check if game is completely finished
    if (checkGameCompletion()) {
        endGameSummary();
        return;
    }

    // 7. Advance turn to next player
    advanceTurn();
}

// Dynamic game log output
function logMove(player, from, to, isJump) {
    const config = PLAYER_CONFIGS[player];
    const logBox = document.getElementById("log-box");
    
    const item = document.createElement("div");
    item.className = `log-item p${player}-log`;
    
    const typeText = isJump ? "折线折跃" : "单步滑动";
    item.innerHTML = `<strong>${config.name}</strong> 的一颗棋子从 <span class="coordinate">(${from.r}, ${from.c})</span> ${typeText} 至 <span class="coordinate">(${to.r}, ${to.c})</span>`;
    
    logBox.appendChild(item);
    logBox.scrollTop = logBox.scrollHeight;
}

function logSystem(text) {
    const logBox = document.getElementById("log-box");
    const item = document.createElement("div");
    item.className = `log-item system-log`;
    item.innerHTML = `⚠️ ${text}`;
    logBox.appendChild(item);
    logBox.scrollTop = logBox.scrollHeight;
}

// Verify if a player has successfully occupied all 10 holes in their target opposite triangle
function checkPlayerWinning(player) {
    if (winners.includes(player)) return;

    const config = PLAYER_CONFIGS[player];
    let targetFilledCount = 0;

    holesList.forEach(h => {
        if (h.zone === config.targetZone) {
            if (boardState[`${h.r},${h.c}`] === player) {
                targetFilledCount++;
            }
        }
    });

    if (targetFilledCount === 10) {
        winners.push(player);
        playSound('win');
        showToast(`🎉 恭喜！ [${config.name}] 率先完成星盘大合围，荣登英雄榜！`);
        logSystem(`🏆 [${config.name}] 完成全部 10 颗棋子合围！锁定第 ${winners.length} 名！`);
        updateLeaderboard();
    }
}

// Calculate the number of marbles inside target camp for progress bars
function getTargetZoneCount(player) {
    const config = PLAYER_CONFIGS[player];
    let count = 0;
    holesList.forEach(h => {
        if (h.zone === config.targetZone && boardState[`${h.r},${h.c}`] === player) {
            count++;
        }
    });
    return count;
}

// Verify if all players except one have won/finished
function checkGameCompletion() {
    let activePlayingCount = 0;
    for (let p = 1; p <= 6; p++) {
        if (seats[p] !== 'none' && !winners.includes(p)) {
            activePlayingCount++;
        }
    }
    return activePlayingCount <= 0; // If all players won or only 1 remains, game is done!
}

// Finish game alert summary
function endGameSummary() {
    gameStarted = false;
    clearInterval(turnTimer);
    updateLobbyStatus("对局结束", "online");

    let summaryText = "🏆 星盘争夺战最终名次如下：\n";
    winners.forEach((p, idx) => {
        summaryText += `${idx + 1}. [${PLAYER_CONFIGS[p].name}]\n`;
    });

    showToast("🎉 对局圆满结束！");
    logSystem("🏁 战事终结。感谢各方英豪在极光星盘贡献的高超博弈！");
}

// Turn advancement selector
function advanceTurn() {
    clearInterval(turnTimer);
    
    // Find next active player that hasn't won yet
    const nextPlayer = getNextPlayer(activePlayer);
    activePlayer = nextPlayer;

    // Pulse active Turn banner
    const banner = document.getElementById("turn-banner");
    const activeText = document.getElementById("active-turn-text");
    const activeDot = document.getElementById("active-turn-dot");
    const config = PLAYER_CONFIGS[activePlayer];

    activeDot.className = `active-badge player-${activePlayer}-bg`;
    
    const isAI = isPlayerAI(activePlayer);
    activeText.innerText = `${config.name} (${isAI ? seats[activePlayer].replace('ai-', 'AI-').toUpperCase() : '人类'}) 的回合`;

    updateSeatStyling();
    startTurnTimer();

    // Trigger AI logic if turn is AI
    if (isAI || autoplayActive) {
        const delay = Math.random() * 500 + 400; // Realistic deliberation delay
        setTimeout(triggerAITurn, delay);
    }
}

// Clockwise search for next player
function getNextPlayer(current) {
    let next = current;
    while (true) {
        next = next + 1;
        if (next > 6) next = 1;
        
        // Break if player is configured and has not won yet
        if (seats[next] !== 'none' && !winners.includes(next)) {
            return next;
        }
        
        // Break out of loop if we looped back entirely (infinite loop protection)
        if (next === current) return current;
    }
}

// Turn time circular countdown timer controller
function startTurnTimer() {
    clearInterval(turnTimer);
    timeLeft = 20;
    document.getElementById("timer-sec").innerText = timeLeft;
    
    const circle = document.querySelector(".timer-ring-circle");
    circle.style.strokeDashoffset = 0;

    turnTimer = setInterval(() => {
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(turnTimer);
            logSystem(`⏰ [${PLAYER_CONFIGS[activePlayer].name}] 对局思考超时，系统强制顺延至下一家！`);
            advanceTurn();
            return;
        }
        
        document.getElementById("timer-sec").innerText = timeLeft;
        
        // Update circular ring offset (dashoffset goes 0 -> 94.2)
        const pct = (20 - timeLeft) / 20;
        circle.style.strokeDashoffset = pct * 94.2;
    }, 1000);
}

// Undo move listener
function undoMove() {
    if (moveHistory.length === 0) {
        showToast("没有更早的历史记录可以悔棋！");
        return;
    }

    playSound('reset');
    const prev = moveHistory.pop();
    boardState = prev.board;
    activePlayer = prev.activePlayer;
    winners = prev.winners;

    // Reset selected flags
    selectedMarble = null;
    validMoves = [];

    logSystem("↩️ 执行悔棋成功，对局时光倒流一回合。");

    // Redraw
    renderBoard();
    updateSeatStyling();
    updateLeaderboard();
    startTurnTimer();
}

// Toast alerts helper
function showToast(msg) {
    const el = document.getElementById("toast-el");
    el.innerText = msg;
    el.classList.add("show-toast");
    
    setTimeout(() => {
        el.classList.remove("show-toast");
    }, 2800);
}

// Leaderboard list render controller
function updateLeaderboard() {
    const boardBox = document.getElementById("leaderboard-box");
    boardBox.innerHTML = "";

    // Generate and sort leaderboard rows
    const list = [];
    for (let p = 1; p <= 6; p++) {
        if (seats[p] !== 'none') {
            const progress = getTargetZoneCount(p);
            const isWinner = winners.includes(p);
            const rankIndex = winners.indexOf(p);
            
            list.push({
                player: p,
                progress: progress,
                isWinner: isWinner,
                rank: isWinner ? rankIndex + 1 : 99,
                name: PLAYER_CONFIGS[p].name,
                roleName: getRoleChineseName(seats[p]),
                color: PLAYER_CONFIGS[p].color
            });
        }
    }

    // Sort by: Rank ascending, then Progress descending
    list.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        return b.progress - a.progress;
    });

    list.forEach(item => {
        const row = document.createElement("div");
        row.className = `leader-row ${item.isWinner ? 'won-player' : ''}`;
        row.setAttribute("data-player", item.player);

        const rankDisplay = item.isWinner ? `🥇 第${item.rank}名` : "--";
        const progressPct = (item.progress / 10) * 100;

        row.innerHTML = `
            <span class="leader-rank">${rankDisplay}</span>
            <span class="leader-avatar player-${item.player}-bg"></span>
            <div class="leader-info">
                <span class="leader-name" style="color: ${item.color}">${item.name}</span>
                <span class="leader-role">${item.roleName}</span>
            </div>
            <div class="leader-progress-wrapper">
                <div class="progress-bar">
                    <div class="progress-fill player-${item.player}-bg" style="width: ${progressPct}%"></div>
                </div>
                <span class="progress-text">${item.progress}/10 入营</span>
            </div>
        `;
        boardBox.appendChild(row);
    });
}

function getRoleChineseName(role) {
    if (role === 'human') return '人类玩家';
    if (role === 'ai-easy') return 'AI 助手 (简级)';
    if (role === 'ai-medium') return 'AI 助手 (中等)';
    if (role === 'ai-hard') return 'AI 大师 (大师)';
    return '空席';
}

/* ==========================================================================
   AI DECISION ENGINE (EASY / MEDIUM / HARD BRAIN)
   ========================================================================== */

function triggerAITurn() {
    if (!gameStarted) return;

    // Safety check: is active player AI?
    if (!isPlayerAI(activePlayer) && !autoplayActive) return;

    const role = seats[activePlayer];
    const difficulty = role ? role.replace('ai-', '') : 'medium'; // defaults 'medium'

    // 1. Gather all marbles for active player
    const myMarbles = [];
    holesList.forEach(h => {
        if (boardState[`${h.r},${h.c}`] === activePlayer) {
            myMarbles.push(h);
        }
    });

    // 2. Gather all valid moves for all marbles
    const allMoves = [];
    myMarbles.forEach(m => {
        const moves = calculateValidMoves(m.r, m.c);
        moves.forEach(mv => {
            allMoves.push({
                from: { r: m.r, c: m.c },
                to: { r: mv.r, c: mv.c },
                path: mv.path
            });
        });
    });

    if (allMoves.length === 0) {
        logSystem(`⚠️ [${PLAYER_CONFIGS[activePlayer].name}] AI 无步可走，弃权一次！`);
        advanceTurn();
        return;
    }

    // 3. Evaluate and select best move according to difficulty level
    let selectedMove = null;

    if (difficulty === 'easy') {
        // Easy AI: Filter moves that make positive progress, choose one semi-randomly
        const sorted = scoreAndSortMoves(allMoves);
        const forwardMoves = sorted.filter(m => m.score > -2); // at least not backwards much
        if (forwardMoves.length > 0) {
            // Select from top 50%
            const index = Math.floor(Math.random() * Math.min(4, forwardMoves.length));
            selectedMove = forwardMoves[index];
        } else {
            selectedMove = sorted[Math.floor(Math.random() * sorted.length)];
        }
    } else if (difficulty === 'medium') {
        // Medium AI: Greedy evaluation. Pick the absolute best progress score
        const sorted = scoreAndSortMoves(allMoves);
        selectedMove = sorted[0];
    } else {
        // Hard AI: Advanced group clustering evaluation.
        // It favors moves that make excellent progress AND keeps the team grouped tightly, preventing stragglers!
        const sorted = scoreAndSortMovesWithClustering(allMoves, myMarbles);
        selectedMove = sorted[0];
    }

    if (selectedMove) {
        executeMove(selectedMove.from, selectedMove.to, selectedMove.path);
    }
}

// Calculate moves progress score and sort descending
function scoreAndSortMoves(moves) {
    const list = moves.map(m => {
        const score = getMoveProgressScore(activePlayer, m.from, m.to);
        return { ...m, score };
    });
    // Sort descending
    list.sort((a, b) => b.score - a.score);
    return list;
}

// Custom advanced Heuristics combining forward progress and marble clustering
function scoreAndSortMovesWithClustering(moves, myMarbles) {
    // 1. Calculate current average center of mass of all our marbles
    let sumX = 0, sumY = 0;
    myMarbles.forEach(m => {
        sumX += m.x;
        sumY += m.y;
    });
    const avgX = sumX / myMarbles.length;
    const avgY = sumY / myMarbles.length;

    const list = moves.map(m => {
        const progressScore = getMoveProgressScore(activePlayer, m.from, m.to);
        
        // Clustering Term: penalize if landing coordinate is very far from current average team center
        const targetHole = holesMap.get(`${m.to.r},${m.to.c}`);
        const distToCenter = Math.sqrt(Math.pow(targetHole.x - avgX, 2) + Math.pow(targetHole.y - avgY, 2));
        
        // Grouping weight: penalize outliers
        let clusteringTerm = 0;
        if (distToCenter > 130) {
            // Penalty scales heavily for stragglers left behind
            clusteringTerm = - (distToCenter - 130) * 0.05;
        }

        // Target Zone entry boost: extra reward for filling up the target triangle from back to front
        let targetZoneBoost = 0;
        const config = PLAYER_CONFIGS[activePlayer];
        if (targetHole.zone === config.targetZone) {
            targetZoneBoost = 15; // Massive entering boost

            // If landing in target, reward landing closer to the furthest back target holes
            const distToStartingTip = getHoleDistance(targetHole, config.tip);
            targetZoneBoost += distToStartingTip * 0.08; 
        }

        // Straggler rescue: if a marble is very far behind, reward moving IT specifically!
        let stragglerRescueBoost = 0;
        const fromHole = holesMap.get(`${m.from.r},${m.from.c}`);
        const distFromStartTip = getHoleDistance(fromHole, config.tip);
        const avgDistFromStart = myMarbles.reduce((acc, current) => acc + getHoleDistance(current, config.tip), 0) / myMarbles.length;
        
        if (getHoleDistance(fromHole, config.tip) < avgDistFromStart - 30) {
            // This marble is left far behind! Give moving it a heavy boost
            stragglerRescueBoost = 6;
        }

        const score = progressScore * 1.5 + clusteringTerm + targetZoneBoost + stragglerRescueBoost;
        return { ...m, score };
    });

    list.sort((a, b) => b.score - a.score);
    return list;
}

// Distance progress calculation (Distance(from, target) - Distance(to, target))
function getMoveProgressScore(player, from, to) {
    const config = PLAYER_CONFIGS[player];
    const targetTip = config.targetTip;

    const fromHole = holesMap.get(`${from.r},${from.c}`);
    const toHole = holesMap.get(`${to.r},${to.c}`);
    const targetHole = holesMap.get(`${targetTip.r},${targetTip.c}`);

    const fromDist = getHoleDistance(fromHole, targetHole);
    const toDist = getHoleDistance(toHole, targetHole);

    // Score is positive if we moved closer to target tip
    return fromDist - toDist;
}

// 2D Cartesian distance between two holes helper
function getHoleDistance(h1, h2) {
    if (!h1 || !h2) return 999;
    
    // Resolve tip objects that lack x/y
    const x1 = h1.x !== undefined ? h1.x : h1.c * SPACER;
    const y1 = h1.y !== undefined ? h1.y : (h1.r - 8) * H;
    const x2 = h2.x !== undefined ? h2.x : h2.c * SPACER;
    const y2 = h2.y !== undefined ? h2.y : (h2.r - 8) * H;

    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
}
