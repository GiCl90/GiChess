//
// GiChess, a javascript chess engine.
//

var STACK_SIZE = 100; // maximum size of undo stack

var board = null;
var $board = $('#myBoard');
var $status = $('#status')
var $fen = $('#fen');
var $pgn = $('#pgn');
var game = new Chess();
var globalSum = 0;

var squareClass = 'square-55d63';
var squareToHighlight = null;
var colorToHighlight = null;
var positionCount;

var config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
};
board = Chessboard('myBoard', config);

timer = null;

//
// Piece Square Tables
//

var weights = { 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000, 'k_e': 20000 };
var pst_w = {
  'p': [
    [30, 30, 30, 30, 30, 30, 30, 30],
    [25, 25, 25, 25, 25, 25, 25, 25],
    [20, 20, 20, 20, 20, 20, 20, 20],
    [15, 15, 15, 15, 15, 15, 15, 15],
    [ 0,  0,  0, 10, 10,  0,  0,  0],
    [10,  5,  5,  5,  5,  5,  5, 10],
    [ 5, 10, 10,  0,  0, 10, 10,  5],
    [ 0,  0,  0,  0,  0,  0,  0,  0]
  ],
  'n': [
    [0,  0,  0,  0,  0,  0,  0, 0],
    [0, 10, 10, 10, 10, 10, 10, 0],
    [0, 10, 20, 20, 20, 20, 10, 0],
    [0, 10, 20, 30, 30, 20, 10, 0],
    [0, 10, 20, 30, 30, 20, 10, 0],
    [0, 10, 20, 20, 20, 20, 10, 0],
    [0, 10, 10, 10, 10, 10, 10, 0],
    [0,  0,  0,  0,  0,  0,  0, 0]
  ],
  'b': [
    [0,  0,  0,  0,  0,  0,  0, 0],
    [0, 30, 20, 10, 10, 20, 30, 0],
    [0, 20, 30, 20, 20, 30, 20, 0],
    [0, 10, 20, 30, 30, 20, 10, 0],
    [0, 10, 20, 30, 30, 20, 10, 0],
    [0, 20, 30, 20, 20, 30, 20, 0],
    [0, 30, 20, 10, 10, 20, 30, 0],
    [0,  0,  0,  0,  0,  0,  0, 0]
  ],
  'r': [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  'q': [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ],
  'k': [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
    [15, 30, 15, 0, 0, 15, 30, 15]
  ],

  // Endgame King Table
  'k_e': [
    [0,  0,  0,  0,  0,  0,  0, 0],
    [0, 10, 10, 10, 10, 10, 10, 0],
    [0, 10, 20, 20, 20, 20, 10, 0],
    [0, 10, 20, 30, 30, 20, 10, 0],
    [0, 10, 20, 30, 30, 20, 10, 0],
    [0, 10, 20, 20, 20, 20, 10, 0],
    [0, 10, 10, 10, 10, 10, 10, 0],
    [0,  0,  0,  0,  0,  0,  0, 0]
  ]
};
var pst_b = {
  'p': pst_w['p'].slice().reverse(),
  'n': pst_w['n'].slice().reverse(),
  'b': pst_w['b'].slice().reverse(),
  'r': pst_w['r'].slice().reverse(),
  'q': pst_w['q'].slice().reverse(),
  'k': pst_w['k'].slice().reverse(),
  'k_e': pst_w['k_e'].slice().reverse()
}

var pstOpponent = { 'w': pst_b, 'b': pst_w };
var pstSelf = { 'w': pst_w, 'b': pst_b };

// 
// Evaluates the board at this point in time, 
// using the material weights and piece square tables.
//

function evaluateBoard(move, prevSum, color) {
  var from = [8 - parseInt(move.from[1]), move.from.charCodeAt(0) - 'a'.charCodeAt(0)];
  var to = [8 - parseInt(move.to[1]), move.to.charCodeAt(0) - 'a'.charCodeAt(0)];

  // Change endgame behavior for kings
  if (prevSum < -1500) {
    if (move.piece === 'k') { move.piece = 'k_e' }
    else if (move.captured === 'k') { move.captured = 'k_e' }
  }

  if ('captured' in move) {
    // Opponent piece was captured (good for us)
    if (move.color === color) {
      prevSum += (weights[move.captured] + pstOpponent[move.color][move.captured][to[0]][to[1]]);
    }
    // Our piece was captured (bad for us)
    else {
      prevSum -= (weights[move.captured] + pstSelf[move.color][move.captured][to[0]][to[1]]);
    }
  }

  if (move.flags.includes('p')) {
    // NOTE: promote to queen for simplicity
    move.promotion = 'q';

    // Our piece was promoted (good for us)
    if (move.color === color) {
      prevSum -= (weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]]);
      prevSum += (weights[move.promotion] + pstSelf[move.color][move.promotion][to[0]][to[1]]);
    }
    // Opponent piece was promoted (bad for us)
    else {
      prevSum += (weights[move.piece] + pstSelf[move.color][move.piece][from[0]][from[1]]);
      prevSum -= (weights[move.promotion] + pstSelf[move.color][move.promotion][to[0]][to[1]]);
    }
  }
  else {
    // The moved piece still exists on the updated board, so we only need to update the position value
    if (move.color !== color) {
      prevSum += pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum -= pstSelf[move.color][move.piece][to[0]][to[1]];
    }
    else {
      prevSum -= pstSelf[move.color][move.piece][from[0]][from[1]];
      prevSum += pstSelf[move.color][move.piece][to[0]][to[1]];
    }
  }

  return prevSum;
}

