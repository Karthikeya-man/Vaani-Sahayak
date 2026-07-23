"use client";
import { useState, useRef, useEffect } from "react";
import { IoMicOutline, IoMic, IoSendOutline, IoVolumeHighOutline } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/context/LanguageContext";
import styles from "@/styles/VoiceBanner.module.css";

const SPEECH_LANG_MAP = {
    en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN",
    kn: "kn-IN", ml: "ml-IN", bn: "bn-IN", mr: "mr-IN",
    gu: "gu-IN", pa: "pa-IN", or: "or-IN", as: "as-IN",
};

const WELCOME_MSGS = {
    en: "🌾 Jai Kisan! I'm Vaani Sahayak, your farming friend. Ask me anything about crops, weather, schemes, or market prices!",
    hi: "🌾 जय किसान! मैं वाणी सहायक हूँ, आपका खेती का साथी। फसल, मौसम, योजनाओं या बाजार भाव के बारे में कुछ भी पूछें!",
    ta: "🌾 விவசாயி வாழ்க! நான் வாணி சகாயக், உங்கள் விவசாய நண்பன். பயிர், வானிலை, திட்டங்கள் பற்றி கேளுங்கள்!",
    te: "🌾 జై కిసాన్! నేను వాణి సహాయక్, మీ వ్యవసాయ మిత్రుడు. పంట, వాతావరణం, పథకాల గురించి అడగండి!",
    kn: "🌾 ಜೈ ಕಿಸಾನ್! ನಾನು ವಾಣಿ ಸಹಾಯಕ, ನಿಮ್ಮ ಕೃಷಿ ಸ್ನೇಹಿತ. ಬೆಳೆ, ಹವಾಮಾನ, ಯೋಜನೆ ಬಗ್ಗೆ ಕೇಳಿ!",
    ml: "🌾 ജൈ കിസാൻ! ഞാൻ വാണി സഹായക്, നിങ്ങളുടെ കൃഷി സഹായി. വിള, കാലാവസ്ഥ, പദ്ധതികൾ ചോദിക്കൂ!",
    bn: "🌾 জয় কিষান! আমি বাণী সহায়ক, আপনার কৃষি বন্ধু। ফসল, আবহাওয়া, প্রকল্প সম্পর্কে জিজ্ঞাসা করুন!",
    mr: "🌾 जय किसान! मी वाणी सहायक, तुमचा शेती मित्र. पीक, हवामान, योजना याबद्दल विचारा!",
    gu: "🌾 જય કિસાન! હું વાણી સહાયક, તમારો ખેતી મિત્ર. પાક, હવામાન, યોજના વિશે પૂછો!",
    pa: "🌾 ਜੈ ਕਿਸਾਨ! ਮੈਂ ਵਾਣੀ ਸਹਾਇਕ, ਤੁਹਾਡਾ ਖੇਤੀ ਮਿੱਤਰ ਹਾਂ। ਫ਼ਸਲ, ਮੌਸਮ, ਯੋਜਨਾ ਬਾਰੇ ਪੁੱਛੋ!",
    or: "🌾 ଜୟ କିଷାନ! ମୁଁ ବାଣୀ ସହାୟକ, ଆପଣଙ୍କ ଚାଷ ବନ୍ଧୁ। ଫସଲ, ପାଣିପାଗ, ଯୋଜନା ବିଷୟରେ ପଚାରନ୍ତୁ!",
    as: "🌾 জয় কৃষক! মই বাণী সহায়ক, আপোনাৰ কৃষি বন্ধু। শস্য, বতৰ, আঁচনিৰ বিষয়ে সোধক!",
};

