import React, { useState, useRef, useCallback } from 'react';
import { GameState, Player, Impostor } from '../../shared/types/game';

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onFindImpostor: (x: number, y: number) => Promise<{ found: boolean; impostor?: Impostor; score: number }>;
  error: string;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  currentPlayer,
  onFindImpostor,
  error,
}) => {
  const [clicking, setClicking] = useState(false);
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ impostor: Impostor; x: number; y: number } | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(async (event: React.MouseEvent<HTMLDivElement>) => {
    if (clicking || gameState.phase !== 'playing') return;

    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate percentage position
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setClicking(true);
    setLastClick({ x: event.clientX - rect.left, y: event.clientY - rect.top });

    try {
      const result = await onFindImpostor(x, y);
      
      if (result.found && result.impostor) {
        setShowSuccess({
          impostor: result.impostor,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
        
        setTimeout(() => setShowSuccess(null), 2000);
      }
    } catch (err) {
      console.error('Error finding impostor:', err);
    } finally {
      setClicking(false);
      setTimeout(() => setLastClick(null), 500);
    }
  }, [clicking, gameState.phase, onFindImpostor]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const foundCount = currentPlayer?.foundImpostors.length || 0;
  const totalCount = gameState.impostors.length;
  const timeLeft = gameState.timeLeft || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <h1 className="text-2xl font-bold text-red-400">Find the Impostors!</h1>
            <div className="flex items-center space-x-4 text-lg">
              <div className="bg-blue-600 px-3 py-1 rounded">
                Found: {foundCount}/{totalCount}
              </div>
              <div className="bg-green-600 px-3 py-1 rounded">
                Score: {currentPlayer?.score || 0}
              </div>
              <div className={`px-3 py-1 rounded ${timeLeft <= 30 ? 'bg-red-600' : 'bg-yellow-600'}`}>
                Time: {formatTime(timeLeft)}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-300">Playing as</div>
            <div className="font-semibold">{currentPlayer?.username}</div>
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div className="relative max-w-6xl mx-auto p-4">
        <div
          ref={gameAreaRef}
          className="relative w-full h-[600px] bg-gradient-to-b from-blue-400 to-green-400 rounded-lg overflow-hidden cursor-crosshair"
          onClick={handleClick}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='crowd' patternUnits='userSpaceOnUse' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='8' fill='%23333' opacity='0.1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23crowd)'/%3E%3C/svg%3E")`,
          }}
        >
          {/* Crowd simulation with CSS */}
          <div className="absolute inset-0 opacity-30">
            {Array.from({ length: 200 }, (_, i) => (
              <div
                key={i}
                className="absolute w-3 h-3 bg-gray-800 rounded-full"
                style={{
                  left: `${Math.random() * 95}%`,
                  top: `${Math.random() * 95}%`,
                  transform: `scale(${0.5 + Math.random() * 0.5})`,
                }}
              />
            ))}
          </div>

          {/* Found impostors markers */}
          {gameState.impostors
            .filter(impostor => impostor.found)
            .map((impostor) => (
              <div
                key={impostor.id}
                className="absolute border-4 border-green-500 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center"
                style={{
                  left: `${impostor.x}%`,
                  top: `${impostor.y}%`,
                  width: `${impostor.width}%`,
                  height: `${impostor.height}%`,
                }}
              >
                <div className="text-green-500 font-bold text-xl">✓</div>
              </div>
            ))}

          {/* Click feedback */}
          {lastClick && (
            <div
              className="absolute w-8 h-8 border-4 border-red-500 rounded-full animate-ping"
              style={{
                left: lastClick.x - 16,
                top: lastClick.y - 16,
              }}
            />
          )}

          {/* Success animation */}
          {showSuccess && (
            <div
              className="absolute z-10 pointer-events-none"
              style={{
                left: showSuccess.x - 50,
                top: showSuccess.y - 30,
              }}
            >
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold animate-bounce">
                +{showSuccess.impostor.difficulty === 'easy' ? 10 : 
                   showSuccess.impostor.difficulty === 'medium' ? 25 : 50} points!
              </div>
            </div>
          )}

          {/* Instructions overlay */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-3 rounded-lg max-w-xs">
            <h3 className="font-bold mb-2">Instructions:</h3>
            <ul className="text-sm space-y-1">
              <li>🔍 Click on suspicious figures in the crowd</li>
              <li>🟢 Easy impostors: 10 points</li>
              <li>🟡 Medium impostors: 25 points</li>
              <li>🔴 Hard impostors: 50 points</li>
              <li>⚡ Speed bonus for quick finds!</li>
            </ul>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold mb-4">Live Leaderboard</h2>
          <div className="grid gap-2">
            {Object.values(gameState.players)
              .sort((a, b) => b.score - a.score)
              .map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2 rounded ${
                    player.id === currentPlayer?.id ? 'bg-blue-600 bg-opacity-30' : 'bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="font-medium">{player.username}</span>
                    {player.id === currentPlayer?.id && (
                      <span className="text-blue-400 text-sm">(You)</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{player.score} pts</div>
                    <div className="text-sm text-gray-400">
                      {player.foundImpostors.length}/{totalCount} found
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="fixed bottom-4 right-4 p-3 bg-red-600 bg-opacity-90 border border-red-500 rounded-lg text-red-100 text-sm max-w-sm">
          {error}
        </div>
      )}
    </div>
  );
};