//
// Performs the minimax algorithm to choose the best move: https://en.wikipedia.org/wiki/Minimax (pseudocode provided)
// Recursively explores all possible moves up to a given depth, and evaluates the game board at the leaves.
//
// Basic idea: maximize the minimum value of the position resulting from the opponent's possible following moves.
// Optimization: alpha-beta pruning: https://en.wikipedia.org/wiki/Alpha%E2%80%93beta_pruning (pseudocode provided)
//
// Inputs:
//  - game:                 the game object.
//  - depth:                the depth of the recursive tree of all possible moves (i.e. height limit).
//  - isMaximizingPlayer:   true if the current layer is maximizing, false otherwise.
//  - sum:                  the sum (evaluation) so far at the current layer.
//  - color:                the color of the current player.
//
// Output:
//  the best move at the root of the current subtree.
//

function minimax(game, depth, alpha, beta, isMaximizingPlayer, sum, color) {
  positionCount++;
  var children = game.ugly_moves({ verbose: true });

  var currMove;
  // Maximum depth exceeded or node is a terminal node (no children)
  if (depth === 0 || children.length === 0) {
    return [null, sum]
  }

  // Find maximum/minimum from list of 'children' (possible moves)
  var maxValue = Number.NEGATIVE_INFINITY;
  var minValue = Number.POSITIVE_INFINITY;
  var bestMove;
  for (var i = 0; i < children.length; i++) {
    currMove = children[i];

    // Note: in our case, the 'children' are simply modified game states
    var currPrettyMove = game.ugly_move(currMove);
    var newSum = evaluateBoard(currPrettyMove, sum, color);
    var [childBestMove, childValue] = minimax(game, depth - 1, alpha, beta, !isMaximizingPlayer, newSum, color);

    game.undo();

    if (isMaximizingPlayer) {
      if (childValue > maxValue) {
        maxValue = childValue;
        bestMove = currPrettyMove;
      }
      if (childValue > alpha) {
        alpha = childValue;
      }
    }

    else {
      if (childValue < minValue) {
        minValue = childValue;
        bestMove = currPrettyMove;
      }
      if (childValue < beta) {
        beta = childValue;
      }
    }

    // Alpha-beta pruning
    if (alpha >= beta) {
      break;
    }
  }

  if (isMaximizingPlayer) {
    return [bestMove, maxValue]
  }
  else {
    return [bestMove, minValue];
  }
}

function updateStatus () {
  var status = ''

  var moveColor = 'White'
  if (game.turn() === 'b') {
    moveColor = 'Black'
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = 'Game over, ' + moveColor + ' is in checkmate.'
  }

  // draw?
  else if (game.in_draw()) {
    status = 'Game over, drawn position'
  }

  // game still on
  else {
    status = moveColor + ' to move'

    // check?
    if (game.in_check()) {
      status += ', ' + moveColor + ' is in check'
    }
  }

  $status.html(status);
  $fen.html(game.fen());
  $pgn.html(game.pgn());
}

function updateAdvantage() {
  document.getElementById("myMeter").value = globalSum / 100;
}

//
// Calculates the best legal move for the given color.
//

function getBestMove(game, color, currSum) {
  positionCount = 0;

  var sd = document.getElementById("search-depth");
  var sdv = sd.value;
  var depth = sdv;

  var d = new Date().getTime();
  var [bestMove, bestMoveValue] = minimax(
    game,
    depth,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    true,
    currSum,
    color
  );
  var d2 = new Date().getTime();
  var moveTime = d2 - d;
  var positionsPerS = (positionCount * 1000) / moveTime;

  $('#position-count').text(positionCount);
  $('#time').text(moveTime / 1000);
  $('#positions-per-s').text(Math.round(positionsPerS));
  $('#depth').text(depth);

  return [bestMove, bestMoveValue];
}

//
// Makes the best legal move for the given color.
//

