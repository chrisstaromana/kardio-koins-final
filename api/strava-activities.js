// Vercel API route to fetch Strava activities
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
    
    // Get today's timestamp for filtering activities
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const afterTimestamp = Math.floor(todayStart.getTime() / 1000);
    
    // Fetch activities from Strava API
    const response = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${afterTimestamp}&per_page=20`, {
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
        error: 'Failed to fetch activities',
        details: errorText
      });
    }
    
    const activitiesData = await response.json();
    
    // Process activities and calculate steps
    const processedActivities = activitiesData.map(activity => {
      // Calculate estimated steps based on activity type and distance
      let stepsPerMeter = 1.2; // default
      
      switch(activity.type) {
        case 'Run':
          stepsPerMeter = 1.4;
          break;
        case 'Walk':
          stepsPerMeter = 1.3;
          break;
        case 'Hike':
          stepsPerMeter = 1.3;
          break;
        case 'Ride':
          stepsPerMeter = 0; // cycling doesn't count as steps
          break;
        case 'Swim':
          stepsPerMeter = 0; // swimming doesn't count as steps
          break;
        default:
          stepsPerMeter = 1.2;
      }
      
      const estimatedSteps = Math.round(activity.distance * stepsPerMeter);
      
      return {
        id: activity.id,
        name: activity.name,
        type: activity.type,
        distance: activity.distance,
        moving_time: activity.moving_time,
        start_date: activity.start_date,
        estimated_steps: estimatedSteps,
        calories: activity.calories || null
      };
    });
    
    // Calculate total steps for today
    const totalSteps = processedActivities.reduce((sum, activity) => sum + activity.estimated_steps, 0);
    
    // Return processed activities data
    res.status(200).json({
      success: true,
      activities: processedActivities,
      total_steps: totalSteps,
      activity_count: processedActivities.length
    });
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}