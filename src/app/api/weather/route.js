import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

function generateFarmingAdvisory(current) {
  const advisories = [];
  const desc = current.description.toLowerCase();
  const temp = current.temp;
  const humidity = current.humidity;
  const wind = current.wind_speed;
  const isRaining = desc.includes('rain') || desc.includes('drizzle');

  if (isRaining) {
    advisories.push("🌧️ Rain expected — avoid pesticide/fertilizer spraying today.");
    advisories.push("🚜 Postpone tilling — wet soil may compact under machinery.");
  }
  
  if (temp > 40) {
    advisories.push("🌡️ Extreme heat — irrigate crops in early morning or evening.");
    advisories.push("💧 Increase irrigation frequency for water-sensitive crops.");
  } else if (temp < 10) {
    advisories.push("❄️ Cold temperature — protect frost-sensitive seedlings overnight.");
  }

  if (humidity > 80 && !isRaining) {
    advisories.push("🍄 High humidity — monitor crops for fungal disease (blight, mildew).");
  }

  if (wind > 10) {
    advisories.push("💨 Strong winds — avoid aerial spraying. Secure greenhouse covers.");
  }

  if (desc.includes('clear') && temp >= 25 && temp <= 35) {
    advisories.push("☀️ Ideal conditions for harvesting and field work today.");
  }

  if (advisories.length === 0) {
    advisories.push("✅ Weather looks normal. Good day for regular farm activities.");
  }

  return advisories;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  let city = searchParams.get('city');

  if (!API_KEY) {
    return NextResponse.json({ error: 'Weather API key not configured' }, { status: 500 });
  }

  if (!lat && !lon && !city) {
    return NextResponse.json({ error: 'Missing location parameters (lat/lon or city)' }, { status: 400 });
  }

  try {
    let queryParams = '';
    if (lat && lon) {
      queryParams = `lat=${lat}&lon=${lon}`;
    } else if (city) {
      if (!city.toUpperCase().endsWith(',IN')) {
         city += ',IN';
      }
      queryParams = `q=${encodeURIComponent(city)}`;
    }

    const currentRes = await fetch(`${BASE_URL}/weather?${queryParams}&units=metric&appid=${API_KEY}`, { next: { revalidate: 1800 } });
    
    if (!currentRes.ok) {
       const errorText = await currentRes.json();
       if (currentRes.status === 404) return NextResponse.json({ error: 'City not found' }, { status: 404 });
       if (currentRes.status === 401) return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
       throw new Error(errorText.message || 'Failed to fetch current weather');
    }
    
    const currentData = await currentRes.json();
    const actualLat = currentData.coord.lat;
    const actualLon = currentData.coord.lon;

    const [forecastRes, aqiRes] = await Promise.all([
      fetch(`${BASE_URL}/forecast?lat=${actualLat}&lon=${actualLon}&units=metric&cnt=5&appid=${API_KEY}`, { next: { revalidate: 1800 } }),
      fetch(`${BASE_URL}/air_pollution?lat=${actualLat}&lon=${actualLon}&appid=${API_KEY}`, { next: { revalidate: 1800 } })
    ]);

    let forecastData = null;
    let aqiData = null;

    if (forecastRes.ok) forecastData = await forecastRes.json();
    if (aqiRes.ok) aqiData = await aqiRes.json();

    const formattedCurrent = {
      temp: Math.round(currentData.main.temp),
      feels_like: Math.round(currentData.main.feels_like),
      humidity: currentData.main.humidity,
      description: currentData.weather[0].description,
      icon: currentData.weather[0].icon,
      wind_speed: currentData.wind.speed,
      wind_deg: currentData.wind.deg,
      visibility: currentData.visibility / 1000,
      pressure: currentData.main.pressure,
      sunrise: currentData.sys.sunrise,
      sunset: currentData.sys.sunset,
    };

    const responseData = {
      location: {
        city: currentData.name,
        country: currentData.sys.country,
        lat: actualLat,
        lon: actualLon
      },
      current: formattedCurrent,
      farming_advisory: generateFarmingAdvisory(formattedCurrent),
      forecast: forecastData?.list?.map(item => ({
        time: item.dt,
        temp: Math.round(item.main.temp),
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        rain: item.rain ? item.rain['3h'] || 0 : 0
      })) || [],
      air_quality_index: aqiData?.list?.[0]?.main?.aqi || null
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Weather API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
