"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import styles from "@/styles/Admin.module.css";

const INITIAL_SESSIONS = [
    { id: 1, name: "Ramesh Kumar", lang: "hi", village: "Badlapur, UP", query: "मेरी गेहूं की फसल में पीले धब्बे आ रहे हैं", time: "2 min ago", status: "waiting", avatar: "👨‍🌾" },
    { id: 2, name: "Kavitha S.", lang: "ta", village: "Thanjavur, TN", query: "தக்காளி விலை இன்று என்ன?", time: "5 min ago", status: "active", avatar: "👩‍🌾" },
    { id: 3, name: "Suresh Patil", lang: "mr", village: "Pune, MH", query: "PM-KISAN मला मिळाले नाही", time: "12 min ago", status: "resolved", avatar: "👨‍🌾" },
    { id: 4, name: "Lakshmi Devi", lang: "te", village: "Guntur, AP", query: "వరి పంటకు ఎరువు ఎప్పుడు వేయాలి?", time: "18 min ago", status: "waiting", avatar: "👩‍🌾" },
    { id: 5, name: "Gurpreet Singh", lang: "pa", village: "Amritsar, PB", query: "ਮੇਰੀ ਝੋਨੇ ਦੀ ਫ਼ਸਲ ਨੂੰ ਬਿਮਾਰੀ ਹੈ", time: "25 min ago", status: "active", avatar: "👨‍🌾" },
];

const NEW_SESSIONS = [
    { id: 6, name: "Anita Bai", lang: "hi", village: "Jaipur, RJ", query: "सब्जी का बीमा कैसे करें?", time: "just now", status: "waiting", avatar: "👩‍🌾" },
    { id: 7, name: "Mohan Das", lang: "or", village: "Cuttack, OD", query: "ଧାନ ପ୍ରତ୍ୟୟ ଯୋଜନା ବିଷୟରେ ଜାଣିବା", time: "just now", status: "waiting", avatar: "👨‍🌾" },
];

const STATUS_COLORS = { waiting: "#f59e0b", active: "#10b981", resolved: "#6366f1" };
const LANG_LABELS = { en: "EN", hi: "HI", ta: "TA", te: "TE", kn: "KN", ml: "ML", bn: "BN", mr: "MR", gu: "GU", pa: "PA", or: "OR", as: "AS" };

const ADMIN_REPLIES = [
    "Thank you for reaching out! I'm checking on this right away. 🌾",
    "I understand your concern. Let me look up the information for you.",
    "Great question! I'll provide the details shortly.",
    "Your issue has been noted. Our team will resolve this within the hour.",
    "Please share more details so I can help you better.",
];

