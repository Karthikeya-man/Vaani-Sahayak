"use client";
import {
    IoHomeOutline, IoChatbubbleOutline, IoScanOutline, IoPersonOutline,
    IoLeafOutline, IoCallOutline, IoCloseOutline
} from "react-icons/io5";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/Sidebar.module.css";

export default function Sidebar({ activeTab, onTabChange, isOpen, onClose }) {
    const { t } = useLanguage();

    const tabs = [
        { id: "home", icon: <IoHomeOutline />, labelKey: "home" },
        { id: "chat", icon: <IoChatbubbleOutline />, labelKey: "chat" },
        { id: "scan", icon: <IoScanOutline />, labelKey: "scan" },
        { id: "profile", icon: <IoPersonOutline />, labelKey: "profile" },
    ];

    const handleNav = (tabId) => {
        onTabChange(tabId);
        onClose(); // close drawer after navigation
    };

    return (
        <>
            {/* Click-away backdrop */}
            {isOpen && <div className={styles.backdrop} onClick={onClose} />}

            <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
                <div className={styles.sidebarInner}>

                    {/* Menu header — just label + close, no duplicate app name */}
                    <div className={styles.brand}>
                        <span className={styles.brandText}>Menu</span>
                        <button className={styles.closeBtn} onClick={onClose} aria-label="Close menu">
                            <IoCloseOutline />
                        </button>
                    </div>

                    {/* Nav */}
                    <div className={styles.navSection}>Navigation</div>
                    <nav className={styles.nav}>
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ""}`}
                                onClick={() => handleNav(tab.id)}
                            >
                                <span className={styles.navIcon}>{tab.icon}</span>
                                <span className={styles.navLabel}>{t(tab.labelKey)}</span>
                            </button>
                        ))}
                    </nav>

                    {/* Toll-free box */}
                    <div className={styles.tollFreeBox}>
                        <div className={styles.tollFreeLabel}>
                            <IoCallOutline style={{ verticalAlign: "middle", marginRight: 4 }} />
                            Toll-Free Help
                        </div>
                        <div className={styles.tollFreeNumber}>1800-XXX-XXXX</div>
                        <div className={styles.tollFreeSub}>Free · Mon–Sat 8am–8pm</div>
                    </div>

                    {/* Bottom strip */}
                    <div className={styles.sidebarFooter}>
                        <div className={styles.footerText}>Connecting rural Bharat<br />to digital solutions</div>
                        <div className={styles.footerVersion}>v1.0.0 · Vaani Sahayak</div>
                    </div>

                </div>
            </aside>
        </>
    );
}
