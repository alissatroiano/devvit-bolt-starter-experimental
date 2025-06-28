import React, { useRef } from 'react';

interface Impostor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  found: boolean;
}

interface GameState {
  phase: 'menu' | 'playing' | 'ended';
  timeLeft: number;
  score: number;
  impostors: Impostor[];
  startTime?: number;
  endTime?: number;
}

interface GameBoardProps {
  gameState: GameState;
  onFindImpostor: (x: number, y: number) => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, onFindImpostor }) => {
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!gameAreaRef.current) return;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    onFindImpostor(x, y);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const foundCount = gameState.impostors.filter(imp => imp.found).length;
  const totalCount = gameState.impostors.length;

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-6">
          <h1 className="text-2xl font-bold text-red-400">REDDIMPOSTERS</h1>
          <div className="flex items-center space-x-4">
            <div className="bg-blue-600 px-4 py-2 rounded-lg font-bold">
              {foundCount}/{totalCount} FOUND
            </div>
            <div className="bg-green-600 px-4 py-2 rounded-lg font-bold">
              {gameState.score} PTS
            </div>
          </div>
        </div>
        
        <div className={`px-4 py-2 rounded-lg font-bold ${
          gameState.timeLeft <= 30 
            ? 'bg-red-600 animate-pulse' 
            : 'bg-yellow-600'
        }`}>
          ⏱️ {formatTime(gameState.timeLeft)}
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={gameAreaRef}
        className="flex-1 relative cursor-crosshair overflow-hidden"
        onClick={handleClick}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)
          `,
          backgroundColor: '#1f2937'
        }}
      >
        {/* Crowd of people */}
        {Array.from({ length: 200 }, (_, i) => (
          <div
            key={`person_${i}`}
            className="absolute text-2xl select-none pointer-events-none"
            style={{
              left: `${Math.random() * 95}%`,
              top: `${Math.random() * 95}%`,
              transform: 'translate(-50%, -50%)',
              opacity: 0.7 + Math.random() * 0.3,
              fontSize: `${1 + Math.random() * 1}rem`,
            }}
          >
            {['🧑', '👩', '👨', '🧑‍💼', '👩‍💼', '👨‍💼'][Math.floor(Math.random() * 6)]}
          </div>
        ))}

        {/* Impostors */}
        {gameState.impostors.map((impostor) => (
          <div
            key={impostor.id}
            className={`absolute text-4xl select-none pointer-events-none transition-all duration-300 ${
              impostor.found ? 'opacity-30 scale-110' : 'hover:scale-110'
            }`}
            style={{
              left: `${impostor.x}%`,
              top: `${impostor.y}%`,
              width: `${impostor.width}px`,
              height: `${impostor.height}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <span className={impostor.found ? 'grayscale' : 'text-green-400'}>
              👽
            </span>
            {impostor.found && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold">
                  ✓
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Scanning lines for atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse opacity-30" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse opacity-30" />
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="text-center">
          <p className="text-gray-300 mb-2">
            🔍 Click on the alien impostors hidden in the crowd!
          </p>
          <div className="flex justify-center space-x-8 text-sm">
            <span className="text-green-400">👽 = Alien Impostor (+100 pts)</span>
            <span className="text-blue-400">🧑 = Human (ignore)</span>
          </div>
        </div>
      </div>
    </div>
  );
};