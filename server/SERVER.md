# WebSocket Messaging Conventions

This document outlines the messaging conventions for interacting with the Contract Bridge FastAPI WebSocket server.

## 1. `create:`

*   **Description:** Initiates a new game session on the server.
*   **Client Sends:** `"create:"` (string)
*   **Server Responds:** A 6-digit alphanumeric `game_id` (string) for the newly created game.

## 2. `join:<game_id>`

*   **Description:** Allows a player to join an existing game using its `game_id`.
*   **Client Sends:** `"join:<game_id>"` (string), where `<game_id>` is the 6-digit alphanumeric code.
*   **Server Responds:**
    *   **Success:** A JSON string representing the masked `Game` object. Player WebSocket objects are replaced with generic names ("alpha", "beta", "sigma", "zeta") based on their join order.
        ```json
        {
            "last_updated": <timestamp>,
            "players": ["alpha", "beta", "sigma", "zeta"], // Up to 4 players
            "north": "alpha" | null,
            "south": "beta" | null,
            "east": "sigma" | null,
            "west": "zeta" | null
        }
        ```
    *   **Error (Game Not Found):** `"Error: Game not found"` (string)
    *   **Error (Game Full):** `"Error: Game is full"` (string)

## 3. `iam:north|south|east|west`

*   **Description:** Assigns a directional role (North, South, East, West) to the connected player within their current game.
*   **Client Sends:** `"iam:<direction>"` (string), where `<direction>` can be `north`, `south`, `east`, or `west`.
*   **Server Responds:**
    *   **Success:** `"You are now <direction>"` (string)
    *   **Error (Not in Game):** `"Error: Not in a game"` (string)
    *   **Error (Invalid Direction):** `"Error: Invalid direction"` (string)

## 4. `start:`

*   **Description:** Initiates the game, shuffles a deck of cards, and deals them to the four players.
*   **Client Sends:** `"start:"` (string)
*   **Server Responds:**
    *   **Success (to initiating player):** `"Game started and cards dealt!"` (string)
    *   **Success (to each player):** A JSON string containing their hand.
        ```json
        {
            "hand": [card1, card2, ..., card13] // An array of integers from 1 to 52
        }
        ```
    *   **Error (Not in Game):** `"Error: Not in a game"` (string)
    *   **Error (Not Enough Players):** `"Error: Not enough players to start (need 4)"` (string)

