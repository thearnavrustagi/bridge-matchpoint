import { type CardType } from '../utils/game';
import './Card.css';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  clickable?: boolean;
  hidden?: boolean;
  rotation?: 'left' | 'right' | 'none';
}

function Card({ card, onClick, clickable = false, hidden = false, rotation = 'none' }: CardProps) {
  const imagePath = hidden
    ? `/assets/backs/card_back.png`
    : `/assets/fronts/balatro/${card.suit}/${card.rank}.png`;

  const rotationClass = rotation === 'left' ? 'rotate-left' : rotation === 'right' ? 'rotate-right' : '';

  return (
    <div
      className={`card ${clickable ? 'clickable' : ''} ${hidden ? 'hidden-card' : ''} ${rotationClass}`}
      onClick={clickable ? onClick : undefined}
    >
      <img src={imagePath} alt={hidden ? "Card back" : `${card.rank} of ${card.suit}`} draggable="false" />
    </div>
  );
}

export default Card;
