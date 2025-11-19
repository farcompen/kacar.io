import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import Menu from './components/Menu';
import Leaderboard from './components/Leaderboard';
import GameOver from './components/GameOver';
import { GameState, LeaderboardEntry } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [nickname, setNickname] = useState<string>('Player');
  const [score, setScore] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [killerName, setKillerName] = useState<string>('Unknown');
  const [startTime, setStartTime] = useState<number>(0);

  const handleStartGame = (name: string) => {
    setNickname(name);
    setGameState(GameState.PLAYING);
    setStartTime(Date.now());
    setScore(0);
  };

  const handleRestart = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      {/* Background/Game Layer */}
      {(gameState === GameState.PLAYING || gameState === GameState.GAME_OVER) && (
        <GameCanvas 
          nickname={nickname} 
          setGameState={setGameState} 
          setScore={setScore}
          setLeaderboard={setLeaderboard}
          setKillerName={setKillerName}
        />
      )}

      {/* UI Overlays */}
      {gameState === GameState.PLAYING && (
        <>
          <div className="absolute bottom-4 left-4 bg-gray-900 bg-opacity-60 backdrop-blur px-4 py-2 rounded-lg border border-white/10 text-white font-bold text-xl pointer-events-none select-none">
            Mass: {Math.floor(score)}
          </div>
          <Leaderboard entries={leaderboard} />
        </>
      )}

      {/* Menu Overlay */}
      {gameState === GameState.MENU && (
        <Menu onStart={handleStartGame} />
      )}

      {/* Game Over Overlay */}
      {gameState === GameState.GAME_OVER && (
        <GameOver 
            score={score} 
            nickname={nickname} 
            killerName={killerName} 
            startTime={startTime}
            onRestart={handleRestart} 
        />
      )}
    </div>
  );
};

export default App;
