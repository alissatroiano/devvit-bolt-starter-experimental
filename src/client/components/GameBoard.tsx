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

  // Generate crowd of people with some being impostors
  const generateCrowd = () => {
    const crowd = [];
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * 95;
      const y = Math.random() * 95;
      const isImpostor = gameState.impostors.some(imp => 
        !imp.found && 
        Math.abs(imp.x - x) < 3 && 
        Math.abs(imp.y - y) < 3
      );
      
      crowd.push({
        id: i,
        x,
        y,
        emoji: isImpostor ? '👽' : '👤',
        isImpostor,
      });
    }
    return crowd;
  };

  const crowd = generateCrowd();

  return (
    <div className="h-screen bg-[#1a1a2e] text-white flex flex-col">
      {/* Top Header */}
      <div className="bg-[#16213e] p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-6">
          <h1 className="text-xl font-bold text-[#0ea5e9]">FIND THE IMPOSTORS</h1>
          <div className="flex items-center space-x-4">
            <div className="bg-[#0ea5e9] px-3 py-1 rounded text-sm font-medium">
              {foundCount}/{totalCount}
            </div>
            <div className="text-[#0ea5e9] font-medium">
              Score: {currentPlayer?.score || 0}
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded font-medium ${
            timeLeft <= 30 ? 'bg-red-600 text-white' : 'bg-[#0ea5e9] text-white'
          }`}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-300">
            {currentPlayer?.username}
          </div>
        </div>
      </div>

      {/* Main Game Canvas */}
      <div className="flex-1 relative">
        <div
          ref={gameAreaRef}
          className="w-full h-full bg-gradient-to-b from-[#2a4a6b] to-[#1e3a5f] cursor-crosshair relative overflow-hidden"
          onClick={handleClick}
        >
          {/* Crowd */}
          {crowd.map((person) => (
            <div
              key={person.id}
              className={`absolute text-lg select-none pointer-events-none ${
                person.isImpostor ? 'text-red-400' : 'text-gray-400'
              }`}
              style={{
                left: `${person.x}%`,
                top: `${person.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {person.emoji}
            </div>
          ))}

          {/* Found impostors markers */}
          {gameState.impostors
            .filter(impostor => impostor.found)
            .map((impostor) => (
              <div
                key={impostor.id}
                className="absolute border-2 border-green-400 bg-green-400 bg-opacity-20 rounded-lg flex items-center justify-center"
                style={{
                  left: `${impostor.x}%`,
                  top: `${impostor.y}%`,
                  width: `${impostor.width}%`,
                  height: `${impostor.height}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="text-green-400 font-bold text-xl">✓</div>
              </div>
            ))}

          {/* Click feedback */}
          {lastClick && (
            <div
              className="absolute w-8 h-8 border-2 border-[#0ea5e9] rounded-full animate-ping"
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
        </div>
      </div>

      {/* Bottom Panel - Who to Look For */}
      <div className="bg-[#16213e] border-t border-gray-700 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-[#0ea5e9]">WHO TO LOOK FOR</h2>
            <div className="text-sm text-gray-400">
              Click on suspicious figures in the crowd
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Easy Impostors */}
            <div className="bg-[#1a1a2e] rounded-lg p-3 border border-green-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-medium">EASY</span>
                <span className="text-green-400 text-2xl">👽</span>
              </div>
              <div className="text-xs text-gray-300 mb-1">Large, obvious figures</div>
              <div className="text-green-400 font-bold">+10 points</div>
            </div>

            {/* Medium Impostors */}
            <div className="bg-[#1a1a2e] rounded-lg p-3 border border-yellow-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 font-medium">MEDIUM</span>
                <span className="text-yellow-400 text-2xl">👽</span>
              </div>
              <div className="text-xs text-gray-300 mb-1">Smaller, partially hidden</div>
              <div className="text-yellow-400 font-bold">+25 points</div>
            </div>

            {/* Hard Impostors */}
            <div className="bg-[#1a1a2e] rounded-lg p-3 border border-red-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-red-400 font-medium">HARD</span>
                <span className="text-red-400 text-2xl">👽</span>
              </div>
              <div className="text-xs text-gray-300 mb-1">Very small, well hidden</div>
              <div className="text-red-400 font-bold">+50 points</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm text-[#0ea5e9]">{foundCount}/{totalCount} found</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-[#0ea5e9] h-2 rounded-full transition-all duration-300"
                style={{ width: `${(foundCount / totalCount) * 100}%` }}
              />
            </div>
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