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

    const webView = useWebView({
      // URL of your web view content
      url: 'index.html',

      // Handle messages sent from the web view (if needed)
      async onMessage(message, webView) {
        // Handle any messages from the webview if needed
        console.log('Message from webview:', message);
      },
      onUnmount() {
        context.ui.showToast('Game closed!');
      },
    });

    // Render the custom post type with Figma-inspired design
    return (
      <vstack grow padding="medium" backgroundColor="#1a1a2e">
        {/* Header Section */}
        <vstack alignment="center middle" padding="large">
          <text size="xxlarge" weight="bold" color="#0ea5e9">
            FIND THE IMPOSTORS
          </text>
          <spacer size="small" />
          <text size="medium" color="#16d9e3" weight="bold">
            Hidden Object Challenge
          </text>
          <spacer size="small" />
          <text size="small" color="#888888" alignment="center">
            Scan the crowd and click on suspicious alien figures
          </text>
        </vstack>

        {/* Game Preview Visualization */}
        <vstack alignment="center middle" padding="medium">
          <hstack alignment="center middle" backgroundColor="#0f3460" cornerRadius="large" padding="large" width="90%" height="200px">
            {/* Simulated crowd scene */}
            <vstack alignment="center middle" gap="small" width="100%">
              <hstack gap="small" alignment="center">
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#ff6b6b" size="large">👽</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
              </hstack>
              <hstack gap="small" alignment="center">
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#ff6b6b" size="large">👽</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
              </hstack>
              <hstack gap="small" alignment="center">
                <text color="#ff6b6b" size="large">👽</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
              </hstack>
              <hstack gap="small" alignment="center">
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
                <text color="#ff6b6b" size="large">👽</text>
                <text color="#666">👤</text>
                <text color="#666">👤</text>
              </hstack>
            </vstack>
          </hstack>
        </vstack>

        {/* Game Stats */}
        <hstack alignment="center middle" gap="large" padding="medium">
          <vstack alignment="center middle" backgroundColor="#2d4a22" cornerRadius="medium" padding="medium" minWidth="80px">
            <text size="large" weight="bold" color="#4ade80">12</text>
            <text size="small" color="#86efac">IMPOSTORS</text>
          </vstack>
          <vstack alignment="center middle" backgroundColor="#7c2d12" cornerRadius="medium" padding="medium" minWidth="80px">
            <text size="large" weight="bold" color="#fb923c">5:00</text>
            <text size="small" color="#fdba74">TIME LIMIT</text>
          </vstack>
          <vstack alignment="center middle" backgroundColor="#1e3a8a" cornerRadius="medium" padding="medium" minWidth="80px">
            <text size="large" weight="bold" color="#60a5fa">∞</text>
            <text size="small" color="#93c5fd">PLAYERS</text>
          </vstack>
        </hstack>

        {/* Difficulty Levels */}
        <vstack alignment="start" padding="medium" backgroundColor="#2a2a3e" cornerRadius="medium" gap="small">
          <text size="medium" weight="bold" color="#ffffff">Difficulty Levels:</text>
          <hstack gap="medium" alignment="center">
            <vstack alignment="center" backgroundColor="#2d4a22" cornerRadius="small" padding="small" minWidth="60px">
              <text color="#4ade80" size="large">👽</text>
              <text size="small" color="#4ade80" weight="bold">EASY</text>
              <text size="small" color="#86efac">+10pts</text>
            </vstack>
            <vstack alignment="center" backgroundColor="#7c2d12" cornerRadius="small" padding="small" minWidth="60px">
              <text color="#fb923c" size="large">👽</text>
              <text size="small" color="#fb923c" weight="bold">MEDIUM</text>
              <text size="small" color="#fdba74">+25pts</text>
            </vstack>
            <vstack alignment="center" backgroundColor="#7c2d12" cornerRadius="small" padding="small" minWidth="60px">
              <text color="#ef4444" size="large">👽</text>
              <text size="small" color="#ef4444" weight="bold">HARD</text>
              <text size="small" color="#fca5a5">+50pts</text>
            </vstack>
          </hstack>
        </vstack>

        {/* Instructions */}
        <vstack alignment="start" padding="medium" backgroundColor="#16213e" cornerRadius="medium" gap="small">
          <text size="medium" weight="bold" color="#0ea5e9">How to Play:</text>
          <hstack gap="small">
            <text color="#0ea5e9">🔍</text>
            <text size="small" color="#cccccc">Scan the crowd to find hidden alien impostors</text>
          </hstack>
          <hstack gap="small">
            <text color="#0ea5e9">⚡</text>
            <text size="small" color="#cccccc">Click quickly for speed bonuses</text>
          </hstack>
          <hstack gap="small">
            <text color="#0ea5e9">🏆</text>
            <text size="small" color="#cccccc">Compete with other players for high score</text>
          </hstack>
        </vstack>

        {/* Play Button */}
        <vstack alignment="center middle" padding="large">
          <button 
            onPress={() => webView.mount()}
            appearance="primary"
            size="large"
          >
            🚀 START HUNTING
          </button>
          <spacer size="small" />
          <text size="small" color="#888888">
            Playing as {username ?? 'Player'}
          </text>
        </vstack>
      </vstack>
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
        title: 'Find the Impostors - Hidden Object Challenge',
        subredditName: subreddit.name,
        preview: <Preview text="Click START HUNTING to begin the challenge!" />,
      });
      
      ui.showToast({ text: 'Created Find the Impostors game!' });
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