import { useState, useEffect } from 'react';
import { 
  CARD_BACKS, 
  CARD_FRONTS, 
  SHADER_THEMES,
  getCardBackName
} from '../utils/cardTheme';
import { useCardTheme } from '../contexts/CardThemeContext';
import { playSound } from '../utils/sound';
import './CustomizeSettings.css';

interface CustomizeSettingsProps {
  onClose: () => void;
}

function CustomizeSettings({ onClose }: CustomizeSettingsProps) {
  const { theme, updateTheme } = useCardTheme();
  const [selectedBack, setSelectedBack] = useState<string>(theme.back);
  const [selectedFront, setSelectedFront] = useState<string>(theme.front);
  const [selectedShader, setSelectedShader] = useState<string>(theme.shaderTheme);
  const [shaderEnabled, setShaderEnabled] = useState<boolean>(theme.shaderEnabled);

  useEffect(() => {
    // Sync with current theme if it changes externally
    setSelectedBack(theme.back);
    setSelectedFront(theme.front);
    setSelectedShader(theme.shaderTheme);
    setShaderEnabled(theme.shaderEnabled);
  }, [theme]);

  const handleSave = () => {
    playSound('button');
    updateTheme({
      back: selectedBack,
      front: selectedFront,
      shaderTheme: selectedShader,
      shaderEnabled: shaderEnabled
    });
    onClose();
  };

  const handleClose = () => {
    playSound('button');
    onClose();
  };

  return (
    <div className="customize-modal-overlay" onClick={onClose}>
      <div className="customize-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Customize Cards</h2>
        
        <div className="customize-section">
          <h3>Card Backs</h3>
          <div className="card-backs-grid">
            {CARD_BACKS.map((back) => (
              <div
                key={back}
                className={`card-back-option ${selectedBack === back ? 'selected' : ''}`}
                onClick={() => setSelectedBack(back)}
              >
                <img 
                  src={`/assets/backs/${back}.png`} 
                  alt={getCardBackName(back)} 
                  draggable="false"
                />
                <span className="card-back-label">{getCardBackName(back)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="customize-section">
          <h3>Card Fronts</h3>
          <div className="card-fronts-grid">
            {CARD_FRONTS.map((front) => (
              <div
                key={front.id}
                className={`card-front-option ${selectedFront === front.id ? 'selected' : ''}`}
                onClick={() => setSelectedFront(front.id)}
              >
                <div className="sample-cards">
                  {/* Show all 4 suits: Spades, Hearts, Diamonds, Clubs */}
                  <img 
                    src={`/assets/fronts/${front.id}/spades/1.png`} 
                    alt="Ace of Spades" 
                    className="sample-card"
                    draggable="false"
                  />
                  <img 
                    src={`/assets/fronts/${front.id}/hearts/12.png`} 
                    alt="King of Hearts" 
                    className="sample-card"
                    draggable="false"
                  />
                  <img 
                    src={`/assets/fronts/${front.id}/diamonds/11.png`} 
                    alt="Queen of Diamonds" 
                    className="sample-card"
                    draggable="false"
                  />
                  <img 
                    src={`/assets/fronts/${front.id}/clubs/10.png`} 
                    alt="Jack of Clubs" 
                    className="sample-card"
                    draggable="false"
                  />
                </div>
                <span className="card-front-label">{front.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="customize-section">
          <h3>Background Shader</h3>
          
          <div className="shader-toggle">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={shaderEnabled}
                onChange={(e) => setShaderEnabled(e.target.checked)}
              />
              <span className="toggle-text">Enable Shader Background</span>
            </label>
          </div>

          {shaderEnabled && (
            <div className="shader-themes-grid">
              {Object.entries(SHADER_THEMES).map(([id, shader]) => (
                <div
                  key={id}
                  className={`shader-theme-option ${selectedShader === id ? 'selected' : ''}`}
                  onClick={() => setSelectedShader(id)}
                >
                  <div 
                    className="shader-preview"
                    style={{
                      background: `linear-gradient(135deg, 
                        rgba(${shader.colors.color1[0] * 255}, ${shader.colors.color1[1] * 255}, ${shader.colors.color1[2] * 255}, 1) 0%, 
                        rgba(${shader.colors.color2[0] * 255}, ${shader.colors.color2[1] * 255}, ${shader.colors.color2[2] * 255}, 1) 50%,
                        rgba(${shader.colors.color3[0] * 255}, ${shader.colors.color3[1] * 255}, ${shader.colors.color3[2] * 255}, 1) 100%)`
                    }}
                  />
                  <span className="shader-theme-label">{shader.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="customize-actions">
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
          <button className="cancel-button" onClick={handleClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomizeSettings;

