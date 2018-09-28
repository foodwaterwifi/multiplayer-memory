import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

export default function game_init(root) {
  ReactDOM.render(<MemoryGame />, root);
}

// A Position is a {x: integer, y: intereger}
// A position represents a cell of the board. {x: 0, y: 0} is the top left cell.

// A Board is a [[string, ...], ...]
// A two dimensional array that represents a memory game board.

// State:
//
// cells - Board - the board our game is played on
// correctGuesses - [Position, ...] - positions that we have guessed correctly and found matches for
// firstGuess - Position - our first pick. The user wants to match this with the next card they pick.
// secondGuess - Position - our second guess. behavior will change depending on whether this was correct or not.
// currentTimeoutId - integer - nonzero when there is an action waiting to occur. only one action may occur at a time.
// gameState - "menu", "play", or "retry" - the screen to display

class MemoryGame extends React.Component {
  constructor(props) {
    super(props);

    this.state = { cells: [["A", "A", "B", "B"],
                           ["C", "C", "D", "D"],
                           ["E", "E", "F", "F"],
                           ["G", "G", "H", "H"]],
                   correctGuesses: [],
                   firstGuess: null,
                   secondGuess: null,
                   clicks: 0,
                   currentTimeoutId: -1,
                   gameState: "menu",
                 };

    //console.log("Default state: ", this.state);
  }

  goToMenuScreen() {
    //console.log("go to menu"),
    this.clearCurrentTimeout();
    this.setState(_.assign(this.state, {gameState: "menu"}));
  }

  goToPlayScreen() {
    //console.log("go to play"),
    this.clearCurrentTimeout();
    this.setState(_.assign(this.state, {gameState: "play"}));
  }

  goToRetryScreen() {
    //console.log("go to restart"),
    this.clearCurrentTimeout();
    this.setState(_.assign(this.state, {gameState: "retry"}));
  }

  resetBoard(randomizeBoard) {
    this.clearCurrentTimeout();
    this.setState(_.assign(this.state,
      {cells: randomizeBoard ? this.generateRandomBoard(4, 4, ["A", "B", "C", "D", "E", "F", "G", "H"]) : this.state.cells.slice(),
      //{cells: randomizeBoard ? this.generateRandomBoard(2, 2, ["A", "B"]) : this.state.cells.slice(),
       correctGuesses: [],
       firstGuess: null,
       secondGuess: null,
       clicks: 0,
      }));
  }

  // Clears the timeout action currently active.
  clearCurrentTimeout() {
    //console.log("cleared timeout");
    if (this.state.currentTimeoutId >= 0) {
      window.clearTimeout(this.state.currentTimeoutId);
      this.setState(_.assign(this.state, {currentTimeoutId: -1}));
    }
  }

  // width - integer - width of the board
  // height - integer - height of the board
  // symbols - [string, ...] - symbols to use as card values
  generateRandomBoard(width, height, symbols) {
    // there must be an even number of cells, and the symbols list cannot be empty
    let numCells = width*height;
    if (numCells % 2 != 0 || symbols.length == 0) {
      return [];
    }
    // generate a list of random positions
    let positions = [];
    for (yy = 0; yy < height; yy++) {
      for (xx = 0; xx < width; xx++) {
        positions.push({x: xx, y: yy});
      }
    }
    positions = _.shuffle(positions);
    // construct the board
    let board = [];
    let xx, yy;
    for (yy = 0; yy < height; yy++) {
      let row = [];
      for (xx = 0; xx < width; xx++) {
        row.push(1); // placeholder
      }
      board.push(row);
    }
    // use the positions list to assign pairs
    let lastSymbol = null;
    let symbolIndex = 0;
    let i;
    for (i = 0; i < positions.length; i++) {
      let pos = positions[i];
      let symbol;
      if (lastSymbol) {
        symbol = lastSymbol;
        lastSymbol = null;
        symbolIndex = (symbolIndex + 1)%symbols.length;
      }
      else {
        symbol = symbols[symbolIndex];
        lastSymbol = symbol;
      }
      board[pos['y']][pos['x']] = symbol;
    }
    return board;
  }

