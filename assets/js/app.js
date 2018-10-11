// We need to import the CSS so that webpack will load it.
// The MiniCssExtractPlugin is used to separate it out into
// its own CSS file.
import css from "../css/app.css";

// webpack automatically bundles all modules in your
// entry points. Those entry points can be configured
// in "webpack.config.js".
//
// Import dependencies
//
import "phoenix_html";
import $ from "jquery";

// Import local files
//
// Local files can be imported directly using relative paths, for example:
// import socket from "./socket"

import socket from "./socket";
import game_init from "./memory-game";

function channel_from_name(gameName, userName) {
  return socket.channel("games:" + gameName, {user: userName});
}

function form_init() {
  $('#game-button').click(() => {
    let gameName = $('#game-input').val();
    let playerName = $('#user-input').val();
    console.log("Joining game '" + gameName + "' as '" + playerName + "'.");
    window.location.href = "/game/" + gameName + "/" + playerName;
  });
}

function start() {
  let isGame = !!document.getElementById("page:game");
  if (isGame) {
    console.log("Game name is '", gameName, "'");
    game_init(root, channel_from_name(window.gameName, window.userName));
  }

  let isIndex = !!document.getElementById("page:index");
  if (isIndex) {
    console.log("Index page loaded.")
    form_init();
  }
}

$(start);
