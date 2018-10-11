import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';

export default function game_init(root, channel) {
  ReactDOM.render(<MemoryGame channel={channel}/>, root);
}

// A Position is a {x: integer, y: integer}
// A position represents a cell of the board. {x: 0, y: 0} is the top left cell.

// A Board is a {{string, ...}, ...}
// A two dimensional array that represents a memory game board.

// A Player is a {name: string, score: integer}
// One of the two players who is playing the game.

// State:
//
// cells - Board - the board our game is played on
// correctGuesses - [Position, ...] - positions that we have guessed correctly and found matches for
// firstGuess - Position or null - our first pick. The user wants to match this with the next card they pick.
// secondGuess - Position or null - our second guess. behavior will change depending on whether this was correct or not.
// currentTimeoutId - integer - nonzero when there is an action waiting to occur. only one action may occur at a time.
// player1 - Player or null - the first player to join. player1 always joins before player2.
// player2 - Player or null - the second player to join.

class MemoryGame extends React.Component {
  constructor(props) {
    super(props);

    this.channel = props.channel;
    this.state = { cells: null,
                   first_guess: null,
                   second_guess: null,
                   current_timeout_id: -1,
                   player1: null,
                   player2: null};

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

  gameHasEnded() {
    // We've one once there are no more ? cards
    return this.state.cells != null && !_.includes(_.flatten(this.state.cells), "?");
  }

  // Generates the win text to display on the restart screen. Assumes both players exist.
  winText() {
    if (this.state.player1.score > this.state.player2.score) {
      return this.state.player1.name + " has defeated " + this.state.player2.name + ".";
    } else if (this.state.player1.score < this.state.player2.score) {
      return this.state.player2.name + " has defeated " + this.state.player1.name + ".";
    } else {
      return this.state.player1.name + " and " + this.state.player2.name + " have tied."
    }
  }

  // Returns whether the game is in "lobby" mode.
  isInLobby() {
    return (this.state.player1 == null || this.state.player2 == null);
  }

  // Returns whether we are waiting for a player in lobby mode.
  isWaitingForPlayer() {
    return (this.isInLobby() && this.state.player1 != null && this.state.player1.name == window.userName);
  }

  resetCurrentTimeout() {
    if (this.state.current_timeout_id >= 0) {
      window.clearTimeout(this.state.current_timeout_id);
      this.setState({ current_timeout_id: -1 });
    }
  }

  render() {
    let onRestartButtonPressed = () => {
      this.channel.push("reset", {});
    }
    let onMenuButtonPressed = () => {
      window.location.href = "/";
    }
    let onCardClicked = (pos) => {
      if (this.state.current_timeout_id >= 0) return; // don't do anything if we're delaying
      this.channel.push("guess", {posx: pos.x, posy: pos.y});
    }
    let onJoinButtonPressed = () => {
      this.channel.push("joinlobby", {});
    }

    let playerCount = (this.state.player1) ? ((this.state.player2) ? 2 : 1) : 0;

    console.log("New render: ", this.state);
    if (this.isInLobby()) {
      return <LobbyScreen onJoinButtonPressed={onJoinButtonPressed} playerCount={playerCount} isWaitingForPlayer={this.isWaitingForPlayer()}/>;
    }
    else if (this.gameHasEnded()) {
      return <RetryScreen onMenuButtonPressed={onMenuButtonPressed} onRestartButtonPressed={onRestartButtonPressed} winText={this.winText()}/>;
    } else {
      return <PlayScreen onMenuButtonPressed={onMenuButtonPressed} onCardClicked={onCardClicked} state={this.state}/>;
    }
  }
}

// state - the game state
// onMenuButtonPressed - callback for when menu button is pressed
// onCardClicked - callback for when a card is clicked
function PlayScreen(params) {
  return <div>
           <div className="row">
             <div className="column"><h1>Memory Game</h1></div>
           </div>
           <div className="row">
             <div className="column"><button onClick={params.onMenuButtonPressed}>Menu</button></div>
             <div className="column"><p>{params.state.player1.name}'s Score: {params.state.player1.score}</p></div>
             <div className="column"><p>{params.state.player2.name}'s Score: {params.state.player2.score}</p></div>
           </div>
           <Board cells={params.state.cells}
                  firstGuess={params.state.first_guess}
                  secondGuess={params.state.second_guess}
                  onGuess={params.onCardClicked} />
         </div>;
}

// onJoinButtonPressed - callback for when the join button is pressed
// playerCount - the number of players in the lobby
// isWaitingForPlayer - whether or not the user has joined and is waiting for another player
function LobbyScreen(params) {
  return <div>
    <div className="row">
      <div className="column"><h3>Lobby</h3></div>
    </div>
    <div className="row">
      <div className="column">
        <p>{params.playerCount} / 2</p>
      </div>
    </div>
    <div className="row">
      <div className="column">
        <LobbyJoinButton onJoinButtonPressed={params.onJoinButtonPressed} isWaitingForPlayer={params.isWaitingForPlayer}/>
      </div>
    </div>
  </div>;
}

// isWaitingForPlayer - whether the user has joined and is waiting for another user to join
// onJoinButtonPressed - join callback
function LobbyJoinButton(params) {
  if (!params.isWaitingForPlayer) {
    return <button onClick={params.onJoinButtonPressed}>Join</button>;
  }
  else {
    return <button disabled>Waiting...</button>
  }
}

// winText - the text to display on the screen that describes the outcome of the game
// onRestartButtonPressed - callback for when the restart button is pressed
// onMenuButtonPressed - callback for when the menu button is pressed
function RetryScreen(params) {
  return <div>
    <div className="row">
      <div className="column"><h3>{params.winText}</h3></div>
    </div>
    <div className="row">
      <div className="column"><button onClick={params.onRestartButtonPressed}>Restart</button></div>
    </div>
    <div className="row">
      <div className="column"><button onClick={params.onMenuButtonPressed}>Menu</button></div>
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
