import React from 'react';
import { LeaderboardEntry } from '../types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
  return (
    <div className="absolute top-4 right-4 bg-gray-900 bg-opacity-60 backdrop-blur-sm p-4 rounded-lg border border-white/10 w-48 select-none pointer-events-none">
      <h3 className="text-white font-bold text-lg mb-2 border-b border-white/20 pb-1">Leaderboard</h3>
      <ol className="text-sm text-gray-200 space-y-1">
        {entries.map((entry, index) => (
          <li key={entry.id} className="flex justify-between items-center">
            <span className="truncate max-w-[100px]">
              <span className="text-gray-400 mr-2">{index + 1}.</span>
              {entry.name}
            </span>
            <span className="font-mono text-gray-300">{Math.floor(entry.score)}</span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-gray-500 italic">No players</li>
        )}
      </ol>
    </div>
  );
};

export default Leaderboard;
