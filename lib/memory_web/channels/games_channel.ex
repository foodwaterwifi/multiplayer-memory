defmodule MemoryWeb.GamesChannel do
  use MemoryWeb, :channel

  alias Memory.Game, as: Game
  alias Memory.BackupAgent, as: BackupAgent

  def join("games:" <> gameName, payload, socket) do
    if authorized?(payload) do
      gameState = BackupAgent.get(gameName) || Game.new_state()
      userName = Map.get(payload, "user")
      socket = socket
      |> assign(:gameName, gameName)
      |> assign(:userName, userName)
      |> IO.inspect
      BackupAgent.put(gameName, gameState)
      {:ok, %{"join" => gameName, "game" => Game.client_view(gameState)}, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  def handle_in("guess", %{"posx" => posx, "posy" => posy}, socket) do
    gameName = socket.assigns[:gameName]
    userName = socket.assigns[:userName]

    IO.puts("User '" <> userName <> "' tried to guess on game '" <> gameName <> "'.")
    # This version of the game will be sent to the client. It includes their two guesses.
    # The client is responsible for flipping the cards back over. The game could be cheated either way,
    # so this puts less stress on the server.
    game_for_client = Game.guess(BackupAgent.get(gameName), posx, posy, userName)
    # This version of the game will be stored on the server. It does not include the two
    # guesses. This way, if the client reloads the page, they will no longer receive information
    # about the cards they should have flipped over.
    game_to_store = Game.postguess(game_for_client)
    BackupAgent.put(gameName, game_to_store)
    broadcast(socket, "update", %{"game" => Game.client_view(game_for_client)})
    {:noreply, socket}
  end

  def handle_in("joinlobby", %{}, socket) do
    gameName = socket.assigns[:gameName]
    userName = socket.assigns[:userName]
    gameState = Game.joinlobby(BackupAgent.get(gameName), userName)
    BackupAgent.put(gameName, gameState)
    broadcast(socket, "update", %{"game" => gameState})
    {:noreply, socket}
  end

  def handle_in("reset", %{}, socket) do
    gameName = socket.assigns[:gameName]
    gameState = Game.new_state()
    BackupAgent.put(gameName, gameState)
    broadcast(socket, "update", %{"game" => Game.client_view(gameState)})
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end
end
