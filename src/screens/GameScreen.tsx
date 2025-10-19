import { type CardType, type PlayerPosition } from '../utils/game';
import Card from '../components/Card';
import BiddingBox from '../components/BiddingBox';
import ScoreBox from '../components/ScoreBox';
import ShaderBackground from '../components/ShaderBackground';
import './GameScreen.css';

interface BidType {
  player: string;
  playerIndex?: number;
  level?: number;
  suit?: 'clubs' | 'diamonds' | 'hearts' | 'spades' | 'NT' | 'Pass' | 'Double' | 'Redouble';
  display: string;
}

interface ScoreData {
  declarer_partnership: number;
  declarer_score: {
    contract_points: number;
    overtrick_points: number;
    slam_bonus: number;
    double_bonus: number;
    game_bonus: number;
    undertrick_penalty: number;
    total: number;
  };
  defender_score: {
    contract_points: number;
    overtrick_points: number;
    slam_bonus: number;
    double_bonus: number;
    game_bonus: number;
    undertrick_penalty: number;
    total: number;
  };
  contract_made: boolean;
  tricks_taken: number;
  tricks_needed: number;
}

interface GameScreenProps {
  hands: CardType[][];
  selectedPosition: PlayerPosition | null;
  gamePhase: 'bidding' | 'playing';
  currentPlayer: PlayerPosition;
  biddingHistory: BidType[];
  contract: { level: number; suit: string; declarer: number; doubled: boolean; redoubled: boolean } | null;
  playedCards: { card: CardType; player: PlayerPosition }[];
  allPlayedCards: { card: CardType; player: PlayerPosition }[];
  tricks: number[];
  dummyPlayer: PlayerPosition | null;
  dummyHand: CardType[] | null;
  scoreData: ScoreData | null;
  gameNumber: number;
  vulnerability: {ns: boolean, ew: boolean};
  cumulativeScores: {we: number, they: number};
  isHost?: boolean;
  onBid: (level: number, suit: string) => void;
  onPass: () => void;
  onDouble: () => void;
  onPlayCard: (card: CardType, player: PlayerPosition) => void;
  onNextGame?: () => void;
}

