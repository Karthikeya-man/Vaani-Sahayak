"use client";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { translations } from "@/translations";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
    const [lang, setLangState] = useState("en");

    // Load saved language from localStorage on mount
    const [isLoaded, setIsLoaded] = useState(false);
    useEffect(() => {
        const saved = localStorage.getItem("vaani_lang");
        if (saved && translations[saved]) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLangState(saved);
        }
        setIsLoaded(true);
    }, []);

    // Persist language changes and update HTML lang attribute
    const setLang = useCallback((newLang) => {
        setLangState(newLang);
        localStorage.setItem("vaani_lang", newLang);
        if (typeof document !== "undefined") {
            document.documentElement.lang = newLang;
        }
    }, []);

    // Also set HTML lang on initial load
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.documentElement.lang = lang;
        }
    }, [lang]);

    const t = useCallback(
        (key) => {
            return translations[lang]?.[key] || translations["en"]?.[key] || key;
        },
        [lang]
    );

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
    return ctx;
}
