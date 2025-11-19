import React, { useState } from 'react';

interface MenuProps {
  onStart: (nickname: string) => void;
}

const Menu: React.FC<MenuProps> = ({ onStart }) => {
  const [nickname, setNickname] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nickname.trim() || 'Guest';
    onStart(name);
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 z-50">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
        <h1 className="text-5xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
          Kaçar.io
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
          Use your mouse to move. Eat smaller dots to grow. Avoid bigger dots.
        </div>
      </div>
    </div>
  );
};

export default Menu;
