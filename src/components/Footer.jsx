"use client";
import { IoHomeOutline, IoChatbubbleOutline, IoScanOutline, IoPersonOutline } from "react-icons/io5";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/Footer.module.css";

export default function Footer({ activeTab, onTabChange }) {
    const { t } = useLanguage();

    const tabs = [
        { id: "home", icon: <IoHomeOutline />, labelKey: "home" },
        { id: "chat", icon: <IoChatbubbleOutline />, labelKey: "chat" },
        { id: "scan", icon: <IoScanOutline />, labelKey: "scan" },
        { id: "profile", icon: <IoPersonOutline />, labelKey: "profile" },
    ];

    return (
        <nav className={styles.footer}>
            <div className={styles.inner}>
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${tab.id === "scan" ? styles.scanTab : ""} ${activeTab === tab.id ? styles.active : ""}`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <span className={styles.icon}>{tab.icon}</span>
                        <span className={styles.label}>{t(tab.labelKey)}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}

