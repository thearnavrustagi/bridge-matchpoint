# Contract Bridge - Application Architecture

## File Structure

```
src/
├── App.tsx                      # Main app component - manages state and routing
├── App.css                      # Container styles only
├── main.tsx                     # Entry point
├── WebSocketProvider.tsx        # WebSocket context provider
├── screens/
│   ├── LandingScreen.tsx        # Home screen (Make/Join lobby)
│   ├── LandingScreen.css
│   ├── LobbyScreen.tsx          # Pre-game lobby (select position)
│   ├── LobbyScreen.css
│   ├── GameScreen.tsx           # Main game screen (bidding + playing)
│   └── GameScreen.css
├── components/
│   ├── Card.tsx                 # Individual card component
│   ├── Card.css
│   ├── BiddingBox.tsx           # Bidding interface
│   └── BiddingBox.css
└── utils/
    └── game.ts                  # Game logic utilities
```

## Screen Flow

1. **Landing Screen** (`landing`)
   - Choose to create or join a lobby
   - Enter game code to join existing game

2. **Lobby Screen** (`lobby`)
   - Shows connected players (up to 4)
   - Select your position (North/South/East/West)
   - Start game when 4 players ready

3. **Game Screen** (`bidding` / `playing`)
   - Bidding phase: Players bid clockwise starting with North
   - Playing phase: Play cards, track tricks
   - Your cards always at bottom, others show backs

## State Management

### App.tsx Responsibilities
- Manages all game state (hands, bids, tricks, etc.)
- Handles WebSocket messages
- Routes between screens based on `gamePhase`
- Passes handlers and state down to screen components

### Screen Components
- **LandingScreen**: Minimal state (lobby code input, settings modal)
- **LobbyScreen**: Stateless - displays props and triggers callbacks
- **GameScreen**: Stateless - displays game state and triggers callbacks

## WebSocket Communication

All WebSocket logic centralized in:
- `WebSocketProvider.tsx` - Connection management
- `App.tsx` - Message handling and state updates

## Key Features

### Multiplayer
- Real-time synchronization via WebSocket
- 4-player support
- Position selection in lobby
- Game code sharing

### Card Display
- Table rotates so you're always at bottom
- Your cards face-up, others show backs
- Position labels show direction names

### Bidding
- Starts with North, goes clockwise
- Buttons disabled when not your turn
- Turn indicator shows current player
- Standard bridge bidding rules

## Component Props Flow

```
App
├─> LandingScreen
│   ├─ onMakeLobby()
│   ├─ onJoinLobby(code)
│   └─ gameCode
│
├─> LobbyScreen
│   ├─ gameState
│   ├─ selectedPosition
│   ├─ onPositionSelect(pos)
│   └─ onStartGame()
│
└─> GameScreen
    ├─ hands[]
    ├─ selectedPosition
    ├─ gamePhase
    ├─ currentPlayer
    ├─ biddingHistory[]
    ├─ contract
    ├─ playedCards[]
    ├─ tricks[]
    ├─ onBid(level, suit)
    ├─ onPass()
    ├─ onDouble()
    └─ onPlayCard(card, player)
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each screen handles its own UI, App handles logic
2. **Maintainability**: Easy to find and update specific screens
3. **Reusability**: Components are self-contained with CSS
4. **Scalability**: Easy to add new screens or features
5. **Clean Code**: App.tsx is now focused on state management, not rendering

## Future Improvements

- Add React Router for true URL-based routing
- Split game logic into custom hooks
- Add TypeScript interfaces in separate files
- Implement state persistence (localStorage)
- Add sound effects and animations

