"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    IoArrowBack, IoSearchOutline, IoChevronForward,
    IoClose, IoOpenOutline, IoShieldCheckmarkOutline,
    IoCalendarOutline, IoBusinessOutline
} from "react-icons/io5";
import { useRouter } from "next/navigation";
import { useLanguage, LanguageProvider } from "@/context/LanguageContext";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Footer from "@/components/Footer";
import styles from "@/styles/Schemes.module.css";

// ── Category definitions ──
const CATEGORIES = [
    { key: "all", labelKey: "schemesCatAll" },
    { key: "income", labelKey: "schemesCatIncome" },
    { key: "insurance", labelKey: "schemesCatInsurance" },
    { key: "credit", labelKey: "schemesCatCredit" },
    { key: "subsidy", labelKey: "schemesCatSubsidy" },
    { key: "state", labelKey: "schemesCatState" },
];

// ── Expanded mock data ──
const MOCK_SCHEMES = [
    {
        id: "pmkisan",
        icon: "💰",
        title: "PM-Kisan Samman Nidhi",
        description: "Provides income support of ₹6,000 per year to all landholding farmer families across India, disbursed in three equal installments.",
        category: "income",
        tags: ["Income Support", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All landholding farmer families",
            "Must have cultivable land in their name",
            "Subject to existing exclusion criteria (e.g., income taxpayers excluded)"
        ],
        benefits: [
            "₹6,000 per year in 3 installments of ₹2,000 each",
            "Directly transferred to bank account (DBT)",
            "No intermediary involved"
        ],
        applyLink: "https://pmkisan.gov.in/",
    },
    {
        id: "fby",
        icon: "🛡️",
        title: "Pradhan Mantri Fasal Bima Yojana",
        description: "Comprehensive crop insurance scheme protecting farmers against unseasonal rains, natural calamities, drought, floods, and pest attacks.",
        category: "insurance",
        tags: ["Insurance", "Central"],
        deadline: "Jul 31, 2026",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All farmers including sharecroppers and tenant farmers",
            "Must have crop sown notification from the state",
            "Both loanee and non-loanee farmers can enroll"
        ],
        benefits: [
            "Premium: 2% for Kharif, 1.5% for Rabi, 5% for horticulture & commercial crops",
            "Full insured amount on crop loss",
            "Coverage for prevented sowing & post-harvest losses up to 14 days"
        ],
        applyLink: "https://pmfby.gov.in/",
    },
    {
        id: "kcc",
        icon: "🏦",
        title: "Kisan Credit Card (KCC)",
        description: "Provides timely and adequate credit support to farmers for cultivation, purchase of inputs, and other farm needs at concessional interest rates.",
        category: "credit",
        tags: ["Credit", "Loans", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Finance",
        eligibility: [
            "Owner-cultivators, tenant farmers, oral lessees",
            "Must have valid land documents or tenancy proof",
            "Self Help Groups (SHGs) and Joint Liability Groups (JLGs)"
        ],
        benefits: [
            "Credit limit based on land holding and crop pattern",
            "Interest rate: 7% p.a. (effective 4% after interest subvention)",
            "Insurance cover for crop and personal accident",
            "Flexible repayment options post-harvest"
        ],
        applyLink: "https://www.pmkisan.gov.in/kcc",
    },
    {
        id: "pmkmy",
        icon: "🏗️",
        title: "PM Krishi Sinchai Yojana",
        description: "Ensures access to protective irrigation for every farm (Har Khet Ko Paani) and improves water use efficiency through micro-irrigation.",
        category: "subsidy",
        tags: ["Irrigation", "Subsidy", "Central"],
        deadline: "Mar 31, 2026",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All categories of farmers with own or leased land",
            "Farmers in water-stressed blocks get priority",
            "Available for both individual and community projects"
        ],
        benefits: [
            "Up to 55% subsidy for micro-irrigation (drip/sprinkler)",
            "Additional subsidy for small and marginal farmers",
            "Support for water harvesting structures and watershed development"
        ],
        applyLink: "https://pmksy.gov.in/",
    },
    {
        id: "smy",
        icon: "🌱",
        title: "Soil Health Card Scheme",
        description: "Every farmer gets a Soil Health Card (SHC) every 2 years with crop-wise nutrient recommendations to improve soil quality and yields.",
        category: "subsidy",
        tags: ["Soil Health", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All farmers across India",
            "No land size restriction",
            "Both owner and tenant farmers"
        ],
        benefits: [
            "Free soil testing and health card issuance",
            "Crop-wise fertilizer recommendation for optimal yield",
            "Reduces input cost by avoiding excess fertilizer use"
        ],
        applyLink: "https://soilhealth.dac.gov.in/",
    },
    {
        id: "nmsa",
        icon: "🌾",
        title: "National Mission for Sustainable Agriculture",
        description: "Promotes sustainable farming practices, organic farming, and climate-resilient agriculture to ensure food security.",
        category: "subsidy",
        tags: ["Organic", "Subsidy", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All farmers willing to adopt sustainable practices",
            "Farmer groups and cooperatives for cluster approach",
            "Priority for rain-fed and vulnerable regions"
        ],
        benefits: [
            "₹50,000/ha assistance for organic farming clusters",
            "Training and capacity building support",
            "Subsidy on organic inputs and bio-fertilizers"
        ],
        applyLink: "https://nmsa.dac.gov.in/",
    },
    {
        id: "mikusy",
        icon: "🏭",
        title: "Mukhyamantri Krishi Udyog Yojana",
        description: "State-level subsidy scheme for setting up agro-based industries, food processing units, and purchase of modern farm equipment.",
        category: "state",
        tags: ["Subsidy", "State", "Equipment"],
        deadline: "Dec 31, 2026",
        ministry: "State Agriculture Department",
        eligibility: [
            "Domicile of the respective state",
            "Farmer or agri-entrepreneur with a viable project plan",
            "Must have suitable land/space for the project"
        ],
        benefits: [
            "25-50% capital subsidy on machinery and equipment",
            "Up to ₹10 lakh for small food processing units",
            "Interest subvention on term loans from banks"
        ],
        applyLink: "#",
    },
    {
        id: "rytha",
        icon: "🌻",
        title: "Rythu Bandhu (Telangana)",
        description: "Investment support of ₹10,000 per acre per year to all landholding farmers of Telangana state for purchasing farm inputs.",
        category: "state",
        tags: ["Income Support", "State"],
        deadline: "Ongoing",
        ministry: "Telangana Agriculture Department",
        eligibility: [
            "All farmer landholders of Telangana",
            "Land must be recorded in the revenue records (Pahani)",
            "No income or land size ceiling"
        ],
        benefits: [
            "₹10,000 per acre per year (₹5,000 each for Kharif and Rabi)",
            "Farmers free to choose their own inputs",
            "No loan recovery deductions"
        ],
        applyLink: "https://rythubandhu.telangana.gov.in/",
    },
];

