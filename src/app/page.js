"use client";
import { useState, useEffect, useRef } from "react";
import {
  IoCloudOutline, IoDocumentTextOutline, IoBarChartOutline,
  IoCameraOutline, IoNotificationsOutline, IoHelpCircleOutline
} from "react-icons/io5";
import { useRouter } from "next/navigation";
import { LanguageProvider, useLanguage } from "@/context/LanguageContext";
import SplashScreen from "@/components/SplashScreen";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import VoiceBanner from "@/components/VoiceBanner";
import FeatureCard from "@/components/FeatureCard";
import UpdatesCarousel from "@/components/UpdatesCarousel";
import LanguageModal from "@/components/LanguageModal";
import ProfilePage from "@/app/profile/page";
import WebFooter from "@/components/WebFooter";
import styles from "@/styles/Home.module.css";

const FEATURES = [
  { icon: <IoCloudOutline />, titleKey: "weatherTitle", subKey: "weatherSub", colorClass: "weather", route: "/weather" },
  { icon: <IoDocumentTextOutline />, titleKey: "schemesTitle", subKey: "schemesSub", colorClass: "schemes", route: "/schemes" },
  { icon: <IoBarChartOutline />, titleKey: "marketTitle", subKey: "marketSub", colorClass: "market", route: "/market" },
  { icon: <IoCameraOutline />, titleKey: "cropTitle", subKey: "cropSub", colorClass: "crop", route: "/crop" },
  { icon: <IoNotificationsOutline />, titleKey: "alertsTitle", subKey: "alertsSub", colorClass: "alerts", route: "/alerts" },
  { icon: <IoHelpCircleOutline />, titleKey: "helpTitle", subKey: "helpSub", colorClass: "help", route: "/help" },
];

import { LocationProvider } from "@/context/LocationContext";
import LocationModal from "@/components/LocationModal";

// ... existing code

function HomeContent() {
  const { t, lang, setLang } = useLanguage();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Only show splash screen once per browser session
    if (sessionStorage.getItem("splashShown")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSplash(false);
    }
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem("splashShown", "true");
  };

  const [showLangModal, setShowLangModal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [currentView, setCurrentView] = useState("home");
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);

  // Lock body scroll while splash is visible so page can't drift behind it
  useEffect(() => {
    if (showSplash) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
      const scrollIt = () => {
        window.scrollTo({ top: 0, behavior: "instant" });
        if (mainRef.current) {
          mainRef.current.scrollTo({ top: 0, behavior: "instant" });
          mainRef.current.scrollTop = 0;
        }
      };
      scrollIt();
      requestAnimationFrame(scrollIt);
      setTimeout(scrollIt, 50);
      setTimeout(scrollIt, 150);
    }
    return () => { document.body.classList.remove('no-scroll'); };
  }, [showSplash]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentView(tab === "profile" ? "profile" : "home");
  };

  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;

  return (
    <div className={styles.appShell}>
      {/* ── Top header (spans full width) ── */}
      <Header
        onLocationClick={() => setShowLocModal(true)}
        onLanguageClick={() => setShowLangModal(true)}
        onProfileClick={() => handleTabChange("profile")}
        onMenuClick={() => setSidebarOpen(o => !o)}
        sidebarOpen={sidebarOpen}
      />

      {/* ── Slide-in sidebar drawer (desktop only) ── */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={styles.bodyRow}>
        {/* ── Main scrollable content ── */}
        <main className={styles.mainContent} ref={mainRef}>
          {currentView === "profile" ? (
            <ProfilePage onBack={() => { setCurrentView("home"); setActiveTab("home"); }} />
          ) : (
            <>
              <VoiceBanner />
              <div className={styles.featureGrid}>
                {FEATURES.map((feat, idx) => (
                  <FeatureCard
                    key={feat.titleKey}
                    icon={feat.icon}
                    title={t(feat.titleKey)}
                    subtitle={t(feat.subKey)}
                    colorClass={feat.colorClass}
                    delay={0.3 + idx * 0.06}
                    onClick={() => router.push(feat.route)}
                  />
                ))}
              </div>
              <UpdatesCarousel />
              <WebFooter />
            </>
          )}
        </main>
      </div>

      {/* ── Bottom nav (tablet + mobile only, hidden on desktop via CSS) ── */}
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

export default function HomePage() {
  return (
    <LanguageProvider>
      <LocationProvider>
        <HomeContent />
      </LocationProvider>
    </LanguageProvider>
  );
}
