const moveAudio = new Audio('sounds/move-self.mp3');
const captureAudio = new Audio('sounds/capture.mp3');
const confirmAudio = new Audio('sounds/Confirmation.mp3');
const startAudio = new Audio('sounds/Berserk.mp3');
const endAudio = new Audio('sounds/Error.mp3');
const gameOverAudio = new Audio('sounds/gameOver.wav');
const gameFinishAudio = new Audio('sounds/Victory.mp3');
const lowTimeAudio = new Audio('sounds/LowTime.mp3');
var r = document.querySelector(':root');

function start() {
    let selectedTime =  5; //Number($('input[name="timeSelect"]:checked').val());
    $('#startPage').hide();
    $('#loadingPage').css("display", "flex");
    $.ajax({
        url: `js/puzzles.json`,
        dataType: "json",
        complete(resp) {
            $('#loadingPage').hide();
            $('#gameDiv').css("display", "flex");
            const puzzles = resp.responseJSON;
            startAudio.play();
            var a = 'hi';
            let userHistory = [];
            let id = Math.floor(Math.random() * (501 - 1 + 1)) + 1;
            var correct = 0;
            let wrong = 0;
            let puzzleStartDateTime = new Date();
            let puzzleEndDateTime = new Date(puzzleStartDateTime.getTime() + selectedTime * 60000);
            let timerId = setInterval(() => {
                timer(puzzleEndDateTime, timerId)
            }, 1000);
            loadPuzzle(puzzles, id, userHistory, correct, wrong, puzzleEndDateTime, timerId);
        }
    });
}

function timer(puzzleEndDateTime, timerId) {
    let timeDifference = puzzleEndDateTime.getTime() - new Date().getTime();
    let minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    let seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    if (timeDifference < 0) {
        gameOver(correct, timerId);
    }
    let mins = String(minutes);
    let secs = String(seconds);
    if (seconds < 10) secs = `0${secs}`;
    if (minutes === 0 && seconds === 30) {
        lowTimeAudio.play();
        $('#timer').css("color", "red");
    }
    $('#timer').text(`${mins}:${secs}`);

}

function setInfo(puzzles, id, userHistory, correct, wrong) {
    if (id < puzzles.length) {
        const data = puzzles[id];

        // Move Color
        $('#moveColor').text(`${data.color.charAt(0).toUpperCase() + data.color.slice(1)} To Move`);
        if (data.color === 'black') {
            $('#colorSquare').css("background-color", "#363236");
        } else {
            $('#colorSquare').css("background-color", "#ececec");
        }
    }
    // Score
    $('#score').text(correct);

    var text2;
    if (correct < 5) { text2 = 'Bad Luck!' }
    else if (correct >= 5 && correct < 10) { text2 = 'Keep Trying!' }
    else if (correct >= 10 && correct < 20) { text2 = 'Nice One!' }
    else if (correct >= 20 && correct < 30) { text2 = 'Amazing!' }
    else if (correct >= 30) { text2 = 'Excellent!' };
    $('#scoreText2').text(text2);
}

function gameOver(correct, timerId) {
    console.log("Game Over!");
    gameOverAudio.play();
    clearInterval(timerId);
    $('#gameBoardDiv').hide();
    $('#moveColorDiv').hide();
    $('#gameOver').css("display", "flex");
}

function gameFinish(timerId) {
    console.log("Game Finish!");
    gameFinishAudio.play();
    clearInterval(timerId);
    $('#gameBoardDiv').hide();
    $('#moveColorDiv').hide();
    $('#gameOver').css("display", "flex");
    let text = 'Try Again!';
    $('#scoreText').text(text);
}

