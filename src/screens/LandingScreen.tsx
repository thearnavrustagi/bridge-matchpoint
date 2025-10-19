import { useState } from 'react';
import { MdSettings } from "react-icons/md";
import { playSound } from '../utils/sound';
import ShaderBackground from '../components/ShaderBackground';
import CustomizeSettings from '../components/CustomizeSettings';
import './LandingScreen.css';

interface LandingScreenProps {
  onMakeLobby: () => void;
  onJoinLobby: (code: string) => void;
  gameCode: string | null;
}

function LandingScreen({ onMakeLobby, onJoinLobby, gameCode }: LandingScreenProps) {
  const [lobbyCodeInput, setLobbyCodeInput] = useState<string>('');
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState<boolean>(false);

  const handleJoin = () => {
    if (lobbyCodeInput.trim()) {
      onJoinLobby(lobbyCodeInput.trim());
    }
  };

  return (
    <div className="landing-screen">
      <ShaderBackground />
      <div className="title-section">
        <img src="/assets/bid-breaker.png" alt="Bid Breaker" className="main-logo" />
      </div>
      
      <div className="lobby-controls">
        <button className="make-lobby-button" onClick={() => {
          playSound('button');
          onMakeLobby();
        }}>
          Make Lobby
        </button>
        <input
          type="text"
          placeholder="Enter code ..."
          className="lobby-code-input"
          value={lobbyCodeInput}
          onChange={(e) => setLobbyCodeInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
        />
        <button className="join-button" onClick={() => {
          playSound('button');
          handleJoin();
        }}>
          Join
        </button>
      </div>
      
      {gameCode && (
        <div className="game-code-display">
          Game Code: {gameCode}
        </div>
      )}
      
      <button 
        className="settings-button" 
        onClick={() => {
          playSound('button');
          setShowSettingsModal(true);
        }} 
        aria-label="Settings"
      >
        <MdSettings size={30} color="white" />
      </button>

      {showSettingsModal && (
        <div className="settings-modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Settings</h2>
            <div className="settings-options">
              <button 
                className="settings-option-button"
                onClick={() => {
                  playSound('button');
                  setShowSettingsModal(false);
                  setShowCustomizeModal(true);
                }}
              >
                Customize Cards
              </button>
            </div>
            <button className="close-settings-button" onClick={() => {
              playSound('button');
              setShowSettingsModal(false);
            }}>
              Close
            </button>
          </div>
        </div>
      )}

      {showCustomizeModal && (
        <CustomizeSettings onClose={() => setShowCustomizeModal(false)} />
      )}
    </div>
  );
}

export default LandingScreen;

