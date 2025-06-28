import { Devvit, useState, useWebView } from '@devvit/public-api';

Devvit.configure({
  redditAPI: true,
  redis: true,
});

export const Preview: Devvit.BlockComponent<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <zstack width={'100%'} height={'100%'} alignment="center middle">
      <vstack width={'100%'} height={'100%'} alignment="center middle">
        <text size="large" weight="bold" alignment="center middle" wrap>
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
        context.ui.showToast('Game closed! Check back for your results.');
      },
    });

    // Render the custom post type with completely simplified design
    return (
      <zstack width={'100%'} height={'100%'} backgroundColor="#1a1a2e">
        {/* Main content */}
        <hstack width={'100%'} height={'100%'} alignment="center middle" gap="large" padding="large">
          {/* Left side - Text content */}
          <vstack alignment="start middle" gap="medium" grow>
            {/* Title */}
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

            {/* Action buttons */}
            <vstack gap="medium" alignment="start">
              <button 
                onPress={() => webView.mount()}
                appearance="primary"
                size="large"
                backgroundColor="#ffd700"
                textColor="#000000"
              >
                🚀 START HUNTING
              </button>
              
              <button 
                onPress={() => {
                  context.ui.showToast('Find all 3 hidden alien impostors in the crowd! Base: +100pts per impostor, Time bonus, Completion bonus. You have 5 minutes!');
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

          {/* Right side - Simple character illustration using text */}
          <vstack alignment="center middle" width="200px" height="300px">
            {/* Large alien character using emoji */}
            <vstack alignment="center middle" backgroundColor="#ffd700" cornerRadius="full" width="150px" height="150px">
              <text size="xxlarge">👽</text>
            </vstack>
            
            <spacer size="medium" />
            
            {/* Decorative elements */}
            <hstack gap="large" alignment="center" width="100%">
              <text color="#ff4444" size="large">✦</text>
              <text color="#ffd700" size="large">✦</text>
              <text color="#ff4444" size="large">✦</text>
            </hstack>
          </vstack>
        </hstack>

        {/* Corner decorations using simple text */}
        <vstack alignment="top start" padding="medium">
          <text color="#ff4444" size="large">✦</text>
        </vstack>
        
        <vstack alignment="top end" padding="medium">
          <hstack alignment="center middle" backgroundColor="#ffd700" cornerRadius="full" width="80px" height="80px">
            <text color="#000000" size="medium" weight="bold">BOLT</text>
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
        preview: <Preview text="Click START HUNTING to begin your alien hunt!" />,
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