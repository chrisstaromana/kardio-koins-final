// Vercel API route to fetch Strava athlete data
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const accessToken = process.env.STRAVA_ACCESS_TOKEN;
    
    if (!accessToken) {
      return res.status(500).json({ error: 'Strava access token not configured' });
    }
    
    // Fetch athlete data from Strava API
    const response = await fetch('https://www.strava.com/api/v3/athlete', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Strava API error:', response.status, errorText);
      
      if (response.status === 401) {
        return res.status(401).json({ 
          error: 'Strava token expired',
          message: 'Please refresh your Strava authentication'
        });
      }
      
      return res.status(response.status).json({ 
        error: 'Failed to fetch athlete data',
        details: errorText
      });
    }
    
    const athleteData = await response.json();
    
    // Return athlete data
    res.status(200).json({
      success: true,
      athlete: {
        id: athleteData.id,
        firstname: athleteData.firstname,
        lastname: athleteData.lastname,
        profile: athleteData.profile,
        city: athleteData.city,
        country: athleteData.country
      }
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}