export default function VoiceBanner() {
    const { t, lang } = useLanguage();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const recognitionRef = useRef(null);
    const chatEndRef = useRef(null);

    // Set welcome message when lang changes
    useEffect(() => {
        const welcomeMsg = WELCOME_MSGS[lang] || WELCOME_MSGS.en;
        setMessages([{ id: 1, role: "bot", text: welcomeMsg, ts: Date.now() }]);
    }, [lang]);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const sendMessage = async (text) => {
        if (!text.trim() || isLoading) return;
        const userMsg = { id: Date.now(), role: "user", text: text.trim(), ts: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInputText("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text.trim(), lang }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch response");
            }
            setMessages(prev => [...prev, { id: Date.now() + 1, role: "bot", text: data.reply, ts: Date.now() }]);
        } catch (err) {
            console.error("VoiceBanner send error:", err);
            setMessages(prev => [...prev, { id: Date.now() + 1, role: "bot", text: "🙏 Sorry, there was an error. Please try again.", ts: Date.now() }]);
        } finally {
            setIsLoading(false);
        }
    };

    const startListening = () => {
        if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
            alert("Speech recognition not supported in this browser. Please use Chrome.");
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SR();
        recognition.lang = SPEECH_LANG_MAP[lang] || "hi-IN";
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onstart = () => setIsListening(true);
        recognition.onresult = (e) => {
            let t = "";
            for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
            setInputText(t);
        };
        recognition.onend = () => {
            setIsListening(false);
            setInputText(prev => { if (prev.trim()) sendMessage(prev); return ""; });
        };
        recognition.onerror = () => setIsListening(false);
        recognitionRef.current = recognition;
        recognition.start();
    };

    const stopListening = () => recognitionRef.current?.stop();

    const speakText = (text) => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = SPEECH_LANG_MAP[lang] || "hi-IN";
        utt.rate = 0.9;
        window.speechSynthesis.speak(utt);
    };

    return (
        <motion.div className={styles.chatCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}>

            {/* Header */}
            <div className={styles.chatHeader}>
                <div className={styles.botAvatar}>🌿</div>
                <div>
                    <div className={styles.botName}>Vaani Sahayak</div>
                    <div className={styles.botStatus}>
                        <span className={styles.onlineDot} />
                        {isLoading ? "Thinking..." : "Online"}
                    </div>
                </div>
            </div>

            {/* Chat thread */}
            <div className={styles.chatThread}>
                <AnimatePresence initial={false}>
                    {messages.map(msg => (
                        <motion.div key={msg.id}
                            className={`${styles.bubbleRow} ${msg.role === "user" ? styles.bubbleRowUser : ""}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}>

                            {msg.role === "bot" && <div className={styles.botAvatarSmall}>🌿</div>}

                            <div className={`${styles.bubble} ${msg.role === "user" ? styles.bubbleUser : styles.bubbleBot}`}>
                                <p className={styles.bubbleText}>{msg.text}</p>
                                {msg.role === "bot" && (
                                    <button className={styles.speakBtn} onClick={() => speakText(msg.text)} title="Listen">
                                        <IoVolumeHighOutline size={13} />
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Typing indicator */}
                {isLoading && (
                    <motion.div className={`${styles.bubbleRow}`}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className={styles.botAvatarSmall}>🌿</div>
                        <div className={`${styles.bubble} ${styles.bubbleBot} ${styles.typingBubble}`}>
                            <span className={styles.dot} /><span className={styles.dot} /><span className={styles.dot} />
                        </div>
                    </motion.div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input row (Terminal Style) */}
            <div className={styles.inputRow}>
                {/* AI Orb acts as the primary assistant button */}
                <div className={styles.orbContainer}>
                    <button
                        className={`${styles.aiOrb} ${isListening ? styles.orbActive : ""}`}
                        onClick={isListening ? stopListening : startListening}
                        aria-label="Voice input">
                        {isListening ? <IoMic size={28} /> : <IoMicOutline size={28} />}
                    </button>
                </div>

                {/* Sleek Terminal Input Row */}
                <div className={styles.terminalInputRow}>
                    <input
                        type="text"
                        placeholder={t("micPlaceholder")}
                        className={styles.textInput}
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && sendMessage(inputText)}
                    />
                    <button className={styles.sendBtn} onClick={() => sendMessage(inputText)} aria-label="Send">
                        <IoSendOutline size={18} />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
