import './BiddingBox.css';

interface BidType {
  player: string;
  display: string;
}

interface BiddingBoxProps {
  onBid: (level: number, suit: string) => void;
  onPass: () => void;
  onDouble: () => void;
  biddingHistory: BidType[];
  currentPlayer: number;
}

const playerNames = ['West', 'North', 'East', 'South'];

function BiddingBox({ onBid, onPass, onDouble, biddingHistory, currentPlayer }: BiddingBoxProps) {
  const suits = ['♣', '♦', '♥', '♠'];
  const suitNames = ['clubs', 'diamonds', 'hearts', 'spades'];

  // Pad bidding history to show in grid
  const paddedHistory = [...biddingHistory];
  while (paddedHistory.length % 4 !== 0) {
    paddedHistory.push({ player: '', display: '' } as BidType);
  }

  return (
    <div className="bidding-box">
      <div className="bidding-header">
        <div className="deal-info">
          <span>Deal: 1</span>
          <span>Vul: None</span>
        </div>
      </div>

      <div className="bidding-table">
        <div className="bidding-headers">
          <span>West</span>
          <span>North</span>
          <span>East</span>
          <span>South</span>
        </div>
        <div className="bidding-history">
          {paddedHistory.map((bid, i) => (
            <div key={i} className={`bid-entry ${!bid.display ? 'current-bid' : ''}`}>
              {bid.display || (i === biddingHistory.length ? '?' : '')}
            </div>
          ))}
        </div>
      </div>

      <div className="bidding-controls">
        <div className="number-row">
          {[1, 2, 3, 4].map(num => (
            <button key={num} className="bid-btn" onClick={() => onBid(num, 'level')}>
              {num}
            </button>
          ))}
        </div>
        <div className="number-row">
          {[5, 6, 7].map(num => (
            <button key={num} className="bid-btn" onClick={() => onBid(num, 'level')}>
              {num}
            </button>
          ))}
          <button className="bid-btn" onClick={() => onBid(0, 'NT')}>
            NT
          </button>
        </div>
        <div className="suit-row">
          {suits.map((suit, i) => (
            <button
              key={i}
              className={`bid-btn suit-btn suit-${suitNames[i]}`}
              onClick={() => onBid(0, suitNames[i])}
            >
              {suit}
            </button>
          ))}
        </div>
        <div className="action-row">
          <button className="bid-btn action-btn" onClick={onDouble}>
            Double
          </button>
          <button className="bid-btn action-btn" onClick={onPass}>
            Pass
          </button>
        </div>
      </div>

      <div className="hcp-display">6 HCP</div>
    </div>
  );
}

export default BiddingBox;
