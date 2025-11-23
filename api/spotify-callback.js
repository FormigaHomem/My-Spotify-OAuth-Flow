export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
  
try {
      // Handle Spotify OAuth callback
      const { code, error, state } = req.query;

  if (error) {
    return res.status(400).json({ error: 'OAuth failed', details: error });
  }
  
  
if (!code) {
        return res.status(400).json({ error: 'No authorization code received' });
      }

  // Your Spotify credentials
  const CLIENT_ID = 'ef6658e9c39d405099a8c4d7eee3c1a5';
  const CLIENT_SECRET = 'c8331c163eba4f8fa5c4f06737a22e3a';
  const REDIRECT_URI = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/spotify-callback`;
  
  
// Exchange code for access token
      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: REDIRECT_URI
        })
      });

  const tokenData = await tokenResponse.json();
  
  
if (!tokenData.access_token) {
        return res.status(400).json({ error: 'Failed to get access token', details: tokenData });
      }
  // STORE THE TOKEN in a simple in-memory cache (for this session)
  global.spotifyToken = {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
    created_at: Date.now()
  };
  
  
// Success! Token is now stored
      return res.status(200).json({
        success: true,
        message: 'OAuth successful! Token stored and ready to use. You can close this window.',
        tokenStored: true,
        expiresIn: tokenData.expires_in
      });
  
} catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
  
}
