"use client";
import { IoLanguage, IoNotificationsOutline, IoPersonOutline, IoMenuOutline, IoCloseOutline, IoLocationOutline } from "react-icons/io5";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/Header.module.css";

export default function Header({ onLanguageClick, onProfileClick, onMenuClick, sidebarOpen, onLocationClick }) {
    const { t } = useLanguage();

    return (
        <header className={styles.header}>
            <div className={styles.inner}>
                <div className={styles.left}>
                    {/* Hamburger — desktop only */}
                    <button
                        className={styles.menuBtn}
                        onClick={onMenuClick}
                        aria-label="Toggle menu"
                    >
                        {sidebarOpen ? <IoCloseOutline /> : <IoMenuOutline />}
                    </button>

                    <img src="/images/logo.png" alt="Logo" className={styles.logo} />
                    <div className={styles.brand}>
                        <h1 className={styles.brandName}>{t("brandName")}</h1>
                        <span className={styles.brandTag}>{t("brandTagline")}</span>
                    </div>
                </div>
                <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={onLocationClick} aria-label="Location">
                        <IoLocationOutline />
                    </button>
                    <button className={styles.actionBtn} onClick={onLanguageClick} aria-label="Language">
                        <IoLanguage />
                    </button>
                    <button className={styles.actionBtn} aria-label="Notifications">
                        <IoNotificationsOutline />
                    </button>
                    <button className={styles.actionBtn} onClick={onProfileClick} aria-label="Profile">
                        <IoPersonOutline />
                    </button>
                </div>
            </div>
        </header>
    );
}
