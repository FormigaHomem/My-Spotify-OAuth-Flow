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
    // Handle both formats: direct data or wrapped in inputData
    let trackUri, playlistId, playlistName;
    
    if (req.body.inputData) {
      // Handle wrapped format from steps 7 and 10
      const parsedData = JSON.parse(req.body.inputData);
      trackUri = parsedData.trackUri;
      playlistId = parsedData.playlistId;
      playlistName = parsedData.playlistName;
    } else {
      // Handle direct format from step 4
      trackUri = req.body.trackUri;
      playlistId = req.body.playlistId;
      playlistName = req.body.playlistName;
    }
    
    if (!trackUri || !playlistId) {
      return res.status(400).json({ 
        error: 'Missing trackUri or playlistId',
        received: { trackUri, playlistId, playlistName }
      });
    }

    // Get access token from environment
    const USER_ACCESS_TOKEN = process.env.SPOTIFY_USER_TOKEN;
    const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
    
    if (!USER_ACCESS_TOKEN) {
      return res.status(401).json({ 
        error: 'User authorization required', 
        message: 'Please complete OAuth flow and set SPOTIFY_USER_TOKEN in environment variables',
        authUrl: `https://accounts.spotify.com/authorize?client_id=ef6658e9c39d405099a8c4d7eee3c1a5&response_type=code&redirect_uri=https://my-spotify-o-auth-flow.vercel.app/api/spotify-callback&scope=playlist-modify-public%20playlist-modify-private&prompt=consent`
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

    // Add track to playlist
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
      // If token expired, try to refresh
      if (response.status === 401 && REFRESH_TOKEN) {
        return res.status(401).json({ 
          error: 'Token expired', 
          message: 'Access token expired. Please re-authenticate.',
          authUrl: `https://accounts.spotify.com/authorize?client_id=ef6658e9c39d405099a8c4d7eee3c1a5&response_type=code&redirect_uri=https://my-spotify-o-auth-flow.vercel.app/api/spotify-callback&scope=playlist-modify-public%20playlist-modify-private&prompt=consent`
        });
      }
      
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
