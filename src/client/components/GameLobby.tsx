import React, { useState } from 'react';
import { GameState, Player } from '../../shared/types/game';

interface GameLobbyProps {
  gameState?: GameState;
  currentPlayer?: Player | null;
  onJoinGame: (username: string) => Promise<void>;
  onStartGame?: () => Promise<void>;
  error: string;
}

export const GameLobby: React.FC<GameLobbyProps> = ({
  gameState,
  currentPlayer,
  onJoinGame,
  onStartGame,
  error,
}) => {
  const [username, setUsername] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setJoining(true);
    await onJoinGame(username.trim());
    setJoining(false);
  };

  const handleStart = async () => {
    if (onStartGame) {
      await onStartGame();
    }
  };

  const players = gameState ? Object.values(gameState.players) : [];
  const isHost = currentPlayer && gameState && currentPlayer.id === gameState.host;

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-red-400 mb-2">Find the Impostors!</h1>
            <p className="text-gray-300">Where's Waldo style hidden object game</p>
          </div>
          
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Enter your username:
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                placeholder="Your username"
                disabled={joining}
                maxLength={20}
              />
            </div>
            
            <button
              type="submit"
              disabled={!username.trim() || joining}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {joining ? 'Creating Game...' : 'Create Game'}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-3 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-800 rounded-lg p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-400 mb-2">Find the Impostors!</h1>
          <p className="text-gray-300">Waiting for players...</p>
          <div className="mt-2 text-sm text-gray-400">
            {players.length}/20 players
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-white mb-4">Players ({players.length})</h2>
          <div className="grid gap-3">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.id === gameState.host
                    ? 'bg-yellow-600 bg-opacity-20 border border-yellow-500'
                    : 'bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-white">{player.username}</span>
                </div>
                {player.id === gameState.host && (
                  <span className="text-yellow-400 text-sm font-medium">HOST</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {!currentPlayer && (
          <form onSubmit={handleJoin} className="space-y-4 mb-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Join the game:
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                placeholder="Your username"
                disabled={joining}
                maxLength={20}
              />
            </div>
            
            <button
              type="submit"
              disabled={!username.trim() || joining}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
            >
              {joining ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        )}

        {isHost && (
          <div className="text-center">
            <button
              onClick={handleStart}
              className="py-3 px-8 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
            >
              Start Game
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-400">
          <p>How to play:</p>
          <p className="mt-2">🔍 Find all the hidden impostors in the crowd</p>
          <p>⏱️ Race against time and other players</p>
          <p>🏆 Score points based on difficulty and speed</p>
        </div>
      </div>
    </div>
  );
};