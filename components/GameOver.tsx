import React, { useEffect, useState, useRef } from 'react';
import { generateGameOverCommentary } from '../services/geminiService';
import { saveScoreToDb } from '../services/supabaseService';

interface GameOverProps {
  score: number;
  nickname: string;
  killerName: string;
  startTime: number;
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ score, nickname, killerName, startTime, onRestart }) => {
  const [commentary, setCommentary] = useState<string>('Analyzing gameplay...');
  const [loading, setLoading] = useState(true);
  const hasSavedScore = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const timeAlive = Math.floor((Date.now() - startTime) / 1000);
    const finalScore = Math.floor(score);

    // Save Score to DB (Only once)
    if (!hasSavedScore.current && finalScore > 0) {
     console.log("saved score",hasSavedScore.current);
      hasSavedScore.current = true;
      saveScoreToDb(nickname, finalScore);
    }

    const fetchCommentary = async () => {
      const text = await generateGameOverCommentary(nickname, finalScore, killerName, timeAlive);
      if (isMounted) {
        setCommentary(text);
        setLoading(false);
      }
    };

    fetchCommentary();

    return () => {
      isMounted = false;
    };
  }, [nickname, score, killerName, startTime]);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50 backdrop-blur-sm">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-2xl border border-red-900/50 w-full max-w-lg text-center">
        <h2 className="text-4xl font-black text-red-500 mb-2">GAME OVER</h2>
        <p className="text-gray-400 mb-6">You were eaten by <span className="font-bold text-white">{killerName}</span></p>
        
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Final Mass</div>
            <div className="text-3xl font-mono font-bold text-blue-400">{Math.floor(score)}</div>
          </div>
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Time Alive</div>
            <div className="text-3xl font-mono font-bold text-green-400">{Math.floor((Date.now() - startTime) / 1000)}s</div>
          </div>
        </div>

        <div className="mb-8 bg-gray-800/50 border border-gray-700 p-4 rounded-lg">
           <h4 className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center justify-center gap-2">
             {loading && <span className="animate-spin h-3 w-3 border-2 border-purple-400 border-t-transparent rounded-full"></span>}
             AI Commentator
           </h4>
           <p className={`text-sm italic ${loading ? 'text-gray-600' : 'text-gray-300'}`}>
             "{commentary}"
           </p>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3 px-6 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition transform hover:scale-105"
        >
          Respawn
        </button>
      </div>
    </div>
  );
};

export default GameOver;