import React, { useState, useRef, useCallback } from 'react';

interface Impostor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  image: string;
  found: boolean;
}

interface GameState {
  phase: 'start' | 'playing' | 'ended';
  timeLeft: number;
  score: number;
  foundImpostors: string[];
  startTime?: number;
  endTime?: number;
}

interface GameBoardProps {
  gameState: GameState;
  impostors: Impostor[];
  onFindImpostor: (x: number, y: number) => { found: boolean; impostor?: Impostor; score: number };
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  impostors,
  onFindImpostor,
}) => {
  const [clicking, setClicking] = useState(false);
  const [lastClick, setLastClick] = useState<{ x: number; y: number } | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ impostor: Impostor; x: number; y: number } | null>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (clicking || gameState.phase !== 'playing') return;

    setClicking(true);
    
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    setLastClick({ x: event.clientX - rect.left, y: event.clientY - rect.top });

    const result = onFindImpostor(x, y);
    
    if (result.found && result.impostor) {
      setShowSuccess({
        impostor: result.impostor,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
      
      setTimeout(() => setShowSuccess(null), 2000);
    }

    setClicking(false);
    setTimeout(() => setLastClick(null), 500);
  }, [clicking, gameState.phase, onFindImpostor]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const foundCount = gameState.foundImpostors.length;
  const totalCount = impostors.length;

  return (
    <div className="h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-4 flex items-center justify-between border-b border-purple-500/30 shadow-lg">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-purple-400 bg-clip-text text-transparent">
            REDDIMPOSTERS
          </h1>
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 rounded-lg text-sm font-bold shadow-lg">
              {foundCount}/{totalCount} FOUND
            </div>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2 rounded-lg font-bold shadow-lg">
              {gameState.score} PTS
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`px-4 py-2 rounded-lg font-bold shadow-lg ${
            gameState.timeLeft <= 30 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' 
              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
          }`}>
            ⏱️ {formatTime(gameState.timeLeft)}
          </div>
        </div>
      </div>

      {/* Main Game Canvas */}
      <div className="flex-1 relative overflow-hidden" ref={gameAreaRef} onClick={handleClick}>
        {/* Background crowd scene */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900">
          {/* Generate crowd of people */}
          {Array.from({ length: 200 }, (_, i) => (
            <div
              key={`person_${i}`}
              className="absolute text-gray-300 cursor-pointer select-none"
              style={{
                left: `${Math.random() * 95}%`,
                top: `${Math.random() * 95}%`,
                fontSize: `${0.8 + Math.random() * 1.2}rem`,
                transform: 'translate(-50%, -50%)',
                zIndex: Math.floor(Math.random() * 10),
                filter: `brightness(${0.6 + Math.random() * 0.4})`,
              }}
            >
              {['🧑', '👩', '👨', '🧑‍💼', '👩‍💼', '👨‍💼', '🧑‍🎓', '👩‍🎓'][Math.floor(Math.random() * 8)]}
            </div>
          ))}

          {/* Hidden impostors */}
          {impostors.map((impostor) => (
            <div
              key={impostor.id}
              className={`absolute transition-all duration-200 select-none ${
                gameState.foundImpostors.includes(impostor.id) ? 'opacity-50 grayscale' : ''
              }`}
              style={{
                left: `${impostor.x}%`,
                top: `${impostor.y}%`,
                width: `${impostor.width}px`,
                height: `${impostor.height}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: gameState.foundImpostors.includes(impostor.id) ? 1000 : Math.floor(Math.random() * 50),
              }}
            >
              <img
                src={impostor.image}
                alt="Hidden Impostor"
                className="w-full h-full object-contain"
                style={{
                  filter: gameState.foundImpostors.includes(impostor.id) 
                    ? 'grayscale(100%) brightness(0.5)' 
                    : 'drop-shadow(0 0 10px rgba(0, 255, 0, 0.3))'
                }}
              />
              
              {/* Found marker */}
              {gameState.foundImpostors.includes(impostor.id) && (
                <div className="absolute inset-0 border-4 border-green-400 bg-green-400 bg-opacity-20 rounded-lg flex items-center justify-center">
                  <div className="text-green-400 font-bold text-2xl">✓</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Click feedback */}
        {lastClick && (
          <div
            className="absolute w-12 h-12 border-4 border-cyan-400 rounded-full animate-ping pointer-events-none"
            style={{
              left: lastClick.x - 24,
              top: lastClick.y - 24,
              zIndex: 1001,
            }}
          />
        )}

        {/* Success animation */}
        {showSuccess && (
          <div
            className="absolute z-[1002] pointer-events-none"
            style={{
              left: showSuccess.x - 60,
              top: showSuccess.y - 40,
            }}
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg font-bold animate-bounce shadow-2xl border border-green-300">
              🎉 Impostor Found! +100 points!
            </div>
          </div>
        )}

        {/* Scanning overlay effect */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse opacity-30" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse opacity-30" />
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-red-400 to-transparent animate-pulse opacity-30" />
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent animate-pulse opacity-30" />
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border-t border-purple-500/30 p-6 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              🎯 HUNT PROGRESS
            </h2>
            <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg">
              Click on the hidden alien impostors in the crowd!
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-cyan-400">🔍 ALIENS CAPTURED</span>
              <span className="text-lg font-bold text-cyan-400">{foundCount}/{totalCount}</span>
            </div>
            <div className="relative w-full bg-gray-700 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${(foundCount / totalCount) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Hunt Started</span>
              <span>{Math.round((foundCount / totalCount) * 100)}% Complete</span>
              <span>Victory</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};