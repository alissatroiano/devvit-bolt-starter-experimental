import React, { useState } from 'react';
import { GameState, Player } from '../../shared/types/game';

interface DiscussionVotingProps {
  gameState: GameState;
  currentPlayer: Player | null;
  onCastVote: (targetId?: string) => Promise<void>;
  error: string;
}

export const DiscussionVoting: React.FC<DiscussionVotingProps> = ({
  gameState,
  currentPlayer,
  onCastVote,
  error,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [voting, setVoting] = useState(false);

  const alivePlayers = Object.values(gameState.players).filter(p => p.status === 'alive');
  const isDiscussion = gameState.phase === 'discussion';
  const isVoting = gameState.phase === 'voting';
  const canVote = currentPlayer?.status === 'alive' && !currentPlayer?.hasVoted;
  
  const meetingCaller = gameState.meetingCaller 
    ? gameState.players[gameState.meetingCaller]
    : null;

  const handleVote = async () => {
    if (!canVote) return;
    
    setVoting(true);
    await onCastVote(selectedTarget || undefined);
    setVoting(false);
  };

  const handleSkip = async () => {
    if (!canVote) return;
    
    setVoting(true);
    await onCastVote(undefined);
    setVoting(false);
  };

  // Count votes for display
  const voteCount = alivePlayers.reduce((acc, player) => {
    if (player.hasVoted && player.votedFor) {
      acc[player.votedFor] = (acc[player.votedFor] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const votedPlayers = alivePlayers.filter(p => p.hasVoted).length;
  const totalPlayers = alivePlayers.length;

  return (
    <div className="min-h-screen p-4 space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          {isDiscussion ? '💬 Discussion Phase' : '🗳️ Voting Phase'}
        </h1>
        
        {meetingCaller && (
          <p className="text-gray-300 mb-4">
            Emergency meeting called by <span className="font-semibold text-yellow-400">{meetingCaller.username}</span>
          </p>
        )}

        {gameState.eliminatedPlayer && (
          <div className="bg-red-600 bg-opacity-20 border border-red-500 rounded-lg p-3 mb-4">
            <p className="text-red-300">
              💀 <strong>{gameState.players[gameState.eliminatedPlayer]?.username}</strong> was found dead!
            </p>
          </div>
        )}

        <div className="flex items-center justify-center space-x-6 text-lg">
          {isDiscussion && gameState.discussionTimeLeft !== undefined && (
            <div className="text-yellow-400 font-bold">
              Discussion: {gameState.discussionTimeLeft}s
            </div>
          )}
          
          {isVoting && gameState.votingTimeLeft !== undefined && (
            <div className="text-red-400 font-bold">
              Voting: {gameState.votingTimeLeft}s
            </div>
          )}
          
          <div className="text-gray-300">
            Votes: {votedPlayers}/{totalPlayers}
          </div>
        </div>
      </div>

      {/* Discussion Phase */}
      {isDiscussion && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Discussion Time</h2>
          <div className="space-y-3">
            <p className="text-gray-300">
              🗣️ This is the time to discuss what you've seen and share suspicions.
            </p>
            <p className="text-gray-300">
              🕵️ Look for inconsistencies in stories and suspicious behavior.
            </p>
            <p className="text-gray-300">
              ⏰ Voting will begin automatically when discussion time ends.
            </p>
          </div>
        </div>
      )}

      {/* Voting Phase */}
      {isVoting && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Cast Your Vote</h2>
          
          {currentPlayer?.status === 'dead' ? (
            <div className="text-center text-gray-400">
              💀 You are dead and cannot vote
            </div>
          ) : currentPlayer?.hasVoted ? (
            <div className="text-center">
              <div className="text-green-400 font-semibold mb-2">✓ Vote Cast</div>
              <div className="text-gray-300">
                {currentPlayer.votedFor 
                  ? `You voted for ${gameState.players[currentPlayer.votedFor]?.username}`
                  : 'You skipped the vote'
                }
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3">
                {alivePlayers
                  .filter(p => p.id !== currentPlayer?.id)
                  .map((player) => (
                    <label
                      key={player.id}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTarget === player.id
                          ? 'bg-red-600 bg-opacity-20 border-red-500'
                          : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="radio"
                        name="vote"
                        value={player.id}
                        checked={selectedTarget === player.id}
                        onChange={(e) => setSelectedTarget(e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{player.username}</span>
                        {voteCount[player.id] && (
                          <span className="ml-auto text-red-400 font-bold">
                            {voteCount[player.id]} votes
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVote}
                  disabled={!selectedTarget || voting}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  {voting ? 'Voting...' : 'Vote to Eliminate'}
                </button>
                
                <button
                  onClick={handleSkip}
                  disabled={voting}
                  className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
                >
                  {voting ? 'Skipping...' : 'Skip Vote'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Players List */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-green-400">Alive Players ({alivePlayers.length})</h2>
          {alivePlayers.map((player) => (
            <div
              key={player.id}
              className={`p-4 rounded-lg border-2 ${
                player.id === currentPlayer?.id
                  ? 'bg-blue-600 bg-opacity-20 border-blue-500'
                  : 'bg-gray-700 border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {player.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-white">{player.username}</div>
                    {player.id === currentPlayer?.id && (
                      <div className="text-sm text-gray-400">(You)</div>
                    )}
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  {player.hasVoted ? (
                    <div className="text-green-400">✓ Voted</div>
                  ) : (
                    <div className="text-gray-400">Waiting...</div>
                  )}
                  {isVoting && voteCount[player.id] && (
                    <div className="text-red-400 font-bold">
                      {voteCount[player.id]} votes
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-400">Game Info</h2>
          <div className="p-4 bg-gray-700 rounded-lg space-y-2">
            <div className="text-sm">
              <span className="text-gray-400">Phase:</span>
              <span className="ml-2 font-medium text-yellow-400">
                {isDiscussion ? 'Discussion' : 'Voting'}
              </span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Players Alive:</span>
              <span className="ml-2 font-medium">{alivePlayers.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-400">Votes Cast:</span>
              <span className="ml-2 font-medium">{votedPlayers}/{totalPlayers}</span>
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