  // pos - Position - the position of the card that is our guess
  // this function comprises the main game logic
  guess(pos) {
    //console.log("guessed: ", pos);
    //console.log("Before guess: ", this.state);
    // check if we already have this guess, or are delaying
    if (this.state.currentTimeoutId >= 0 || _.isEqual(this.state.firstGuess, pos) || _.isEqual(this.state.secondGuess, pos) || _.some(this.state.correctGuesses, pos)) {
      // do nothing
    }
    else {
      // check if we have a first guess already
      if (this.state.firstGuess) {
        // if it's a match
        if (this.state.cells[pos.y][pos.x] == this.state.cells[this.state.firstGuess.y][this.state.firstGuess.x]) {
          let newCorrectGuesses = _.concat(this.state.correctGuesses, [this.state.firstGuess, pos]);
          this.setState(_.assign(this.state, {correctGuesses: newCorrectGuesses, firstGuess: null, clicks: this.state.clicks + 1}));
        }
        // if the guess was wrong
        else {
          let timeoutId = window.setTimeout(() => {
            //console.log("flip cards back over"),
            this.setState(_.assign(this.state, {firstGuess: null, secondGuess: null, currentTimeoutId: -1}));
          }, 1000);
          //console.log("flipped cards over: timeout id is ", timeoutId);
          this.setState(_.assign(this.state, {secondGuess: pos, clicks: this.state.clicks + 1, currentTimeoutId: timeoutId}));
        }
      }
      else {
        // we don't have a first guess yet; set it.
        this.setState(_.assign(this.state, {firstGuess: pos, clicks: this.state.clicks + 1}));
      }

      if (this.hasWon()) {
        let timeoutId = window.setTimeout(() => {
          //console.log("after waiting, go to retry screen"),
          this.setState(_.assign(this.state, {currentTimeoutId: -1}));
          this.goToRetryScreen();
        }, 1000)
        this.setState(_.assign(this.state, {currentTimeoutId: timeoutId}));
      }
    }

    //console.log("After guess: ", this.state);
  }

  // returns true if the board is in a winning state
  hasWon() {
    return (this.state.correctGuesses.length == _.flatten(this.state.cells).length);
  }

  render() {
    //console.log("New render: ", this.state);
    switch (this.state.gameState) {
      case "menu":
        return <MenuScreen root={this}/>;
        break;
      case "play":
        return <PlayScreen root={this}/>;
        break;
      case "retry":
        return <RetryScreen root={this}/>;
        break;
      default:
        throw "Invalid";
    }
  }
}

// root - MemoryGame - the root object
function MenuScreen(params) {
  let onStartButtonPressed = () => {
    params.root.resetBoard(true);
    params.root.goToPlayScreen();
  }
  return <span>
    <div className="row"><div className="column"><h1>Memory Game</h1></div></div>
    <div className="row">
      <div className="column">
        <button onClick={onStartButtonPressed}>Start</button>
      </div>
    </div>
  </span>;
}

// root - MemoryGame - the root object
function PlayScreen(params) {
  let onRestartButtonPressed = () => {
    params.root.resetBoard(true);
  }
  let onMenuButtonPressed = () => {
    params.root.goToMenuScreen();
  }
  let onCardClicked = (pos) => {
    params.root.guess(pos);
  }
  return <span>
           <div className="row">
             <div className="column"><h1>Memory Game</h1></div>
           </div>
           <div className="row">
             <div className="column"><button onClick={onMenuButtonPressed}>Menu</button></div>
             <div className="column"><p>Clicks: {params.root.state.clicks}</p></div>
             <div className="column"><button onClick={onRestartButtonPressed}>Restart</button></div>
           </div>
           <Board cells={params.root.state.cells}
                  shownPositions={params.root.state.correctGuesses.concat([params.root.state.firstGuess, params.root.state.secondGuess])}
                  onGuess={onCardClicked} />
         </span>;
}

// root - MemoryGame - the root object
function RetryScreen(params) {
  let onRestartButtonPressed = () => {
    params.root.resetBoard(true);
    params.root.goToPlayScreen();
  }
  let onMenuButtonPressed = () => {
    params.root.goToMenuScreen();
  }
  return <span>
    <div className="row">
      <div className="column"><h3>A winner is you.</h3></div>
    </div>
    <div className="row">
      <div className="column"><p>Clicks: {params.root.state.clicks}</p></div>
    </div>
    <div className="row">
      <div className="column"><button onClick={onRestartButtonPressed}>Restart</button></div>
    </div>
    <div className="row">
      <div className="column"><button onClick={onMenuButtonPressed}>Menu</button></div>
    </div>
  </span>;
}

// cells - the board
// shownPositions - cards to be shown face-up
function Board(params) {
  //console.log("Cells: ", params.cells);
  let board = [];
  let xx, yy;
  for (yy = 0; yy < params.cells.length; yy++) {
    let columns = [];
    for (xx = 0; xx < params.cells.length; xx++) {
      let card = <div key = {xx.toString()} className="column">
                   <Card text = {params.cells[yy][xx]}
                         hidden = {!_.some(params.shownPositions, {x: xx, y: yy})}
                         onGuess = {params.onGuess}
                         pos = {{x: xx, y: yy}} />
                 </div>;
      //console.log(card);
      columns.push(card);
    }
    let row = <div key={yy.toString()} className="row">{columns}</div>;
    board.push(row);
  }
  //console.log(board);
  return board;
}

// text - the text on the face of the card
// hidden - whether the card is visible
function Card(params) {
  if (params.hidden) {
    return <button className="card hidden-card" onClick={(e) => params.onGuess(params.pos)}>?</button>;
  }
  else {
    return <div className="card shown-card">{params.text}</div>;
  }
}
