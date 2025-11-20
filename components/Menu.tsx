import React, { useState, useEffect } from 'react';
import { getGlobalLeaderboard, GlobalScore, saveScoreToDb } from '../services/supabaseService';
import { INITIAL_PLAYER_RADIUS } from '../constants';

interface MenuProps {
  onStart: (nickname: string) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart }) => {
  const [nickname, setNickname] = useState('');
  const [topScores, setTopScores] = useState<GlobalScore[]>([]);
  const [loadingScores, setLoadingScores] = useState(true);
  
  // Check if connected (simple check based on env vars availability)
  const isDbConnected = !!process.env.SUPABASE_URL;

  useEffect(() => {
    if (!isDbConnected) {
      setLoadingScores(false);
      return;
    }

    const fetchScores = async () => {
      const scores = await getGlobalLeaderboard(5);
      setTopScores(scores);
      setLoadingScores(false);
    };
    fetchScores();
  }, [isDbConnected]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickname.trim() || 'Guest';
    
    // Save to DB immediately upon entry (User Request)
    if (isDbConnected) {
      // Saving with initial mass (usually 20) to register the player
      saveScoreToDb(name, INITIAL_PLAYER_RADIUS);
    }

    onStart(name);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-50">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        
        {/* Login Form */}
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
          <h1 className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Kacar.io
          </h1>
          <p className="text-gray-400 text-center mb-8">Grow, Eat, Survive.</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-300 mb-1">
                Nickname
              </label>
              <input
                type="text"
                id="nickname"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition"
                placeholder="Enter your name..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={15}
              />
            </div>
            
            <button
              type="submit"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-lg shadow-lg transform transition hover:-translate-y-0.5 active:translate-y-0"
            >
              Play Now
            </button>
          </form>
          
          <div className="mt-6 text-xs text-center text-gray-500">
            Mouse to move • Space to split
          </div>
          <div className="mt-2 text-xs text-center text-gray-400 font-medium opacity-70">
            Created by Faruk GÜNGÖR
          </div>
        </div>

        {/* Global Leaderboard */}
        <div className="bg-gray-800 p-6 rounded-xl shadow-2xl border border-yellow-600/30 w-full md:w-72">
          <h3 className="text-xl font-bold text-yellow-400 mb-4 flex items-center gap-2">
             <span>🏆</span> Hall of Fame
          </h3>
          
          {!isDbConnected ? (
             <div className="text-red-400 text-xs text-center py-4 border border-red-900 bg-red-900/20 rounded p-2">
               <strong>Connection Failed</strong><br/>
               Database keys not found.<br/>
               Please configure Vercel Env Vars and Redeploy.
             </div>
          ) : loadingScores ? (
             <div className="text-gray-500 text-sm text-center py-4">Loading records...</div>
          ) : topScores.length > 0 ? (
            <ul className="space-y-3">
              {topScores.map((score, idx) => (
                <li key={idx} className="flex justify-between items-center text-sm border-b border-gray-700 pb-2 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`font-bold font-mono w-4 text-center ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-gray-200 truncate max-w-[100px]" title={score.nickname}>{score.nickname}</span>
                  </div>
                  <span className="font-mono text-blue-400 font-bold">{score.score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-500 text-sm text-center italic py-4">
              No records yet.<br/>Be the first!
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Menu;