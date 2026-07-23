"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoArrowBack, IoWarningOutline, IoTrendingDown, IoCashOutline, IoCloudOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import styles from "@/styles/Alerts.module.css";

// MOCK DATA for Alerts
const MOCK_ALERTS = [
    {
        id: 1,
        type: "weather",
        title: "Heavy Rainfall Warning",
        message: "IMD predicts heavy to very heavy rainfall in your district over the next 48 hours. Please postpone pesticide spraying and ensure proper drainage in your fields.",
        time: "2 hours ago",
        critical: true
    },
    {
        id: 2,
        type: "market",
        title: "Cotton Prices Dropping",
        message: "Cotton prices at Wardha Mandi have dropped by ₹120/qtl today. Consider holding your harvest if you can wait for a price recovery next week.",
        time: "5 hours ago",
        critical: false
    },
    {
        id: 3,
        type: "scheme",
        title: "PM-Kisan Installment Released",
        message: "The 14th installment of PM-Kisan Samman Nidhi has been credited to registered farmers' accounts. Please check your bank balance.",
        time: "Yesterday",
        critical: false
    },
    {
        id: 4,
        type: "weather",
        title: "Favorable Sowing Conditions",
        message: "Soil moisture levels are now optimal for sowing Kharif crops like Soyabean. Good weather expected for the next 4 days.",
        time: "2 days ago",
        critical: false
    }
];

function AlertsContent() {
    const { t } = useLanguage();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("home");
    const [filter, setFilter] = useState("all");

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "home") router.push("/");
    };

    const getIconForType = (type, critical) => {
        if (critical) return <IoWarningOutline size={24} color="#ef4444" />;
        switch (type) {
            case "weather": return <IoCloudOutline size={24} color="#3b82f6" />;
            case "market": return <IoTrendingDown size={24} color="#f59e0b" />;
            case "scheme": return <IoCashOutline size={24} color="#10b981" />;
            default: return <IoWarningOutline size={24} color="#6b7280" />;
        }
    };

    const filteredAlerts = filter === "all" ? MOCK_ALERTS : MOCK_ALERTS.filter(a => a.type === filter);

    return (
        <div className={styles.appShell}>
            <Header
                onMenuClick={() => setSidebarOpen(o => !o)}
                sidebarOpen={sidebarOpen}
                onLanguageClick={() => { }}
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
                        <h1 className={styles.pageTitle}>{t("alertsTitle") || "Alerts & Notifications"}</h1>
                    </div>

                    <div className={styles.filterTabs}>
                        {["all", "weather", "market", "scheme"].map(f => (
                            <button
                                key={f}
                                className={`${styles.filterBtn} ${filter === f ? styles.activeFilter : ""}`}
                                onClick={() => setFilter(f)}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className={styles.alertsList}>
                        <AnimatePresence>
                            {filteredAlerts.map((alert, i) => (
                                <motion.div
                                    key={alert.id}
                                    className={`${styles.alertCard} ${alert.critical ? styles.criticalAlert : ""}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: i * 0.05 }}
                                >
                                    <div className={styles.alertIconWrapper}>
                                        {getIconForType(alert.type, alert.critical)}
                                    </div>
                                    <div className={styles.alertContent}>
                                        <div className={styles.alertHeader}>
                                            <h3 className={styles.alertTitle}>{alert.title}</h3>
                                            <span className={styles.alertTime}>{alert.time}</span>
                                        </div>
                                        <p className={styles.alertMessage}>{alert.message}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredAlerts.length === 0 && (
                            <div className={styles.emptyState}>
                                <p>No {filter !== "all" ? filter : ""} alerts at the moment.</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <Footer activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
    );
}

export default function AlertsPage() {
    return (
        <LanguageProvider>
            <AlertsContent />
        </LanguageProvider>
    );
}
