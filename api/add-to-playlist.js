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
  return res.status(400).json({ 
    error: 'Missing trackUri or playlistId',
    received: { trackUri, playlistId, playlistName }
  });
}

// Spotify credentials
const CLIENT_ID = 'ef6658e9c39d405099a8c4d7eee3c1a5';
const CLIENT_SECRET = 'c8331c163eba4f8fa5c4f06737a22e3a';
let USER_ACCESS_TOKEN = process.env.SPOTIFY_USER_TOKEN;
    const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

if (!USER_ACCESS_TOKEN) {
  return res.status(401).json({ 
    error: 'User authorization required', 
    message: 'Please complete OAuth flow and set SPOTIFY_USER_TOKEN in environment variables',
    authUrl: `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https://my-spotify-o-auth-flow.vercel.app/api/spotify-callback&scope=playlist-modify-public%20playlist-modify-private&prompt=consent`
  });
}

// Extract track ID and format
let trackId;
if (trackUri.includes('spotify:track:')) {
  trackId = trackUri.split('spotify:track:')[1];
} else if (trackUri.includes('open.spotify.com/')) {
  trackId = trackUri.split('/track/')[1].split('?')[0];
} else {
  trackId = trackUri; // assume it's just the ID
}

if (!trackId) {
  return res.status(400).json({ 
    error: 'Invalid Spotify URI format',
    received: trackUri 
  });
}

const trackUriFormatted = `spotify:track:${trackId}`;

// Function to make Spotify API request
const makeSpotifyRequest = async (accessToken) => {
  return await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: [trackUriFormatted]
    })
  });
};

// First attempt with current token
let response = await makeSpotifyRequest(USER_ACCESS_TOKEN);
let result = await response.json();

// If token expired and we have a refresh token, try to refresh
if (response.status === 401 && REFRESH_TOKEN) {
  console.log('Token expired, attempting refresh...');
  
  try {
    // Refresh the access token
    const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN
      })
    });

    const tokenData = await refreshResponse.json();
    
    if (tokenData.access_token) {
      USER_ACCESS_TOKEN = tokenData.access_token;
      console.log('Token refreshed successfully');
      
      // Retry the request with new token
      response = await makeSpotifyRequest(USER_ACCESS_TOKEN);
      result = await response.json();
      
      // Log successful refresh for monitoring
      console.log('Retry with new token successful');
    } else {
      return res.status(401).json({ 
        error: 'Failed to refresh token', 
        details: tokenData,
        authUrl: `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https://my-spotify-o-auth-flow.vercel.app/api/spotify-callback&scope=playlist-modify-public%20playlist-modify-private&prompt=consent`
      });
    }
  } catch (refreshError) {
    console.error('Token refresh failed:', refreshError);
    return res.status(401).json({ 
      error: 'Token refresh failed', 
      message: 'Please re-authenticate manually',
      authUrl: `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=https://my-spotify-o-auth-flow.vercel.app/api/spotify-callback&scope=playlist-modify-public%20playlist-modify-private&prompt=consent`
    });
  }
}

// Check final response
if (!response.ok) {
  return res.status(response.status).json({ 
    error: 'Spotify API error', 
    details: result 
  });
}

return res.status(200).json({
  success: true,
  message: `Successfully added track to ${playlistName}`,
  trackId,
  trackUri: trackUriFormatted,
  playlistId,
  playlistName,
  spotifyResponse: result,
  tokenRefreshed: response.status === 401 // indicates if we had to refresh the token
});

  
} catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
