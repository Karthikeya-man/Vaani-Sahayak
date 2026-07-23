"use client";
import { motion, AnimatePresence } from "framer-motion";
import { IoClose, IoLocationOutline, IoSaveOutline } from "react-icons/io5";
import { useLanguage } from "@/context/LanguageContext";
import { useLocation } from "@/context/LocationContext";
import { useState, useEffect } from "react";
import styles from "@/styles/LocationModal.module.css";

const LOCATION_DATA = {
    "Maharashtra": {
        "Nagpur": ["Katol", "Kalmeshwar", "Saoner", "Umred"],
        "Wardha": ["Arvi", "Hinganghat", "Deoli", "Seloo"],
        "Amravati": ["Achalpur", "Chandur", "Daryapur", "Morshi"],
        "Akola": ["Akot", "Balapur", "Murtizapur", "Telhara"],
        "Bhandara": ["Tumsar", "Mohadi", "Sakoli", "Lakhandur"]
    },
    "Madhya Pradesh": {
        "Bhopal": ["Berasia", "Huzur", "Kolar"],
        "Indore": ["Mhow", "Sanwer", "Depalpur"]
    },
    "Gujarat": {
        "Ahmedabad": ["Sanand", "Daskroi", "Dholka"],
        "Surat": ["Bardoli", "Mandvi", "Mangrol"]
    }
};

const STATES = [
    "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
    "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

export default function LocationModal({ isOpen, onClose }) {
    const { t } = useLanguage();
    const { location, setLocation } = useLocation();
    const [form, setForm] = useState({ state: "", district: "", village: "" });
    const [manualEntry, setManualEntry] = useState({ district: false, village: false });

    // Sync form whenever modal opens specifically
    useEffect(() => {
        if (isOpen) {

            setForm(location); // Safe because we only care about syncing on mount/open
            setManualEntry({ district: false, village: false }); // Reset manual entry state on open
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const handleChange = (field, value) => {
        if (value === "__OTHER__") {
            setManualEntry(prev => ({ ...prev, [field]: true }));
            setForm(prev => ({ ...prev, [field]: "" })); // Clear value for manual entry
            return;
        }

        setForm((prev) => {
            const newForm = { ...prev, [field]: value };
            if (field === "state") {
                newForm.district = "";
                newForm.village = "";
                setManualEntry({ district: false, village: false });
            } else if (field === "district") {
                newForm.village = "";
                setManualEntry(prev => ({ ...prev, village: false }));
            }
            return newForm;
        });
    };

    const handleSave = () => {
        setLocation(form);
        onClose();
    };

    const availableDistricts = form.state && LOCATION_DATA[form.state] ? Object.keys(LOCATION_DATA[form.state]) : [];
    const availableVillages = form.state && form.district && LOCATION_DATA[form.state]?.[form.district] ? LOCATION_DATA[form.state][form.district] : [];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className={styles.modal}
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className={styles.closeBtn} onClick={onClose} aria-label={t("close") || "Close"}>
                            <IoClose />
                        </button>

                        <div className={styles.header}>
                            <div className={styles.iconWrapper}>
                                <IoLocationOutline />
                            </div>
                            <h2 className={styles.title}>{t("selectLocation") || "Select Location"}</h2>
                            <p className={styles.subtitle}>{t("locationDesc") || "Set your location for local market prices and help desk rules."}</p>
                        </div>

                        <div className={styles.formContainer}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t("state") || "State"} *</label>
                                <select className={styles.select}
                                    value={form.state} onChange={(e) => handleChange("state", e.target.value)}>
                                    <option value="">{t("selectState") || "Select State"}</option>
                                    {STATES.map((s) => (<option key={s} value={s}>{s}</option>))}
                                </select>
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t("district") || "District"}</label>
                                {availableDistricts.length > 0 && !manualEntry.district ? (
                                    <select className={styles.select}
                                        value={form.district} onChange={(e) => handleChange("district", e.target.value)}>
                                        <option value="">{t("selectDistrict") || "Select District"}</option>
                                        {availableDistricts.map((d) => (<option key={d} value={d}>{d}</option>))}
                                        <option value="__OTHER__">{t("other") || "Other (Enter Manually)"}</option>
                                    </select>
                                ) : (
                                    <input className={styles.input} type="text" placeholder={t("enterDistrict") || "Enter your District"}
                                        value={form.district} onChange={(e) => handleChange("district", e.target.value)} />
                                )}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t("village") || "Village"}</label>
                                {availableVillages.length > 0 && !manualEntry.village ? (
                                    <select className={styles.select}
                                        value={form.village} onChange={(e) => handleChange("village", e.target.value)}>
                                        <option value="">{t("selectVillage") || "Select Village"}</option>
                                        {availableVillages.map((v) => (<option key={v} value={v}>{v}</option>))}
                                        <option value="__OTHER__">{t("other") || "Other (Enter Manually)"}</option>
                                    </select>
                                ) : (
                                    <input className={styles.input} type="text" placeholder={t("enterVillage") || "Enter your Village"}
                                        value={form.village} onChange={(e) => handleChange("village", e.target.value)} />
                                )}
                            </div>
                        </div>

                        <button className={styles.saveBtn} onClick={handleSave}>
                            <IoSaveOutline /> {t("saveLocation") || "Save Location"}
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
