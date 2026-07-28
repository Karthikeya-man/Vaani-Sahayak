"use client";
import { useState, useEffect } from "react";
import { IoPeopleOutline, IoShieldCheckmarkOutline } from "react-icons/io5";
import { useLocation } from "@/context/LocationContext";
import styles from "@/styles/NearbyActivityCard.module.css";

export default function NearbyActivityCard() {
  const { location } = useLocation();
  const district = location?.district || "Rajkot";
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchNearbyActivity() {
      try {
        const res = await fetch(`/api/farmer/nearby-activity?district=${encodeURIComponent(district)}`);
        const data = await res.json();
        if (isMounted && res.ok && data.activities) {
          setActivities(data.activities);
        }
      } catch (err) {
        console.warn("[NearbyActivityCard] Fetch failed:", err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchNearbyActivity();
    return () => { isMounted = false; };
  }, [district]);

  if (loading || activities.length === 0) return null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.iconBadge}>
          <IoPeopleOutline />
        </div>
        <div>
          <h3 className={styles.title}>Farmers Near You ({district})</h3>
          <p className={styles.subtitle}>Community network effect & collective crop trends</p>
        </div>
      </div>

      <div className={styles.activityList}>
        {activities.map((item, idx) => (
          <div key={idx} className={styles.activityItem}>
            <div className={styles.cropInfo}>
              <span className={styles.cropIcon}>🌾</span>
              <span className={styles.cropName}>{item.crop}</span>
            </div>
            <span className={styles.countTag}>
              {item.count} Farmers Growing
            </span>
          </div>
        ))}
      </div>

      <div className={styles.privacyBadge}>
        <IoShieldCheckmarkOutline size={14} />
        <span>100% Anonymized — Only aggregated counts shown to protect farmer privacy.</span>
      </div>
    </div>
  );
}
