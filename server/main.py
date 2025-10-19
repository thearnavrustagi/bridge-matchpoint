import time
import random
import json
import asyncio
import os
from datetime import datetime
from typing import Dict, List, Optional
from string import ascii_letters

from fastapi import FastAPI, WebSocket

app = FastAPI()

# Configuration
GAME_INACTIVITY_TIMEOUT = 3600  # 1 hour in seconds
SAVE_GAME_HISTORY_TO_DISK = True  # Set to True to save game history to JSON files
GAME_HISTORY_DIR = "game_history"  # Directory to save game histories


class Game:
    def __init__(self):
        self.last_updated: float = time.time()
        self.players: List[WebSocket] = []
        self.host: Optional[WebSocket] = None  # Track the host (first player)
        self.north: Optional[WebSocket] = None
        self.south: Optional[WebSocket] = None
        self.east: Optional[WebSocket] = None
        self.west: Optional[WebSocket] = None
        self.hands: Dict[str, List[int]] = {
            "north": [],
            "south": [],
            "east": [],
            "west": [],
        }
        self.bidding_history: List[Dict] = []
        self.current_player: int = 1  # Start with North (index 1)
        self.game_phase: str = "lobby"  # lobby, bidding, playing
        self.current_trick: List[Dict] = []  # Cards played in current trick
        self.tricks_won: List[int] = [0, 0, 0, 0]  # Tricks won by each player
        self.contract: Optional[Dict] = None  # The final contract
        self.trump_suit: Optional[str] = None  # Trump suit for current deal
        self.dummy_revealed: bool = False  # Whether dummy's hand has been shared
        self.game_number: int = 1  # Track which game number we're on
        
        # Game history tracking
        self.play_history: List[Dict] = []  # Track all plays in current game
        self.game_history: List[Dict] = []  # Store completed games with full details

games: Dict[str, Game] = {}
player_to_game: Dict[WebSocket, str] = {}


def get_vulnerability(game_number: int) -> Dict[str, bool]:
    """
    Calculate vulnerability based on game number.
    Pattern repeats every 4 games:
    1. No one vulnerable
    2. N-S vulnerable (partnership 1)
    3. E-W vulnerable (partnership 0)
    4. Both vulnerable
    """
    position = (game_number - 1) % 4
    
    if position == 0:  # Game 1, 5, 9, etc.
        return {'ns': False, 'ew': False}
    elif position == 1:  # Game 2, 6, 10, etc.
        return {'ns': True, 'ew': False}
    elif position == 2:  # Game 3, 7, 11, etc.
        return {'ns': False, 'ew': True}
    else:  # Game 4, 8, 12, etc.
        return {'ns': True, 'ew': True}


def check_bidding_end(history: List[Dict]) -> bool:
    """Check if bidding has ended"""
    if len(history) < 4:
        return False
    # All passed out at start
    if len(history) == 4 and all(b['suit'] == 'Pass' for b in history):
        return True
    
    # Check if there's a redouble in the bidding
    has_redouble = any(b['suit'] == 'Redouble' for b in history)
    
    if has_redouble:
        # After redouble, need 3 consecutive passes to end bidding
        if len(history) < 3:
            return False
        last3 = history[-3:]
        has_real_bid = any(b['level'] > 0 for b in history)
        return has_real_bid and all(b['suit'] == 'Pass' for b in last3)
    else:
        # Normal bidding end: last 3 bids are passes and there's at least one real bid
        last3 = history[-3:]
        has_real_bid = any(b['level'] > 0 for b in history)
        return has_real_bid and all(b['suit'] == 'Pass' for b in last3)


def get_final_contract(history: List[Dict]):
    """Get the final contract from bidding history"""
    # Find last real bid (non-pass)
    last_real_bid = None
    for bid in reversed(history):
        if bid['level'] > 0:
            last_real_bid = bid
            break
    
    if not last_real_bid:
        return None
    
    # Find declarer (first player in partnership to bid the suit)
    partnership = last_real_bid['playerIndex'] % 2
    declarer = None
    for bid in history:
        if (bid['level'] > 0 and 
            bid['suit'] == last_real_bid['suit'] and 
            bid['playerIndex'] % 2 == partnership):
            declarer = bid['playerIndex']
            break
    
    # Check for doubles/redoubles
    last_bid_index = history.index(last_real_bid)
    after_bid = history[last_bid_index + 1:]
    doubled = any(b['suit'] == 'Double' for b in after_bid)
    redoubled = any(b['suit'] == 'Redouble' for b in after_bid)
    
    return {
        'level': last_real_bid['level'],
        'suit': last_real_bid['suit'],
        'declarer': declarer if declarer is not None else last_real_bid['playerIndex'],
        'doubled': doubled,
        'redoubled': redoubled
    }


