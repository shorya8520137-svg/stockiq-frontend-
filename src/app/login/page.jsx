"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import styles from "./login.module.css";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("login"); // "login" or "about"
    const { login, availableUsers } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        // Simulate loading delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1500));

        const result = login(email, password);

        if (result.success) {
            setTimeout(() => {
                router.push("/products");
            }, 1000);
        } else {
            setError(result.error || "Invalid credentials");
            setLoading(false);
        }
    };

    const switchTab = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className={styles.container}>
            {/* Background Image */}
            <div className={styles.backgroundImage}>
                <img src="/login.png" alt="Background" />
                <div className={styles.overlay}></div>
            </div>

            {/* Navigation Tabs */}
            <div className={styles.tabNavigation}>
                <button 
                    className={`${styles.tabBtn} ${activeTab === "login" ? styles.active : ""}`}
                    onClick={() => switchTab("login")}
                >
                    Login
                </button>
                <button 
                    className={`${styles.tabBtn} ${activeTab === "about" ? styles.active : ""}`}
                    onClick={() => switchTab("about")}
                >
                    About Us
                </button>
            </div>

            {/* Sliding Content Container */}
            <div className={styles.contentContainer}>
                {/* Login Panel */}
                <div className={`${styles.panel} ${styles.loginPanel} ${activeTab === "login" ? styles.active : ""}`}>
                    <div className={styles.loginContent}>
                        {/* Left Section - Branding & Motivation */}
                        <div className={styles.loginLeft}>
                            <div className={styles.brandSection}>
                                <div className={styles.logo}>
                                    <div className={styles.logoIcon}>H</div>
                                    <span className={styles.logoText}>
                                        <span className={styles.hunyPink}>huny</span>
                                        <span className={styles.hunyBlue}>huny</span>
                                    </span>
                                </div>
                                <h1 className={styles.title}>Welcome Back</h1>
                                <p className={styles.subtitle}>
                                    Empowering your success, one login at a time
                                </p>
                                <div className={styles.motivationalQuote}>
                                    "Excellence is not a skill, it's an attitude. Let's make today count!"
                                </div>
                            </div>
                        </div>

                        {/* Right Section - Login Form */}
                        <div className={styles.loginRight}>
                            <form onSubmit={handleSubmit} className={styles.form}>
                            {error && (
                                <div className={styles.errorMessage}>
                                    <span>⚠️</span>
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Email Address</label>
                                <input
                                    type="email"
                                    className={styles.input}
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <div className={styles.labelRow}>
                                    <label className={styles.label}>Password</label>
                                    <a href="#" className={styles.forgotLink}>Forgot password?</a>
                                </div>
                                <input
                                    type="password"
                                    className={styles.input}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className={`${styles.submitBtn} ${loading ? styles.loading : ""}`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <div className={styles.spinner}></div>
                                        Signing in...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </button>

                            <div className={styles.footer}>
                                {/* Demo credentials section removed */}
                            </div>
                        </form>
                        </div>
                    </div>
                </div>

                {/* About Us Panel */}
                <div className={`${styles.panel} ${styles.aboutPanel} ${activeTab === "about" ? styles.active : ""}`}>
                    <div className={styles.aboutContent}>
                        <div className={styles.aboutHeader}>
                            <h1 className={styles.aboutTitle}>About hunyhuny</h1>
                            <p className={styles.aboutSubtitle}>
                                Empowering teams to achieve extraordinary results through intelligent business solutions
                            </p>
                            <div className={styles.missionStatement}>
                                "Your success is our mission. Together, we build the future of business excellence."
                            </div>
                        </div>

                        <div className={styles.featuresGrid}>
                            <div className={styles.feature}>
                                <div className={styles.featureIcon}>🚀</div>
                                <h3>Accelerate Growth</h3>
                                <p>Transform your potential into performance. Our platform empowers your team to achieve breakthrough results and exceed every goal.</p>
                            </div>
                            
                            <div className={styles.feature}>
                                <div className={styles.featureIcon}>💡</div>
                                <h3>Innovate Fearlessly</h3>
                                <p>Break barriers and push boundaries. With cutting-edge tools at your fingertips, innovation becomes your competitive advantage.</p>
                            </div>
                            
                            <div className={styles.feature}>
                                <div className={styles.featureIcon}>🎯</div>
                                <h3>Achieve Excellence</h3>
                                <p>Excellence isn't an accident—it's a habit. Our platform helps you build systems that deliver consistent, outstanding results.</p>
                            </div>
                            
                            <div className={styles.feature}>
                                <div className={styles.featureIcon}>🌟</div>
                                <h3>Inspire Success</h3>
                                <p>Success is contagious. Create a culture of achievement where every team member thrives and contributes to collective greatness.</p>
                            </div>
                        </div>

                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <div className={styles.statNumber}>500K+</div>
                                <div className={styles.statLabel}>Goals Achieved</div>
                            </div>
                            <div className={styles.stat}>
                                <div className={styles.statNumber}>98%</div>
                                <div className={styles.statLabel}>Success Rate</div>
                            </div>
                            <div className={styles.stat}>
                                <div className={styles.statNumber}>24/7</div>
                                <div className={styles.statLabel}>Team Support</div>
                            </div>
                        </div>

                        <div className={styles.cta}>
                            <button 
                                className={styles.ctaBtn}
                                onClick={() => switchTab("login")}
                            >
                                Start Your Success Journey
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

