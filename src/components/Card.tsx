import { type CardType } from '../utils/game';
import { useCardTheme } from '../contexts/CardThemeContext';
import { playSound } from '../utils/sound';
import './Card.css';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  clickable?: boolean;
  hidden?: boolean;
  rotation?: 'left' | 'right' | 'none';
  archRotation?: number;
  invertedArch?: boolean;
  floatDelay?: number;
  disabled?: boolean;
}

function Card({ card, onClick, clickable = false, hidden = false, rotation = 'none', archRotation = 0, invertedArch = false, floatDelay = 0, disabled = false }: CardProps) {
  const { theme } = useCardTheme();
  
  const imagePath = hidden
    ? `/assets/backs/${theme.back}.png`
    : `/assets/fronts/${theme.front}/${card.suit}/${card.rank}.png`;

  const rotationClass = rotation === 'left' ? 'rotate-left' : rotation === 'right' ? 'rotate-right' : '';
  const hasArch = archRotation !== 0;
  const archClass = hasArch ? (invertedArch ? 'arched-inverted' : 'arched') : '';

  const style: React.CSSProperties = {
    ...(hasArch && { '--arch-rotation': `${archRotation}deg` }),
    '--float-delay': `${floatDelay}s`
  } as React.CSSProperties;

  const handleMouseEnter = () => {
    if (clickable && !disabled) {
      playSound('cardHover');
    }
  };

  const handleClick = () => {
    if (clickable && !disabled && onClick) {
      playSound('cardPlay');
      onClick();
    }
  };

  return (
    <div
      className={`card ${clickable ? 'clickable' : ''} ${hidden ? 'hidden-card' : ''} ${disabled ? 'disabled' : ''} ${rotationClass} ${archClass}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      style={style}
    >
      <img src={imagePath} alt={hidden ? "Card back" : `${card.rank} of ${card.suit}`} draggable="false" />
    </div>
  );
}

export default Card;
