"use client";
import { motion } from "framer-motion";
import styles from "@/styles/FeatureCard.module.css";

export default function FeatureCard({ icon, title, subtitle, colorClass, delay = 0, onClick }) {
    return (
        <motion.div
            className={styles.card}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            onClick={onClick}
            whileTap={{ scale: 0.96 }}
        >
            <div className={`${styles.iconWrapper} ${styles[colorClass] || ""}`}>
                {icon}
            </div>
            <span className={styles.title}>{title}</span>
            <span className={styles.subtitle}>{subtitle}</span>
        </motion.div>
    );
}
