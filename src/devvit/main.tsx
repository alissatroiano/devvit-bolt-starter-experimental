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
      try {
        return (await context.reddit.getCurrentUsername()) ?? 'anon';
      } catch (error) {
        console.error('Error getting username:', error);
        return 'anon';
      }
    });

    const webView = useWebView({
      // URL of your web view content
      url: 'index.html',

      // Handle messages sent from the web view (if needed)
      async onMessage(message, _webView) {
        console.log('Message from webview:', message);
        try {
          // Handle any messages from the webview if needed
          if (message.type === 'GAME_COMPLETED') {
            context.ui.showToast('Game completed! Score: ' + message.score);
          }
        } catch (error) {
          console.error('Error handling webview message:', error);
        }
      },
      onUnmount() {
        try {
          context.ui.showToast('Game closed! Thanks for playing!');
        } catch (error) {
          console.error('Error on webview unmount:', error);
        }
      },
    });
    const url = 'https://bolt.new/~/github-qben3rsr';


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

            {/* Action buttons */}
            <vstack gap="medium" alignment="start">
              <button 
                onPress={() => {
                  try {
                    webView.mount();
                  } catch (error) {
                    console.error('Error mounting webview:', error);
                    context.ui.showToast('Error loading game. Please try again.');
                  }
                }}
                appearance="primary"
                size="large"
              >
                🎮 PLAY GAME
              </button>
              
              <button 
                onPress={() => {
                  context.ui.showToast('🎯 Find all hidden alien impostors in the crowd!\n⏱️ You have 2 minutes to find them all\n🏆 Score points for each impostor found\n💡 Look carefully - some are well hidden!');
                }}
                appearance="secondary"
                size="medium"
              >
                📖 HOW TO PLAY
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
            
             <button onPress:context.ui.navigateTo(url)>
          
                      <image
              url="bolt-black.png"
              description="bolt"
              imageHeight={100}
              imageWidth={100}
              height="100px"
              width="100px"
            />
          </button>
          </hstack>

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
        preview: <Preview text="🎮 Click PLAY GAME to start hunting for alien impostors!" />,
      });
      
      ui.showToast({ text: 'Created Reddimposters game!' });
      ui.navigateTo(post.url);
    } catch (error) {
      if (post) {
        try {
          await post.remove(false);
        } catch (removeError) {
          console.error('Error removing post:', removeError);
        }
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