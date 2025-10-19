import { useState } from 'react';
import { playSound } from '../utils/sound';
import './BiddingBox.css';

interface BidType {
  player: string;
  playerIndex?: number;
  display: string;
  level?: number;
  suit?: string;
}

interface BiddingBoxProps {
  onBid: (level: number, suit: string) => void;
  onPass: () => void;
  onDouble: () => void;
  biddingHistory: BidType[];
  currentPlayer: number;
  selectedPosition: number | null;
  gameNumber?: number;
  vulnerability?: {ns: boolean, ew: boolean};
}

const playerNames = ['West', 'North', 'East', 'South'];

function BiddingBox({ onBid, onPass, onDouble, biddingHistory, currentPlayer, selectedPosition, gameNumber = 1, vulnerability = {ns: false, ew: false} }: BiddingBoxProps) {
  const suits = ['♣', '♦', '♥', '♠'];
  const suitNames = ['clubs', 'diamonds', 'hearts', 'spades'];
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  
  // Check if it's the player's turn
  const isMyTurn = selectedPosition === currentPlayer;

  // Get the highest bid from history
  const getHighestBid = (): { level: number; suitIndex: number } | null => {
    for (let i = biddingHistory.length - 1; i >= 0; i--) {
      const bid = biddingHistory[i];
      if (bid.level && bid.suit) {
        const suitIndex = bid.suit === 'NT' ? 4 : suitNames.indexOf(bid.suit);
        return { level: bid.level, suitIndex };
      }
    }
    return null;
  };

  const highestBid = getHighestBid();

  // Check if a level is valid (has at least one valid suit)
  const isLevelValid = (level: number): boolean => {
    if (!highestBid) return true;
    
    // If level is higher, it's always valid
    if (level > highestBid.level) return true;
    
    // If level is same, check if there are any higher suits available
    if (level === highestBid.level) {
      // NT is at index 4, so if current bid is less than 4, there are higher suits
      return highestBid.suitIndex < 4;
    }
    
    // If level is lower, it's invalid
    return false;
  };

  // Check if a suit at the selected level is valid
  const isSuitValid = (suitName: string): boolean => {
    if (selectedLevel === null) return false;
    if (!highestBid) return true;
    
    const suitIndex = suitName === 'NT' ? 4 : suitNames.indexOf(suitName);
    
    // If selected level is higher than highest bid, all suits are valid
    if (selectedLevel > highestBid.level) return true;
    
    // If same level, only higher suits are valid
    if (selectedLevel === highestBid.level) {
      return suitIndex > highestBid.suitIndex;
    }
    
    // If lower level, no suits are valid
    return false;
  };

  // Check if two players are teammates
  const areTeammates = (player1: number, player2: number): boolean => {
    // North (1) & South (3) are teammates (odd)
    // West (0) & East (2) are teammates (even)
    return player1 % 2 === player2 % 2;
  };

  // Get double/redouble state
  const getDoubleRedoubleState = (): { canDouble: boolean; canRedouble: boolean; isDoubled: boolean } => {
    if (selectedPosition === null) return { canDouble: false, canRedouble: false, isDoubled: false };
    
    // Find the last real bid (not Pass)
    let lastRealBid: BidType | null = null;
    let lastRealBidIndex = -1;
    for (let i = biddingHistory.length - 1; i >= 0; i--) {
      if (biddingHistory[i].level && biddingHistory[i].level! > 0) {
        lastRealBid = biddingHistory[i];
        lastRealBidIndex = i;
        break;
      }
    }
    
    if (!lastRealBid || lastRealBid.playerIndex === undefined) {
      return { canDouble: false, canRedouble: false, isDoubled: false };
    }
    
    // Check what happened after the last real bid
    const bidsAfter = biddingHistory.slice(lastRealBidIndex + 1);
    const hasDouble = bidsAfter.some(b => b.suit === 'Double');
    const hasRedouble = bidsAfter.some(b => b.suit === 'Redouble');
    
    // Can't double/redouble if there's already a redouble
    if (hasRedouble) return { canDouble: false, canRedouble: false, isDoubled: false };
    
    // If there's a double, check if we can redouble
    if (hasDouble) {
      // Can redouble if the last real bid was from our partnership
      const lastBidPlayerIndex = lastRealBid.playerIndex;
      const canRedouble = areTeammates(selectedPosition, lastBidPlayerIndex);
      return { canDouble: false, canRedouble, isDoubled: true };
    }
    
    // No double yet - check if we can double
    // Can only double opponent's bid (not teammate's)
    const lastBidPlayerIndex = lastRealBid.playerIndex;
    const canDouble = !areTeammates(selectedPosition, lastBidPlayerIndex);
    
    return { canDouble, canRedouble: false, isDoubled: false };
  };

  const doubleRedoubleState = getDoubleRedoubleState();

  // Handle making a bid with selected level and suit
  const handleBid = (suit: string) => {
    if (selectedLevel !== null && isSuitValid(suit)) {
      playSound('button');
      onBid(selectedLevel, suit);
      setSelectedLevel(null); // Reset selection after bidding
    }
  };

  const handleButtonClick = (callback: () => void) => {
    playSound('button');
    callback();
  };

  // Organize bidding history by rounds (4 bids per round) in N, E, S, W order
  const organizeBiddingHistory = () => {
    const rounds: BidType[][] = [];
    
    if (biddingHistory.length === 0) {
      return rounds;
    }
    
    // Determine the starting player (first bid's playerIndex)
    // Header order is: North(1), East(2), South(3), West(0)
    const headerPlayerOrder = [1, 2, 3, 0]; // North, East, South, West
    const firstBidPlayerIndex = biddingHistory[0].playerIndex;
    
    // If we can't determine the starting player, fall back to old behavior
    if (firstBidPlayerIndex === undefined) {
      for (let i = 0; i < biddingHistory.length; i += 4) {
        const round = biddingHistory.slice(i, i + 4);
        while (round.length < 4) {
          round.push({ player: '', display: '' } as BidType);
        }
        rounds.push(round);
      }
      return rounds;
    }
    
    // Find position in header where first bid should appear
    const startPosition = headerPlayerOrder.indexOf(firstBidPlayerIndex);
    
    // Create first round with empty bids before the starting player
    const firstRound: BidType[] = [];
    for (let i = 0; i < startPosition; i++) {
      firstRound.push({ player: '', display: '' } as BidType);
    }
    
    // Add all bids
    const allBids = [...firstRound, ...biddingHistory];
    
    // Group into rounds of 4
    for (let i = 0; i < allBids.length; i += 4) {
      const round = allBids.slice(i, i + 4);
      // Pad incomplete round
      while (round.length < 4) {
        round.push({ player: '', display: '' } as BidType);
      }
      rounds.push(round);
    }
    
    return rounds;
  };

  const biddingRounds = organizeBiddingHistory();

  // Format bid display for history
  const formatBidDisplay = (bid: BidType): string => {
    if (!bid.display) return '';
    if (bid.suit === 'Double') return 'X';
    if (bid.suit === 'Redouble') return 'XX';
    return bid.display;
  };

  // Get vulnerability display
  const getVulnerabilityDisplay = () => {
    if (vulnerability.ns && vulnerability.ew) {
      return 'Both';
    } else if (vulnerability.ns) {
      return 'N-S';
    } else if (vulnerability.ew) {
      return 'E-W';
    } else {
      return 'None';
    }
  };

  return (
    <div className="bidding-box">
      <div className="bidding-header">
        <div className="deal-info">
          <span>Deal: {gameNumber}</span>
          <span>Vul: {getVulnerabilityDisplay()}</span>
        </div>
        <div className="current-turn">
          {isMyTurn ? "Your turn to bid" : `Waiting for ${playerNames[currentPlayer]}`}
        </div>
      </div>

      <div className="bidding-content">
        {/* Left side - Bidding History */}
        <div className="bidding-table">
          <div className="bidding-headers">
            <span>North</span>
            <span>East</span>
            <span>South</span>
            <span>West</span>
          </div>
          <div className="bidding-history">
            {biddingRounds.map((round, roundIndex) => (
              <div key={roundIndex} className="bidding-round">
                {round.map((bid, bidIndex) => (
                  <div key={`${roundIndex}-${bidIndex}`} className={`bid-entry ${!bid.display ? 'current-bid' : ''}`}>
                    {formatBidDisplay(bid) || (roundIndex === biddingRounds.length - 1 && bidIndex === biddingHistory.length % 4 ? '?' : '')}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Bidding Controls */}
        <div className="bidding-controls">
          <div className="number-row">
            {[1, 2, 3, 4].map(num => (
              <button 
                key={num} 
                className={`bid-btn ${selectedLevel === num ? 'active' : ''}`} 
                onClick={() => handleButtonClick(() => setSelectedLevel(num))} 
                disabled={!isMyTurn || !isLevelValid(num)}
              >
                {num}
              </button>
            ))}
          </div>
          <div className="number-row">
            {[5, 6, 7].map(num => (
              <button 
                key={num} 
                className={`bid-btn ${selectedLevel === num ? 'active' : ''}`} 
                onClick={() => handleButtonClick(() => setSelectedLevel(num))} 
                disabled={!isMyTurn || !isLevelValid(num)}
              >
                {num}
              </button>
            ))}
            <button 
              className="bid-btn suit-btn" 
              onClick={() => handleBid('NT')} 
              disabled={!isMyTurn || selectedLevel === null || !isSuitValid('NT')}
            >
              NT
            </button>
          </div>
          <div className="suit-row">
            {suits.map((suit, i) => (
              <button
                key={i}
                className={`bid-btn suit-btn suit-${suitNames[i]}`}
                onClick={() => handleBid(suitNames[i])}
                disabled={!isMyTurn || selectedLevel === null || !isSuitValid(suitNames[i])}
              >
                {suit}
              </button>
            ))}
          </div>
          <div className="action-row">
            <button 
              className="bid-btn action-btn" 
              onClick={() => handleButtonClick(onDouble)} 
              disabled={!isMyTurn || (!doubleRedoubleState.canDouble && !doubleRedoubleState.canRedouble)}
            >
              {doubleRedoubleState.canRedouble ? 'Redouble' : 'Double'}
            </button>
            <button className="bid-btn action-btn" onClick={() => handleButtonClick(onPass)} disabled={!isMyTurn}>
              Pass
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BiddingBox;
