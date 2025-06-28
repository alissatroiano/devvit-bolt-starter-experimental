import { Devvit, useState, useWebView } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
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

    // Load saved game result
    const [gameResult] = useState(async () => {
      try {
        // In a real implementation, you'd load this from Redis
        // For now, we'll show a placeholder
        return null;
      } catch {
        return null;
      }
    });

    const webView = useWebView({
      // URL of your web view content
      url: 'index.html',

      // Handle messages sent from the web view (if needed)
      async onMessage(message, _webView) {
        // Handle any messages from the webview if needed
        console.log('Message from webview:', message);
      },
      onUnmount() {
        context.ui.showToast('Game closed! Your score has been saved.');
      },
    });

    // Render the custom post type
    return (
      <zstack width={'100%'} height={'100%'} backgroundColor="#000000">
        {/* Background with gradient effect */}
        <vstack width={'100%'} height={'100%'} backgroundColor="#1a1a2e" />
        
        {/* Main content */}
        <hstack width={'100%'} height={'100%'} alignment="center middle" gap="large" padding="large">
          {/* Left side - Text content */}
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

            <spacer size="large" />

            {/* Game stats if available */}
            {gameResult && (
              <vstack gap="small" alignment="start">
                <text size="medium" weight="bold" color="#ffd700">Last Game:</text>
                <text size="small" color="#ffffff">Score: {gameResult.score}</text>
                <text size="small" color="#ffffff">Time: {gameResult.time}s</text>
              </vstack>
            )}

            {/* Action buttons */}
            <vstack gap="medium" alignment="start">
              <button 
                onPress={() => webView.mount()}
                appearance="primary"
                size="large"
              >
                PLAY
              </button>
              
              <button 
                onPress={() => {
                  context.ui.showToast('Game Rules: Find all 3 hidden alien impostors in the crowd! You have 2 minutes. Each impostor is worth 100 points plus time bonus!');
                }}
                appearance="secondary"
                size="medium"
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
        
        <vstack alignment="top end" padding="medium">
          <hstack alignment="center middle" backgroundColor="#ffd700" cornerRadius="full" width="60px" height="60px">
            <text color="#000000" size="small" weight="bold">BOLT</text>
          </hstack>
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
  label: '[Reddimposters] New Game',
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