export default function AdminPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [activeTab, setActiveTab] = useState("feedback"); // "support" or "feedback"
    const [sessions, setSessions] = useState(INITIAL_SESSIONS);
    const [selected, setSelected] = useState(INITIAL_SESSIONS[0]);
    const [chats, setChats] = useState({
        1: [{ role: "farmer", text: "मेरी गेहूं की फसल में पीले धब्बे आ रहे हैं" }],
        2: [{ role: "farmer", text: "தக்காளி விலை இன்று என்ன?" }],
        3: [{ role: "farmer", text: "PM-KISAN मला मिळाले नाही" }, { role: "admin", text: "Your account is linked. Installment will arrive in 3 days. ✅" }],
        4: [{ role: "farmer", text: "వరి పంటకు ఎరువు ఎప్పుడు వేయాలి?" }],
        5: [{ role: "farmer", text: "ਮੇਰੀ ਝੋਨੇ ਦੀ ਫ਼ਸਲ ਨੂੰ ਬਿਮਾਰੀ ਹੈ" }],
    });
    const [replyText, setReplyText] = useState("");
    const [stats, setStats] = useState({ active: 23, today: 148, resolved: 112, avgTime: "4.2m" });
    const [feedbackStats, setFeedbackStats] = useState(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        const token = sessionStorage.getItem("admin_token");
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

    const fetchFeedbackData = async () => {
        setFeedbackLoading(true);
        try {
            const res = await fetch("/api/admin/feedback-stats");
            const data = await res.json();
            if (res.ok) {
                setFeedbackStats(data);
            }
        } catch (e) {
            console.warn("Failed to fetch feedback stats:", e.message);
        } finally {
            setFeedbackLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchFeedbackData();
        }
    }, [isAuthenticated, activeTab]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError("");
        setIsLoggingIn(true);

        try {
            const res = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) {
                sessionStorage.setItem("admin_token", data.token);
                setIsAuthenticated(true);
            } else {
                setLoginError(data.message || "Invalid credentials");
            }
        } catch (error) {
            setLoginError("Failed to connect to server");
        } finally {
            setIsLoggingIn(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        const t = setTimeout(() => {
            setSessions(prev => [...NEW_SESSIONS, ...prev]);
        }, 8000);
        return () => clearTimeout(t);
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const i = setInterval(() => {
            setStats(s => ({ ...s, active: s.active + (Math.random() > 0.5 ? 1 : -1) }));
        }, 5000);
        return () => clearInterval(i);
    }, [isAuthenticated]);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chats, selected]);

    const sendReply = () => {
        if (!replyText.trim() || !selected) return;
        setChats(prev => ({
            ...prev,
            [selected.id]: [...(prev[selected.id] || []), { role: "admin", text: replyText.trim() }],
        }));
        setSessions(prev => prev.map(s => s.id === selected.id ? { ...s, status: "resolved" } : s));
        setReplyText("");
    };

    const quickReply = (text) => {
        setChats(prev => ({
            ...prev,
            [selected.id]: [...(prev[selected.id] || []), { role: "admin", text }],
        }));
        setSessions(prev => prev.map(s => s.id === selected.id ? { ...s, status: "active" } : s));
    };

    if (!isAuthenticated) {
        return (
            <div className={styles.loginWrapper}>
                <div className={styles.loginCard}>
                    <div className={styles.loginLogo}>🌿</div>
                    <h1 className={styles.loginTitle}>Admin Login</h1>
                    <p className={styles.loginSub}>Vaani Sahayak Support Portal</p>

                    <form onSubmit={handleLogin}>
                        <input
                            type="text"
                            placeholder="Username"
                            className={styles.loginInput}
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            disabled={isLoggingIn}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            className={styles.loginInput}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isLoggingIn}
                            required
                        />
                        <button
                            type="submit"
                            className={styles.loginBtn}
                            disabled={isLoggingIn || !username || !password}
                        >
                            {isLoggingIn ? "Verifying..." : "Login"}
                        </button>
                    </form>

                    {loginError && <div className={styles.errorText}>{loginError}</div>}
                    {!loginError && <div className={styles.errorText}></div>}

                    <Link href="/" className={styles.farmerLink} style={{ display: 'inline-block', marginTop: '1.5rem' }}>
                        ← Back to Farmer App
                    </Link>
                </div>
            </div>
        );
    }

    const overallRatio = feedbackStats?.overall?.ratio ?? 85;
    const chatRatio = feedbackStats?.categories?.chat?.ratio ?? 88;
    const cropRatio = feedbackStats?.categories?.cropScan?.ratio ?? 92;
    const schemeRatio = feedbackStats?.categories?.schemeMatch?.ratio ?? 81;

    return (
        <div className={styles.shell}>
            {/* Top bar */}
            <header className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <span className={styles.logo}>🌿</span>
                    <div>
                        <div className={styles.brand}>Vaani Sahayak — Admin Portal</div>
                        <div className={styles.brandSub}>Real-time Support & Feedback Analytics</div>
                    </div>
                </div>
                <div className={styles.topBarRight}>
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '3px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setActiveTab('feedback')}
                            style={{
                                background: activeTab === 'feedback' ? '#2E7D32' : 'transparent',
                                color: '#fff',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '16px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            📊 Feedback Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('support')}
                            style={{
                                background: activeTab === 'support' ? '#2E7D32' : 'transparent',
                                color: '#fff',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '16px',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            💬 Live Support
                        </button>
                    </div>
                    <button onClick={() => { sessionStorage.removeItem("admin_token"); setIsAuthenticated(false); }} className={styles.farmerLink} style={{ marginRight: '5px' }}>Logout</button>
                    <Link href="/" className={styles.farmerLink}>← Farmer App</Link>
                    <div className={styles.adminBadge}>👤 Admin</div>
                </div>
            </header>

            {/* TAB 1: FEEDBACK ANALYTICS DASHBOARD */}
            {activeTab === 'feedback' && (
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto' }}>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '14px', padding: '1.2rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 700 }}>Overall Satisfaction</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{overallRatio}% 👍</div>
                            <div style={{ fontSize: '0.75rem', color: '#6e7681', marginTop: '4px' }}>
                                {feedbackStats?.overall?.helpful ?? 14} Helpful vs {feedbackStats?.overall?.unhelpful ?? 2} Unhelpful
                            </div>
                        </div>

                        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '14px', padding: '1.2rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 700 }}>Chat Assistant Feedback</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6', marginTop: '4px' }}>{chatRatio}% 👍</div>
                            <div style={{ fontSize: '0.75rem', color: '#6e7681', marginTop: '4px' }}>
                                {feedbackStats?.categories?.chat?.helpful ?? 8} Helpful | {feedbackStats?.categories?.chat?.unhelpful ?? 1} Unhelpful
                            </div>
                        </div>

                        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '14px', padding: '1.2rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 700 }}>Crop Scan Diagnoses</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#8b5cf6', marginTop: '4px' }}>{cropRatio}% 👍</div>
                            <div style={{ fontSize: '0.75rem', color: '#6e7681', marginTop: '4px' }}>
                                {feedbackStats?.categories?.cropScan?.helpful ?? 4} Helpful | {feedbackStats?.categories?.cropScan?.unhelpful ?? 0} Unhelpful
                            </div>
                        </div>

                        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '14px', padding: '1.2rem' }}>
                            <div style={{ fontSize: '0.75rem', color: '#8b949e', textTransform: 'uppercase', fontWeight: 700 }}>Scheme Match Results</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{schemeRatio}% 👍</div>
                            <div style={{ fontSize: '0.75rem', color: '#6e7681', marginTop: '4px' }}>
                                {feedbackStats?.categories?.schemeMatch?.helpful ?? 2} Helpful | {feedbackStats?.categories?.schemeMatch?.unhelpful ?? 1} Unhelpful
                            </div>
                        </div>
                    </div>

                    {/* Detailed Category Progress Bars */}
                    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '14px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#e6edf3' }}>
                            📊 Category Breakdown & Satisfaction Ratios
                        </h3>

                        {[
                            { name: '💬 AI Chat Assistant & IVR', ratio: chatRatio, color: '#3b82f6', helpful: feedbackStats?.categories?.chat?.helpful ?? 8, unhelpful: feedbackStats?.categories?.chat?.unhelpful ?? 1 },
                            { name: '🌿 Crop Disease Diagnoses', ratio: cropRatio, color: '#8b5cf6', helpful: feedbackStats?.categories?.cropScan?.helpful ?? 4, unhelpful: feedbackStats?.categories?.cropScan?.unhelpful ?? 0 },
                            { name: '📋 Scheme Match Recommendations', ratio: schemeRatio, color: '#f59e0b', helpful: feedbackStats?.categories?.schemeMatch?.helpful ?? 2, unhelpful: feedbackStats?.categories?.schemeMatch?.unhelpful ?? 1 },
                        ].map((cat) => (
                            <div key={cat.name} style={{ marginBottom: '1.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: 600, color: '#e6edf3' }}>{cat.name}</span>
                                    <span style={{ fontWeight: 700, color: cat.color }}>{cat.ratio}% Helpful ({cat.helpful} 👍 / {cat.unhelpful} 👎)</span>
                                </div>
                                <div style={{ background: '#21262d', height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: `${cat.ratio}%`, background: cat.color, height: '100%', transition: 'width 0.5s' }} />
                                    <div style={{ width: `${100 - cat.ratio}%`, background: '#ef4444', height: '100%', opacity: 0.7 }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recent Timeline Table */}
                    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '14px', padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: '#e6edf3' }}>
                            📅 Feedback Ratio Over Time
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', color: '#c9d1d9' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #30363d', textAlign: 'left', color: '#8b949e' }}>
                                    <th style={{ padding: '8px 12px' }}>Date</th>
                                    <th style={{ padding: '8px 12px' }}>Helpful (👍)</th>
                                    <th style={{ padding: '8px 12px' }}>Not Helpful (👎)</th>
                                    <th style={{ padding: '8px 12px' }}>Satisfaction Ratio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(feedbackStats?.timeline && feedbackStats.timeline.length > 0 ? feedbackStats.timeline : [
                                    { date: 'Today', helpful: 14, unhelpful: 2 },
                                    { date: 'Yesterday', helpful: 18, unhelpful: 3 },
                                    { date: '2026-07-26', helpful: 15, unhelpful: 1 }
                                ]).map((row, idx) => {
                                    const total = row.helpful + row.unhelpful;
                                    const ratio = total > 0 ? Math.round((row.helpful / total) * 100) : 0;
                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #21262d' }}>
                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{row.date}</td>
                                            <td style={{ padding: '10px 12px', color: '#10b981', fontWeight: 600 }}>{row.helpful}</td>
                                            <td style={{ padding: '10px 12px', color: '#ef4444', fontWeight: 600 }}>{row.unhelpful}</td>
                                            <td style={{ padding: '10px 12px', fontWeight: 700, color: ratio >= 80 ? '#10b981' : '#f59e0b' }}>
                                                {ratio}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: LIVE SUPPORT DASHBOARD */}
            {activeTab === 'support' && (
                <>
                    {/* Stats row */}
                    <div className={styles.statsRow}>
                        {[
                            { label: "Active Farmers", value: stats.active, icon: "🧑‍🌾", color: "#10b981" },
                            { label: "Queries Today", value: stats.today, icon: "💬", color: "#3b82f6" },
                            { label: "Resolved", value: stats.resolved, icon: "✅", color: "#6366f1" },
                            { label: "Avg Response", value: stats.avgTime, icon: "⚡", color: "#f59e0b" },
                        ].map((s) => (
                            <motion.div key={s.label} className={styles.statCard}
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <div className={styles.statIcon} style={{ color: s.color }}>{s.icon}</div>
                                <div className={styles.statValue} style={{ color: s.color }}>{s.value}</div>
                                <div className={styles.statLabel}>{s.label}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Main panel */}
                    <div className={styles.mainPanel}>
                        {/* Session list */}
                        <aside className={styles.sessionList}>
                            <div className={styles.sessionListHeader}>
                                <span>Farmer Sessions</span>
                                <span className={styles.sessionCount}>{sessions.length}</span>
                            </div>
                            <AnimatePresence>
                                {sessions.map(s => (
                                    <motion.div key={s.id}
                                        className={`${styles.sessionItem} ${selected?.id === s.id ? styles.sessionActive : ""}`}
                                        onClick={() => { setSelected(s); }}
                                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                        layout>
                                        <div className={styles.sessionAvatar}>{s.avatar}</div>
                                        <div className={styles.sessionInfo}>
                                            <div className={styles.sessionName}>{s.name}</div>
                                            <div className={styles.sessionQuery}>{s.query}</div>
                                            <div className={styles.sessionMeta}>
                                                <span className={styles.langTag}>{LANG_LABELS[s.lang]}</span>
                                                <span className={styles.sessionVillage}>{s.village}</span>
                                            </div>
                                        </div>
                                        <div className={styles.sessionRight}>
                                            <div className={styles.sessionTime}>{s.time}</div>
                                            <div className={styles.statusDot} style={{ background: STATUS_COLORS[s.status] }} />
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </aside>

                        {/* Chat panel */}
                        <main className={styles.chatPanel}>
                            {selected ? (
                                <>
                                    <div className={styles.chatPanelHeader}>
                                        <div className={styles.chatPanelAvatar}>{selected.avatar}</div>
                                        <div>
                                            <div className={styles.chatPanelName}>{selected.name}</div>
                                            <div className={styles.chatPanelMeta}>{selected.village} · Lang: {LANG_LABELS[selected.lang]}</div>
                                        </div>
                                        <div className={styles.statusBadge} style={{ background: STATUS_COLORS[selected.status] }}>
                                            {selected.status}
                                        </div>
                                    </div>

                                    <div className={styles.chatMessages}>
                                        {(chats[selected.id] || [{ role: "farmer", text: selected.query }]).map((msg, i) => (
                                            <motion.div key={i}
                                                className={`${styles.adminBubbleRow} ${msg.role === "admin" ? styles.adminBubbleRowRight : ""}`}
                                                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                                                <div className={`${styles.adminBubble} ${msg.role === "admin" ? styles.adminBubbleRight : styles.adminBubbleLeft}`}>
                                                    {msg.text}
                                                </div>
                                            </motion.div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>

                                    <div className={styles.quickReplies}>
                                        {ADMIN_REPLIES.slice(0, 3).map((r, i) => (
                                            <button key={i} className={styles.quickReplyBtn} onClick={() => quickReply(r)}>
                                                {r.slice(0, 35)}…
                                            </button>
                                        ))}
                                    </div>

                                    <div className={styles.replyRow}>
                                        <input
                                            className={styles.replyInput}
                                            placeholder="Type your reply to the farmer..."
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && sendReply()}
                                        />
                                        <button className={styles.replyBtn} onClick={sendReply}>Send ✉️</button>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.noSession}>Select a farmer session to begin</div>
                            )}
                        </main>
                    </div>
                </>
            )}
        </div>
    );
}
