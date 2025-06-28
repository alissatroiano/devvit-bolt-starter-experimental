import { Devvit, useState, useWebView } from '@devvit/public-api';

// Side effect import to bundle the server. The /index is required for server splitting.
import '../server/index';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

export const Preview: Devvit.BlockComponent<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <zstack width={'100%'} height={'100%'} alignment="center middle">
      <vstack width={'100%'} height={'100%'} alignment="center middle">
        <image
          url="loading.gif"
          description="Loading..."
          height={'140px'}
          width={'140px'}
          imageHeight={'240px'}
          imageWidth={'240px'}
        />
        <spacer size="small" />
        <text maxWidth={`80%`} size="large" weight="bold" alignment="center middle" wrap>
          {text}
        </text>
      </vstack>
    </zstack>
  );
};

// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: 'Find the Impostors Game',
  height: 'tall',
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      return (await context.reddit.getCurrentUsername()) ?? 'anon';
    });

    // Load user's best game result
    const [userResult] = useState(async () => {
      try {
        const userId = context.userId;
        if (!userId) return null;
        
        const resultData = await context.redis.get(`reddimposters:result:${userId}`);
        return resultData ? JSON.parse(resultData) : null;
      } catch {
        return null;
      }
    });

    // Load community leaderboard using sorted sets
    const [leaderboard] = useState(async () => {
      try {
        // Get top 10 players from the sorted set (highest scores first)
        const topPlayers = await context.redis.zRange('reddimposters:leaderboard', 0, 9, { 
          by: 'rank',
          reverse: true 
        });
        
        // Get detailed info for each player
        const leaderboardWithDetails = await Promise.all(
          topPlayers.map(async (entry) => {
            try {
              const playerData = await context.redis.get(`reddimposters:player:${entry.member}`);
              const details = playerData ? JSON.parse(playerData) : null;
              
              return {
                userId: entry.member,
                username: details?.username || 'Unknown Player',
                score: entry.score,
                timeUsed: details?.timeUsed || 0,
                impostorsFound: details?.impostorsFound || 0,
                totalImpostors: details?.totalImpostors || 3,
                isComplete: details?.isComplete || false,
                completedAt: details?.completedAt || 0
              };
            } catch {
              return {
                userId: entry.member,
                username: 'Unknown Player',
                score: entry.score,
                timeUsed: 0,
                impostorsFound: 0,
                totalImpostors: 3,
                isComplete: false,
                completedAt: 0
              };
            }
          })
        );
        
        return leaderboardWithDetails;
      } catch (error) {
        console.error('Error loading leaderboard:', error);
        return [];
      }
    });

    const webView = useWebView({
      // URL of your web view content
      url: 'index.html',

      // Handle messages sent from the web view
      async onMessage(message, webView) {
        if (message.type === 'GAME_COMPLETED') {
          try {
            const { score, timeUsed, impostorsFound, totalImpostors } = message.data;
            const userId = context.userId;
            const currentUsername = await context.reddit.getCurrentUsername();
            
            if (!userId || !currentUsername) return;

            // Save detailed player data
            const gameResult = {
              username: currentUsername,
              score,
              timeUsed,
              impostorsFound,
              totalImpostors,
              completedAt: Date.now(),
              isComplete: impostorsFound === totalImpostors
            };

            await context.redis.set(`reddimposters:player:${userId}`, JSON.stringify(gameResult));
            await context.redis.set(`reddimposters:result:${userId}`, JSON.stringify(gameResult));

            // Update leaderboard using sorted set
            // Use score as the sort value, with a tie-breaker for completion time
            let sortScore = score;
            
            // For completed games, add a small bonus based on speed (faster = higher score)
            if (gameResult.isComplete) {
              // Add completion bonus and speed bonus (max 300 seconds = 300 bonus points)
              const speedBonus = Math.max(0, 300 - timeUsed);
              sortScore = score + speedBonus;
            }

            // Add player to leaderboard sorted set
            await context.redis.zAdd('reddimposters:leaderboard', {
              member: userId,
              score: sortScore
            });

            // Get player's rank
            const rank = await context.redis.zRank('reddimposters:leaderboard', userId, { reverse: true });
            const totalPlayers = await context.redis.zCard('reddimposters:leaderboard');

            context.ui.showToast(`Game saved! Score: ${score} points (Rank: ${(rank || 0) + 1}/${totalPlayers})`);
          } catch (error) {
            console.error('Error saving game result:', error);
            context.ui.showToast('Error saving game result');
          }
        }
      },
      onUnmount() {
        context.ui.showToast('Game closed! Your results are saved.');
      },
    });

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get user's current rank if they have a score
    const [userRank] = useState(async () => {
      try {
        const userId = context.userId;
        if (!userId) return null;
        
        const rank = await context.redis.zRank('reddimposters:leaderboard', userId, { reverse: true });
        const totalPlayers = await context.redis.zCard('reddimposters:leaderboard');
        
        return rank !== null ? { rank: rank + 1, total: totalPlayers } : null;
      } catch {
        return null;
      }
    });

    // Render the custom post type with logo in top right
    return (
      <zstack width={'100%'} height={'100%'} backgroundColor="#000000">
        {/* Background with gradient effect */}
        <vstack width={'100%'} height={'100%'} backgroundColor="#1a1a2e" />
        
        {/* Logo in top right corner */}
        <vstack alignment="top end" padding="medium">
          <image
            url="logo.png"
            description="Bolt.new Logo"
            width="80px"
            height="80px"
            imageWidth="360px"
            imageHeight="360px"
          />
        </vstack>
        
        {/* Main content */}
        <hstack width={'100%'} height={'100%'} alignment="center middle" gap="large" padding="large">
          {/* Left side - Text content and results */}
          <vstack alignment="start middle" gap="medium" grow>
            {/* Title with red accent */}
            <vstack alignment="start" gap="small">
              <text size="xxlarge" weight="bold" color="#ff4444">
                Reddimposters
              </text>
              <hstack gap="small" alignment="center">
                <text size="large" color="#ffffff">find the</text>
                <text size="large" weight="bold" color="#ffd700">impostors</text>
              </hstack>
              <hstack gap="small" alignment="center">
                <text size="large" color="#ffffff">among us on</text>
                <text size="large" weight="bold" color="#ff4444">reddit</text>
              </hstack>
            </vstack>

            <spacer size="medium" />

            {/* User's best result */}
            {userResult && (
              <vstack gap="small" alignment="start" backgroundColor="#16213e" cornerRadius="medium" padding="medium" width="100%">
                <hstack gap="medium" alignment="center">
                  <text size="medium" weight="bold" color="#ffd700">🏆 Your Best Score</text>
                  {userRank && (
                    <text size="small" color="#888888">
                      Rank #{userRank.rank} of {userRank.total}
                    </text>
                  )}
                </hstack>
                <hstack gap="large" alignment="center">
                  <vstack alignment="center">
                    <text size="large" weight="bold" color="#ffffff">{userResult.score}</text>
                    <text size="small" color="#888888">Points</text>
                  </vstack>
                  <vstack alignment="center">
                    <text size="large" weight="bold" color="#ffffff">{userResult.impostorsFound}/{userResult.totalImpostors}</text>
                    <text size="small" color="#888888">Found</text>
                  </vstack>
                  <vstack alignment="center">
                    <text size="large" weight="bold" color="#ffffff">{formatTime(userResult.timeUsed)}</text>
                    <text size="small" color="#888888">Time</text>
                  </vstack>
                  {userResult.isComplete && (
                    <text size="small" color="#00ff00">✓ Complete</text>
                  )}
                </hstack>
              </vstack>
            )}

            {/* Community leaderboard */}
            {leaderboard && leaderboard.length > 0 && (
              <vstack gap="small" alignment="start" backgroundColor="#16213e" cornerRadius="medium" padding="medium" width="100%">
                <text size="medium" weight="bold" color="#ffd700">🌟 Community Leaders</text>
                {leaderboard.slice(0, 5).map((entry: any, index: number) => (
                  <hstack key={entry.userId} gap="medium" alignment="center" width="100%">
                    <text size="medium" color="#ffd700" weight="bold">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </text>
                    <text size="small" color="#ffffff" grow>
                      {entry.username}
                    </text>
                    <text size="small" color="#ffffff" weight="bold">
                      {entry.score}
                    </text>
                    {entry.isComplete && (
                      <text size="small" color="#00ff00">✓</text>
                    )}
                  </hstack>
                ))}
                {leaderboard.length > 5 && (
                  <text size="small" color="#888888">
                    +{leaderboard.length - 5} more players
                  </text>
                )}
              </vstack>
            )}

            <spacer size="medium" />

            {/* Action buttons */}
            <vstack gap="medium" alignment="start">
              <button 
                onPress={() => webView.mount()}
                appearance="primary"
                size="large"
                backgroundColor="#ffd700"
                textColor="#000000"
              >
                {userResult ? '🎯 BEAT YOUR SCORE' : '🚀 START HUNTING'}
              </button>
              
              <button 
                onPress={() => {
                  context.ui.showToast('Game Rules: Find all 3 hidden alien impostors in the crowd! Base: +100pts per impostor, Time bonus: +1pt per second left, Completion bonus: +2pts per second remaining. You have 5 minutes!');
                }}
                appearance="secondary"
                size="medium"
                backgroundColor="#333333"
                textColor="#ffffff"
              >
                HOW TO PLAY
              </button>
            </vstack>

            <spacer size="small" />
            
            {/* Player info */}
            <text size="small" color="#888888">
              Playing as {username ?? 'Player'}
            </text>
          </vstack>

          {/* Right side - Character illustration */}
          <vstack alignment="center middle" width="200px" height="300px">
            {/* Large alien character */}
            <vstack alignment="center middle" backgroundColor="#ffd700" cornerRadius="full" width="150px" height="200px">
              <text size="xxlarge" color="#000000">👽</text>
            </vstack>
            
            {/* Decorative stars around */}
            <hstack gap="large" alignment="center" width="100%">
              <text color="#ff4444" size="large">✦</text>
              <spacer />
              <text color="#ffd700" size="large">✦</text>
            </hstack>
          </vstack>
        </hstack>

        {/* Decorative elements */}
        <vstack alignment="top start" padding="medium">
          <text color="#ff4444" size="large">✦</text>
        </vstack>

        <vstack alignment="bottom start" padding="medium">
          <text color="#ffd700" size="large">✦</text>
        </vstack>

        <vstack alignment="bottom end" padding="medium">
          <text color="#ff4444" size="large">✦</text>
        </vstack>
      </zstack>
    );
  },
});

// Create game posts via menu
Devvit.addMenuItem({
  label: '[Find the Impostors] New Game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;

    let post;
    try {
      const subreddit = await reddit.getCurrentSubreddit();
      post = await reddit.submitPost({
        title: 'Reddimposters - Find the Alien Impostors!',
        subredditName: subreddit.name,
        preview: <Preview text="Click PLAY to start hunting for alien impostors!" />,
      });
      
      ui.showToast({ text: 'Created Reddimposters game!' });
      ui.navigateTo(post.url);
    } catch (error) {
      if (post) {
        await post.remove(false);
      }
      if (error instanceof Error) {
        ui.showToast({ text: `Error creating game: ${error.message}` });
      } else {
        ui.showToast({ text: 'Error creating game!' });
      }
    }
  },
});

export default Devvit;