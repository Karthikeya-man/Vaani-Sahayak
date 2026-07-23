"use client";

import { useEffect } from "react";
import styles from "@/styles/WeatherCard.module.css";
import { useWeather } from "@/hooks/useWeather";
import { IoWarningOutline, IoWaterOutline, IoTimerOutline, IoLeafOutline } from "react-icons/io5";
import { FiWind } from "react-icons/fi";

export default function WeatherCard({ district = null }) {
  const { weather, loading, error, fetchWeather, fetchByGPS } = useWeather();

  useEffect(() => {
    if (district) {
      fetchWeather({ city: district });
    } else {
      fetchByGPS();
    }
  }, [district, fetchWeather, fetchByGPS]);

  if (loading) {
    return (
      <div className={`${styles.card} ${styles.loadingState}`}>
        <div className={styles.loadingSkeletonTitle}></div>
        <div className={styles.loadingSkeletonTemp}></div>
        <div className={styles.loadingSkeletonRow}>
          <div></div><div></div><div></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.card} ${styles.errorState}`}>
        <IoWarningOutline size={32} />
        <p className={styles.errorText}>{error}</p>
        <button onClick={() => district ? fetchWeather({ city: district }) : fetchByGPS()} className={styles.retryBtn}>Retry</button>
      </div>
    );
  }

  if (!weather || !weather.current) {
    return null;
  }

  const { current, location, farming_advisory, forecast, air_quality_index } = weather;

  return (
    <div className={styles.card}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.location}>
          {location.city}, {location.country}
        </div>
      </div>

      {/* Main Temperature & Weather Info */}
      <div className={styles.mainInfo}>
        <div className={styles.tempBox}>
          <span className={styles.temp}>{current.temp}°</span>
        </div>
        <div className={styles.weatherIconBox}>
          <img 
            src={`https://openweathermap.org/img/wn/${current.icon}@4x.png`} 
            alt={current.description} 
            className={styles.weatherIcon}
          />
          <p className={styles.description}>{current.description}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statBox}>
          <IoWaterOutline className={styles.statIcon} />
          <div className={styles.statCol}>
             <span className={styles.statLabel}>Humidity</span>
             <span className={styles.statValue}>{current.humidity}%</span>
          </div>
        </div>
        <div className={styles.statBox}>
          <FiWind className={styles.statIcon} />
          <div className={styles.statCol}>
             <span className={styles.statLabel}>Wind</span>
             <span className={styles.statValue}>{current.wind_speed} m/s</span>
          </div>
        </div>
        <div className={styles.statBox}>
           <IoTimerOutline className={styles.statIcon} />
           <div className={styles.statCol}>
             <span className={styles.statLabel}>Feels Like</span>
             <span className={styles.statValue}>{current.feels_like}°</span>
           </div>
        </div>
      </div>
      
      {/* Air Quality (Optional) */}
      {air_quality_index && (
          <div className={styles.aqiRow}>
              <span>Air Quality Index (AQI): {air_quality_index}/5</span>
          </div>
      )}

      {/* Farming Advisories */}
      {farming_advisory && farming_advisory.length > 0 && (
        <div className={styles.advisorySection}>
          <h4 className={styles.advisoryTitle}><IoLeafOutline className={styles.leafIcon} /> Farming Advisory</h4>
          <ul className={styles.advisoryList}>
            {farming_advisory.map((advice, index) => (
              <li key={index} className={styles.advisoryItem}>{advice}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Horizontal Forecast Strip */}
      {forecast && forecast.length > 0 && (
        <div className={styles.forecastStripContainer}>
          <h4 className={styles.forecastTitle}>Forecast (Next 15 hrs)</h4>
          <div className={styles.forecastStrip}>
            {forecast.map((item, index) => {
              const date = new Date(item.time * 1000);
              const hour = date.getHours();
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const formattedHour = hour % 12 || 12;
              
              return (
                <div key={index} className={styles.forecastCard}>
                  <span className={styles.forecastTime}>{formattedHour} {ampm}</span>
                  <img 
                    src={`https://openweathermap.org/img/wn/${item.icon}.png`} 
                    alt={item.description}
                    title={item.description}
                    className={styles.forecastIcon}
                  />
                  <span className={styles.forecastTemp}>{item.temp}°</span>
                  {item.rain > 0 && <span className={styles.forecastRain}>{item.rain}mm💧</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
