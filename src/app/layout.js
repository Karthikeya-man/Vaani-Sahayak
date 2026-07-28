import "./globals.css";
import ScrollToTop from "@/components/ScrollToTop";
import RegisterSW from "@/components/RegisterSW";

export const metadata = {
  title: "Vaani Sahayak | वाणी सहायक — Your Farming Assistant",
  description:
    "AI-powered multilingual farming assistant for Indian farmers. Get weather updates, government scheme info, market prices, and crop disease detection — all in your language.",
  keywords: "farming, agriculture, AI, India, farmer assistant, weather, mandi prices, government schemes, crop disease",
  manifest: "/manifest.json",
  icons: {
    icon: "/images/logo.png",
    apple: "/images/logo.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1B5E20",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <RegisterSW />
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
