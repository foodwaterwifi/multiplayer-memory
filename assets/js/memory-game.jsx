import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

export default function game_init(root, channel) {
  ReactDOM.render(<MemoryGame channel={channel}/>, root);
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

    this.channel = props.channel;
    this.state = { cells: null,
                   clicks: 0,
                   first_guess: null,
                   second_guess: null,
                   current_timeout_id: -1};

    console.log("Attempting to connect to channel.")
    this.channel.join()
        .receive("ok", resp => {
          console.log("Successfully connected.");
          this.gotView(resp);
        })
        .receive("error", resp => { console.log("Unable to join: ", resp) })
    this.channel.on("update", payload => {
      this.gotView(payload)
    })
  }

  gotView(view) {
    console.log("Received new view.")

    this.setState(_.assign(this.state, view.game));

    this.resetCurrentTimeout()

    if (view.game.first_guess != null && view.game.second_guess != null) {
      let timeoutId = window.setTimeout(() => {
        this.setState({ first_guess: null, second_guess: null });
        this.resetCurrentTimeout();
      }, 1000);
      this.setState({ current_timeout_id: timeoutId })
    }
  }

  hasWon() {
    // We've one once there are no more ? cards
    return this.state.cells != null && !_.includes(_.flatten(this.state.cells), "?");
  }

  resetCurrentTimeout() {
    if (this.state.current_timeout_id >= 0) {
      window.clearTimeout(this.state.current_timeout_id);
      this.setState({ current_timeout_id: -1 });
    }
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

  render() {
    console.log("New render: ", this.state);
    if (this.hasWon()) {
      return <RetryScreen root={this}/>;
    }
    else {
      return <PlayScreen root={this}/>;
    }
  }
}

// root - MemoryGame - the root object
function PlayScreen(params) {
  let onRestartButtonPressed = () => {
    params.root.channel.push("reset", {});
  }
  let onMenuButtonPressed = () => {
    window.location.href = "/";
  }
  let onCardClicked = (pos) => {
    if (params.root.state.current_timeout_id >= 0) return; // don't do anything if we're delaying
    params.root.channel.push("guess", {posx: pos.x, posy: pos.y});
  }
  return <div>
           <div className="row">
             <div className="column"><h1>Memory Game</h1></div>
           </div>
           <div className="row">
             <div className="column"><button onClick={onMenuButtonPressed}>Menu</button></div>
             <div className="column"><p>Clicks: {params.root.state.clicks}</p></div>
             <div className="column"><button onClick={onRestartButtonPressed}>Restart</button></div>
           </div>
           <Board cells={params.root.state.cells}
                  firstGuess={params.root.state.first_guess}
                  secondGuess={params.root.state.second_guess}
                  onGuess={onCardClicked} />
         </div>;
}

// root - MemoryGame - the root object
function RetryScreen(params) {
  let onRestartButtonPressed = () => {
    params.root.channel.push("reset", {});
  }
  let onMenuButtonPressed = () => {
    window.location.href = "/";
  }
  return <div>
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
  </div>;
}

// cells - the board
// shownPositions - cards to be shown face-up
function Board(params) {
  if (params.cells == null) {
    return <div className="row">
             <div className="column">
                <h4>Loading...</h4>
             </div>
           </div>
  }
  //console.log("Cells: ", params.cells);
  let board = [];
  let xx, yy;
  for (yy = 0; yy < params.cells.length; yy++) {
    let columns = [];
    for (xx = 0; xx < params.cells.length; xx++) {
      let cardText = params.cells[yy][xx];
      if (cardText == "?") {
        if (params.firstGuess != null && _.isEqual(params.firstGuess.pos, {x: xx, y: yy})) {
          cardText = params.firstGuess.letter;
        }
        else if (params.secondGuess != null && _.isEqual(params.secondGuess.pos, {x: xx, y: yy})) {
          cardText = params.secondGuess.letter;
        }
      }
      let card = <div key = {xx.toString()} className="column">
                   <Card text = {cardText}
                         hidden = {cardText == "?"}
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
