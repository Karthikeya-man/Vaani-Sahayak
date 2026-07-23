"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLanguage } from "./LanguageContext";
// Assume Bhashini translation function is available or will be soon, we use a placeholder or existing translations if applicable

const LocationContext = createContext();

export function LocationProvider({ children }) {
    const { lang } = useLanguage();
    const [location, setLocationState] = useState({
        state: "",
        district: "",
        village: "",
    });

    const [isLoaded, setIsLoaded] = useState(false);

    // Load from localStorage only on the client strictly after initial hydration
    useEffect(() => {
        const saved = localStorage.getItem("vaani_location");
        if (saved) {
            try {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setLocationState(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved location", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Derived state for translated values
    const [translatedLocation, setTranslatedLocation] = useState({
        state: "",
        district: "",
        village: "",
    });

    const setLocation = useCallback((newLocation) => {
        setLocationState(newLocation);
        localStorage.setItem("vaani_location", JSON.stringify(newLocation));
    }, []);

    // Effect to translate location when language or location changes
    useEffect(() => {
        // Here we ideally call Bhashini API to translate the location strings
        // For now, in a realistic mockup we might use a dummy async function or translations object
        const fetchTranslations = async () => {
            if (lang === "en") {
                setTranslatedLocation(location);
                return;
            }

            // Pseudo-Bhashini call or translation logic
            // const res = await bhashiniTranslate({ text: location.state, source: 'en', target: lang });
            // We'll mimic this with a simple suffix substitution for demonstration if no API is wired yet
            setTranslatedLocation({
                state: location.state ? `${location.state} (${lang})` : "",
                district: location.district ? `${location.district} (${lang})` : "",
                village: location.village ? `${location.village} (${lang})` : "",
            });
        };

        fetchTranslations();
    }, [location, lang]);

    return (
        <LocationContext.Provider value={{ location, setLocation, translatedLocation, isLoaded }}>
            {children}
        </LocationContext.Provider>
    );
}

export function useLocation() {
    const ctx = useContext(LocationContext);
    if (!ctx) throw new Error("useLocation must be used within LocationProvider");
    return ctx;
}
