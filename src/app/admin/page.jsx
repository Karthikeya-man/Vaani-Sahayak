"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import styles from "@/styles/Admin.module.css";

// Simulated incoming farmer sessions
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
    const chatEndRef = useRef(null);

    // Check auth on mount
    useEffect(() => {
        const token = sessionStorage.getItem("admin_token");
        if (token) {
            setIsAuthenticated(true);
        }
    }, []);

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

    // Simulate incoming sessions (only when authenticated)
    useEffect(() => {
        if (!isAuthenticated) return;
        const t = setTimeout(() => {
            setSessions(prev => [...NEW_SESSIONS, ...prev]);
        }, 8000);
        return () => clearTimeout(t);
    }, [isAuthenticated]);

    // Bump active count periodically (only when authenticated)
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
                    {!loginError && <div className={styles.errorText}></div>} {/* Keeps spacing */}

                    <Link href="/" className={styles.farmerLink} style={{ display: 'inline-block', marginTop: '1.5rem' }}>
                        ← Back to Farmer App
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.shell}>
            {/* Top bar */}
            <header className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    <span className={styles.logo}>🌿</span>
                    <div>
                        <div className={styles.brand}>Vaani Sahayak — Admin Portal</div>
                        <div className={styles.brandSub}>Real-time Farmer Support Dashboard</div>
                    </div>
                </div>
                <div className={styles.topBarRight}>
                    <button onClick={() => { sessionStorage.removeItem("admin_token"); setIsAuthenticated(false); }} className={styles.farmerLink} style={{ marginRight: '10px' }}>Logout</button>
                    <Link href="/" className={styles.farmerLink}>← Farmer App</Link>
                    <div className={styles.adminBadge}>👤 Admin</div>
                </div>
            </header>

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
                            {/* Chat header */}
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

                            {/* Messages */}
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

                            {/* Quick replies */}
                            <div className={styles.quickReplies}>
                                {ADMIN_REPLIES.slice(0, 3).map((r, i) => (
                                    <button key={i} className={styles.quickReplyBtn} onClick={() => quickReply(r)}>
                                        {r.slice(0, 35)}…
                                    </button>
                                ))}
                            </div>

                            {/* Reply input */}
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
        </div>
    );
}
