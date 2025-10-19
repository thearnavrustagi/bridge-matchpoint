import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './App.css';
import { sortHand, type CardType, type PlayerPosition } from './utils/game';
import { useWebSocket } from './WebSocketProvider';
import { playSound } from './utils/sound';
import LandingScreen from './screens/LandingScreen';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';

type GamePhase = 'landing' | 'lobby' | 'bidding' | 'playing';

interface BidType {
  player: string;
  playerIndex: number;
  level: number;
  suit: 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'NT' | 'Pass' | 'Double' | 'Redouble';
  display: string;
}

function App() {
  const location = useLocation();
  
  // Game state
  const [hands, setHands] = useState<CardType[][]>([[], [], [], []]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerPosition>(0);
  const [playedCards, setPlayedCards] = useState<{ card: CardType; player: PlayerPosition }[]>([]);
  const [allPlayedCards, setAllPlayedCards] = useState<{ card: CardType; player: PlayerPosition }[]>([]); // Track all cards played in the game
  const [tricks, setTricks] = useState([0, 0, 0, 0]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('landing');
  const [biddingHistory, setBiddingHistory] = useState<BidType[]>([]);
  const [contract, setContract] = useState<{ level: number; suit: string; declarer: number; doubled: boolean; redoubled: boolean } | null>(null);
  const [dummyHand, setDummyHand] = useState<CardType[] | null>(null);
  const [dummyPlayer, setDummyPlayer] = useState<PlayerPosition | null>(null);
  const [scoreData, setScoreData] = useState<any | null>(null);
  const [gameNumber, setGameNumber] = useState<number>(1);
  const [vulnerability, setVulnerability] = useState<{ns: boolean, ew: boolean}>({ns: false, ew: false});
  const [cumulativeScores, setCumulativeScores] = useState<{we: number, they: number}>({we: 0, they: 0});
  const [passedOut, setPassedOut] = useState<boolean>(false);
  
  // Multiplayer state
  const [selectedPosition, setSelectedPosition] = useState<PlayerPosition | null>(null);
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<any | null>(null);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [hasAttemptedReconnect, setHasAttemptedReconnect] = useState(false);

  const { ws, sendMessage, messages } = useWebSocket();
  const [processedMessageCount, setProcessedMessageCount] = useState(0);

  // Handle URL-based joining and auto-reconnection on mount
  useEffect(() => {
    // Wait for WebSocket to be ready
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not ready yet, waiting...');
      return;
    }

    const path = location.pathname;
    
    // Extract game code from URL
    const joinMatch = path.match(/^\/join\/([a-zA-Z0-9]+)$/);
    const playMatch = path.match(/^\/play\/([a-zA-Z0-9]+)$/);
    
    const urlGameCode = joinMatch?.[1] || playMatch?.[1];
    
    if (urlGameCode && !hasAttemptedReconnect) {
      setHasAttemptedReconnect(true);
      
      // Try to restore previous session
      const savedGameCode = localStorage.getItem('bridge_game_code');
      const savedPosition = localStorage.getItem('bridge_selected_position');
      
      if (savedGameCode === urlGameCode && savedPosition !== null) {
        // Reconnect to existing game with saved position
        const position = parseInt(savedPosition) as PlayerPosition;
        console.log(`Reconnecting to game ${urlGameCode} as position ${position}`);
        
        setGameCode(urlGameCode);
        setSelectedPosition(position);
        
        // Join the game
        sendMessage(`join:${urlGameCode}`);
        
        // Re-announce position after a short delay
        const positionNames = ['west', 'north', 'east', 'south'];
        setTimeout(() => {
          sendMessage(`iam:${positionNames[position]}`);
        }, 500);
        
        setGamePhase('lobby');
      } else {
        // New join - just join the game
        console.log(`Joining new game ${urlGameCode}`);
        setGameCode(urlGameCode);
        sendMessage(`join:${urlGameCode}`);
        setGamePhase('lobby');
      }
    }
  }, [location.pathname, hasAttemptedReconnect, sendMessage, ws]);
  
  // Save game state to localStorage for reconnection
  useEffect(() => {
    if (gameCode) {
      localStorage.setItem('bridge_game_code', gameCode);
    }
    if (selectedPosition !== null) {
      localStorage.setItem('bridge_selected_position', selectedPosition.toString());
    }
  }, [gameCode, selectedPosition]);

  // WebSocket message handler
  useEffect(() => {
    const newMessages = messages.slice(processedMessageCount);
    
    newMessages.forEach((message) => {
      console.log("App received WebSocket message:", message);
      
      try {
        const parsedMessage = JSON.parse(message);
        
        switch (parsedMessage.type) {
          case "game_code":
            setGameCode(parsedMessage.code);
            console.log("Game Code:", parsedMessage.code);
            break;
            
          case "game_state":
            setGameState(parsedMessage);
            if (parsedMessage.game_id) {
              setGameCode(parsedMessage.game_id);
            }
            if (parsedMessage.is_host !== undefined) {
              setIsHost(parsedMessage.is_host);
            }
            console.log("Game state updated:", parsedMessage);
            break;
            
          case "hand":
            console.log("Received hand:", parsedMessage.hand);
            console.log("Selected position:", selectedPosition);
            
            // Convert card numbers to CardType objects
            // 1-13: Spades, 14-26: Hearts, 27-39: Diamonds, 40-52: Clubs
            const cardHand = parsedMessage.hand.map((cardNum: number) => {
              const suitIndex = Math.floor((cardNum - 1) / 13);
              const rankIndex = (cardNum - 1) % 13;
              const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
              return {
                suit: suits[suitIndex],
                rank: rankIndex
              };
            });
            console.log("Converted cards:", cardHand);
            
            if (selectedPosition !== null) {
              setHands((prevHands) => {
                const newHands = [...prevHands];
                newHands[selectedPosition] = sortHand(cardHand);
                console.log("Updated hands, position", selectedPosition, "now has", newHands[selectedPosition].length, "cards");
                return newHands;
              });
            } else {
              console.warn("Cannot set hand: selectedPosition is null");
            }
            break;
            
          case "game_started":
            console.log(parsedMessage.message);
            setGamePhase('bidding');
            // Reset game state for new game
            // Preserve our own hand but clear other players' hands
            setHands((prevHands) => {
              const newHands: CardType[][] = [[], [], [], []];
              // Keep our own hand if we have one
              if (selectedPosition !== null && prevHands[selectedPosition]) {
                newHands[selectedPosition] = prevHands[selectedPosition];
              }
              return newHands;
            });
            setAllPlayedCards([]);
            setPlayedCards([]);
            setBiddingHistory([]);
            setContract(null);
            setDummyHand(null);
            setDummyPlayer(null);
            setScoreData(null);
            setPassedOut(false);
            setTricks([0, 0, 0, 0]);
            // Bidding starts with North (position 1)
            setCurrentPlayer(parsedMessage.current_player || 1);
            if (parsedMessage.game_number) {
              setGameNumber(parsedMessage.game_number);
            }
            if (parsedMessage.vulnerability) {
              setVulnerability(parsedMessage.vulnerability);
            }
            break;
          
          case "bid":
            console.log("Received bid:", parsedMessage.bid);
            setBiddingHistory(prev => [...prev, parsedMessage.bid]);
            break;
          
          case "next_player":
            console.log("Next player:", parsedMessage.current_player);
            setCurrentPlayer(parsedMessage.current_player);
            break;
          
          case "bidding_ended":
            console.log("Bidding ended, contract:", parsedMessage.contract);
            const contract = parsedMessage.contract;
            setContract(contract);
            setGamePhase('playing');
            setCurrentPlayer(parsedMessage.current_player);
            break;
          
          case "card_played":
            console.log("Card played:", parsedMessage.card, "by player", parsedMessage.player);
            const playedCard = { 
              card: parsedMessage.card, 
              player: parsedMessage.player 
            };
            setPlayedCards(prev => [...prev, playedCard]);
            setAllPlayedCards(prev => [...prev, playedCard]);
            playSound('cardPlay');
            break;
          
          case "trick_complete":
            console.log("Trick complete, winner:", parsedMessage.winner);
            setTricks(parsedMessage.tricks);
            // Clear played cards after a delay to show the trick
            setTimeout(() => {
              setPlayedCards([]);
              setCurrentPlayer(parsedMessage.winner);
            }, 1500);
            break;
          
          case "dummy_revealed":
            const dummyPlayerName = ['West','North','East','South'][parsedMessage.dummy_player];
            console.log(`Dummy revealed: Player ${parsedMessage.dummy_player} (${dummyPlayerName}) with ${parsedMessage.dummy_hand.length} cards`);
            console.log(`Selected position: ${selectedPosition} (${selectedPosition !== null ? ['West','North','East','South'][selectedPosition] : 'None'})`);
            setDummyPlayer(parsedMessage.dummy_player);
            
            // Convert card numbers to CardType objects
            const dummyCardHand = parsedMessage.dummy_hand.map((cardNum: number) => {
              const suitIndex = Math.floor((cardNum - 1) / 13);
              const rankIndex = (cardNum - 1) % 13;
              const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
              return {
                suit: suits[suitIndex],
                rank: rankIndex
              };
            });
            setDummyHand(sortHand(dummyCardHand));
            
            // Also update the hands array for the dummy position
            setHands((prevHands) => {
              const newHands = [...prevHands];
              newHands[parsedMessage.dummy_player] = sortHand(dummyCardHand);
              return newHands;
            });
            break;
          
          case "dummy_hand_updated":
            console.log("Dummy hand updated:", parsedMessage.dummy_hand);
            
            // Convert card numbers to CardType objects
            const updatedDummyHand = parsedMessage.dummy_hand.map((cardNum: number) => {
              const suitIndex = Math.floor((cardNum - 1) / 13);
              const rankIndex = (cardNum - 1) % 13;
              const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
              return {
                suit: suits[suitIndex],
                rank: rankIndex
              };
            });
            setDummyHand(sortHand(updatedDummyHand));
            
            // Also update the hands array for the dummy position
            setHands((prevHands) => {
              const newHands = [...prevHands];
              newHands[parsedMessage.dummy_player] = sortHand(updatedDummyHand);
              return newHands;
            });
            break;
          
          case "game_over":
            console.log("Game over!", parsedMessage.tricks, parsedMessage.score);
            setScoreData(parsedMessage.score);
            setPassedOut(parsedMessage.passed_out || false);
            
            // Update cumulative scores
            if (parsedMessage.score && selectedPosition !== null) {
              const myPartnership = selectedPosition % 2; // 0 for E-W, 1 for N-S
              const declarerPartnership = parsedMessage.score.declarer_partnership;
              
              const weRoundScore = myPartnership === declarerPartnership 
                ? parsedMessage.score.declarer_score.total 
                : parsedMessage.score.defender_score.total;
              const theyRoundScore = myPartnership === declarerPartnership 
                ? parsedMessage.score.defender_score.total 
                : parsedMessage.score.declarer_score.total;
              
              setCumulativeScores(prev => ({
                we: prev.we + weRoundScore,
                they: prev.they + theyRoundScore
              }));
            }
            
            if (parsedMessage.game_number) {
              setGameNumber(parsedMessage.game_number);
            }
            if (parsedMessage.vulnerability) {
              setVulnerability(parsedMessage.vulnerability);
            }
            break;
            
          case "error":
            console.error("Server Error:", parsedMessage.message);
            alert(parsedMessage.message);
            break;
            
          default:
            console.log("Unknown message type:", parsedMessage);
        }
      } catch (e) {
        console.log("Non-JSON message:", message);
      }
    });
    
    if (newMessages.length > 0) {
      setProcessedMessageCount(messages.length);
    }
  }, [messages, processedMessageCount, selectedPosition]);

  // Handlers
  const handleMakeLobby = () => {
    sendMessage("create:");
    setGamePhase('lobby');
  };

  const handleJoinLobby = (code: string) => {
    sendMessage(`join:${code}`);
    setGamePhase('lobby');
  };

  const handlePositionSelect = (position: PlayerPosition) => {
    setSelectedPosition(position);
    const positionNames = ['west', 'north', 'east', 'south'];
    sendMessage(`iam:${positionNames[position]}`);
  };

  const handleStartGame = () => {
    sendMessage("start:");
  };

  const handleNextGame = () => {
    if (!isHost) return;
    sendMessage("start:");
  };

  const handleBid = (level: number, suit: string) => {
    if (selectedPosition === null) return;
    
    const playerNames = ['West', 'North', 'East', 'South'];

    if (suit === 'NT' || suit === 'clubs' || suit === 'diamonds' || suit === 'hearts' || suit === 'spades') {
      // Validate bid is higher than last real bid
      const suitRank = { 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4, 'NT': 5 };
      const lastRealBid = [...biddingHistory].reverse().find(b => b.level > 0);

      if (lastRealBid) {
        const isHigherLevel = level > lastRealBid.level;
        const isSameLevelHigherSuit = level === lastRealBid.level &&
          suitRank[suit as keyof typeof suitRank] > suitRank[lastRealBid.suit as keyof typeof suitRank];

        if (!isHigherLevel && !isSameLevelHigherSuit) {
          return;
        }
      }

      const suitSymbols: Record<string, string> = {
        'clubs': '♣',
        'diamonds': '♦',
        'hearts': '♥',
        'spades': '♠',
        'NT': 'NT'
      };

      const bidString = `${level}${suitSymbols[suit] || suit}`;
      
      // Send bid to server with selectedPosition (the actual player making the bid)
      sendMessage(`bid:${level}:${suit}:${playerNames[selectedPosition]}:${selectedPosition}:${bidString}`);
    }
  };

  const handlePass = () => {
    if (selectedPosition === null) return;
    
    const playerNames = ['West', 'North', 'East', 'South'];
    
    // Send pass to server with selectedPosition (the actual player passing)
    sendMessage(`bid:0:Pass:${playerNames[selectedPosition]}:${selectedPosition}:Pass`);
  };

  const handleDouble = () => {
    if (selectedPosition === null) return;
    
    const playerNames = ['West', 'North', 'East', 'South'];
    const lastRealBid = [...biddingHistory].reverse().find(b => b.level && b.level > 0);
    if (!lastRealBid) return;

    const lastBidIndex = biddingHistory.lastIndexOf(lastRealBid);
    const afterBid = biddingHistory.slice(lastBidIndex + 1);
    const hasDouble = afterBid.some(b => b.suit === 'Double');
    const hasRedouble = afterBid.some(b => b.suit === 'Redouble');

    // Can't do anything if already redoubled
    if (hasRedouble) return;

    // Check if we're teammates with the bidder
    const areTeammates = lastRealBid.playerIndex % 2 === selectedPosition % 2;

    if (hasDouble) {
      // There's already a double - can only redouble if we're teammates with the original bidder
      if (!areTeammates) return;
      sendMessage(`bid:0:Redouble:${playerNames[selectedPosition]}:${selectedPosition}:XX`);
    } else {
      // No double yet - can only double if we're opponents with the bidder
      if (areTeammates) return;
      sendMessage(`bid:0:Double:${playerNames[selectedPosition]}:${selectedPosition}:X`);
    }
  };

  const handlePlayCard = (card: CardType, player: PlayerPosition) => {
    if (player !== currentPlayer || gamePhase !== 'playing') return;
    
    // Check if it's dummy's turn and if declarer is trying to play
    const isDummyTurn = contract && player === (contract.declarer + 2) % 4;
    const canPlay = isDummyTurn ? selectedPosition === contract.declarer : selectedPosition === player;
    
    if (!canPlay) return;

    // Check if player must follow suit
    if (playedCards.length > 0) {
      const leadSuit = playedCards[0].card.suit;
      const hasLeadSuit = hands[player].some(c => c.suit === leadSuit);
      if (hasLeadSuit && card.suit !== leadSuit) return;
    }

    // Send play to server
    sendMessage(`play:${card.suit}:${card.rank}:${player}`);
    
    // Remove card from hand locally (will be synced by server response)
    const newHands = [...hands];
    newHands[player] = newHands[player].filter(c => !(c.suit === card.suit && c.rank === card.rank));
    setHands(newHands);
  };

  // Render appropriate screen based on game phase
  const renderScreen = () => {
    if (gamePhase === 'landing') {
      return (
        <LandingScreen
          onMakeLobby={handleMakeLobby}
          onJoinLobby={handleJoinLobby}
          gameCode={gameCode}
        />
      );
    }

    if (gamePhase === 'lobby') {
      return (
        <LobbyScreen
          gameState={gameState}
          gameCode={gameCode}
          selectedPosition={selectedPosition}
          onPositionSelect={handlePositionSelect}
          onStartGame={handleStartGame}
        />
      );
    }

    if (gamePhase === 'bidding' || gamePhase === 'playing') {
      return (
        <GameScreen
          hands={hands}
          selectedPosition={selectedPosition}
          gamePhase={gamePhase}
          currentPlayer={currentPlayer}
          biddingHistory={biddingHistory}
          contract={contract}
          playedCards={playedCards}
          allPlayedCards={allPlayedCards}
          tricks={tricks}
          dummyPlayer={dummyPlayer}
          dummyHand={dummyHand}
          scoreData={scoreData}
          gameNumber={gameNumber}
          vulnerability={vulnerability}
          cumulativeScores={cumulativeScores}
          isHost={isHost}
          passedOut={passedOut}
          onBid={handleBid}
          onPass={handlePass}
          onDouble={handleDouble}
          onPlayCard={handlePlayCard}
          onNextGame={handleNextGame}
        />
      );
    }

    return null;
  };

  return (
    <div className="game-container">
      {renderScreen()}
    </div>
  );
}

export default App;