function loadPuzzle(puzzles, id, userHistory, correct, wrong, puzzleEndDateTime, timerId) {
    setInfo(puzzles, id, userHistory, correct, wrong);
    if (wrong == 3) {
        gameOver(correct, timerId);
        return;
    }
    if (id < 0 || id >= puzzles.length) {
        gameFinish(timerId);
        return;
    }

    const data = puzzles[id];
    console.log(`Puzzle ID: ${String(data.id)}`);
    console.log(`Puzzle Rating: ${String(data.rating)}`);
    $('#rating').text(`Puzzle Rating: ${String(data.rating)}`);
    console.log(id);
    console.log("score: " + correct);
    const startMove = data.start;
    const playing = true;
    let color = 'white';
    let mvNum = 0;
    let board;
    let $boardHighlighting = $('#myBoard');
    var game = new Chess(data.fen);
    let squareClass = 'square-55d63'

    function removeHighlights() {
        $boardHighlighting.find('.' + squareClass)
            .removeClass('highlight-white')
        $boardHighlighting.find('.' + squareClass)
            .removeClass('highlight-black')
    }

    function onDragStart(source, piece, position, orientation) {
        // do not pick up pieces if the game is over
        if (game.game_over()) return false

        // only pick up pieces for the side to move
        if (!playing || (game.turn() === 'w' && (piece.search(/^b/) !== -1 || color === 'black')) ||
            (game.turn() === 'b' && (piece.search(/^w/) !== -1 || color === 'white')) || (color !== 'black' && color !== 'white')) {
            return false
        }
    }

    function onDrop(source, target) {
        // see if the move is legal
        const move = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for example simplicity
        });

        // illegal move
        if (move === null) return 'snapback';

        if (move.san != data.answer[mvNum]) {
            if (id < 500) {
                gameFinish(timerId);
                return;
            }
            game.undo();
            endAudio.play();
            userHistory.push(false);
            wrong++
            $('#wrong').show();
            setTimeout(() => {
                $('#wrong').hide();
            }, 200);
            // Solved Puzzles
            if (id > 0) {
                let startFEN = puzzles[id].fen;
                let puzzleGame = new Chess(startFEN);
                puzzleGame.move(puzzles[id].start);
                let lichessPuzzleFEN = puzzleGame.fen().replace(/ /g, "%20");
                let elem;
                if (userHistory.pop() == true)
                    elem = `<a href="https://lichess.org/analysis/${lichessPuzzleFEN}" target="_blank"><img class="marks" src="img/tick.png"></img></a>`;
                else
                    elem = `<a href="https://lichess.org/analysis/${lichessPuzzleFEN}" target="_blank"><img class="marks" src="img/cross.png"></img></a>`;
                $('#solvedPuzzles').append(elem);
            }
            loadPuzzle(puzzles, id - 250, userHistory, correct, wrong, puzzleEndDateTime, timerId);
            return 'snapback';
        }
        if (move.captured) captureAudio.play()
        else moveAudio.play()
    }

    // update the board position after the piece snap
    // for castling, en passant, pawn promotion
    function onSnapEnd() {
        board.position(game.fen())
        mvNum++;
        if (mvNum == data.answer.length) {
            confirmAudio.play();
            userHistory.push(true);
            correct++;
            $('#correct').show();
            setTimeout(() => {
                $('#correct').hide();
            }, 200);
            // Solved Puzzles
            if (id > 0) {
                let startFEN = puzzles[id].fen;
                let puzzleGame = new Chess(startFEN);
                puzzleGame.move(puzzles[id].start);
                let lichessPuzzleFEN = puzzleGame.fen().replace(/ /g, "%20");
                let elem;
                if (userHistory.pop() == true)
                    elem = `<a href="https://lichess.org/analysis/${lichessPuzzleFEN}" target="_blank"><img class="marks" src="img/tick.png"></img></a>`;
                else
                    elem = `<a href="https://lichess.org/analysis/${lichessPuzzleFEN}" target="_blank"><img class="marks" src="img/cross.png"></img></a>`;
                $('#solvedPuzzles').append(elem);
            }
            loadPuzzle(puzzles, id + 501, userHistory, correct, wrong, puzzleEndDateTime, timerId);
            return;
        }

        window.setTimeout(function () {
            const mv = game.move(data.answer[mvNum]);
            board.position(game.fen());

            // Piece Highlighting for Computer's Move
            removeHighlights();
            $boardHighlighting.find('.square-' + mv.from).addClass('highlight-' + squares[mv.from])
            $boardHighlighting.find('.square-' + mv.to).addClass('highlight-' + squares[mv.to])

            if (mv.captured) captureAudio.play();
            else moveAudio.play();
            mvNum++;
        }, 1000)

    }

    theme = document.getElementById("theme").value;

    if (theme == 'blue') {
        theme = 'wikipedia';
        r.style.setProperty('--light', '#dee3e6');
        r.style.setProperty('--dark', '#8ca2ad');
        r.style.setProperty('--blight', '#312e2b');
        r.style.setProperty('--bdark', '#ffffff');
        r.style.setProperty('--move', 'inset 0 0 0px 2000px rgba(195,216,135,0.7)');
    } else if (theme == 'chesscom') {
        r.style.setProperty('--light', '#eeeed2');
        r.style.setProperty('--dark', '#769656');
        r.style.setProperty('--blight', '#312e2b');
        r.style.setProperty('--bdark', '#ffffff');
        r.style.setProperty('--move', 'inset 0 0 0px 2000px rgba(247,247,105,0.7)');
    } else if (theme == 'symbol') {
        r.style.setProperty('--light', '#ffffff');
        r.style.setProperty('--dark', '#58ac8a');
    } else if (theme == 'uscf') {
        r.style.setProperty('--light', '#c3c6be');
        r.style.setProperty('--dark', '#727fa2');
    } else if (theme == 'wikipedia') {
        r.style.setProperty('--light', '#f0d9b5');
        r.style.setProperty('--dark', '#b58863');
        r.style.setProperty('--move', 'inset 0 0 0px 2000px rgba(195,216,135,0.7)');
    }

    var config = {
        draggable: true,
        position: game.fen(),
        onDragStart: onDragStart,
        onDrop: onDrop,
        onSnapEnd: onSnapEnd,
        orientation: data.color,
        pieceTheme: ('img/chesspieces/' + theme + '/{piece}.png'),
    };
    board = Chessboard('myBoard', config);

    window.setTimeout(function () {

        if (data.color === 'white') color = 'black';
        else color = 'white';

        // play first move
        const mv = game.move(startMove);
        board.position(game.fen())

        if (color === 'white') color = 'black';
        else color = 'white';

        // Piece Highlighting for first move
        removeHighlights();
        $boardHighlighting.find('.square-' + mv.from).addClass('highlight-' + squares[mv.from]);
        $boardHighlighting.find('.square-' + mv.to).addClass('highlight-' + squares[mv.to]);

        if (mv.captured) captureAudio.play()
        else moveAudio.play()
    }, 1000)
}
