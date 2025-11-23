export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trackUri, playlistId, playlistName } = req.body;

if (!trackUri || !playlistId) {
  return res.status(400).json({ error: 'Missing trackUri or playlistId' });
}

// Get stored token from memory or environment
let USER_ACCESS_TOKEN = global.spotifyToken?.access_token || process.env.SPOTIFY_USER_TOKEN;
// Check if token is expired (if we have expiry info)
    if (global.spotifyToken && global.spotifyToken.expires_at < Date.now()) {
      USER_ACCESS_TOKEN = null;
    }

if (!USER_ACCESS_TOKEN) {
  return res.status(401).json({ 
    error: 'User authorization required', 
    message: 'Please complete OAuth flow first to get user access token',
    authUrl: `https://accounts.spotify.com/authorize?client_id=ef6658e9c39d405099a8c4d7eee3c1a5&response_type=code&redirect_uri=https://my-spotify-o-auth-flow.vercel.app/api/spotify-callback&scope=playlist-modify-public%20playlist-modify-private`,
    tokenExpired: global.spotifyToken ? true : false
  });
}

// Extract track ID and format
let trackId;
if (trackUri.includes('spotify:track:')) {
  trackId = trackUri.split('spotify:track:')[1];
} else if (trackUri.includes('open.spotify.com/')) {
  trackId = trackUri.split('/track/')[1].split('?')[0];
}

if (!trackId) {
  return res.status(400).json({ error: 'Invalid Spotify URI format' });
}

const trackUriFormatted = `spotify:track:${trackId}`;

// Add track to playlist using USER token
const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${USER_ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    uris: [trackUriFormatted]
  })
});

const result = await response.json();

if (!response.ok) {
  return res.status(response.status).json({ 
    error: 'Spotify API error', 
    details: result 
  });
}

return res.status(200).json({
  success: true,
  trackId,
  trackUri: trackUriFormatted,
  playlistId,
  playlistName,
  spotifyResponse: result
});

  
} catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
