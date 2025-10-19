import { useState, useEffect } from 'react';
import ShaderBackground from '../components/ShaderBackground';
import './LobbyScreen.css';

type PlayerPosition = 0 | 1 | 2 | 3;

interface LobbyScreenProps {
  gameState: any | null;
  gameCode: string | null;
  selectedPosition: PlayerPosition | null;
  onPositionSelect: (position: PlayerPosition) => void;
  onStartGame: () => void;
}

function LobbyScreen({ 
  gameState, 
  gameCode, 
  selectedPosition, 
  onPositionSelect, 
  onStartGame 
}: LobbyScreenProps) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => {
        setShowToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);
  return (
    <div className="lobby-screen-container">
      <ShaderBackground />
      <div className="lobby-info-card">
        <p className="you-are-text">You are</p>
        <p className="player-name">{gameState?.your_name || 'Loading...'}</p>
        <p className="players-count">{gameState?.players?.length || 0}/4 Players joined</p>
        
        <div className="position-buttons">
          <button 
            className={`position-btn ${selectedPosition === 1 ? 'selected' : ''}`}
            onClick={() => onPositionSelect(1)}
          >
            North {gameState?.north && `(${gameState.north})`}
          </button>
          <button 
            className={`position-btn ${selectedPosition === 2 ? 'selected' : ''}`}
            onClick={() => onPositionSelect(2)}
          >
            East {gameState?.east && `(${gameState.east})`}
          </button>
          <button 
            className={`position-btn ${selectedPosition === 3 ? 'selected' : ''}`}
            onClick={() => onPositionSelect(3)}
          >
            South {gameState?.south && `(${gameState.south})`}
          </button>
          <button 
            className={`position-btn ${selectedPosition === 0 ? 'selected' : ''}`}
            onClick={() => onPositionSelect(0)}
          >
            West {gameState?.west && `(${gameState.west})`}
          </button>
        </div>
        
        <div className="lobby-actions">
          <button 
            className="start-game-button" 
            onClick={onStartGame}
            disabled={
              !gameState?.is_host || 
              selectedPosition === null || 
              (gameState?.players?.length || 0) < 4 ||
              !gameState?.north || 
              !gameState?.south || 
              !gameState?.east || 
              !gameState?.west
            }
          >
            {gameState?.is_host ? 'Start!' : 'Waiting...'}
          </button>
          
          {gameCode && (
            <button 
              className="copy-code-button"
              onClick={() => {
                navigator.clipboard.writeText(gameCode);
                setShowToast(true);
              }}
              aria-label="Copy game code"
            >
              <span className="code-text">{gameCode}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {showToast && (
        <div className="toast-notification">
          Game code copied to clipboard!
        </div>
      )}
    </div>
  );
}

export default LobbyScreen;

