"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IoArrowBack, IoCheckmarkCircle, IoSaveOutline } from "react-icons/io5";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import styles from "@/styles/Profile.module.css";

const STATES = [
    "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const CROPS = [
    "Rice", "Wheat", "Maize", "Sugarcane", "Cotton", "Groundnut",
    "Soybean", "Pulses", "Millets", "Vegetables", "Fruits", "Spices",
    "Tea", "Coffee", "Coconut", "Jute",
];

function ProfileContent({ onBack }) {
    const { t } = useLanguage();
    const [form, setForm] = useState({
        fullName: "", phone: "", aadhaar: "", dob: "", gender: "",
        state: "", district: "", village: "", pinCode: "",
        landSize: "", bankAccount: "", ifscCode: "",
    });
    const [selectedCrops, setSelectedCrops] = useState([]);
    
    // DB Plot & Preferences State
    const [farmerId, setFarmerId] = useState("4379bc18-5a9b-4649-9c3c-d0970e9933c1");
    const [plotCrop, setPlotCrop] = useState("");
    const [plotAcres, setPlotAcres] = useState("");
    const [sowingDate, setSowingDate] = useState("");
    const [expectedHarvestDate, setExpectedHarvestDate] = useState("");
    const [priceAlertThreshold, setPriceAlertThreshold] = useState("");
    
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        // Load initial farmer state from DB
        fetch(`/api/farmer?farmerId=${farmerId}`)
            .then(res => res.json())
            .then(data => {
                if (data && !data.error) {
                    setForm(prev => ({
                        ...prev,
                        fullName: data.name || prev.fullName,
                        phone: data.phone || prev.phone,
                        district: data.district || prev.district,
                        state: data.state || prev.state
                    }));

                    if (data.plot) {
                        setPlotCrop(data.plot.crop || "");
                        setPlotAcres(data.plot.land_acres ? String(data.plot.land_acres) : "");
                        if (data.plot.sowing_date) {
                            setSowingDate(new Date(data.plot.sowing_date).toISOString().split('T')[0]);
                        }
                        if (data.plot.expected_harvest_date) {
                            setExpectedHarvestDate(new Date(data.plot.expected_harvest_date).toISOString().split('T')[0]);
                        }
                    }

                    if (data.preferences && data.preferences.price_alert_threshold) {
                        setPriceAlertThreshold(String(data.preferences.price_alert_threshold));
                    }
                }
            })
            .catch(err => console.warn("Failed to load farmer state:", err));
    }, [farmerId]);

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const toggleCrop = (crop) => {
        setSelectedCrops((prev) =>
            prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop]
        );
        setSaved(false);
    };

    const filledFields = Object.values(form).filter(Boolean).length + (selectedCrops.length > 0 ? 1 : 0);
    const totalFields = 13;
    const pct = Math.round((filledFields / totalFields) * 100);
    const circumference = 2 * Math.PI * 38;
    const dashOffset = circumference - (pct / 100) * circumference;

    const handleSave = async () => {
        localStorage.setItem("vaani_profile", JSON.stringify({ ...form, crops: selectedCrops }));
        
        try {
            await fetch('/api/farmer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    farmerId,
                    plot: {
                        crop: plotCrop || "Cotton",
                        land_acres: plotAcres ? parseFloat(plotAcres) : 2.0,
                        sowing_date: sowingDate || new Date().toISOString().split('T')[0],
                        expected_harvest_date: expectedHarvestDate || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0]
                    },
                    preferences: {
                        price_alert_threshold: priceAlertThreshold ? parseFloat(priceAlertThreshold) : null
                    }
                })
            });
        } catch (e) {
            console.error("Failed to sync profile to DB:", e);
        }

        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <motion.div className={styles.container}
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            {/* Header */}
            <div className={styles.profileHeader}>
                <button className={styles.backBtn} onClick={onBack} aria-label={t("back")}><IoArrowBack /></button>
                <div className={styles.avatarWrapper}>
                    <div className={styles.avatar}>👨‍🌾</div>
                    <svg className={styles.progressRing} viewBox="0 0 88 88">
                        <circle className={styles.progressBg} cx="44" cy="44" r="38" />
                        <circle className={styles.progressFill} cx="44" cy="44" r="38"
                            strokeDasharray={circumference} strokeDashoffset={dashOffset} transform="rotate(-90 44 44)" />
                    </svg>
                </div>
                <div className={styles.profileName}>{form.fullName || "Farmer"}</div>
                <div className={styles.profileLabel}>{t("myProfile")}</div>
                <div className={styles.completionBadge}>📊 {t("profileComplete").replace("{pct}", pct)}</div>
            </div>

            {/* Form */}
            <div className={styles.formSection}>
                <div className={styles.formCard}>
                    <div className={styles.formTitle}>{t("generalDetails")}</div>
                    <div className={styles.sectionLabel}>{t("personalInfo")}</div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>{t("fullName")} *</label>
                        <input className={styles.input} type="text" placeholder={t("enterName")}
                            value={form.fullName} onChange={(e) => handleChange("fullName", e.target.value)} />
                    </div>
                    <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("phone")} *</label>
                            <input className={styles.input} type="tel" placeholder={t("enterPhone")}
                                value={form.phone} onChange={(e) => handleChange("phone", e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("dob")}</label>
                            <input className={styles.input} type="date"
                                value={form.dob} onChange={(e) => handleChange("dob", e.target.value)} />
                        </div>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("aadhaar")}</label>
                            <input className={styles.input} type="text" placeholder={t("enterAadhaar")} maxLength={14}
                                value={form.aadhaar} onChange={(e) => handleChange("aadhaar", e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("gender")}</label>
                            <select className={styles.select}
                                value={form.gender} onChange={(e) => handleChange("gender", e.target.value)}>
                                <option value="">{t("select")}</option>
                                <option value="male">{t("male")}</option>
                                <option value="female">{t("female")}</option>
                                <option value="other">{t("other")}</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.divider} />
                    <div className={styles.sectionLabel}>{t("locationDetails")}</div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>{t("state")} *</label>
                        <select className={styles.select}
                            value={form.state} onChange={(e) => handleChange("state", e.target.value)}>
                            <option value="">{t("selectState")}</option>
                            {STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                        </select>
                    </div>
                    <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("district")} *</label>
                            <input className={styles.input} type="text" placeholder={t("enterDistrict")}
                                value={form.district} onChange={(e) => handleChange("district", e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("village")}</label>
                            <input className={styles.input} type="text" placeholder={t("enterVillage")}
                                value={form.village} onChange={(e) => handleChange("village", e.target.value)} />
                        </div>
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>{t("pinCode")}</label>
                        <input className={styles.input} type="text" placeholder={t("enterPin")} maxLength={6}
                            value={form.pinCode} onChange={(e) => handleChange("pinCode", e.target.value)} />
                    </div>

                    <div className={styles.divider} />
                    <div className={styles.sectionLabel}>🌾 FARM PLOT & ALERT PREFERENCES</div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Primary Crop</label>
                        <select className={styles.select}
                            value={plotCrop} onChange={(e) => setPlotCrop(e.target.value)}>
                            <option value="">Select Crop</option>
                            {CROPS.map((crop) => (
                                <option key={crop} value={crop}>{crop}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Plot Size (Acres)</label>
                            <input className={styles.input} type="number" step="0.1" placeholder="e.g. 2.5"
                                value={plotAcres} onChange={(e) => setPlotAcres(e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Price Alert Threshold (₹/Quintal)</label>
                            <input className={styles.input} type="number" placeholder="e.g. 6500"
                                value={priceAlertThreshold} onChange={(e) => setPriceAlertThreshold(e.target.value)} />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Sowing Date</label>
                            <input className={styles.input} type="date"
                                value={sowingDate} onChange={(e) => setSowingDate(e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Expected Harvest Date</label>
                            <input className={styles.input} type="date"
                                value={expectedHarvestDate} onChange={(e) => setExpectedHarvestDate(e.target.value)} />
                        </div>
                    </div>

                    <div className={styles.divider} />
                    <div className={styles.sectionLabel}>{t("bankingDetails")}</div>

                    <div className={styles.row}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("bankAccount")}</label>
                            <input className={styles.input} type="text" placeholder={t("enterBank")}
                                value={form.bankAccount} onChange={(e) => handleChange("bankAccount", e.target.value)} />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t("ifscCode")}</label>
                            <input className={styles.input} type="text" placeholder={t("enterIfsc")}
                                value={form.ifscCode} onChange={(e) => handleChange("ifscCode", e.target.value)} />
                        </div>
                    </div>

                    <motion.button className={styles.saveBtn} onClick={handleSave} whileTap={{ scale: 0.97 }}>
                        <IoSaveOutline /> {t("saveProfile")}
                    </motion.button>

                    <AnimatePresence>
                        {saved && (
                            <motion.div className={styles.savedMsg}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                                <IoCheckmarkCircle /> {t("profileSaved")}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
}

export default function ProfilePage(props) {
    return (
        <LanguageProvider>
            <ProfileContent {...props} />
        </LanguageProvider>
    );
}
