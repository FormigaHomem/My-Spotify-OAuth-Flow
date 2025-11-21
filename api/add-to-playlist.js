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

    // Your Spotify credentials
    const CLIENT_ID = 'ef6658e9c39d405099a8c4d7eee3c1a5';
    const CLIENT_SECRET = 'c8331c163eba4f8fa5c4f06737a22e3a';
    
    // For now, use client credentials (you'll need to get user token via OAuth later)
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(500).json({ error: 'Failed to get access token' });
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

    // Add track to playlist
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
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
