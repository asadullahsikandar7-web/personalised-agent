import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import WebView from 'react-native-webview';

interface YoutubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  onEnded?: () => void;
}

function buildPlayerHtml(videoId: string, autoplay: boolean): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    html, body { margin: 0; padding: 0; background: #000; overflow: hidden; }
    #player { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="player"></div>
  <script>
    function report(msg) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', msg: String(msg) })); } catch (e) {}
    }
    window.onerror = function (message, source, lineno, colno) {
      report('JS error: ' + message + ' @' + lineno + ':' + colno);
    };
    report('booting, loading iframe_api...');
    var apiReadyTimeout = setTimeout(function () {
      report('TIMEOUT: onYouTubeIframeAPIReady never fired after 8s - iframe_api script likely blocked/failed to load');
    }, 8000);
  </script>
  <script src="https://www.youtube.com/iframe_api" onerror="report('FAILED to load https://www.youtube.com/iframe_api script tag')"></script>
  <script>
    var player;
    function onYouTubeIframeAPIReady() {
      clearTimeout(apiReadyTimeout);
      report('onYouTubeIframeAPIReady fired, creating player for ${videoId}');
      player = new YT.Player('player', {
        videoId: '${videoId}',
        playerVars: { autoplay: ${autoplay ? 1 : 0}, playsinline: 1, controls: 1, rel: 0, origin: 'https://www.youtube.com' },
        events: {
          onReady: function () { report('player onReady'); },
          onError: function (event) { report('player onError code=' + event.data); },
          onStateChange: function (event) {
            report('player state=' + event.data);
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'stateChange', state: event.data }));
          },
        },
      });
    }
    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (!player || !player[data.command]) return;
        player[data.command]();
      } catch (e) {
        report('handleMessage error: ' + e.message);
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Real playback of a YouTube video via the official IFrame Player API - the only way to play
 * actual YouTube audio/video that respects YouTube's Terms of Service (extracting raw streams
 * outside the official player does not). This is the audio pipeline for the 'youtube'
 * MusicProvider: the backend tracks *what* should be playing (currentTrack, state); this
 * component mirrors that by loading/playing/pausing the real player.
 *
 * Shows a debug line below the player (last postMessage from the embedded page) - remove once
 * playback is confirmed stable; it's here to diagnose WebView/IFrame-API load issues without
 * needing remote JS debugging.
 */
export function YoutubePlayer({ videoId, isPlaying, onEnded }: YoutubePlayerProps) {
  const webViewRef = useRef<WebView>(null);
  const lastVideoId = useRef(videoId);
  const [debugMsg, setDebugMsg] = useState<string>('');

  useEffect(() => {
    if (lastVideoId.current === videoId) {
      webViewRef.current?.postMessage(JSON.stringify({ command: isPlaying ? 'playVideo' : 'pauseVideo' }));
    }
    lastVideoId.current = videoId;
  }, [isPlaying, videoId]);

  return (
    <View style={{ width: '100%' }}>
      <View style={{ width: '100%', height: 200, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' }}>
        <WebView
          key={videoId}
          ref={webViewRef}
          source={{ html: buildPlayerHtml(videoId, isPlaying), baseUrl: 'https://www.youtube.com' }}
          originWhitelist={['*']}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          onError={(e) => setDebugMsg(`WebView onError: ${JSON.stringify(e.nativeEvent)}`)}
          onHttpError={(e) => setDebugMsg(`WebView onHttpError: ${JSON.stringify(e.nativeEvent)}`)}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'debug') setDebugMsg(data.msg);
              if (data.type === 'stateChange' && data.state === 0) onEnded?.();
            } catch {
              // ignore malformed bridge messages
            }
          }}
        />
      </View>
      {debugMsg ? <Text style={{ fontSize: 11, color: '#8B8D98', marginTop: 4 }}>{debugMsg}</Text> : null}
    </View>
  );
}