def get_player_position(game: Game, websocket: WebSocket) -> Optional[int]:
    """Get the positional index (0=West, 1=North, 2=East, 3=South) for a websocket"""
    if game.west == websocket:
        return 0
    elif game.north == websocket:
        return 1
    elif game.east == websocket:
        return 2
    elif game.south == websocket:
        return 3
    return None


def get_trick_winner(trick: List[Dict], trump_suit: Optional[str]) -> int:
    """Determine the winner of a trick"""
    if not trick:
        return 0
    
    lead_suit = trick[0]['suit']
    winner = trick[0]
    
    for played in trick:
        # Trump beats everything
        if trump_suit and played['suit'] == trump_suit:
            if winner['suit'] != trump_suit or played['rank'] > winner['rank']:
                winner = played
        # If no trump involved, follow suit and highest rank wins
        elif played['suit'] == lead_suit and winner['suit'] != trump_suit:
            if winner['suit'] != lead_suit or played['rank'] > winner['rank']:
                winner = played
    
    return winner['player']


def calculate_score(contract: Dict, tricks_won: List[int], vulnerability: Dict[str, bool]) -> Dict:
    """
    Calculate the bridge score based on the contract and tricks won.
    Returns a dict with score breakdown for both teams.
    vulnerability: dict with 'ns' and 'ew' keys indicating if each partnership is vulnerable
    """
    declarer = contract['declarer']
    level = contract['level']
    suit = contract['suit']
    doubled = contract['doubled']
    redoubled = contract['redoubled']
    
    # Calculate tricks won by declarer's partnership
    # Declarer is at position 0-3, partners are 0&2 or 1&3
    declarer_partnership = declarer % 2
    
    # Determine if declarer is vulnerable
    # Partnership 0 = West-East, Partnership 1 = North-South
    vulnerable = vulnerability['ns'] if declarer_partnership == 1 else vulnerability['ew']
    if declarer_partnership == 0:  # West-East partnership (positions 0 and 2)
        declarer_tricks = tricks_won[0] + tricks_won[2]
    else:  # North-South partnership (positions 1 and 3)
        declarer_tricks = tricks_won[1] + tricks_won[3]
    
    # Tricks needed to make contract (6 + bid level)
    tricks_needed = 6 + level
    tricks_made = declarer_tricks
    
    # Initialize score breakdown
    declarer_score = {
        'contract_points': 0,
        'overtrick_points': 0,
        'slam_bonus': 0,
        'double_bonus': 0,
        'game_bonus': 0,
        'undertrick_penalty': 0,
        'total': 0
    }
    
    defender_score = {
        'contract_points': 0,
        'overtrick_points': 0,
        'slam_bonus': 0,
        'double_bonus': 0,
        'game_bonus': 0,
        'undertrick_penalty': 0,
        'total': 0
    }
    
    # Check if contract was made or failed
    if tricks_made >= tricks_needed:
        # Contract made
        overtricks = tricks_made - tricks_needed
        
        # Calculate base trick points
        if suit in ['clubs', 'diamonds']:
            # Minor suits: 20 points per trick
            base_points_per_trick = 20
        elif suit in ['hearts', 'spades']:
            # Major suits: 30 points per trick
            base_points_per_trick = 30
        else:  # NT
            # No trump: 40 for first trick, 30 for rest
            base_points_per_trick = 30
            declarer_score['contract_points'] = 40  # First trick bonus for NT
        
        # Calculate contract points
        trick_points = level * base_points_per_trick
        if suit == 'NT':
            declarer_score['contract_points'] += trick_points
        else:
            declarer_score['contract_points'] = trick_points
        
        # Apply doubling/redoubling to contract points
        if doubled:
            declarer_score['contract_points'] *= 2
            declarer_score['double_bonus'] = 50
        elif redoubled:
            declarer_score['contract_points'] *= 4
            declarer_score['double_bonus'] = 100
        
        # Calculate overtrick points
        if overtricks > 0:
            if doubled:
                overtrick_value = 100 if not vulnerable else 200
                declarer_score['overtrick_points'] = overtricks * overtrick_value
            elif redoubled:
                overtrick_value = 200 if not vulnerable else 400
                declarer_score['overtrick_points'] = overtricks * overtrick_value
            else:
                # Undoubled overtricks
                if suit in ['clubs', 'diamonds']:
                    declarer_score['overtrick_points'] = overtricks * 20
                elif suit in ['hearts', 'spades']:
                    declarer_score['overtrick_points'] = overtricks * 30
                else:  # NT
                    declarer_score['overtrick_points'] = overtricks * 30
        
        # Check for game bonus (100 points or more in contract points)
        if declarer_score['contract_points'] >= 100:
            # Game bonus
            declarer_score['game_bonus'] = 300 if not vulnerable else 500
        else:
            # Part-score bonus
            declarer_score['game_bonus'] = 50
        
        # Slam bonuses
        if level == 6:  # Small slam
            declarer_score['slam_bonus'] = 500 if not vulnerable else 750
        elif level == 7:  # Grand slam
            declarer_score['slam_bonus'] = 1000 if not vulnerable else 1500
        
        # Calculate total
        declarer_score['total'] = (
            declarer_score['contract_points'] +
            declarer_score['overtrick_points'] +
            declarer_score['slam_bonus'] +
            declarer_score['double_bonus'] +
            declarer_score['game_bonus']
        )
    else:
        # Contract failed - defenders get penalty points
        undertricks = tricks_needed - tricks_made
        
        if doubled:
            # Doubled penalties
            for i in range(undertricks):
                if i == 0:  # First undertrick
                    defender_score['undertrick_penalty'] += 100 if not vulnerable else 200
                elif i in [1, 2]:  # 2nd and 3rd undertricks
                    defender_score['undertrick_penalty'] += 200 if not vulnerable else 300
                else:  # 4th and subsequent
                    defender_score['undertrick_penalty'] += 300
        elif redoubled:
            # Redoubled penalties (double the doubled penalties)
            for i in range(undertricks):
                if i == 0:  # First undertrick
                    defender_score['undertrick_penalty'] += 200 if not vulnerable else 400
                elif i in [1, 2]:  # 2nd and 3rd undertricks
                    defender_score['undertrick_penalty'] += 400 if not vulnerable else 600
                else:  # 4th and subsequent
                    defender_score['undertrick_penalty'] += 600
        else:
            # Undoubled penalties
            penalty_per_trick = 50 if not vulnerable else 100
            defender_score['undertrick_penalty'] = undertricks * penalty_per_trick
        
        defender_score['total'] = defender_score['undertrick_penalty']
    
    return {
        'declarer_partnership': declarer_partnership,
        'declarer_score': declarer_score,
        'defender_score': defender_score,
        'contract_made': tricks_made >= tricks_needed,
        'tricks_taken': tricks_made,
        'tricks_needed': tricks_needed
    }


