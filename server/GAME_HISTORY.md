# Game History Feature

## Overview
The server now tracks complete game history for each session, including bidding and play history. Games that have been inactive for more than 1 hour are automatically cleaned up.

## Features Implemented

### 1. Game History Tracking
- **Bidding History**: Every bid (including passes, doubles, redoubles) is stored with player information
- **Play History**: Every card played is tracked with:
  - Trick number
  - Position in trick (1-4)
  - Card suit and rank
  - Player who played it
  - Timestamp

### 2. Game Records
When each game completes, a complete record is saved containing:
- Game number
- Timestamp
- Vulnerability settings
- Complete bidding history
- Final contract
- Complete play history (all 52 cards played)
- Tricks won by each player
- Detailed score breakdown
- Declarer and dummy positions

### 3. Automatic Cleanup
- Background task runs every 5 minutes
- Games inactive for more than 1 hour are removed
- Before removal, game history is logged and optionally saved to disk

### 4. Optional Disk Persistence
Game histories can be automatically saved to JSON files when games are cleaned up.

**Configuration** (in `main.py`):
```python
SAVE_GAME_HISTORY_TO_DISK = True  # Set to False to disable
GAME_HISTORY_DIR = "game_history"  # Directory for saved files
GAME_INACTIVITY_TIMEOUT = 3600     # 1 hour in seconds
```

**File Structure**:
```
server/
  game_history/
    game_ABC123_20251019_143022.json
    game_XYZ789_20251019_150533.json
    ...
```

**JSON Format**:
```json
{
  "game_id": "ABC123",
  "saved_at": "2025-10-19T14:30:22.123456",
  "total_games": 3,
  "games": [
    {
      "game_number": 1,
      "timestamp": 1729350622.123,
      "vulnerability": {"ns": false, "ew": false},
      "bidding_history": [...],
      "contract": {...},
      "play_history": [...],
      "tricks_won": [3, 4, 2, 4],
      "score": {...},
      "declarer": 3,
      "dummy": 1
    },
    ...
  ]
}
```

## Activity Tracking
The following actions keep a game active and reset the inactivity timer:
- Creating a game
- Joining a game  
- Selecting a position
- Starting a game
- Making a bid
- Playing a card

## Logging
The server logs:
- When games are completed and saved to history
- When inactive games are being cleaned up
- When game history is saved to disk
- Summary statistics for each completed game

## Future Enhancements
Possible additions:
- API endpoint to retrieve game history
- Statistics and analytics on saved games
- Export to PBN (Portable Bridge Notation) format
- Replay functionality
- Player performance tracking across sessions

