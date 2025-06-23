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

    // Render the custom post type
    return (
      <vstack grow padding="small">
        <vstack grow alignment="middle center">
          <text size="xlarge" weight="bold">
            Find the Impostors!
          </text>
          <spacer />
          <vstack alignment="start middle">
            <text size="medium">Welcome, {username ?? 'Player'}!</text>
            <spacer size="small" />
            <text size="small" color="secondary">
              🔍 Find all the hidden impostors in the crowd
            </text>
            <text size="small" color="secondary">
              ⏱️ Race against time and other players
            </text>
            <text size="small" color="secondary">
              🏆 Score points based on difficulty and speed
            </text>
          </vstack>
          <spacer />
          <button onPress={() => webView.mount()}>Launch Game</button>
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
        title: 'Find the Impostors - Hidden Object Game',
        subredditName: subreddit.name,
        preview: <Preview text="Click to start the hidden object challenge!" />,
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