def save_game_history_to_file(game_id: str, game_history: List[Dict]):
    """Save game history to a JSON file"""
    if not SAVE_GAME_HISTORY_TO_DISK or not game_history:
        return
    
    try:
        # Create directory if it doesn't exist
        os.makedirs(GAME_HISTORY_DIR, exist_ok=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{GAME_HISTORY_DIR}/game_{game_id}_{timestamp}.json"
        
        # Prepare data for saving
        save_data = {
            "game_id": game_id,
            "saved_at": datetime.now().isoformat(),
            "total_games": len(game_history),
            "games": game_history
        }
        
        # Write to file
        with open(filename, 'w') as f:
            json.dump(save_data, f, indent=2)
        
        print(f"✓ Game history saved to {filename}")
        return filename
    except Exception as e:
        print(f"Error saving game history: {e}")
        return None


async def broadcast_game_state(game: Game, game_id: str):
    """Broadcast game state to all players in the game"""
    player_names = ["alpha", "beta", "sigma", "zeta"]
    
    for i, player in enumerate(game.players):
        # Create game state for this player
        game_state = {
            "type": "game_state",
            "game_id": game_id,
            "last_updated": game.last_updated,
            "players": [player_names[j] for j in range(len(game.players))],
            "north": player_names[game.players.index(game.north)] if game.north else None,
            "south": player_names[game.players.index(game.south)] if game.south else None,
            "east": player_names[game.players.index(game.east)] if game.east else None,
            "west": player_names[game.players.index(game.west)] if game.west else None,
            "your_name": player_names[i],
            "your_index": i,
            "is_host": player == game.host,
        }
        
        try:
            await player.send_text(json.dumps(game_state))
        except:
            pass  # Handle disconnected players


async def cleanup_inactive_games():
    """Background task to clean up games that have been inactive for too long"""
    while True:
        try:
            await asyncio.sleep(300)  # Check every 5 minutes
            
            current_time = time.time()
            games_to_remove = []
            
            for game_id, game in games.items():
                time_since_update = current_time - game.last_updated
                
                if time_since_update > GAME_INACTIVITY_TIMEOUT:
                    games_to_remove.append(game_id)
                    
                    # Log the cleanup with game history summary
                    print(f"Cleaning up inactive game {game_id}")
                    print(f"  - Inactive for: {time_since_update / 60:.1f} minutes")
                    print(f"  - Total games played: {len(game.game_history)}")
                    print(f"  - Current game number: {game.game_number}")
                    print(f"  - Game phase: {game.game_phase}")
                    
                    # Save game history to file before cleanup
                    if len(game.game_history) > 0:
                        print(f"  - Game history preserved with {len(game.game_history)} completed games")
                        save_game_history_to_file(game_id, game.game_history)
            
            # Remove inactive games
            for game_id in games_to_remove:
                game = games[game_id]
                
                # Clean up player mappings
                for player in game.players:
                    if player in player_to_game:
                        del player_to_game[player]
                
                # Remove game
                del games[game_id]
                print(f"✓ Game {game_id} removed from memory")
            
            if games_to_remove:
                print(f"Cleanup complete: {len(games_to_remove)} inactive games removed")
            
        except Exception as e:
            print(f"Error in cleanup task: {e}")


@app.on_event("startup")
async def startup_event():
    """Start background tasks when the app starts"""
    # Create game history directory if saving is enabled
    if SAVE_GAME_HISTORY_TO_DISK:
        os.makedirs(GAME_HISTORY_DIR, exist_ok=True)
        print(f"Game history will be saved to: {GAME_HISTORY_DIR}/")
    
    # Start background cleanup task
    asyncio.create_task(cleanup_inactive_games())
    print("Background cleanup task started")
    print(f"Games will be removed after {GAME_INACTIVITY_TIMEOUT / 60:.0f} minutes of inactivity")


@app.websocket("/ws/")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            try:
                data = await websocket.receive_text()
            except Exception as e:
                # WebSocket disconnected
                print(f"WebSocket disconnected: {e}")
                break
                
            if data.startswith("create:"):
                game_id = ''.join(random.choices('0123456789'+ascii_letters, k=6))
                game = Game()
                game.players.append(websocket)
                game.host = websocket  # Set the creator as the host
                games[game_id] = game
                player_to_game[websocket] = game_id
                game.last_updated = time.time()
                
                # Send game code first
                await websocket.send_text(json.dumps({"type": "game_code", "code": game_id}))
                # Then broadcast game state
                await broadcast_game_state(game, game_id)
            elif data.startswith("join:"):
                game_id = data.split(":")[1]
                if game_id not in games:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Game not found"}))
                    continue
                game = games[game_id]
                if len(game.players) >= 4:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Game is full"}))
                    continue
                game.players.append(websocket)
                player_to_game[websocket] = game_id
                game.last_updated = time.time()
                
                # Broadcast updated game state to ALL players
                await broadcast_game_state(game, game_id)
            elif data.startswith("iam:"):
                if websocket not in player_to_game:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not in a game"}))
                    continue
                game_id = player_to_game[websocket]
                game = games[game_id]
                direction = data.split(":")[1]
                if direction not in ["north", "south", "east", "west"]:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Invalid direction"}))
                    continue

                # Set previous direction to None if occupied by this player
                for d in ["north", "south", "east", "west"]:
                    if getattr(game, d) == websocket:
                        setattr(game, d, None)

                # Assign new direction
                setattr(game, direction, websocket)
                game.last_updated = time.time()
                
                # Broadcast updated game state to ALL players
                await broadcast_game_state(game, game_id)
            elif data.startswith("start:"):
                if websocket not in player_to_game:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not in a game"}))
                    continue
                game_id = player_to_game[websocket]
                game = games[game_id]

                # Check if the requester is the host
                if websocket != game.host:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Only the host can start the game"}))
                    continue

                # Check if all positions are filled
                if not all([game.north, game.south, game.east, game.west]):
                    await websocket.send_text(json.dumps({"type": "error", "message": "All positions must be filled before starting"}))
                    continue

                deck = list(range(1, 53))
                random.shuffle(deck)

                game.hands["north"] = sorted(deck[0:13])
                game.hands["east"] = sorted(deck[13:26])
                game.hands["south"] = sorted(deck[26:39])
                game.hands["west"] = sorted(deck[39:52])

                # Send hands to respective players
                if game.north:
                    await game.north.send_text(json.dumps({"type": "hand", "hand": game.hands["north"]}))
                if game.south:
                    await game.south.send_text(json.dumps({"type": "hand", "hand": game.hands["south"]}))
                if game.east:
                    await game.east.send_text(json.dumps({"type": "hand", "hand": game.hands["east"]}))
                if game.west:
                    await game.west.send_text(json.dumps({"type": "hand", "hand": game.hands["west"]}))

                game.last_updated = time.time()
                game.game_phase = "bidding"
                
                # Rotate dealer: Game 1 = North (1), Game 2 = East (2), Game 3 = South (3), Game 4 = West (0), then repeat
                # Dealer rotates clockwise each game
                dealer = (game.game_number - 1) % 4  # 0=West, 1=North, 2=East, 3=South
                game.current_player = (dealer + 1) % 4  # Bidding starts with player to left of dealer
                
                # Reset game state for new game
                game.bidding_history = []
                game.contract = None
                game.trump_suit = None
                game.dummy_revealed = False
                game.current_trick = []
                game.tricks_won = [0, 0, 0, 0]
                game.play_history = []  # Reset play history for new game
                
                # Get vulnerability for current game
                vulnerability = get_vulnerability(game.game_number)
                
                # Broadcast game started to all players
                for player in game.players:
                    await player.send_text(json.dumps({
                        "type": "game_started", 
                        "message": "Game started and cards dealt!",
                        "current_player": game.current_player,
                        "game_number": game.game_number,
                        "vulnerability": vulnerability
                    }))
            elif data.startswith("bid:"):
                if websocket not in player_to_game:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not in a game"}))
                    continue
                game_id = player_to_game[websocket]
                game = games[game_id]
                
                # Parse bid data: "bid:level:suit:player:playerIndex:display"
                parts = data.split(":")
                if len(parts) < 6:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Invalid bid format"}))
                    continue
                
                level = int(parts[1])
                suit = parts[2]
                player = parts[3]
                player_index = int(parts[4])
                display = parts[5]
                
                # Verify it's the player's turn
                if player_index != game.current_player:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not your turn"}))
                    continue
                
                # Add bid to history
                bid = {
                    "player": player,
                    "playerIndex": player_index,
                    "level": level,
                    "suit": suit,
                    "display": display
                }
                game.bidding_history.append(bid)
                game.last_updated = time.time()  # Update activity timestamp
                
                # Broadcast bid to all players
                for player_ws in game.players:
                    await player_ws.send_text(json.dumps({
                        "type": "bid",
                        "bid": bid
                    }))
                
                # Check if bidding has ended
                if check_bidding_end(game.bidding_history):
                    contract = get_final_contract(game.bidding_history)
                    
                    if contract:
                        game.game_phase = "playing"
                        game.contract = contract
                        # Set trump suit (None for NT)
                        game.trump_suit = None if contract['suit'] == 'NT' else contract['suit']
                        # Lead player is to the left of declarer
                        lead_player = (contract['declarer'] + 1) % 4
                        game.current_player = lead_player
                        
                        # Broadcast bidding ended and start playing
                        for player_ws in game.players:
                            await player_ws.send_text(json.dumps({
                                "type": "bidding_ended",
                                "contract": contract,
                                "current_player": lead_player
                            }))
                    else:
                        # All passed out - end game with 0 scores
                        vulnerability = get_vulnerability(game.game_number)
                        
                        # Create zero score data
                        zero_score_data = {
                            'declarer_partnership': 0,  # Arbitrary since no contract
                            'declarer_score': {
                                'contract_points': 0,
                                'overtrick_points': 0,
                                'slam_bonus': 0,
                                'double_bonus': 0,
                                'game_bonus': 0,
                                'undertrick_penalty': 0,
                                'total': 0
                            },
                            'defender_score': {
                                'contract_points': 0,
                                'overtrick_points': 0,
                                'slam_bonus': 0,
                                'double_bonus': 0,
                                'game_bonus': 0,
                                'undertrick_penalty': 0,
                                'total': 0
                            },
                            'contract_made': False,
                            'tricks_taken': 0,
                            'tricks_needed': 0
                        }
                        
                        # Save game record with all passes
                        game_record = {
                            "game_number": game.game_number,
                            "timestamp": time.time(),
                            "vulnerability": vulnerability,
                            "bidding_history": game.bidding_history.copy(),
                            "contract": None,  # No contract was made
                            "play_history": [],  # No cards were played
                            "tricks_won": [0, 0, 0, 0],
                            "score": zero_score_data,
                            "declarer": None,
                            "dummy": None,
                            "passed_out": True
                        }
                        game.game_history.append(game_record)
                        
                        print(f"Game {game.game_number} passed out (all players passed)")
                        
                        # Broadcast game over with zero scores
                        for player_ws in game.players:
                            await player_ws.send_text(json.dumps({
                                "type": "game_over",
                                "tricks": [0, 0, 0, 0],
                                "contract": None,
                                "score": zero_score_data,
                                "game_number": game.game_number,
                                "vulnerability": vulnerability,
                                "passed_out": True
                            }))
                        
                        # Increment game number for next game
                        game.game_number += 1
                else:
                    # Move to next player
                    game.current_player = (game.current_player + 1) % 4
                    for player_ws in game.players:
                        await player_ws.send_text(json.dumps({
                            "type": "next_player",
                            "current_player": game.current_player
                        }))
            elif data.startswith("play:"):
                if websocket not in player_to_game:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not in a game"}))
                    continue
                game_id = player_to_game[websocket]
                game = games[game_id]
                
                if game.game_phase != "playing":
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not in playing phase"}))
                    continue
                
                # Parse play data: "play:suit:rank:player_index"
                parts = data.split(":")
                if len(parts) < 4:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Invalid play format"}))
                    continue
                
                suit = parts[1]
                rank = int(parts[2])
                player_index = int(parts[3])
                
                # Verify it's the player's turn
                if player_index != game.current_player:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Not your turn"}))
                    continue
                
                # Get dummy (partner of declarer)
                dummy = None
                if game.contract:
                    dummy = (game.contract['declarer'] + 2) % 4
                
                # Validate who can play this card
                player_position = get_player_position(game, websocket)
                if player_position is None:
                    await websocket.send_text(json.dumps({"type": "error", "message": "Player position not found"}))
                    continue
                
                if dummy is not None and player_index == dummy:
                    # Only declarer can play dummy's cards
                    if player_position != game.contract['declarer']:
                        await websocket.send_text(json.dumps({"type": "error", "message": "Only declarer can play dummy's cards"}))
                        continue
                else:
                    # Players can only play their own cards
                    if player_position != player_index:
                        await websocket.send_text(json.dumps({"type": "error", "message": "You can only play your own cards"}))
                        continue
                
                # Remove card from player's hand
                direction_names = ["west", "north", "east", "south"]
                player_direction = direction_names[player_index]
                card_number = None
                
                # Find the card number (1-52) based on suit and rank
                suit_values = {"spades": 0, "hearts": 1, "diamonds": 2, "clubs": 3}
                card_number = suit_values[suit] * 13 + rank + 1
                
                if card_number in game.hands[player_direction]:
                    game.hands[player_direction].remove(card_number)
                
                # Add card to current trick
                played_card = {
                    "suit": suit,
                    "rank": rank,
                    "player": player_index
                }
                game.current_trick.append(played_card)
                game.last_updated = time.time()  # Update activity timestamp
                
                # Track play in game history
                game.play_history.append({
                    "trick_number": sum(game.tricks_won) + 1,
                    "card_in_trick": len(game.current_trick),
                    "suit": suit,
                    "rank": rank,
                    "player": player_index,
                    "timestamp": time.time()
                })
                
                # Broadcast card played to all players
                for player_ws in game.players:
                    await player_ws.send_text(json.dumps({
                        "type": "card_played",
                        "card": {"suit": suit, "rank": rank},
                        "player": player_index
                    }))
                
                # After first card is played, reveal dummy's hand to all players
                if not game.dummy_revealed and len(game.current_trick) == 1:
                    game.dummy_revealed = True
                    dummy = (game.contract['declarer'] + 2) % 4
                    direction_names = ["west", "north", "east", "south"]
                    dummy_direction = direction_names[dummy]
                    dummy_hand = game.hands[dummy_direction]
                    
                    # Broadcast dummy's hand to all players
                    for player_ws in game.players:
                        await player_ws.send_text(json.dumps({
                            "type": "dummy_revealed",
                            "dummy_player": dummy,
                            "dummy_hand": dummy_hand
                        }))
                
                # If dummy's card was played, update everyone with the new dummy hand
                if game.contract and player_index == (game.contract['declarer'] + 2) % 4:
                    dummy_pos = (game.contract['declarer'] + 2) % 4
                    updated_dummy_hand = game.hands[direction_names[dummy_pos]]
                    for player_ws in game.players:
                        await player_ws.send_text(json.dumps({
                            "type": "dummy_hand_updated",
                            "dummy_player": dummy_pos,
                            "dummy_hand": updated_dummy_hand
                        }))
                
                # Check if trick is complete (4 cards played)
                if len(game.current_trick) == 4:
                    # Determine winner
                    winner = get_trick_winner(game.current_trick, game.trump_suit)
                    game.tricks_won[winner] += 1
                    
                    # Broadcast trick complete
                    for player_ws in game.players:
                        await player_ws.send_text(json.dumps({
                            "type": "trick_complete",
                            "winner": winner,
                            "tricks": game.tricks_won
                        }))
                    
                    # Reset current trick and set next player to winner
                    game.current_trick = []
                    game.current_player = winner
                    
                    # Check if all 13 tricks are complete
                    if sum(game.tricks_won) == 13:
                        # Get vulnerability for current game number
                        vulnerability = get_vulnerability(game.game_number)
                        
                        # Calculate score
                        score_data = calculate_score(game.contract, game.tricks_won, vulnerability)
                        
                        # Save complete game history before incrementing game number
                        game_record = {
                            "game_number": game.game_number,
                            "timestamp": time.time(),
                            "vulnerability": vulnerability,
                            "bidding_history": game.bidding_history.copy(),
                            "contract": game.contract.copy() if game.contract else None,
                            "play_history": game.play_history.copy(),
                            "tricks_won": game.tricks_won.copy(),
                            "score": score_data,
                            "declarer": game.contract['declarer'] if game.contract else None,
                            "dummy": (game.contract['declarer'] + 2) % 4 if game.contract else None
                        }
                        game.game_history.append(game_record)
                        
                        # Log the saved game
                        print(f"Game {game.game_number} completed and saved to history. Total games: {len(game.game_history)}")
                        print(f"  - Bidding history: {len(game.bidding_history)} bids")
                        print(f"  - Play history: {len(game.play_history)} plays")
                        print(f"  - Contract: {game.contract}")
                        print(f"  - Score: Declarer {score_data['declarer_score']['total']}, Defender {score_data['defender_score']['total']}")
                        
                        # Game over - broadcast final results with score
                        for player_ws in game.players:
                            await player_ws.send_text(json.dumps({
                                "type": "game_over",
                                "tricks": game.tricks_won,
                                "contract": game.contract,
                                "score": score_data,
                                "game_number": game.game_number,
                                "vulnerability": vulnerability
                            }))
                        
                        # Increment game number for next game
                        game.game_number += 1
                    else:
                        # Continue to next trick
                        for player_ws in game.players:
                            await player_ws.send_text(json.dumps({
                                "type": "next_player",
                                "current_player": game.current_player
                            }))
                else:
                    # Move to next player
                    game.current_player = (game.current_player + 1) % 4
                    for player_ws in game.players:
                        await player_ws.send_text(json.dumps({
                            "type": "next_player",
                            "current_player": game.current_player
                        }))
            # await websocket.send_text(f"Message text was: {data}")
    finally:
        # Cleanup when player disconnects
        if websocket in player_to_game:
            game_id = player_to_game[websocket]
            game = games[game_id]
            
            # Remove player from game
            if websocket in game.players:
                game.players.remove(websocket)
            
            # Remove player from positions
            for direction in ["north", "south", "east", "west"]:
                if getattr(game, direction) == websocket:
                    setattr(game, direction, None)
            
            # Remove player from mapping
            del player_to_game[websocket]
            
            # If game is empty, remove it
            if len(game.players) == 0:
                del games[game_id]
            else:
                # Notify remaining players
                try:
                    await broadcast_game_state(game, game_id)
                except:
                    pass
