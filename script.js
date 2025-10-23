document.addEventListener('DOMContentLoaded', () => {
    // --- Referensi DOM ---
    const largeBoardElement = document.getElementById('large-board');
    const statusMessage = document.getElementById('status-message');
    const restartButton = document.getElementById('restart-button');
    const modeSelectionOverlay = document.getElementById('mode-selection');
    const vsPlayerButton = document.getElementById('vs-player');
    const vsAIButton = document.getElementById('vs-ai');

    const rulesButton = document.getElementById('rules-button');
    const rulesOverlay = document.getElementById('rules-overlay');
    const closeRulesButton = document.getElementById('close-rules-button');

    // --- State Game ---
    let largeBoardState = Array(9).fill(null);
    let smallBoardsState = Array(9).fill(null).map(() => Array(9).fill(null));
    let currentPlayer = 'X';
    let nextSmallBoardIndex = null;
    let gameMode = 'vsPlayer';
    let gameOver = false;
    let gameStarted = false;

    // --- Audio ---
    const soundClick = new Audio('sounds/click.wav');
    const soundWin = new Audio('sounds/win.wav');
    const soundLose = new Audio('sounds/lose.wav');
    const soundDraw = new Audio('sounds/draw.wav');

    function playSound(type) {
        try {
            switch (type) {
                case 'click':
                    soundClick.currentTime = 0;
                    soundClick.play();
                    break;
                case 'win':
                    soundWin.currentTime = 0;
                    soundWin.play();
                    break;
                case 'lose':
                    soundLose.currentTime = 0;
                    soundLose.play();
                    break;
                case 'draw':
                    soundDraw.currentTime = 0;
                    soundDraw.play();
                    break;
            }
        } catch (e) {
            console.error("Tidak dapat memutar suara: ", e);
        }
    }


    // --- Inisialisasi Game ---
    function initializeGame() {
        largeBoardState = Array(9).fill(null);
        smallBoardsState = Array(9).fill(null).map(() => Array(9).fill(null));
        currentPlayer = 'X';
        nextSmallBoardIndex = null;
        gameOver = false;
        gameStarted = true;
        largeBoardElement.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const smallBoard = document.createElement('div');
            smallBoard.classList.add('small-board');
            smallBoard.dataset.largeIndex = i;

            for (let j = 0; j < 9; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.smallIndex = j;
                cell.addEventListener('click', () => handleCellClick(i, j));
                smallBoard.appendChild(cell);
            }

            const winOverlay = document.createElement('div');
            winOverlay.classList.add('win-overlay');
            smallBoard.appendChild(winOverlay);

            largeBoardElement.appendChild(smallBoard);
        }

        updateStatus();
        updateActiveBoards();

        modeSelectionOverlay.style.display = 'none';
        rulesOverlay.style.display = 'none';
    }

    // --- Logika Klik Sel ---
    function handleCellClick(largeIndex, smallIndex) {
        if (gameOver || smallBoardsState[largeIndex][smallIndex] !== null) {
            return;
        }

        if (nextSmallBoardIndex !== null && nextSmallBoardIndex !== largeIndex) {
            return;
        }

        playSound('click');
        smallBoardsState[largeIndex][smallIndex] = currentPlayer;
        updateCellDOM(largeIndex, smallIndex);

        const smallWinner = checkWinner(smallBoardsState[largeIndex]);
        if (smallWinner) {
            largeBoardState[largeIndex] = smallWinner;
            markSmallBoardWon(largeIndex, smallWinner);
        } else if (isBoardFull(smallBoardsState[largeIndex])) {
            largeBoardState[largeIndex] = 'D'; // Draw
            markSmallBoardWon(largeIndex, 'D');
        }

        const largeWinner = checkWinner(largeBoardState);
        if (largeWinner) {
            gameOver = true;
            statusMessage.textContent = `Pemain ${largeWinner} MENANG!`;
            if (gameMode === 'vsAI') {
                largeWinner === 'X' ? playSound('win') : playSound('lose');
            } else {
                playSound('win');
            }
            removeAllActiveBoards();
            return;
        }

        if (isBoardFull(largeBoardState)) {
            gameOver = true;
            statusMessage.textContent = "Permainan SERI!";
            playSound('draw');
            removeAllActiveBoards();
            return;
        }

        if (largeBoardState[smallIndex] !== null) {
            nextSmallBoardIndex = null;
        } else {
            nextSmallBoardIndex = smallIndex;
        }

        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        updateStatus();
        updateActiveBoards();

        if (gameMode === 'vsAI' && currentPlayer === 'O' && !gameOver) {
            setTimeout(makeAIMove, 700);
        }
    }


    // ===================================================
    // === FUNGSI AI YANG DIPERBARUI ===
    // ===================================================

    function makeAIMove() {
        if (gameOver) return;

        const validMoves = getValidMoves();
        if (validMoves.length === 0) return;

        // --- Prioritas AI (dari tertinggi ke terendah) ---

        // Prioritas 1: Cari langkah untuk MEMENANGKAN SELURUH PERMAINAN
        for (const move of validMoves) {
            // Cek: Apakah langkah ini memenangkan papan kecil?
            if (isWinningMove(smallBoardsState[move.largeIndex], move.smallIndex, 'O')) {
                // Cek: Jika YA, apakah kemenangan papan kecil itu juga MEMENANGKAN PAPAN BESAR?
                if (isWinningMove(largeBoardState, move.largeIndex, 'O')) {
                    handleCellClick(move.largeIndex, move.smallIndex);
                    return;
                }
            }
        }

        // Prioritas 2: Cari langkah untuk MEMBLOKIR KEMENANGAN PEMAIN
        for (const move of validMoves) {
            // Cek: Apakah langkah ini memblokir pemain memenangkan papan kecil?
            if (isWinningMove(smallBoardsState[move.largeIndex], move.smallIndex, 'X')) {
                // Cek: Jika YA, apakah blokir itu juga MEMBLOKIR KEMENANGAN PAPAN BESAR pemain?
                if (isWinningMove(largeBoardState, move.largeIndex, 'X')) {
                    handleCellClick(move.largeIndex, move.smallIndex);
                    return;
                }
            }
        }

        // Prioritas 3: Cari langkah untuk MEMENANGKAN PAPAN KECIL
        // (Kita simpan daftarnya agar bisa dievaluasi, tapi untuk sekarang ambil yang pertama)
        let smallWinMoves = [];
        for (const move of validMoves) {
            if (isWinningMove(smallBoardsState[move.largeIndex], move.smallIndex, 'O')) {
                smallWinMoves.push(move);
            }
        }
        if (smallWinMoves.length > 0) {
            // (Idealnya, AI akan mengecek 'smallWinMove' mana yang paling strategis)
            // (Untuk saat ini, ambil saja yang pertama)
            handleCellClick(smallWinMoves[0].largeIndex, smallWinMoves[0].smallIndex);
            return;
        }

        // Prioritas 4: Cari langkah untuk MEMBLOKIR KEMENANGAN PAPAN KECIL PEMAIN
        let smallBlockMoves = [];
        for (const move of validMoves) {
            if (isWinningMove(smallBoardsState[move.largeIndex], move.smallIndex, 'X')) {
                smallBlockMoves.push(move);
            }
        }
        if (smallBlockMoves.length > 0) {
            // (Idealnya, AI akan mengecek 'smallBlockMove' mana yang paling strategis)
            // (Untuk saat ini, ambil saja yang pertama)
            handleCellClick(smallBlockMoves[0].largeIndex, smallBlockMoves[0].smallIndex);
            return;
        }

        // Prioritas 5: Coba kirim pemain ke papan yang sudah selesai/penuh
        for (const move of validMoves) {
            if (largeBoardState[move.smallIndex] !== null) {
                handleCellClick(move.largeIndex, move.smallIndex);
                return;
            }
        }

        // Prioritas 6: Ambil tengah papan kecil yang aktif
        const centerMove = validMoves.find(m => m.smallIndex === 4);
        if (centerMove) {
            handleCellClick(centerMove.largeIndex, centerMove.smallIndex);
            return;
        }

        // Prioritas 7: Jika tidak ada langkah strategis, ambil langkah acak
        const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        handleCellClick(randomMove.largeIndex, randomMove.smallIndex);
    }

    // ===================================================
    // === AKHIR FUNGSI AI YANG DIPERBARUI ===
    // ===================================================


    function getValidMoves() {
        const moves = [];
        if (nextSmallBoardIndex !== null) {
            // Hanya bisa main di satu papan kecil
            for (let j = 0; j < 9; j++) {
                if (smallBoardsState[nextSmallBoardIndex][j] === null) {
                    moves.push({ largeIndex: nextSmallBoardIndex, smallIndex: j });
                }
            }
        } else {
            // Bisa main di papan mana saja yang belum selesai
            for (let i = 0; i < 9; i++) {
                if (largeBoardState[i] === null) { // Cek apakah papan besarnya 'null' (belum dimenangkan)
                    for (let j = 0; j < 9; j++) {
                        if (smallBoardsState[i][j] === null) {
                            moves.push({ largeIndex: i, smallIndex: j });
                        }
                    }
                }
            }
        }
        return moves;
    }

    /**
     * Helper untuk MENGECEK APAKAH sebuah langkah akan MENANG di papan TERTENTU.
     * @param {Array} board - Papan yang akan dicek (bisa largeBoardState atau smallBoardsState[i])
     * @param {number} index - Posisi langkah (0-8)
     * @param {string} player - Pemain ('X' atau 'O')
     * @returns {boolean} - True jika langkah itu menang
     */
    function isWinningMove(board, index, player) {
        // Jangan cek jika sudah terisi
        if (board[index] !== null) return false;

        const tempBoard = [...board];
        tempBoard[index] = player;
        return checkWinner(tempBoard) === player;
    }

    // --- Fungsi Helper Papan ---
    function checkWinner(board) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]  // Diagonals
        ];
        for (const line of lines) {
            const [a, b, c] = line;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return null;
    }

    function isBoardFull(board) {
        return board.every(cell => cell !== null);
    }

    // --- Update Tampilan (DOM) ---
    function updateCellDOM(largeIndex, smallIndex) {
        const smallBoard = largeBoardElement.children[largeIndex];
        const cell = smallBoard.children[smallIndex];
        cell.textContent = currentPlayer;
        cell.classList.add(currentPlayer.toLowerCase());
    }

    function markSmallBoardWon(largeIndex, winner) {
        const smallBoard = largeBoardElement.children[largeIndex];
        smallBoard.classList.add('won', winner.toLowerCase());
        const overlay = smallBoard.querySelector('.win-overlay');
        overlay.textContent = winner;
    }

    function updateStatus() {
        statusMessage.textContent = `Giliran Pemain: ${currentPlayer}`;
    }

    function removeAllActiveBoards() {
        document.querySelectorAll('.small-board').forEach(board => {
            board.classList.remove('active');
        });
    }

    function updateActiveBoards() {
        removeAllActiveBoards();
        if (gameOver) return;

        if (nextSmallBoardIndex !== null) {
            largeBoardElement.children[nextSmallBoardIndex].classList.add('active');
        } else {
            for (let i = 0; i < 9; i++) {
                if (largeBoardState[i] === null) {
                    largeBoardElement.children[i].classList.add('active');
                }
            }
        }
    }

    // --- Event Listeners Tombol ---
    vsPlayerButton.addEventListener('click', () => {
        gameMode = 'vsPlayer';
        initializeGame();
    });

    vsAIButton.addEventListener('click', () => {
        gameMode = 'vsAI';
        initializeGame();
    });

    restartButton.addEventListener('click', () => {
        gameStarted = false;
        rulesOverlay.style.display = 'flex';
        modeSelectionOverlay.style.display = 'none';
        statusMessage.textContent = "Selamat Datang!";
    });

    rulesButton.addEventListener('click', () => {
        rulesOverlay.style.display = 'flex';
    });

    closeRulesButton.addEventListener('click', () => {
        rulesOverlay.style.display = 'none';

        if (gameStarted === false) {
            modeSelectionOverlay.style.display = 'flex';
            statusMessage.textContent = "Pilih mode permainan";
        }
    });

    // --- Mulai game ---
    rulesOverlay.style.display = 'flex';
    modeSelectionOverlay.style.display = 'none';
    statusMessage.textContent = "Selamat Datang!";
});