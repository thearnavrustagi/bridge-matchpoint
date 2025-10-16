import { useState, useEffect } from 'react';
import './App.css';
import Card from './components/Card';
import BiddingBox from './components/BiddingBox';
import { createDeck, shuffleDeck, dealHands, sortHand, type CardType, type PlayerPosition } from './utils/game';

type GamePhase = 'start' | 'bidding' | 'playing';

interface BidType {
  player: string;
  playerIndex: number;
  level: number;
  suit: 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'NT' | 'Pass' | 'Double' | 'Redouble';
  display: string;
}

function App() {
  const [hands, setHands] = useState<CardType[][]>([[], [], [], []]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerPosition>(0); // West starts bidding
  const [playedCards, setPlayedCards] = useState<{ card: CardType; player: PlayerPosition }[]>([]);
  const [tricks, setTricks] = useState([0, 0, 0, 0]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('start');
  const [biddingHistory, setBiddingHistory] = useState<BidType[]>([]);
  const [contract, setContract] = useState<{ level: number; suit: string; declarer: number; doubled: boolean; redoubled: boolean } | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [selectedSuit, setSelectedSuit] = useState<string>('');
  const [dealer, setDealer] = useState<PlayerPosition>(0);
  const [leadPlayer, setLeadPlayer] = useState<PlayerPosition | null>(null);
  const [trumpSuit, setTrumpSuit] = useState<string | null>(null);

  const startNewGame = () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const dealt = dealHands(shuffled);
    setHands(dealt.map(hand => sortHand(hand)));
    setBiddingHistory([]);
    setContract(null);
    setTricks([0, 0, 0, 0]);
    setPlayedCards([]);
    setCurrentPlayer(dealer);
    setGamePhase('bidding');
  };

  // Helper function to check if bidding should end
  const checkBiddingEnd = (history: BidType[]): boolean => {
    if (history.length < 4) return false;

    // Check if all 4 players passed (passed out)
    if (history.length === 4 && history.every(b => b.suit === 'Pass')) {
      return true;
    }

    // Check for 3 consecutive passes after a real bid
    const last3 = history.slice(-3);
    const hasRealBid = history.some(b => b.level > 0);
    return hasRealBid && last3.every(b => b.suit === 'Pass');
  };

  // Helper function to get final contract
  const getFinalContract = (history: BidType[]) => {
    const lastRealBid = [...history].reverse().find(b => b.level > 0);
    if (!lastRealBid) return null;

    // Find declarer (first player of partnership to bid this suit)
    const partnership = lastRealBid.playerIndex % 2;
    const declarer = history.find(b =>
      b.level > 0 &&
      b.suit === lastRealBid.suit &&
      b.playerIndex % 2 === partnership
    );

    // Check for double/redouble
    const lastBidIndex = history.lastIndexOf(lastRealBid);
    const afterBid = history.slice(lastBidIndex + 1);
    const doubled = afterBid.some(b => b.suit === 'Double');
    const redoubled = afterBid.some(b => b.suit === 'Redouble');

    return {
      level: lastRealBid.level,
      suit: lastRealBid.suit,
      declarer: declarer?.playerIndex || lastRealBid.playerIndex,
      doubled,
      redoubled
    };
  };

  const playCard = (card: CardType, player: PlayerPosition) => {
    if (player !== currentPlayer || gamePhase !== 'playing') return;

    // Check if player must follow suit
    if (playedCards.length > 0) {
      const leadSuit = playedCards[0].card.suit;
      const hasLeadSuit = hands[player].some(c => c.suit === leadSuit);

      if (hasLeadSuit && card.suit !== leadSuit) {
        // Player has cards of lead suit but trying to play different suit - not allowed
        return;
      }
    }

    const newHands = [...hands];
    newHands[player] = newHands[player].filter(c => !(c.suit === card.suit && c.rank === card.rank));
    setHands(newHands);

    const newPlayed = [...playedCards, { card, player }];
    setPlayedCards(newPlayed);

    if (newPlayed.length === 4) {
      // Determine winner with proper Bridge rules (trump suits)
      const leadSuit = newPlayed[0].card.suit;
      let winner = newPlayed[0];

      for (const played of newPlayed) {
        // Trump beats everything
        if (trumpSuit && played.card.suit === trumpSuit) {
          if (winner.card.suit !== trumpSuit || played.card.rank > winner.card.rank) {
            winner = played;
          }
        }
        // If no trump played, highest of lead suit wins
        else if (played.card.suit === leadSuit && winner.card.suit !== trumpSuit) {
          if (winner.card.suit !== leadSuit || played.card.rank > winner.card.rank) {
            winner = played;
          }
        }
      }

      const newTricks = [...tricks];
      newTricks[winner.player]++;
      setTricks(newTricks);

      setTimeout(() => {
        setPlayedCards([]);
        setCurrentPlayer(winner.player);
      }, 1500);
    } else {
      setCurrentPlayer(((player + 1) % 4) as PlayerPosition);
    }
  };

  const handleBid = (level: number, suit: string) => {
    const playerNames = ['West', 'North', 'East', 'South'];

    // Handle level selection
    if (suit === 'level') {
      setSelectedLevel(level);
      return;
    }

    // Handle suit selection - need both level and suit
    if (suit === 'NT' || suit === 'clubs' || suit === 'diamonds' || suit === 'hearts' || suit === 'spades') {
      if (selectedLevel === 0) {
        return;
      }

      // Check if bid is valid (must be higher than previous bid)
      const suitRank = { 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4, 'NT': 5 };
      const lastRealBid = [...biddingHistory].reverse().find(b => b.level > 0);

      if (lastRealBid) {
        const isHigherLevel = selectedLevel > lastRealBid.level;
        const isSameLevelHigherSuit = selectedLevel === lastRealBid.level &&
          suitRank[suit as keyof typeof suitRank] > suitRank[lastRealBid.suit as keyof typeof suitRank];

        if (!isHigherLevel && !isSameLevelHigherSuit) {
          // Bid too low
          setSelectedLevel(0);
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

      const bidString = `${selectedLevel}${suitSymbols[suit] || suit}`;
      const newBid: BidType = {
        player: playerNames[currentPlayer],
        playerIndex: currentPlayer,
        level: selectedLevel,
        suit: suit as any,
        display: bidString
      };

      const newHistory = [...biddingHistory, newBid];
      setBiddingHistory(newHistory);

      setSelectedLevel(0);
      setSelectedSuit('');

      // Check if bidding ends (3 consecutive passes after a bid)
      if (checkBiddingEnd(newHistory)) {
        const finalContract = getFinalContract(newHistory);
        if (finalContract) {
          setContract(finalContract);
          setTrumpSuit(finalContract.suit === 'NT' ? null : finalContract.suit);
          setGamePhase('playing');
          // Lead player is to the left of declarer
          const leadPlayerIndex = ((finalContract.declarer + 1) % 4) as PlayerPosition;
          setLeadPlayer(leadPlayerIndex);
          setCurrentPlayer(leadPlayerIndex);
        }
      } else {
        setCurrentPlayer(((currentPlayer + 1) % 4) as PlayerPosition);
      }
    }
  };

  const handlePass = () => {
    const playerNames = ['West', 'North', 'East', 'South'];
    const newBid: BidType = {
      player: playerNames[currentPlayer],
      playerIndex: currentPlayer,
      level: 0,
      suit: 'Pass',
      display: 'Pass'
    };

    const newHistory = [...biddingHistory, newBid];
    setBiddingHistory(newHistory);

    setSelectedLevel(0);
    setSelectedSuit('');

    if (checkBiddingEnd(newHistory)) {
      const finalContract = getFinalContract(newHistory);
      if (finalContract) {
        setContract(finalContract);
        setTrumpSuit(finalContract.suit === 'NT' ? null : finalContract.suit);
        setGamePhase('playing');
        const leadPlayerIndex = ((finalContract.declarer + 1) % 4) as PlayerPosition;
        setLeadPlayer(leadPlayerIndex);
        setCurrentPlayer(leadPlayerIndex);
      } else {
        // All passed out - redeal
        const deck = createDeck();
        const shuffled = shuffleDeck(deck);
        const dealt = dealHands(shuffled);
        setHands(dealt.map(hand => sortHand(hand)));
        setBiddingHistory([]);
        setCurrentPlayer(dealer);
      }
    } else {
      setCurrentPlayer(((currentPlayer + 1) % 4) as PlayerPosition);
    }
  };

  const handleDouble = () => {
    const playerNames = ['West', 'North', 'East', 'South'];

    // Can only double opponent's bid
    const lastRealBid = [...biddingHistory].reverse().find(b => b.level > 0);
    if (!lastRealBid || lastRealBid.playerIndex % 2 === currentPlayer % 2) {
      return; // Can't double partner's bid
    }

    // Check if already doubled
    const lastBidIndex = biddingHistory.lastIndexOf(lastRealBid);
    const afterBid = biddingHistory.slice(lastBidIndex + 1);
    if (afterBid.some(b => b.suit === 'Double')) {
      return; // Already doubled
    }

    const newBid: BidType = {
      player: playerNames[currentPlayer],
      playerIndex: currentPlayer,
      level: 0,
      suit: 'Double',
      display: 'Double'
    };

    setBiddingHistory([...biddingHistory, newBid]);
    setSelectedLevel(0);
    setSelectedSuit('');
    setCurrentPlayer(((currentPlayer + 1) % 4) as PlayerPosition);
  };

  const playerDisplayNames = ['WEST', 'NORTH', 'EAST', 'SOUTH'];
  const nsTeam = tricks[1] + tricks[3]; // North + South
  const ewTeam = tricks[2] + tricks[0]; // East + West

  return (
    <div className="game">
      {gamePhase === 'start' && (
        <div className="start-screen">
          <div className="start-content">
            <h1 className="game-title">Contract Bridge</h1>
            <p className="game-subtitle">A Classic Card Game</p>
            <button className="start-button" onClick={startNewGame}>
              Start New Game
            </button>
            <div className="game-rules">
              <h3>Quick Rules</h3>
              <ul>
                <li>4 players in 2 partnerships (North-South vs East-West)</li>
                <li>Bidding phase: bid level + suit to set contract</li>
                <li>Playing phase: win tricks to fulfill contract</li>
                <li>Must follow suit if possible</li>
                <li>Trump suit beats all other suits</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {gamePhase === 'bidding' && (
        <BiddingBox
          onBid={handleBid}
          onPass={handlePass}
          onDouble={handleDouble}
          biddingHistory={biddingHistory}
          currentPlayer={currentPlayer}
        />
      )}

      {/* North - position 1 - bottom left */}
      <div className="player north">
        <div className="hand">
          {hands[1]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 1)} clickable={gamePhase === 'playing' && currentPlayer === 1} hidden />
          ))}
        </div>
      </div>

      {/* West - position 0 */}
      <div className="player west">
        <div className="hand-vertical">
          {hands[0]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 0)} clickable={gamePhase === 'playing' && currentPlayer === 0} hidden rotation="right" />
          ))}
        </div>
      </div>

      {/* East - position 2 */}
      <div className="player east">
        <div className="hand-vertical">
          {hands[2]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 2)} clickable={gamePhase === 'playing' && currentPlayer === 2} hidden rotation="left" />
          ))}
        </div>
      </div>

      {/* Center played cards and contract info */}
      {gamePhase === 'playing' && (
        <div className="center-area">
          <div className="contract-info">
            <div className="declarer">
              {contract ? `${contract.level}${contract.suit === 'NT' ? 'NT' : contract.suit.charAt(0).toUpperCase()} ${playerDisplayNames[contract.declarer]}` : playerDisplayNames[currentPlayer]}
            </div>
          </div>

          <div className="played-cards-area">
            {playedCards.map((played, i) => (
              <div key={i} className={`played-card pos-${played.player}`}>
                <Card card={played.card} />
              </div>
            ))}
          </div>

          <div className="tricks-display">
            <div className="tricks-box">
              <div className="tricks-label">Tricks</div>
              <div className="tricks-score">
                <div className="team">We <span>{nsTeam}</span></div>
                <div className="team">They <span>{ewTeam}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* South - position 3 - bottom right */}
      <div className="player south">
        <div className="hand">
          {hands[3]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 3)} clickable={gamePhase === 'playing' && currentPlayer === 3} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
