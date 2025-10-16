import { useState, useEffect } from 'react';
import './App.css';
import Card from './components/Card';
import BiddingBox from './components/BiddingBox';
import { createDeck, shuffleDeck, dealHands, sortHand, type CardType, type PlayerPosition } from './utils/game';

type GamePhase = 'bidding' | 'playing';

function App() {
  const [hands, setHands] = useState<CardType[][]>([[], [], [], []]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerPosition>(3); // West starts bidding
  const [playedCards, setPlayedCards] = useState<{ card: CardType; player: PlayerPosition }[]>([]);
  const [tricks, setTricks] = useState([0, 0, 0, 0]);
  const [gamePhase, setGamePhase] = useState<GamePhase>('bidding');
  const [biddingHistory, setBiddingHistory] = useState<{ player: string; bid: string }[]>([]);
  const [contract, setContract] = useState<string>('');

  useEffect(() => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const dealt = dealHands(shuffled);
    setHands(dealt.map(hand => sortHand(hand)));
  }, []);

  const playCard = (card: CardType, player: PlayerPosition) => {
    if (player !== currentPlayer) return;

    const newHands = [...hands];
    newHands[player] = newHands[player].filter(c => !(c.suit === card.suit && c.rank === card.rank));
    setHands(newHands);

    const newPlayed = [...playedCards, { card, player }];
    setPlayedCards(newPlayed);

    if (newPlayed.length === 4) {
      // Determine winner (simple: highest card of lead suit wins)
      const leadSuit = newPlayed[0].card.suit;
      let winner = newPlayed[0];
      for (const played of newPlayed) {
        if (played.card.suit === leadSuit && played.card.rank > winner.card.rank) {
          winner = played;
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
    const bid = level > 0 ? `${level}${suit.charAt(0).toUpperCase()}` : suit;
    setBiddingHistory([...biddingHistory, { player: playerNames[currentPlayer], bid }]);

    // Simple: after 4 bids, start playing
    if (biddingHistory.length >= 3) {
      setContract(`${bid} ${playerNames[currentPlayer]}`);
      setGamePhase('playing');
      setCurrentPlayer(2); // South starts playing
    } else {
      setCurrentPlayer(((currentPlayer + 1) % 4) as PlayerPosition);
    }
  };

  const handlePass = () => {
    const playerNames = ['West', 'North', 'East', 'South'];
    setBiddingHistory([...biddingHistory, { player: playerNames[currentPlayer], bid: 'Pass' }]);

    if (biddingHistory.length >= 3) {
      setGamePhase('playing');
      setCurrentPlayer(2);
    } else {
      setCurrentPlayer(((currentPlayer + 1) % 4) as PlayerPosition);
    }
  };

  const handleDouble = () => {
    const playerNames = ['West', 'North', 'East', 'South'];
    setBiddingHistory([...biddingHistory, { player: playerNames[currentPlayer], bid: 'Double' }]);
    setCurrentPlayer(((currentPlayer + 1) % 4) as PlayerPosition);
  };

  const playerDisplayNames = ['NORTH', 'EAST', 'SOUTH', 'WEST'];
  const nsTeam = tricks[0] + tricks[2];
  const ewTeam = tricks[1] + tricks[3];

  return (
    <div className="game">
      {gamePhase === 'bidding' && (
        <BiddingBox
          onBid={handleBid}
          onPass={handlePass}
          onDouble={handleDouble}
          biddingHistory={biddingHistory}
          currentPlayer={currentPlayer}
        />
      )}

      {/* North */}
      <div className="player north">
        <div className="hand">
          {hands[0]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 0)} clickable={gamePhase === 'playing' && currentPlayer === 0} hidden />
          ))}
        </div>
      </div>

      {/* West */}
      <div className="player west">
        <div className="hand-vertical">
          {hands[3]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 3)} clickable={gamePhase === 'playing' && currentPlayer === 3} hidden />
          ))}
        </div>
      </div>

      {/* East */}
      <div className="player east">
        <div className="hand-vertical">
          {hands[1]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 1)} clickable={gamePhase === 'playing' && currentPlayer === 1} hidden />
          ))}
        </div>
      </div>

      {/* Center played cards and contract info */}
      {gamePhase === 'playing' && (
        <div className="center-area">
          <div className="contract-info">
            <div className="declarer">{contract || playerDisplayNames[currentPlayer]}</div>
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

      {/* South */}
      <div className="player south">
        <div className="hand">
          {hands[2]?.map((card, i) => (
            <Card key={i} card={card} onClick={() => playCard(card, 2)} clickable={gamePhase === 'playing' && currentPlayer === 2} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