function GameScreen({
  hands,
  selectedPosition,
  gamePhase,
  currentPlayer,
  biddingHistory,
  contract,
  playedCards,
  allPlayedCards,
  tricks,
  dummyPlayer,
  dummyHand,
  scoreData,
  gameNumber,
  vulnerability,
  cumulativeScores,
  isHost = false,
  onBid,
  onPass,
  onDouble,
  onPlayCard,
  onNextGame
}: GameScreenProps) {
  const playerDisplayNames = ['WEST', 'NORTH', 'EAST', 'SOUTH'];
  const nsTeam = tricks[1] + tricks[3]; // North + South (partners)
  const ewTeam = tricks[0] + tricks[2]; // West + East (partners)

  // Get vulnerability status for display
  const getVulnerabilityDisplay = () => {
    if (vulnerability.ns && vulnerability.ew) {
      return 'Both Vul';
    } else if (vulnerability.ns) {
      return 'N-S Vul';
    } else if (vulnerability.ew) {
      return 'E-W Vul';
    } else {
      return 'No Vul';
    }
  };

  // Use dummy from props (server determines and shares dummy's hand)
  const dummy = dummyPlayer;
  const isDummyVisible = dummyHand !== null; // Show when dummy hand is received from server

  // Check if current player can play (not dummy, or declarer playing for dummy)
  const canCurrentPlayerPlay = (player: PlayerPosition): boolean => {
    if (!contract || dummy === null) return true;
    
    // If it's dummy's turn, only declarer can play
    if (player === dummy) {
      return selectedPosition === contract.declarer;
    }
    
    // Otherwise, only the actual player can play their own cards
    return selectedPosition === player;
  };

  // Map positions so selected position appears at bottom
  const getVisualPosition = (visualPos: 'bottom' | 'left' | 'top' | 'right'): number => {
    if (selectedPosition === null) return visualPos === 'bottom' ? 3 : 0;
    
    // Clockwise order from player's perspective: me(bottom), LHO(left), partner(top), RHO(right)
    const offsetMap = { bottom: 0, left: 1, top: 2, right: 3 };
    return (selectedPosition + offsetMap[visualPos]) % 4;
  };

  // Convert absolute player position to visual position string for center cards
  const getVisualPositionString = (absolutePosition: number): string => {
    if (selectedPosition === null) {
      // Default mapping if no position selected: 0=West(left), 1=North(top), 2=East(right), 3=South(bottom)
      const defaultMap = ['left', 'top', 'right', 'bottom']; // West, North, East, South
      return defaultMap[absolutePosition];
    }
    
    // Bridge table standard seating from each player's perspective:
    // When sitting at table, I see: me=bottom, LHO(next clockwise)=left, partner(opposite)=top, RHO(prev clockwise)=right
    const relativePos = (absolutePosition - selectedPosition + 4) % 4;
    const posMap = ['bottom', 'left', 'top', 'right']; // me, next clockwise, opposite, prev clockwise
    
    // Debug: Let's trace this calculation
    console.log(`getVisualPositionString: absolute=${absolutePosition}, selected=${selectedPosition}, relative=${relativePos}, result=${posMap[relativePos]}`);
    
    return posMap[relativePos];
  };

  const bottomPos = getVisualPosition('bottom');
  const leftPos = getVisualPosition('left');
  const topPos = getVisualPosition('top');
  const rightPos = getVisualPosition('right');

  // Calculate arch rotation for cards
  const getArchRotation = (index: number, totalCards: number) => {
    const middle = (totalCards - 1) / 2;
    const rotationStep = 2.5; // degrees per card
    return (index - middle) * rotationStep;
  };

  // Calculate float delay for cards (staggered animation)
  const getFloatDelay = (index: number) => {
    return (index * 0.15) % 3; // Offset by 0.15s per card, wrapping at 3s
  };

  // Get latest bid for a player
  const getLatestBid = (playerIndex: number): string | null => {
    // Find the last bid by this player
    for (let i = biddingHistory.length - 1; i >= 0; i--) {
      if (biddingHistory[i].playerIndex === playerIndex) {
        return biddingHistory[i].display;
      }
    }
    return null;
  };

  // Get cards to display for a player position
  const getDisplayCards = (position: number): CardType[] => {
    const playerHand = hands[position];
    if (!playerHand) {
      return [];
    }
    
    // For visible hands (own hand or dummy), show actual cards
    const isVisible = selectedPosition === position || (dummyPlayer === position && isDummyVisible);
    if (isVisible) {
      return playerHand;
    }
    
    // For hidden hands, we need to reduce the display count based on played cards
    // Count how many cards this player has played
    const playedByPlayer = allPlayedCards.filter(p => p.player === position).length;
    // Starting hand size is 13, minus played cards
    const remainingCount = 13 - playedByPlayer;
    
    // Return dummy card backs for display (just for count purposes)
    return Array(remainingCount).fill(null).map((_, i) => ({
      suit: 'clubs' as const,
      rank: i,
    }));
  };

  // Check if a card is playable (for visual feedback)
  const isCardPlayable = (card: CardType, position: number): boolean => {
    // Only apply this check during playing phase
    if (gamePhase !== 'playing') return true;
    
    // Only show disabled state for the current player's cards
    if (position !== currentPlayer) return true;
    
    // Only show disabled state if it's the player's hand (not hidden cards)
    const isVisible = selectedPosition === position || (dummyPlayer === position && isDummyVisible);
    if (!isVisible) return true;
    
    // If no cards have been played yet in this trick, all cards are playable
    if (playedCards.length === 0) return true;
    
    // Get the lead suit (first card played in the trick)
    const leadSuit = playedCards[0].card.suit;
    
    // Check if player has any cards of the lead suit
    const playerHand = hands[position];
    const hasLeadSuit = playerHand.some(c => c.suit === leadSuit);
    
    // If player has the lead suit, they must follow suit
    if (hasLeadSuit) {
      return card.suit === leadSuit;
    }
    
    // If player doesn't have the lead suit, any card is playable
    return true;
  };

  // Calculate HCP (High Card Points) for a hand
  const calculateHCP = (hand: CardType[]): number => {
    return hand.reduce((total, card) => {
      // rank 12 = Ace = 4 points
      // rank 11 = King = 3 points
      // rank 10 = Queen = 2 points
      // rank 9 = Jack = 1 point
      if (card.rank === 12) return total + 4; // Ace
      if (card.rank === 11) return total + 3; // King
      if (card.rank === 10) return total + 2; // Queen
      if (card.rank === 9) return total + 1;  // Jack
      return total;
    }, 0);
  };

  // Determine team scores based on selected position
  // "We" = player's partnership, "They" = opponent's partnership
  const getTeamScores = () => {
    if (!scoreData || selectedPosition === null) return null;
    
    // Determine which partnership the player belongs to
    // selectedPosition: 0=West, 1=North, 2=East, 3=South
    // Partnership: 0=E-W (West/East), 1=N-S (North/South)
    const myPartnership = selectedPosition % 2;  // 0 for E-W, 1 for N-S
    const declarerPartnership = scoreData.declarer_partnership;  // 0 for E-W, 1 for N-S
    
    // If my partnership was the declarer, "We" gets declarer_score
    // If my partnership was the defender, "We" gets defender_score
    if (myPartnership === declarerPartnership) {
      return {
        we: scoreData.declarer_score,
        they: scoreData.defender_score
      };
    } else {
      return {
        we: scoreData.defender_score,
        they: scoreData.declarer_score
      };
    }
  };

  return (
    <div className="game-screen">
      <ShaderBackground />
      
      {/* Game Info Display */}
      <div className="game-info">
        <div className="game-number">Game {gameNumber}</div>
        <div className="vulnerability">{getVulnerabilityDisplay()}</div>
      </div>
      
      {/* Score Breakdown */}
      {scoreData && onNextGame && (
        <ScoreBox
          gameNumber={gameNumber}
          vulnerability={vulnerability}
          contractMade={scoreData.contract_made}
          tricksTaken={scoreData.tricks_taken}
          tricksNeeded={scoreData.tricks_needed}
          weScore={getTeamScores()?.we || {contract_points: 0, overtrick_points: 0, slam_bonus: 0, double_bonus: 0, game_bonus: 0, undertrick_penalty: 0, total: 0}}
          theyScore={getTeamScores()?.they || {contract_points: 0, overtrick_points: 0, slam_bonus: 0, double_bonus: 0, game_bonus: 0, undertrick_penalty: 0, total: 0}}
          cumulativeWeScore={cumulativeScores.we}
          cumulativeTheyScore={cumulativeScores.they}
          isHost={isHost}
          onNextGame={onNextGame}
        />
      )}
      
      {/* Turn indicator arrows */}
      {gamePhase === 'playing' && (
        <>
          {currentPlayer === topPos && (
            <div className="turn-arrow north-arrow">
              <img src="/assets/arrow.svg" alt="Turn indicator" style={{ transform: 'rotate(0deg)' }} />
            </div>
          )}
          {currentPlayer === bottomPos && (
            <div className="turn-arrow south-arrow">
              <img src="/assets/arrow.svg" alt="Turn indicator" style={{ transform: 'rotate(180deg)' }} />
            </div>
          )}
          {currentPlayer === leftPos && (
            <div className="turn-arrow west-arrow">
              <img src="/assets/arrow.svg" alt="Turn indicator" style={{ transform: 'rotate(-90deg)' }} />
            </div>
          )}
          {currentPlayer === rightPos && (
            <div className="turn-arrow east-arrow">
              <img src="/assets/arrow.svg" alt="Turn indicator" style={{ transform: 'rotate(90deg)' }} />
            </div>
          )}
        </>
      )}
      
      {gamePhase === 'bidding' && (
        <BiddingBox
          onBid={onBid}
          onPass={onPass}
          onDouble={onDouble}
          biddingHistory={biddingHistory}
          currentPlayer={currentPlayer}
          selectedPosition={selectedPosition}
          gameNumber={gameNumber}
          vulnerability={vulnerability}
        />
      )}


      {/* Center played cards and contract info */}
      {gamePhase === 'playing' && (
        <div className="center-area">
          <div className="contract-info">
            <div className="declarer">
              {contract ? `${contract.level}${contract.suit === 'NT' ? 'NT' : contract.suit.charAt(0).toUpperCase()} ${playerDisplayNames[contract.declarer]}` : playerDisplayNames[currentPlayer]}
            </div>
          </div>

          <div className="played-cards-area">
            {playedCards.map((played, i) => {
              const visualPos = getVisualPositionString(played.player);
              console.log(`Played card ${i}: Player ${played.player} (${['West','North','East','South'][played.player]}) → pos-${visualPos}`);
              return (
                <div key={i} className={`played-card pos-${visualPos}`}>
                  <Card card={played.card} />
                </div>
              );
            })}
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

      {/* Top position - North */}
      <div className={`player north ${dummy === topPos && isDummyVisible ? 'dummy-visible' : ''}`}>
        
        <div className="hand reverse">
          {getDisplayCards(topPos).map((card, i) => (
            <Card 
              key={i} 
              card={card} 
              onClick={() => onPlayCard(card, topPos as PlayerPosition)} 
              clickable={gamePhase === 'playing' && currentPlayer === topPos && canCurrentPlayerPlay(topPos as PlayerPosition)} 
              hidden={selectedPosition !== topPos && !(dummy === topPos && isDummyVisible)}
              archRotation={getArchRotation(i, getDisplayCards(topPos).length)}
              floatDelay={getFloatDelay(i)}
              disabled={!isCardPlayable(card, topPos)}
            />
          ))}
        </div>
<div className="player-label player-label-top">
          {playerDisplayNames[topPos]}
          {dummy === topPos && isDummyVisible && <span className="dummy-label"> (DUMMY)</span>}
          {getLatestBid(topPos) && <span className="player-bid"> - {getLatestBid(topPos)}</span>}
        </div>
      </div>

      {/* Left position - West */}
      <div className="player west">
        <div className="player-label player-label-left">
          {playerDisplayNames[leftPos]}
          {dummy === leftPos && isDummyVisible && <span className="dummy-label"> (DUMMY)</span>}
          {getLatestBid(leftPos) && <span className="player-bid"> - {getLatestBid(leftPos)}</span>}
        </div>
        <div className="hand hand-vertical hand-vertical-left">
          {getDisplayCards(leftPos).map((card, i) => (
            <Card 
              key={i} 
              card={card} 
              onClick={() => onPlayCard(card, leftPos as PlayerPosition)} 
              clickable={gamePhase === 'playing' && currentPlayer === leftPos && canCurrentPlayerPlay(leftPos as PlayerPosition)} 
              hidden={selectedPosition !== leftPos && !(dummy === leftPos && isDummyVisible)}
              rotation="right"
              floatDelay={getFloatDelay(i)}
              disabled={!isCardPlayable(card, leftPos)}
            />
          ))}
        </div>
      </div>

      {/* Right position - East */}
      <div className="player east">
        <div className="player-label player-label-right">
          {playerDisplayNames[rightPos]}
          {dummy === rightPos && isDummyVisible && <span className="dummy-label"> (DUMMY)</span>}
          {getLatestBid(rightPos) && <span className="player-bid"> - {getLatestBid(rightPos)}</span>}
        </div>
        <div className="hand hand-vertical hand-vertical-right">
          {getDisplayCards(rightPos).map((card, i) => (
            <Card 
              key={i} 
              card={card} 
              onClick={() => onPlayCard(card, rightPos as PlayerPosition)} 
              clickable={gamePhase === 'playing' && currentPlayer === rightPos && canCurrentPlayerPlay(rightPos as PlayerPosition)} 
              hidden={selectedPosition !== rightPos && !(dummy === rightPos && isDummyVisible)}
              rotation="left"
              floatDelay={getFloatDelay(i)}
              disabled={!isCardPlayable(card, rightPos)}
            />
          ))}
        </div>
      </div>

      {/* Bottom position - always the player */}
      <div className="player south">
        {gamePhase === 'bidding' && selectedPosition !== null && (
          <div className="hcp-counter">
            {calculateHCP(hands[bottomPos])} HCP
          </div>
        )}
        <div className="hand">
          {getDisplayCards(bottomPos).map((card, i) => (
            <Card 
              key={i} 
              card={card} 
              onClick={() => onPlayCard(card, bottomPos as PlayerPosition)} 
              clickable={gamePhase === 'playing' && currentPlayer === bottomPos && canCurrentPlayerPlay(bottomPos as PlayerPosition)} 
              hidden={selectedPosition !== bottomPos && !(dummy === bottomPos && isDummyVisible)}
              archRotation={getArchRotation(i, getDisplayCards(bottomPos).length)}
              floatDelay={getFloatDelay(i)}
              disabled={!isCardPlayable(card, bottomPos)}
            />
          ))}
        </div>
        <div className="player-label player-label-bottom">
          {playerDisplayNames[bottomPos]} (You)
          {dummy === bottomPos && isDummyVisible && <span className="dummy-label"> (DUMMY)</span>}
          {getLatestBid(bottomPos) && <span className="player-bid"> - {getLatestBid(bottomPos)}</span>}
        </div>
      </div>
    </div>
  );
}

export default GameScreen;

