"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IoArrowBack, IoTrendingUp, IoTrendingDown, IoRemoveOutline, IoLocationOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import { useLocation, LocationProvider } from "@/context/LocationContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import LanguageModal from "@/components/LanguageModal";
import LocationModal from "@/components/LocationModal";
import styles from "@/styles/Market.module.css";

const MOCK_PRICES_FALLBACK = [
    { id: 1, crop: "Wheat", mandi: "Nagpur APMC", price: 2450, change: 50, trend: "up", unit: "per Quintal" },
    { id: 2, crop: "Cotton", mandi: "Wardha Mandi", price: 6800, change: -120, trend: "down", unit: "per Quintal" },
    { id: 3, crop: "Soyabean", mandi: "Amravati APMC", price: 4200, change: 0, trend: "flat", unit: "per Quintal" },
    { id: 4, crop: "Tur (Arhar)", mandi: "Akola Mandi", price: 9500, change: 150, trend: "up", unit: "per Quintal" },
    { id: 5, crop: "Rice (Paddy)", mandi: "Bhandara APMC", price: 2100, change: 20, trend: "up", unit: "per Quintal" }
];

function MarketContent() {
    const { t, lang, setLang } = useLanguage();
    const { location, translatedLocation, isLoaded } = useLocation();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("home");
    const [loading, setLoading] = useState(true);
    const [prices, setPrices] = useState(MOCK_PRICES_FALLBACK);
    const [isCached, setIsCached] = useState(false);
    const [cachedAt, setCachedAt] = useState(null);

    const [showLangModal, setShowLangModal] = useState(false);
    const [showLocModal, setShowLocModal] = useState(false);

    useEffect(() => {
        let isMounted = true;
        async function loadMarketData() {
            setLoading(true);
            try {
                const res = await fetch("/api/market");
                const data = await res.json();
                if (isMounted && res.ok && data.prices) {
                    setPrices(data.prices);
                    const cachedHeader = res.headers.get("X-Cached-At");
                    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
                    if (isOffline || cachedHeader || data.fetchedAt) {
                        setIsCached(isOffline || !!cachedHeader);
                        setCachedAt(cachedHeader || data.fetchedAt || new Date().toISOString());
                    } else {
                        setIsCached(false);
                        setCachedAt(null);
                    }
                    localStorage.setItem("vaani_cached_market", JSON.stringify({
                        prices: data.prices,
                        timestamp: cachedHeader || data.fetchedAt || new Date().toISOString()
                    }));
                }
            } catch (err) {
                console.warn("[Market Page] Fetch failed, checking local backup:", err.message);
                try {
                    const saved = localStorage.getItem("vaani_cached_market");
                    if (saved && isMounted) {
                        const parsed = JSON.parse(saved);
                        setPrices(parsed.prices);
                        setIsCached(true);
                        setCachedAt(parsed.timestamp);
                    }
                } catch (e) {}
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        loadMarketData();
        return () => { isMounted = false; };
    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "home") router.push("/");
    };

    const getTrendIcon = (trend) => {
        if (trend === "up") return <IoTrendingUp color="#10b981" size={20} />;
        if (trend === "down") return <IoTrendingDown color="#ef4444" size={20} />;
        return <IoRemoveOutline color="#6b7280" size={20} />;
    };

    const getTrendClass = (trend) => {
        if (trend === "up") return styles.trendUp;
        if (trend === "down") return styles.trendDown;
        return styles.trendFlat;
    };

    const displayMandi = (baseMandi) => {
        if (!location.district) return baseMandi;
        return `${translatedLocation.district || location.district} Mandi`;
    };

    const formattedTime = cachedAt ? new Date(cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    return (
        <div className={styles.appShell}>
            <Header
                onLocationClick={() => setShowLocModal(true)}
                onLanguageClick={() => setShowLangModal(true)}
                onMenuClick={() => setSidebarOpen(o => !o)}
                sidebarOpen={sidebarOpen}
            />

            <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className={styles.bodyRow}>
                <main className={styles.mainContent}>
                    <div className={styles.pageHeader}>
                        <button className={styles.backBtn} onClick={() => router.push("/")}>
                            <IoArrowBack size={24} />
                        </button>
                        <h1 className={styles.pageTitle}>{t("marketTitle") || "Market Prices"}</h1>
                    </div>

                    {!isLoaded ? (
                        <div className={styles.loadingState}>
                            <div className={styles.spinner} />
                            <p>Loading market data...</p>
                        </div>
                    ) : !location.state ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "16px" }}>
                            <div style={{ padding: "40px 24px", textAlign: "center", background: "#f8fafc", borderRadius: "16px", margin: "16px", maxWidth: "400px", width: "100%", border: "1px solid #e2e8f0" }}>
                                <IoLocationOutline size={56} color="#94a3b8" />
                                <h3 style={{ margin: "20px 0 8px 0", fontSize: "1.25rem", color: "#0f172a" }}>{t("locationRequired") || "Location Required"}</h3>
                                <p style={{ color: "#64748b", marginBottom: "32px", fontSize: "0.95rem", lineHeight: "1.5" }}>{t("selectLocationForPrices") || "Please select your location to see local Mandi prices."}</p>
                                <button onClick={() => setShowLocModal(true)} style={{ background: "#16a34a", color: "#fff", padding: "14px 24px", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer", width: "100%", fontSize: "1rem", transition: "all 0.2s" }}>
                                    {t("selectLocation") || "Select Location"}
                                </button>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className={styles.loadingState}>
                            <div className={styles.spinner} />
                            <p>Fetching local Mandi prices for {translatedLocation.district || location.district}...</p>
                        </div>
                    ) : (
                        <div className={styles.marketContainer}>
                            {isCached && (
                                <div className={styles.infoBanner} style={{ backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fde68a', fontWeight: 600 }}>
                                    ⚡ Showing cached data from {formattedTime || 'offline cache'}
                                </div>
                            )}

                            <div className={styles.infoBanner}>
                                ℹ️ Prices sync daily with eNAM & ONDC networks for accurate trading in {translatedLocation.state || location.state}.
                            </div>

                            <div className={styles.priceGrid}>
                                {prices.map((item, i) => (
                                    <motion.div
                                        key={item.id}
                                        className={styles.priceCard}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, delay: i * 0.1 }}
                                    >
                                        <div className={styles.cardHeader}>
                                            <h3 className={styles.cropName}>{item.crop}</h3>
                                            {getTrendIcon(item.trend)}
                                        </div>

                                        <div className={styles.mandiName}>📍 {displayMandi(item.mandi)}</div>

                                        <div className={styles.priceRow}>
                                            <div className={styles.currentPrice}>₹{item.price}</div>
                                            <span className={styles.unit}>{item.unit}</span>
                                        </div>

                                        <div className={`${styles.changeText} ${getTrendClass(item.trend)}`}>
                                            {item.trend === "up" ? "+" : ""}{item.change} since yesterday
                                        </div>

                                        <button className={styles.sellBtn}>
                                            Sell on ONDC
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            <Footer activeTab={activeTab} onTabChange={handleTabChange} />

            <LanguageModal
                isOpen={showLangModal}
                onClose={() => setShowLangModal(false)}
                selectedLang={lang}
                onSelectLang={setLang}
            />

            <LocationModal
                isOpen={showLocModal}
                onClose={() => setShowLocModal(false)}
            />
        </div>
    );
}

export default function MarketPage() {
    return (
        <LanguageProvider>
            <LocationProvider>
                <MarketContent />
            </LocationProvider>
        </LanguageProvider>
    );
}
