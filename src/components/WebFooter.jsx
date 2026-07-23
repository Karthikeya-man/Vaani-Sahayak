"use client";
import {
    IoLeafOutline, IoCallOutline, IoMailOutline, IoLogoTwitter,
    IoLogoFacebook, IoCloudOutline, IoDocumentTextOutline,
    IoBarChartOutline, IoCameraOutline, IoNotificationsOutline,
    IoHelpCircleOutline, IoLocationOutline
} from "react-icons/io5";
import styles from "@/styles/WebFooter.module.css";

export default function WebFooter() {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>

                {/* ── Column 1: About ── */}
                <div className={styles.col}>
                    <div className={styles.brand}>
                        <IoLeafOutline className={styles.brandIcon} />
                        <span className={styles.brandName}>Vaani Sahayak</span>
                    </div>
                    <p className={styles.about}>
                        India&apos;s voice-first smart assistant for farmers — providing
                        real-time weather, government schemes, market prices, and crop
                        disease detection in 12 Indian languages.
                    </p>
                    <div className={styles.badges}>
                        <span className={styles.badge}>🇮🇳 Made in India</span>
                        <span className={styles.badge}>12 Languages</span>
                        <span className={styles.badge}>Free Service</span>
                    </div>
                </div>

                {/* ── Column 2: Features ── */}
                <div className={styles.col}>
                    <h3 className={styles.colTitle}>Features</h3>
                    <ul className={styles.linkList}>
                        <li><IoCloudOutline />        <span>Weather Forecast</span></li>
                        <li><IoDocumentTextOutline /> <span>Government Schemes</span></li>
                        <li><IoBarChartOutline />     <span>Market Prices</span></li>
                        <li><IoCameraOutline />       <span>Crop Disease Scan</span></li>
                        <li><IoNotificationsOutline /><span>Farm Alerts</span></li>
                        <li><IoHelpCircleOutline />   <span>Expert Help</span></li>
                    </ul>
                </div>

                {/* ── Column 3: Contact & Toll-free ── */}
                <div className={styles.col}>
                    <h3 className={styles.colTitle}>Contact & Help</h3>

                    <div className={styles.tollfreeCard}>
                        <div className={styles.tollfreeIcon}><IoCallOutline /></div>
                        <div>
                            <div className={styles.tollfreeLabel}>Toll-Free Helpline</div>
                            <div className={styles.tollfreeNumber}>1800-XXX-XXXX</div>
                            <div className={styles.tollfreeSub}>Free · Mon–Sat · 8am – 8pm IST</div>
                        </div>
                    </div>

                    <div className={styles.contactRow}>
                        <IoMailOutline className={styles.contactIcon} />
                        <span>help@vaanisahayak.in</span>
                    </div>
                    <div className={styles.contactRow}>
                        <IoLocationOutline className={styles.contactIcon} />
                        <span>Ministry of Agriculture, New Delhi</span>
                    </div>

                    <div className={styles.socials}>
                        <a className={styles.socialBtn} href="#" aria-label="Twitter"><IoLogoTwitter /></a>
                        <a className={styles.socialBtn} href="#" aria-label="Facebook"><IoLogoFacebook /></a>
                    </div>
                </div>

            </div>

            {/* ── Bottom bar ── */}
            <div className={styles.bottomBar}>
                <span>© 2025 Vaani Sahayak. All rights reserved.</span>
                <span className={styles.dividerDot}>·</span>
                <span>Built for Bharat 🇮🇳</span>
                <span className={styles.dividerDot}>·</span>
                <span>Powered by Bhashini API</span>
                <span className={styles.dividerDot}>·</span>
                <a href="/admin" className={styles.adminLink}>🛠 Admin Portal</a>
            </div>
        </footer>
    );
}
