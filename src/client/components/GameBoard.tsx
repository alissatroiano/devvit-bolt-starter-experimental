import React, { useState, useRef, useCallback } from 'react';
import { GameState, Player, Impostor } from '../../shared/types/game';
import { CrowdScene } from './CrowdScene';

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

  const handlePersonClick = useCallback(async (x: number, y: number) => {
    if (clicking || gameState.phase !== 'playing') return;

    setClicking(true);
    
    // Visual feedback
    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (rect) {
      setLastClick({ 
        x: (x / 100) * rect.width, 
        y: (y / 100) * rect.height 
      });
    }

    try {
      const result = await onFindImpostor(x, y);
      
      if (result.found && result.impostor && rect) {
        setShowSuccess({
          impostor: result.impostor,
          x: (x / 100) * rect.width,
          y: (y / 100) * rect.height,
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
              {currentPlayer?.score || 0} PTS
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className={`px-4 py-2 rounded-lg font-bold shadow-lg ${
            timeLeft <= 30 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 animate-pulse' 
              : 'bg-gradient-to-r from-yellow-500 to-orange-500'
          }`}>
            ⏱️ {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded-lg">
            👤 {currentPlayer?.username}
          </div>
        </div>
      </div>

      {/* Main Game Canvas */}
      <div className="flex-1 relative" ref={gameAreaRef}>
        <CrowdScene
          impostors={gameState.impostors}
          onPersonClick={handlePersonClick}
          foundImpostors={currentPlayer?.foundImpostors || []}
        />

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
              🎉 +{showSuccess.impostor.difficulty === 'easy' ? 10 : 
                     showSuccess.impostor.difficulty === 'medium' ? 25 : 50} points!
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

      {/* Bottom Panel - Enhanced UI */}
      <div className="bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border-t border-purple-500/30 p-6 shadow-2xl">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              🎯 TARGET IDENTIFICATION
            </h2>
            <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-2 rounded-lg">
              Click on suspicious alien figures in the crowd
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Easy Impostors */}
            <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-4 border border-green-500/50 shadow-lg hover:shadow-green-500/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-green-400 font-bold text-lg">EASY</span>
                <span className="text-3xl">👽</span>
              </div>
              <div className="text-sm text-gray-300 mb-2">Large, obvious alien figures</div>
              <div className="text-green-400 font-bold text-xl">+10 POINTS</div>
              <div className="text-xs text-green-300 mt-1">Easy to spot, good for beginners</div>
            </div>

            {/* Medium Impostors */}
            <div className="bg-gradient-to-br from-yellow-900/50 to-orange-800/30 rounded-xl p-4 border border-yellow-500/50 shadow-lg hover:shadow-yellow-500/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-yellow-400 font-bold text-lg">MEDIUM</span>
                <span className="text-3xl">👽</span>
              </div>
              <div className="text-sm text-gray-300 mb-2">Smaller, partially hidden</div>
              <div className="text-yellow-400 font-bold text-xl">+25 POINTS</div>
              <div className="text-xs text-yellow-300 mt-1">Requires careful observation</div>
            </div>

            {/* Hard Impostors */}
            <div className="bg-gradient-to-br from-red-900/50 to-pink-800/30 rounded-xl p-4 border border-red-500/50 shadow-lg hover:shadow-red-500/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-red-400 font-bold text-lg">HARD</span>
                <span className="text-3xl">👽</span>
              </div>
              <div className="text-sm text-gray-300 mb-2">Tiny, expertly camouflaged</div>
              <div className="text-red-400 font-bold text-xl">+50 POINTS</div>
              <div className="text-xs text-red-300 mt-1">Master-level challenge</div>
            </div>
          </div>

          {/* Enhanced Progress Bar */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-600/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-lg font-bold text-cyan-400">🔍 HUNT PROGRESS</span>
              <span className="text-lg font-bold text-cyan-400">{foundCount}/{totalCount} ALIENS CAPTURED</span>
            </div>
            <div className="relative w-full bg-gray-700 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 h-4 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${(foundCount / totalCount) * 100}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Hunt Started</span>
              <span>{Math.round((foundCount / totalCount) * 100)}% Complete</span>
              <span>Victory</span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Error Display */}
      {error && (
        <div className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-red-600 to-pink-600 border border-red-400 rounded-xl text-white text-sm max-w-sm shadow-2xl animate-pulse">
          <div className="flex items-center space-x-2">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};