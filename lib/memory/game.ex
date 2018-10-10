defmodule Memory.Game do
  # Creates a new state which describes what the start of the game should look like.
  def new_state do
    %{ board: generate_random_board(4, 4, ["A", "B", "C", "D", "E", "F", "G", "H"]),
       correct_guesses: [],
       first_guess: nil,
       second_guess: nil,
       player1: nil,
       player2: nil,
       turn: :player1,
     }
  end

  # Generate the client view
  def client_view(state) do
    board = state.board
    {width, height} = {board[:width], board[:height]}
    cells = List.foldr(Enum.to_list(0..height-1), [], fn yy, rows ->
      [List.foldr(Enum.to_list(0..width-1), [], fn xx, row ->
        pos = [x: xx, y: yy];
        letter = get_symbol_at_pos(board, pos)
        if (pos in state.correct_guesses) do
          [ letter | row ]
        else
          [ "?" | row ]
        end
      end) | rows]
    end)
    # We want to send information about the client's guesses separately from the board to make computation easier.
    # The client can simply null the guesses when they want to flip the cards back over.
    first_guess = if (state.first_guess != nil) do
      %{pos: Map.new(state.first_guess), letter: get_symbol_at_pos(board, state.first_guess)}
    else nil end
    second_guess = if (state.second_guess != nil) do
      %{pos: Map.new(state.second_guess), letter: get_symbol_at_pos(board, state.second_guess)}
    else nil end
    # Final view
    %{cells: cells, first_guess: first_guess, second_guess: second_guess, player1: state.player1, player2: state.player2}
  end

  # Assigns random symbols to a board using a list of positions to assign the symbols
  defp assign_positions(board, positions, lastSymbol, symbols, symbolIndex) do
    if (positions == []) do
      board
    else
      # Pull a random position from the list of positions without replacement
      pos = Enum.random(positions)
      positions = Enum.reject(positions, fn x -> x == pos end)
      if (lastSymbol) do
        board = put_in(board, [pos[:y], pos[:x]], lastSymbol)
        lastSymbol = nil
        symbolIndex = rem((symbolIndex + 1), length(symbols))
        assign_positions(board, positions, lastSymbol, symbols, symbolIndex)
      else
        symbol = Enum.at(symbols, symbolIndex)
        board = put_in(board, [pos[:y], pos[:x]], symbol)
        lastSymbol = symbol
        assign_positions(board, positions, lastSymbol, symbols, symbolIndex)
      end
    end
  end

  # Generates a random W x H board using the symbols specified (e.g. ["A", "B"])
  def generate_random_board(width, height, symbols) do
    numCells = width*height;
    board = %{width: width, height: height}
    if (rem(numCells, 2) != 0 || length(symbols) == 0) do
      board
    else
      # generate a list of positions
      #positions = generatePositionList(width, height)
      positions = List.foldl(Enum.to_list(0..height-1), [], fn yy, positions ->
        List.foldl(Enum.to_list(0..width-1), positions, fn xx, positions ->
          [ [x: xx, y: yy] | positions ]
        end)
      end)
      # construct the board
      board = List.foldl(Enum.to_list(0..height-1), board, fn yy, board -> Map.put(board, yy, %{}) end)
      # return the board with the assigned positions
      assign_positions(board, positions, nil, symbols, 0)
    end
  end

  # Gets the symbol at a certain position in the board
  defp get_symbol_at_pos(board, pos) do
    get_in(board, [pos[:y], pos[:x]])
  end

  # Defines the behavior for when a player joins the lobby
  def joinlobby(state, name) do
    cond do
      state.player1 == nil ->
        Map.put(state, :player1, %{:name => name, :score => 0})
      state.player1.name != name and state.player2 == nil ->
        Map.put(state, :player2, %{:name => name, :score => 0})
      true -> state
    end
  end

  # Flip turn
  def flipturn(state) do
    if (state.turn == :player1) do
      state
      |> Map.put(:turn, :player2)
    else
      state
      |> Map.put(:turn, :player1)
    end
  end

  # Defines the behavior for when the player makes a guess
  def guess(state, posx, posy, name) do
    pos = [x: posx, y: posy]
    cond do
      # It isn't the player's turn
      ((state.turn == :player1 and state.player1.name != name) or
       (state.turn == :player2 and state.player2.name != name)) ->
        state
      # This is the first guess
      (state.first_guess == nil or (state.first_guess != nil and state.second_guess != nil)) ->
        state
        |> Map.put(:first_guess, pos)
        |> Map.put(:second_guess, nil)
      # We guessed in the same location, do not count
      (state.first_guess == pos and state.second_guess == nil) -> state
      # This is the second guess and it is correct
      (get_symbol_at_pos(state.board, pos) == get_symbol_at_pos(state.board, state.first_guess)) ->
        state
        |> Map.put(:correct_guesses, [ state.first_guess | [pos | state.correct_guesses]])
        |> Map.put(:first_guess, nil)
        |> update_in([state.turn, :score], &(&1 + 1))
        |> flipturn()
      # This is the second guess and it is wrong
      true ->
        state
        |> Map.put(:second_guess, pos)
        |> flipturn()
    end
  end

  # This should be called after each guess to flip the cards back over every two guesses.
  def postguess(state) do
    if (state.first_guess != nil and state.second_guess != nil) do
      state
      |> Map.put(:first_guess, nil)
      |> Map.put(:second_guess, nil)
    else
      state
    end
  end

end