function makeBestMove(color) {
  if (color === 'w') {
    var move = getBestMove(game, color, globalSum)[0];
  } else {
    var move = getBestMove(game, color, -globalSum)[0];
  }

  globalSum = evaluateBoard(move, globalSum, 'w');
  updateAdvantage();
  updateStatus();

  game.move(move);
  board.position(game.fen());

  if (color === 'b') {

    // Highlight black move
    $board.find('.' + squareClass).removeClass('highlight-black');
    $board.find('.' + squareClass).removeClass('highlight-white');
    $board.find('.square-' + move.from).addClass('highlight-black');
    squareToHighlight = move.to;
    colorToHighlight = 'black';

    $board
      .find('.square-' + squareToHighlight)
      .addClass('highlight-' + colorToHighlight);
  } else {

    // Highlight white move
    $board.find('.' + squareClass).removeClass('highlight-white');
    $board.find('.' + squareClass).removeClass('highlight-black');
    $board.find('.square-' + move.from).addClass('highlight-white');
    squareToHighlight = move.to;
    colorToHighlight = 'white';

    $board
      .find('.square-' + squareToHighlight)
      .addClass('highlight-' + colorToHighlight);
  }
}

//
// Resets the game to its initial state.
//

function reset() {
  game.reset();
  globalSum = 0;
  $board.find('.' + squareClass).removeClass('highlight-white');
  $board.find('.' + squareClass).removeClass('highlight-black');
  board.position(game.fen());
  updateAdvantage();
  updateStatus();

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

//
// Event listeners for various buttons.
//

$('#resetBtn').on('click', function () {
  reset();
});

var undo_stack = [];

function undo() {
  var move = game.undo();
  undo_stack.push(move);

  // Maintain a maximum stack size
  if (undo_stack.length > STACK_SIZE) {
    undo_stack.shift();
  }
  board.position(game.fen());
}

$('#undoBtn').on('click', function () {
  if (game.history().length >= 2) {
    $board.find('.' + squareClass).removeClass('highlight-white');
    $board.find('.' + squareClass).removeClass('highlight-black');

    // Undo twice: Opponent's latest move, followed by player's latest move
    undo();
    updateAdvantage();
    updateStatus();
    window.setTimeout(function () {
      undo();
      updateAdvantage();
      updateStatus();
      window.setTimeout(function () {
      }, 250);
    }, 250);
  } else {
    alert('Nothing to undo.');
  }
});

function redo() {
  game.move(undo_stack.pop());
  board.position(game.fen());
}

$('#redoBtn').on('click', function () {
  if (undo_stack.length >= 2) {
    // Redo twice: Player's last move, followed by opponent's last move
    redo();
    updateAdvantage();
    updateStatus();
    window.setTimeout(function () {
      redo();
      updateAdvantage();
      updateStatus();
      window.setTimeout(function () {
        showHint();
      }, 250);
    }, 250);
  } else {
    alert('Nothing to redo.');
  }
});

$('#flipOrientationBtn').on('click', board.flip);

$('#moveBtn').on('click', function () {
  window.setTimeout(function () {
    makeBestMove(game.turn());
    updateAdvantage();
    updateStatus();
    $board.find('.' + squareClass).removeClass('highlight-white');
    $board.find('.' + squareClass).removeClass('highlight-black');
  }, 250)
});

function returnText() {
  input = document.getElementById("fen").value
  localStorage.setItem('input', input);
  board.position(input);
  game.load(input);
  $pgn.html(game.pgn());
  $fen.html(game.fen());
  globalSum = 0;
  $board.find('.' + squareClass).removeClass('highlight-white')
  $board.find('.' + squareClass).removeClass('highlight-black')
  updateAdvantage();
  updateStatus();
}

$('#compVsCompBtn').on('click', function () {
  reset();
  compVsComp('w');
});

function compVsComp(color) {
  updateAdvantage();
  updateStatus();
  if (game.game_over()) return false;
    timer = window.setTimeout(function () {
      makeBestMove(color);
      if (color === 'w') {
        color = 'b';
      } else {
        color = 'w';
      }
      compVsComp(color);
    }, 250);
}

//
// The remaining code is adapted from chessboard.js examples #5000 through #5005:
// https://chessboardjs.com/examples#5000
//

function onDragStart(source, piece) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false;

  // or if it's not that side's turn
  if (
    (game.turn() === 'w' && piece.search(/^b/) !== -1) ||
    (game.turn() === 'b' && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
}

function onDrop(source, target) {
  undo_stack = [];

  // see if the move is legal
  var move = game.move({
    from: source,
    to: target,
    promotion: 'q', // NOTE: always promote to a queen for example simplicity
  });

  // Illegal move
  if (move === null) return 'snapback';

  globalSum = evaluateBoard(move, globalSum, 'w');
  updateAdvantage();
  updateStatus();

  // Highlight latest move
  $board.find('.' + squareClass).removeClass('highlight-white');
  $board.find('.' + squareClass).removeClass('highlight-black');

  $board.find('.square-' + move.from).addClass('highlight-white');
  squareToHighlight = move.to;
  colorToHighlight = 'white';

  $board
    .find('.square-' + squareToHighlight)
    .addClass('highlight-' + colorToHighlight);

    // Make the best move
    window.setTimeout(function () {
      makeBestMove(game.turn());
      updateStatus();
      updateAdvantage();
      window.setTimeout(function () {
      }, 250);
    }, 250);
}

function onSnapEnd() {
  board.position(game.fen());
}