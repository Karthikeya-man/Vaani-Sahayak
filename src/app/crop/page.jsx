"use client";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoArrowBack, IoCameraOutline, IoImageOutline, IoCheckmarkCircleOutline, IoCloudUploadOutline, IoCheckmarkDoneOutline } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import styles from "@/styles/Crop.module.css";
import { savePendingScan, getPendingScans, syncPendingScans } from "@/lib/offlineQueue";

function CropContent() {
    const { t } = useLanguage();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("home");

    // UI States: "idle" | "scanning" | "result"
    const [scanState, setScanState] = useState("idle");
    const [imagePreview, setImagePreview] = useState(null);
    const [isOfflineScan, setIsOfflineScan] = useState(false);
    const [scanId, setScanId] = useState(null);
    const [feedbackGiven, setFeedbackGiven] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [syncNotice, setSyncNotice] = useState(null);
    const fileInputRef = useRef(null);

    const checkPendingQueue = async () => {
        const pending = await getPendingScans();
        setPendingCount(pending.length);
    };

    useEffect(() => {
        checkPendingQueue();

        const handleOnline = async () => {
            const result = await syncPendingScans();
            if (result.synced > 0) {
                setSyncNotice(`Synced ${result.synced} offline crop scan(s) successfully! ✅`);
                setTimeout(() => setSyncNotice(null), 5000);
            }
            checkPendingQueue();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "home") router.push("/");
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setImagePreview(url);
            startScan(url);
        }
    };

    const startScan = async (imgUrl) => {
        setScanState("scanning");
        setFeedbackGiven(null);

        // Simulate 2s AI biomarker scan
        setTimeout(async () => {
            const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

            const scanPayload = {
                id: `scan_${Date.now()}`,
                crop: 'Cotton',
                disease: 'Cotton Leaf Curl Virus',
                district: 'Rajkot',
                image: imgUrl
            };

            if (isOffline) {
                try {
                    await savePendingScan(scanPayload);
                    setIsOfflineScan(true);
                    setScanId(scanPayload.id);
                    checkPendingQueue();
                } catch (e) {
                    console.warn('Failed saving offline scan:', e);
                }
            } else {
                try {
                    const res = await fetch('/api/crop-scan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(scanPayload)
                    });
                    const data = await res.json();
                    if (res.ok && data.scanId) {
                        setScanId(data.scanId);
                        setIsOfflineScan(false);
                    } else {
                        // Fallback to offline queue if server error
                        await savePendingScan(scanPayload);
                        setIsOfflineScan(true);
                    }
                } catch (err) {
                    await savePendingScan(scanPayload);
                    setIsOfflineScan(true);
                    checkPendingQueue();
                }
            }

            setScanState("result");
        }, 2000);
    };

    const handleDiagnosisFeedback = async (helpful) => {
        setFeedbackGiven(helpful ? 'yes' : 'no');
        try {
            await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: 'crop-scan',
                    scanId: scanId,
                    helpful: helpful
                })
            });
        } catch (e) {
            console.warn('Failed to submit crop scan feedback:', e.message);
        }
    };

    const resetScanner = () => {
        setImagePreview(null);
        setScanState("idle");
        setIsOfflineScan(false);
        setScanId(null);
        setFeedbackGiven(null);
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

                    {syncNotice && (
                        <div style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IoCheckmarkDoneOutline size={20} />
                            {syncNotice}
                        </div>
                    )}

                    {pendingCount > 0 && (
                        <div style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '8px 14px', borderRadius: '10px', marginBottom: '14px', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <IoCloudUploadOutline size={18} />
                            {pendingCount} scan(s) queued offline — will auto-upload when back online.
                        </div>
                    )}

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
                                        capture="environment"
                                        className={styles.hiddenInput}
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                    />

                                    <div className={styles.buttonGroup}>
                                        <button className={styles.primaryBtn} onClick={() => fileInputRef.current?.click()}>
                                            <IoCameraOutline size={20} /> Open Camera
                                        </button>
                                        <button className={styles.secondaryBtn} onClick={() => {
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
                                    {isOfflineScan && (
                                        <div style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #ffedd5', padding: '10px 14px', borderRadius: '10px', marginBottom: '14px', fontWeight: 600, fontSize: '0.88rem' }}>
                                            📶 Saved offline: will upload to server when back online.
                                        </div>
                                    )}

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

                                    {/* Diagnosis Feedback Section */}
                                    <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
                                        <p style={{ fontWeight: 600, color: '#334155', marginBottom: '8px', fontSize: '0.9rem' }}>
                                            Was this disease diagnosis helpful?
                                        </p>
                                        {feedbackGiven ? (
                                            <span style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.88rem' }}>
                                                {feedbackGiven === 'yes' ? '👍 Thank you for your feedback!' : '👎 Thank you for your feedback!'}
                                            </span>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <button
                                                    onClick={() => handleDiagnosisFeedback(true)}
                                                    style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                                                >
                                                    👍 Helpful
                                                </button>
                                                <button
                                                    onClick={() => handleDiagnosisFeedback(false)}
                                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem' }}
                                                >
                                                    👎 Not Helpful
                                                </button>
                                            </div>
                                        )}
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
