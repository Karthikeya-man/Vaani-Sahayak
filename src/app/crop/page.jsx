"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoArrowBack, IoCameraOutline, IoImageOutline, IoCheckmarkCircleOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import styles from "@/styles/Crop.module.css";

function CropContent() {
    const { t } = useLanguage();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("home");

    // UI States: "idle" | "scanning" | "result"
    const [scanState, setScanState] = useState("idle");
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "home") router.push("/");
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImagePreview(url);
            startScan();
        }
    };

    const startScan = () => {
        setScanState("scanning");
        // Mock a 3 second scan process
        setTimeout(() => {
            setScanState("result");
        }, 3000);
    };

    const resetScanner = () => {
        setImagePreview(null);
        setScanState("idle");
    };

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
                        <h1 className={styles.pageTitle}>{t("cropTitle")}</h1>
                    </div>

                    <div className={styles.scannerContainer}>
                        <AnimatePresence mode="wait">
                            {/* IDLE STATE */}
                            {scanState === "idle" && (
                                <motion.div
                                    key="idle"
                                    className={styles.idleState}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className={styles.iconCircle}>
                                        <IoCameraOutline size={64} color="var(--primary-color)" />
                                    </div>
                                    <h2>Identify Crop Diseases</h2>
                                    <p>Take a clear photo of the affected leaf or plant part for an instant AI diagnosis and treatment plan.</p>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment" /* Requests back camera on mobile */
                                        className={styles.hiddenInput}
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />

                                    <div className={styles.buttonGroup}>
                                        <button className={styles.primaryBtn} onClick={() => fileInputRef.current?.click()}>
                                            <IoCameraOutline size={20} /> Open Camera
                                        </button>
                                        <button className={styles.secondaryBtn} onClick={() => {
                                            // Optional: Remove capture attr to force gallery picker
                                            fileInputRef.current?.removeAttribute('capture');
                                            fileInputRef.current?.click();
                                        }}>
                                            <IoImageOutline size={20} /> Upload from Gallery
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {/* SCANNING STATE */}
                            {scanState === "scanning" && (
                                <motion.div
                                    key="scanning"
                                    className={styles.scanningState}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <div className={styles.previewContainer}>
                                        <img src={imagePreview} alt="Crop preview" className={styles.previewImage} />
                                        <div className={styles.scanLine}></div>
                                    </div>
                                    <h3 className={styles.scanningText}>Analyzing Plant Biomarkers...</h3>
                                    <p className={styles.scanningSub}>Powered by Vaani Vision AI</p>
                                </motion.div>
                            )}

                            {/* RESULT STATE */}
                            {scanState === "result" && (
                                <motion.div
                                    key="result"
                                    className={styles.resultState}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    <div className={styles.resultHeader}>
                                        <img src={imagePreview} alt="Crop preview" className={styles.smallPreview} />
                                        <div className={styles.diseaseInfo}>
                                            <div className={styles.confidence}>
                                                <IoCheckmarkCircleOutline color="#10b981" />
                                                <span>94% Match</span>
                                            </div>
                                            <h2 className={styles.diseaseName}>Cotton Leaf Curl Virus</h2>
                                            <p className={styles.cropType}>Crop Identified: Cotton</p>
                                        </div>
                                    </div>

                                    <div className={styles.treatmentSection}>
                                        <h3>Recommended Action Plan</h3>

                                        <div className={styles.actionCard}>
                                            <div className={styles.actionLabel}>Organic Control</div>
                                            <p>Use Neem Oil spray (10,000 ppm) at 3ml/liter of water. Uproot and burn severely infected plants to prevent spreading.</p>
                                        </div>

                                        <div className={styles.actionCard}>
                                            <div className={styles.actionLabel}>Chemical Control</div>
                                            <p>Spray Imidacloprid 17.8 SL at 0.5ml/liter of water to control the whitefly vector.</p>
                                        </div>
                                    </div>

                                    <button className={styles.primaryBtn} onClick={resetScanner}>
                                        Scan Another Plant
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            <Footer activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
    );
}

export default function CropPage() {
    return (
        <LanguageProvider>
            <CropContent />
        </LanguageProvider>
    );
}
