"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "@/styles/SplashScreen.module.css";

// The title cycles through these languages
const LANGUAGES = [
    "वाणी सहायकः", // Sanskrit (First)
    "वाणी सहायक",   // Hindi
    "வாணி சகாயக்", // Tamil
    "వాణి సహాయక్", // Telugu
    "ವಾಣಿ ಸಹಾಯಕ", // Kannada
    "വാണി സഹായക്", // Malayalam
    "বাণী সহায়ক",   // Bengali
    "વાણી સહાયક",   // Gujarati
    "ਵਾਣੀ ਸਹਾਇਕ",   // Punjabi
    "ବାଣୀ ସହାୟକ",   // Odia
    "Vaani Sahayak" // English (Last)
];

export default function SplashScreen({ onFinish }) {
    const [phase, setPhase] = useState("logo"); // logo → cycling
    const [langIndex, setLangIndex] = useState(0);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        const t1 = setTimeout(() => setShowContent(true), 500);
        const t2 = setTimeout(() => setPhase("cycling"), 3000);
        const t3 = setTimeout(() => { if (onFinish) onFinish(); }, 17000);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [onFinish]);

    useEffect(() => {
        if (phase !== "cycling") return;
        const interval = setInterval(() => {
            setLangIndex((prev) => {
                if (prev >= LANGUAGES.length - 1) { clearInterval(interval); return prev; }
                return prev + 1;
            });
        }, 1200); // 1.2s per language
        return () => clearInterval(interval);
    }, [phase]);

    // Determine what title text to show
    const titleText = phase === "cycling" ? LANGUAGES[langIndex] : LANGUAGES[0];

    return (
        <AnimatePresence>
            <motion.div className={styles.splashContainer}
                exit={{ opacity: 0, y: -50 }} transition={{ duration: 0.6, ease: "easeInOut" }}>
                <img src="/images/farmer-bg.png" alt="Indian farmer" className={styles.backgroundImage} />
                <div className={styles.overlay} />

                <div className={styles.particles}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className={styles.particle} />
                    ))}
                </div>

                {showContent && (
                    <motion.div className={styles.content}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>

                        {/* Logo in circle */}
                        <motion.div className={styles.logoCircle}
                            initial={{ opacity: 0, scale: 0.3 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1, ease: "easeOut" }}>
                            <img src="/images/logo.png" alt="Logo" className={styles.logo} />
                        </motion.div>

                        {/* Single title that changes language */}
                        <AnimatePresence mode="wait">
                            <motion.h1
                                key={titleText}
                                className={styles.title}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5, ease: "easeInOut" }}>
                                {titleText}
                            </motion.h1>
                        </AnimatePresence>

                        {/* Tagline */}
                        <motion.p className={styles.tagline}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 1.8, ease: "easeOut" }}>
                            CONNECTING RURAL BHARATH
                        </motion.p>
                    </motion.div>
                )}

                <motion.div className={styles.poweredBy}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 2.5 }}>
                    Powered by <span className={styles.teamName}>Team Vaani</span>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
