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

    // ===================================================
    // === PERUBAHAN AUDIO DIMULAI DI SINI ===
    // ===================================================

    // HAPUS: const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // (Baris di atas telah dihapus)

    // BARU: Pre-load semua file suara untuk performa lebih baik
    // BARU: Pre-load semua file suara dari folder 'sounds'
    const soundClick = new Audio('sounds/click.wav');
    const soundWin = new Audio('sounds/win.wav');
    const soundLose = new Audio('sounds/lose.wav');
    const soundDraw = new Audio('sounds/draw.wav');

    // DIUBAH TOTAL: Fungsi playSound sekarang menggunakan file eksternal
    function playSound(type) {
        try {
            switch (type) {
                case 'click':
                    soundClick.currentTime = 0; // Reset agar bisa dimainkan berulang kali dgn cepat
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
            // Ini akan mencegah game crash jika file suara gagal dimuat
        }
    }

    // ===================================================
    // === PERUBAHAN AUDIO SELESAI ===
    // ===================================================


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

        playSound('click'); // <--- Ini akan memanggil fungsi baru
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

    // --- Logika AI (Medium) ---
    function makeAIMove() {
        if (gameOver) return;

        let bestMove = null;
        const validMoves = getValidMoves();
        if (validMoves.length === 0) return;

        for (const move of validMoves) {
            if (isWinningMove(smallBoardsState[move.largeIndex], move.smallIndex, 'O')) {
                bestMove = move;
                break;
            }
        }

        if (!bestMove) {
            for (const move of validMoves) {
                if (isWinningMove(smallBoardsState[move.largeIndex], move.smallIndex, 'X')) {
                    bestMove = move;
                    break;
                }
            }
        }

        if (!bestMove) {
            for (const move of validMoves) {
                if (largeBoardState[move.smallIndex] !== null) {
                    bestMove = move;
                    break;
                }
            }
        }

        if (!bestMove) {
            const centerMove = validMoves.find(m => m.smallIndex === 4);
            if (centerMove) {
                bestMove = centerMove;
            }
        }

        if (!bestMove) {
            bestMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        }

        handleCellClick(bestMove.largeIndex, bestMove.smallIndex);
    }

    function getValidMoves() {
        const moves = [];
        if (nextSmallBoardIndex !== null) {
            for (let j = 0; j < 9; j++) {
                if (smallBoardsState[nextSmallBoardIndex][j] === null) {
                    moves.push({ largeIndex: nextSmallBoardIndex, smallIndex: j });
                }
            }
        } else {
            for (let i = 0; i < 9; i++) {
                if (largeBoardState[i] === null) {
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

    function isWinningMove(board, index, player) {
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