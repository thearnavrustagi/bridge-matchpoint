import { playSound } from '../utils/sound';
import './ScoreBox.css';

interface ScoreBreakdown {
  contract_points: number;
  overtrick_points: number;
  slam_bonus: number;
  double_bonus: number;
  game_bonus: number;
  undertrick_penalty: number;
  total: number;
}

interface ScoreBoxProps {
  gameNumber: number;
  vulnerability: {ns: boolean, ew: boolean};
  contractMade: boolean;
  tricksTaken: number;
  tricksNeeded: number;
  weScore: ScoreBreakdown;
  theyScore: ScoreBreakdown;
  cumulativeWeScore: number;
  cumulativeTheyScore: number;
  isHost: boolean;
  onNextGame: () => void;
  passedOut?: boolean;
}

function ScoreBox({
  gameNumber,
  vulnerability,
  contractMade,
  tricksTaken,
  tricksNeeded,
  weScore,
  theyScore,
  cumulativeWeScore,
  cumulativeTheyScore,
  isHost,
  onNextGame,
  passedOut = false
}: ScoreBoxProps) {
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
    <div className="score-box">
      <div className="score-header">
        <div className="score-deal-info">
          <span>Game: {gameNumber}</span>
          <span>Vul: {getVulnerabilityDisplay()}</span>
        </div>
        <div className="score-result-text">
          {passedOut ? (
            <span className="contract-passed-out">All Players Passed - No Contract</span>
          ) : contractMade ? (
            <span className="contract-made">Contract Made! {tricksTaken}/{tricksNeeded} tricks</span>
          ) : (
            <span className="contract-failed">Contract Failed! {tricksTaken}/{tricksNeeded} tricks</span>
          )}
        </div>
      </div>

      <div className="score-content">
        {/* Left side - Cumulative Scores */}
        <div className="cumulative-scores">
          <div className="cumulative-header">Total Score</div>
          <div className="cumulative-row team-we">
            <span className="team-label">We</span>
            <span className="team-score">{cumulativeWeScore}</span>
          </div>
          <div className="cumulative-row team-they">
            <span className="team-label">They</span>
            <span className="team-score">{cumulativeTheyScore}</span>
          </div>
        </div>

        {/* Right side - This Round Breakdown */}
        <div className="round-breakdown">
          <div className="breakdown-header">
            <span></span>
            <span>We</span>
            <span>They</span>
          </div>
          <div className="breakdown-rows">
            <div className="breakdown-row">
              <span className="breakdown-label">Contract</span>
              <span className="breakdown-value">{weScore.contract_points}</span>
              <span className="breakdown-value">{theyScore.contract_points}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Overtrick</span>
              <span className="breakdown-value">{weScore.overtrick_points}</span>
              <span className="breakdown-value">{theyScore.overtrick_points}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Slam Bonus</span>
              <span className="breakdown-value">{weScore.slam_bonus}</span>
              <span className="breakdown-value">{theyScore.slam_bonus}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Insult Bonus</span>
              <span className="breakdown-value">{weScore.double_bonus}</span>
              <span className="breakdown-value">{theyScore.double_bonus}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Undertrick Penalty</span>
              <span className="breakdown-value">{weScore.undertrick_penalty}</span>
              <span className="breakdown-value">{theyScore.undertrick_penalty}</span>
            </div>
            <div className="breakdown-row">
              <span className="breakdown-label">Game Bonus</span>
              <span className="breakdown-value">{weScore.game_bonus}</span>
              <span className="breakdown-value">{theyScore.game_bonus}</span>
            </div>
            <div className="breakdown-row breakdown-total">
              <span className="breakdown-label"><strong>Round Total</strong></span>
              <span className="breakdown-value"><strong>{weScore.total}</strong></span>
              <span className="breakdown-value"><strong>{theyScore.total}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <div className="score-actions">
        <button 
          className="next-game-btn" 
          onClick={() => {
            playSound('button');
            onNextGame();
          }}
          disabled={!isHost}
        >
          {isHost ? 'Next Game' : 'Waiting for host...'}
        </button>
      </div>
    </div>
  );
}

export default ScoreBox;