function SchemesContent() {
    const { t } = useLanguage();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("home");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [selectedScheme, setSelectedScheme] = useState(null);
    const tabsRef = useRef(null);

    // Filter by category + search
    const filteredSchemes = MOCK_SCHEMES.filter(s => {
        const matchesCategory = activeCategory === "all" || s.category === activeCategory;
        const lowerQ = searchQuery.toLowerCase();
        const matchesSearch = !searchQuery ||
            s.title.toLowerCase().includes(lowerQ) ||
            s.description.toLowerCase().includes(lowerQ) ||
            s.tags.some(tag => tag.toLowerCase().includes(lowerQ));
        return matchesCategory && matchesSearch;
    });

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === "home") router.push("/");
    };

    // Category color map for accent bars
    const categoryColor = {
        income: "#10b981",
        insurance: "#3b82f6",
        credit: "#f59e0b",
        subsidy: "#8b5cf6",
        state: "#ef4444",
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
                    {/* ── Page Header ── */}
                    <div className={styles.pageHeader}>
                        <button className={styles.backBtn} onClick={() => router.push("/")}>
                            <IoArrowBack size={24} />
                        </button>
                        <h1 className={styles.pageTitle}>{t("schemesPageTitle")}</h1>
                    </div>

                    {/* ── Search Bar ── */}
                    <div className={styles.searchBarContainer}>
                        <IoSearchOutline size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder={t("schemesSearchPlaceholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className={styles.clearBtn} onClick={() => setSearchQuery("")}>
                                <IoClose size={18} />
                            </button>
                        )}
                    </div>

                    {/* ── Category Tabs ── */}
                    <div className={styles.categoryTabs} ref={tabsRef}>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                className={`${styles.categoryPill} ${activeCategory === cat.key ? styles.categoryPillActive : ""}`}
                                onClick={() => setActiveCategory(cat.key)}
                            >
                                {t(cat.labelKey)}
                            </button>
                        ))}
                    </div>

                    {/* ── Schemes List ── */}
                    <div className={styles.schemesList}>
                        <AnimatePresence mode="popLayout">
                            {filteredSchemes.map((scheme, i) => (
                                <motion.div
                                    key={scheme.id}
                                    className={styles.schemeCard}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.3, delay: i * 0.04 }}
                                    onClick={() => setSelectedScheme(scheme)}
                                    layout
                                >
                                    <div
                                        className={styles.accentBar}
                                        style={{ background: categoryColor[scheme.category] || "#10b981" }}
                                    />
                                    <div className={styles.schemeIconBadge}>
                                        <span>{scheme.icon}</span>
                                    </div>
                                    <div className={styles.schemeContent}>
                                        <h3 className={styles.schemeTitle}>{scheme.title}</h3>
                                        <p className={styles.schemeDesc}>{scheme.description}</p>

                                        <div className={styles.tagsRow}>
                                            {scheme.tags.map(tag => (
                                                <span key={tag} className={styles.tag}>{tag}</span>
                                            ))}
                                            <span className={styles.deadlineTag}>
                                                <IoCalendarOutline size={14} />
                                                {scheme.deadline === "Ongoing" ? t("schemesOngoing") : scheme.deadline}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.actionArrow}>
                                        <IoChevronForward size={22} />
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {filteredSchemes.length === 0 && (
                            <motion.div
                                className={styles.emptyState}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                <span className={styles.emptyIcon}>📭</span>
                                <p>{t("schemesNoResults")}</p>
                            </motion.div>
                        )}
                    </div>
                </main>
            </div>

            <Footer activeTab={activeTab} onTabChange={handleTabChange} />

            {/* ── Detail Drawer/Modal ── */}
            <AnimatePresence>
                {selectedScheme && (
                    <>
                        <motion.div
                            className={styles.drawerScrim}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedScheme(null)}
                        />
                        <motion.div
                            className={styles.detailDrawer}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.92 }}
                            transition={{ type: "spring", damping: 28, stiffness: 340 }}
                        >
                            <div className={styles.drawerHandle} />
                            <button className={styles.drawerClose} onClick={() => setSelectedScheme(null)}>
                                <IoClose size={24} />
                            </button>

                            <div className={styles.drawerBody}>
                                <div className={styles.drawerHeader}>
                                    <span className={styles.drawerIcon}>{selectedScheme.icon}</span>
                                    <h2 className={styles.drawerTitle}>{selectedScheme.title}</h2>
                                </div>

                                <div className={styles.drawerMeta}>
                                    <span className={styles.metaItem}>
                                        <IoBusinessOutline size={16} />
                                        {selectedScheme.ministry}
                                    </span>
                                    <span className={styles.metaItem}>
                                        <IoCalendarOutline size={16} />
                                        {t("schemesDeadline")}: {selectedScheme.deadline === "Ongoing" ? t("schemesOngoing") : selectedScheme.deadline}
                                    </span>
                                </div>

                                <p className={styles.drawerDesc}>{selectedScheme.description}</p>

                                {/* Eligibility */}
                                <div className={styles.drawerSection}>
                                    <h4 className={styles.sectionLabel}>
                                        <IoShieldCheckmarkOutline size={18} />
                                        {t("schemesEligibility")}
                                    </h4>
                                    <ul className={styles.drawerList}>
                                        {selectedScheme.eligibility.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Benefits */}
                                <div className={styles.drawerSection}>
                                    <h4 className={styles.sectionLabel}>
                                        <span style={{ fontSize: "1.1rem" }}>🎁</span>
                                        {t("schemesBenefits")}
                                    </h4>
                                    <ul className={styles.drawerList}>
                                        {selectedScheme.benefits.map((item, i) => (
                                            <li key={i}>{item}</li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Apply CTA */}
                                {selectedScheme.applyLink && selectedScheme.applyLink !== "#" && (
                                    <a
                                        href={selectedScheme.applyLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.applyBtn}
                                    >
                                        <IoOpenOutline size={18} />
                                        {t("schemesApplyNow")}
                                    </a>
                                )}
                                {selectedScheme.applyLink === "#" && (
                                    <button className={styles.applyBtnDisabled} disabled>
                                        {t("schemesLearnMore")}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function SchemesPage() {
    return (
        <LanguageProvider>
            <SchemesContent />
        </LanguageProvider>
    );
}
