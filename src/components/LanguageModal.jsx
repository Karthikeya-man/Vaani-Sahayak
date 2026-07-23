"use client";
import { motion, AnimatePresence } from "framer-motion";
import { IoCheckmarkCircle, IoCloseOutline } from "react-icons/io5";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/LanguageModal.module.css";

const LANGUAGES = [
    { code: "en", native: "English", label: "English" },
    { code: "hi", native: "हिन्दी", label: "Hindi" },
    { code: "ta", native: "தமிழ்", label: "Tamil" },
    { code: "te", native: "తెలుగు", label: "Telugu" },
    { code: "kn", native: "ಕನ್ನಡ", label: "Kannada" },
    { code: "ml", native: "മലയാളം", label: "Malayalam" },
    { code: "bn", native: "বাংলা", label: "Bengali" },
    { code: "mr", native: "मराठी", label: "Marathi" },
    { code: "gu", native: "ગુજરાતી", label: "Gujarati" },
    { code: "pa", native: "ਪੰਜਾਬੀ", label: "Punjabi" },
    { code: "or", native: "ଓଡ଼ିଆ", label: "Odia" },
    { code: "as", native: "অসমীয়া", label: "Assamese" },
];

export default function LanguageModal({ isOpen, onClose, selectedLang, onSelectLang }) {
    const { t } = useLanguage();

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className={styles.backdrop}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                    <motion.div
                        className={styles.modal}
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        {/* Drag handle */}
                        <div className={styles.handle} />

                        {/* Title row */}
                        <div className={styles.titleRow}>
                            <h2 className={styles.modalTitle}>{t("chooseLang")}</h2>
                            <button className={styles.closeBtnInner} onClick={onClose} aria-label="Close">
                                <IoCloseOutline size={22} />
                            </button>
                        </div>

                        {/* Language grid */}
                        <div className={styles.grid}>
                            {LANGUAGES.map((lang) => {
                                const isSelected = selectedLang === lang.code;
                                return (
                                    <button
                                        key={lang.code}
                                        className={`${styles.langBtn} ${isSelected ? styles.langBtnActive : ""}`}
                                        onClick={() => { onSelectLang(lang.code); onClose(); }}
                                    >
                                        <div className={styles.langBtnInner}>
                                            {isSelected && (
                                                <IoCheckmarkCircle className={styles.checkmark} />
                                            )}
                                            <span className={styles.scriptName}>{lang.native}</span>
                                            <span className={styles.englishName}>{lang.label}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
