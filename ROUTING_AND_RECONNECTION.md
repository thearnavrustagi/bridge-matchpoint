# URL Routing & Auto-Reconnection Features

## Overview
The application now supports URL-based routing and automatic reconnection when users reload the page or disconnect.

## Features Implemented

### 1. Rotating Dealer System
**Server Side (`server/main.py`)**
- Dealer rotates clockwise each game:
  - Game 1: Dealer = North (bidding starts with East)
  - Game 2: Dealer = East (bidding starts with South)
  - Game 3: Dealer = South (bidding starts with West)
  - Game 4: Dealer = West (bidding starts with North)
  - Pattern repeats...
- Bidding always starts with the player to the left of the dealer
- Follows standard bridge rotation rules

### 2. URL-Based Joining
**Frontend (`src/App.tsx`, `src/main.tsx`)**

#### URL Patterns:
- `/` - Landing screen
- `/join/<code>` - Direct link to join a game
- `/play/<code>` - Direct link to join/rejoin a game

#### How it Works:
Users can share and directly access games via URL:
```
http://localhost:5173/join/ABC123
http://localhost:5173/play/ABC123
```

When a user opens these URLs:
- The app extracts the game code from the URL
- Automatically joins that game
- No manual code entry needed!

### 3. Auto-Reconnection with localStorage
**Implementation (`src/App.tsx`)**

The app uses **localStorage** to remember your game session:
- `bridge_game_code`: Which game you're in
- `bridge_selected_position`: Your position (West/North/East/South)

#### Reconnection Flow:
When you visit a game URL (e.g., `/join/ABC123` or `/play/ABC123`):

1. **Check localStorage:** Did you play this game before?
   
2. **If YES (reconnecting):**
   - ✅ Auto-join the game
   - ✅ Restore your position (West/North/East/South)
   - ✅ Continue where you left off
   - No need to select position again!

3. **If NO (new join):**
   - Join as a new player
   - Select your position
   - Start playing

#### What This Means:
- **Refresh the page?** → You're back in the game automatically
- **Browser crashed?** → Reopen the URL, you're back
- **Closed the tab?** → Bookmark or reopen the URL
- **Shared link?** → Others join as new players

The localStorage persists until you:
- Clear browser data
- Join a different game
- Use a different browser/device

### 4. Copy URL Button
**Frontend (`src/screens/LobbyScreen.tsx`, `src/screens/LobbyScreen.css`)**

Added "Copy Invite URL" button to lobby:
- Copies full URL: `http://your-domain/join/<code>`
- Shows toast notification: "Invite URL copied to clipboard!"
- Styled with hover effects and link icon
- Positioned below the game code input

Original "Copy Code" button still available for just the game code.

## User Experience Flow

### Creating a Game:
1. Click "Make Lobby" on landing screen
2. Get a game code (e.g., `ABC123`)
3. Click "Copy Invite URL" button
4. Share `http://domain/join/ABC123` with friends
5. Everyone selects their position
6. Host clicks "Start!" to begin

### Joining via Shared URL:
1. Friend sends you: `http://domain/join/ABC123`
2. Click the link → **Automatically joins game ABC123**
3. Select your position (West/North/East/South)
4. Wait for others and start playing

### Reconnecting After Disconnect:
1. Playing game, browser crashes/closes
2. Reopen the URL: `http://domain/play/ABC123`
3. **Automatically reconnects** to game ABC123
4. **Position restored** from localStorage (e.g., you were South)
5. Continue playing immediately - no need to reselect position!

### First Time vs Reconnecting:
- **First time opening a game URL:** Select your position manually
- **Returning to same URL:** Auto-reconnect with saved position
- **Different device/browser:** Will need to select position again (localStorage is per-browser)

## Technical Details

### Dependencies Added:
- `react-router-dom` - URL routing

### Files Modified:

#### Frontend:
- `src/main.tsx` - Added BrowserRouter wrapper
- `src/App.tsx` - URL routing, reconnection logic, localStorage persistence
- `src/screens/LobbyScreen.tsx` - Copy URL button
- `src/screens/LobbyScreen.css` - Copy URL button styles

#### Server:
- `server/main.py` - Rotating dealer logic

### State Management:
```typescript
// URL pattern matching
const path = location.pathname;
const joinMatch = path.match(/^\/join\/([a-zA-Z0-9]+)$/);
const playMatch = path.match(/^\/play\/([a-zA-Z0-9]+)$/);

// localStorage persistence
localStorage.setItem('bridge_game_code', gameCode);
localStorage.setItem('bridge_selected_position', position.toString());

// Auto-reconnect
if (savedGameCode === urlGameCode) {
  // Rejoin game with saved position
}
```

### Simple URL Pattern Matching:
```typescript
// Extract code from URL
const joinMatch = path.match(/^\/join\/([a-zA-Z0-9]+)$/);
const playMatch = path.match(/^\/play\/([a-zA-Z0-9]+)$/);
const urlGameCode = joinMatch?.[1] || playMatch?.[1];

// If URL has a code, join that game
if (urlGameCode) {
  sendMessage(`join:${urlGameCode}`);
}
```

No automatic navigation - URLs work but don't change as you play. Simple and predictable!

## Testing

### Test Scenarios:
1. **Create and share game:**
   - Create lobby → copy URL → send to friend
   - Friend opens URL → joins automatically

2. **Reconnection:**
   - Join game, select position
   - Refresh page → should reconnect with same position
   - Close browser, reopen URL → should reconnect

3. **Direct access:**
   - Open `/join/<valid-code>` → should join
   - Open `/play/<valid-code>` → should join if game active
   - Open `/join/<invalid-code>` → should show error

4. **Dealer rotation:**
   - Play multiple games
   - Verify bidding starts with different player each game
   - Check pattern: North→East→South→West→North...

## Future Enhancements

Possible additions:
- Game history in URL (e.g., `/play/<code>/game/<number>`)
- Spectator mode via URL
- Deep linking to specific game states
- Share replay URLs
- QR code generation for easy mobile sharing

