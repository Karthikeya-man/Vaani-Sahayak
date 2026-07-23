"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        const resetScroll = () => {
            // Scroll the window itself
            window.scrollTo({ top: 0, behavior: "instant" });

            // Scroll any mainContent containers (since the app uses custom scrolling areas)
            const mainContents = document.querySelectorAll('[class*="mainContent"]');
            mainContents.forEach(el => {
                if (el.scrollTo) {
                    el.scrollTo({ top: 0, behavior: "instant" });
                } else {
                    el.scrollTop = 0;
                }
            });

            // For good measure, also reset document body/html if needed
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        };

        // Try resetting immediately and after a short delay to account for React re-renders or animations
        resetScroll();
        requestAnimationFrame(resetScroll);
        setTimeout(resetScroll, 50);
        setTimeout(resetScroll, 100);

    }, [pathname]); // Runs every time the route changes

    return null; // This component doesn't render anything visually
}
