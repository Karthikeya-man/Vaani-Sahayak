"use client";
import { IoCloudOutline, IoCardOutline, IoTrendingUpOutline, IoLeafOutline } from "react-icons/io5";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/UpdatesCarousel.module.css";

export default function UpdatesCarousel() {
    const { t } = useLanguage();

    const updates = [
        { icon: <IoCloudOutline />, titleKey: "weatherAlert", descKey: "weatherAlertDesc", color: "blue" },
        { icon: <IoCardOutline />, titleKey: "pmKisan", descKey: "pmKisanDesc", color: "green" },
        { icon: <IoTrendingUpOutline />, titleKey: "ricePrice", descKey: "ricePriceDesc", color: "orange" },
        { icon: <IoLeafOutline />, titleKey: "cropAdvisory", descKey: "cropAdvisoryDesc", color: "red" },
    ];

    return (
        <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("updatesTitle")}</h2>
            <div className={styles.carousel}>
                {updates.map((item, i) => (
                    <div key={i} className={`${styles.card} ${styles[item.color]}`}>
                        <div className={styles.cardIcon}>{item.icon}</div>
                        <h3 className={styles.cardTitle}>{t(item.titleKey)}</h3>
                        <p className={styles.cardDesc}>{t(item.descKey)}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
