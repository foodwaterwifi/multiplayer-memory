defmodule MemoryWeb.GamesChannel do
  use MemoryWeb, :channel

  alias Memory.Game, as: Game
  alias Memory.BackupAgent, as: BackupAgent

  def join("games:" <> name, payload, socket) do
    if authorized?(payload) do
      game = BackupAgent.get(name) || Game.new_state()
      socket = socket
      |> assign(:game, game)
      |> assign(:name, name)
      BackupAgent.put(name, game)
      {:ok, %{"join" => name, "game" => Game.client_view(game)}, socket}
    else
      {:error, %{reason: "unauthorized"}}
    end
  end

  def handle_in("guess", %{"posx" => posx, "posy" => posy}, socket) do
    name = socket.assigns[:name]
    # This version of the game will be sent to the client. It includes their two guesses.
    # The client is responsible for flipping the cards back over. The game could be cheated either way,
    # so this puts less stress on the server.
    game_for_client = Game.guess(BackupAgent.get(name), posx, posy)
    # This version of the game will be stored on the server. It does not include the two
    # guesses. This way, if the client reloads the page, they will no longer receive information
    # about the cards they should have flipped over.
    game_to_store = Game.postguess(game_for_client)
    socket = assign(socket, :game, game_to_store)
    BackupAgent.put(name, game_to_store)
    MemoryWeb.Endpoint.broadcast("games:" <> name, "update", Game.client_view(game_for_client))
    {:noreply, socket}
  end

  def handle_in("reset", payload, socket) do
    name = socket.assigns[:name]
    game = Game.new_state()
    socket = assign(socket, :game, game)
    BackupAgent.put(name, game)
    MemoryWeb.Endpoint.broadcast("games:" <> name, "update", Game.client_view(game))
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end
end
