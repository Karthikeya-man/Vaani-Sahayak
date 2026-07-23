"use client";
import { useState } from "react";
import { IoArrowBack } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import { useLocation, LocationProvider } from "@/context/LocationContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import LanguageModal from "@/components/LanguageModal";
import LocationModal from "@/components/LocationModal";
import ChatAssistant from "@/components/ChatAssistant";
import styles from "@/styles/Help.module.css";

function HelpContent() {
    const { t, lang, setLang } = useLanguage();
    const { location, translatedLocation } = useLocation();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("home");

    const [showLangModal, setShowLangModal] = useState(false);
    const [showLocModal, setShowLocModal] = useState(false);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "home") router.push("/");
    };

    // Prepare context for Gemini
    const chatContext = {
        district: location.district || location.state || "India",
        crop: "mixed"
    };

    return (
        <div className={styles.appShell}>
            <Header
                onLocationClick={() => setShowLocModal(true)}
                onLanguageClick={() => setShowLangModal(true)}
                onMenuClick={() => setSidebarOpen(o => !o)}
                sidebarOpen={sidebarOpen}
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
                        <h1 className={styles.pageTitle}>{t("helpTitle")}</h1>
                    </div>

                    <div className={styles.container}>
                        <div style={{ height: '70vh', width: '100%', margin: '0 auto' }}>
                           <ChatAssistant language={lang} context={chatContext} />
                        </div>

                    </div>
                </main>
            </div>

            <Footer activeTab={activeTab} onTabChange={handleTabChange} />

            <LanguageModal
                isOpen={showLangModal}
                onClose={() => setShowLangModal(false)}
                selectedLang={lang}
                onSelectLang={setLang}
            />

            <LocationModal
                isOpen={showLocModal}
                onClose={() => setShowLocModal(false)}
            />
        </div>
    );
}

export default function HelpPage() {
    return (
        <LanguageProvider>
            <LocationProvider>
                <HelpContent />
            </LocationProvider>
        </LanguageProvider>
    );
}
