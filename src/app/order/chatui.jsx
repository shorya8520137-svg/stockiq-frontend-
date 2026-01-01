"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./chatui.module.css";

const SPINNER_FRAMES = ["|", "/", "-", "\\"];

export default function ChatUI() {
    const [open, setOpen] = useState(true);
    const [input, setInput] = useState("");

    const [lines, setLines] = useState([
        { type: "system", text: "Amigo Orders AI v1.0" },
        { type: "system", text: "Type your query below and press Enter." }
    ]);

    const [greeted, setGreeted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [spinnerIndex, setSpinnerIndex] = useState(0);

    const bottomRef = useRef(null);

    // Auto scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [lines, loading, spinnerIndex]);

    // Spinner animation
    useEffect(() => {
        if (!loading) return;
        const interval = setInterval(() => {
            setSpinnerIndex(i => (i + 1) % SPINNER_FRAMES.length);
        }, 120);
        return () => clearInterval(interval);
    }, [loading]);

    // 👋 GREETING (ONCE PER SESSION)
    useEffect(() => {
        if (open && !greeted) {
            setLines(prev => [
                ...prev,
                {
                    type: "bot",
                    text:
                        "Hi Shorya 👋\n" +
                        "I'm your Orders AI assistant! Here's what I can help you with:\n\n" +
                        "📦 Update Order Status:\n" +
                        "• awb 24234332 delivered\n" +
                        "• awb 24234332 cancelled\n\n" +
                        "📋 Bulk Updates:\n" +
                        "• 3456432, 24234332 delivered\n\n" +
                        "💬 Chat Commands:\n" +
                        "• Type 'help' for more commands\n" +
                        "• Type 'hi' to start a conversation\n\n" +
                        "What would you like to do today?"
                }
            ]);
            setGreeted(true);
        }
    }, [open, greeted]);

    // 🔍 PARSE AWB + STATUS
    const parseManualOverride = (text) => {
        const statusMatch = text.match(
            /\b(cancelled|canceled|delivered|manifested|shipped|rto|returned)\b/i
        );
        if (!statusMatch) return null;

        const status = statusMatch[1].toUpperCase();
        const awbs = text.match(/\d{6,}/g);
        if (!awbs || awbs.length === 0) return null;

        return { awbs, status };
    };

    // 🤖 HANDLE BASIC QUERIES LOCALLY
    const handleBasicQuery = (text) => {
        const lowerText = text.toLowerCase().trim();
        
        // Greetings
        if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(lowerText)) {
            return "Hello! 👋 I'm here to help you with order management. You can:\n\n" +
                   "• Update order status: 'awb 24234332 delivered'\n" +
                   "• Bulk update: '3456432, 24234332 cancelled'\n" +
                   "• Ask about order status\n" +
                   "• Get help with commands\n\n" +
                   "What would you like to do?";
        }
        
        // Help commands
        if (/^(help|commands|what can you do|\?)/.test(lowerText)) {
            return "Here are the commands I can help with:\n\n" +
                   "📦 Order Status Updates:\n" +
                   "• awb [number] [status] - Update single order\n" +
                   "• [awb1], [awb2] [status] - Bulk update\n\n" +
                   "📋 Available Statuses:\n" +
                   "• delivered, cancelled, shipped, manifested, rto, returned\n\n" +
                   "💡 Examples:\n" +
                   "• awb 24234332 delivered\n" +
                   "• 3456432, 24234332 cancelled\n\n" +
                   "💬 Chat Commands:\n" +
                   "• hi, hello - Start conversation\n" +
                   "• help - Show this help\n" +
                   "• thanks - Say thank you";
        }
        
        // Status inquiry
        if (/status|check|track/.test(lowerText) && /\d{6,}/.test(lowerText)) {
            const awb = text.match(/\d{6,}/)?.[0];
            return `🔍 To check or update status for AWB ${awb}:\n\n` +
                   "Use this format:\n" +
                   `awb ${awb} [status]\n\n` +
                   "Available statuses: delivered, cancelled, shipped, manifested, rto, returned";
        }
        
        // AWB format validation
        if (/^awb\s+\d+/.test(lowerText) && !/\b(cancelled|canceled|delivered|manifested|shipped|rto|returned)\b/i.test(lowerText)) {
            const awb = text.match(/\d{6,}/)?.[0];
            return `⚠️ Missing status for AWB ${awb}\n\n` +
                   "Please specify a status:\n" +
                   `• awb ${awb} delivered\n` +
                   `• awb ${awb} cancelled\n` +
                   `• awb ${awb} shipped\n` +
                   `• awb ${awb} manifested`;
        }
        
        // Invalid AWB format
        if (/^awb/.test(lowerText) && !/\d{6,}/.test(lowerText)) {
            return "⚠️ Invalid AWB format\n\n" +
                   "AWB numbers should be at least 6 digits.\n" +
                   "Example: awb 24234332 delivered";
        }
        
        // Just numbers (possible AWB)
        if (/^\d{6,}$/.test(lowerText)) {
            return `📦 I see AWB number: ${lowerText}\n\n` +
                   "To update its status, use:\n" +
                   `awb ${lowerText} [status]\n\n` +
                   "Example: awb " + lowerText + " delivered";
        }
        
        // Thank you
        if (/^(thank|thanks|thx|ty)/.test(lowerText)) {
            return "You're welcome! 😊 Is there anything else I can help you with?\n\n" +
                   "Type 'help' to see available commands.";
        }
        
        // Goodbye
        if (/^(bye|goodbye|exit|quit|see you)/.test(lowerText)) {
            return "Goodbye! 👋 Feel free to ask if you need help with orders later.\n\n" +
                   "Click the 🤖 button to chat with me anytime!";
        }
        
        return null; // No match found
    };

    // 🚀 SEND MESSAGE
    const sendMessage = async () => {
        if (!input.trim()) return;

        const question = input;
        setLines(prev => [...prev, { type: "user", text: question }]);
        setInput("");
        setLoading(true);

        try {
            // 🤖 CHECK BASIC QUERIES FIRST
            const basicResponse = handleBasicQuery(question);
            if (basicResponse) {
                setLoading(false);
                setLines(prev => [
                    ...prev,
                    { type: "bot", text: basicResponse }
                ]);
                return;
            }

            const parsed = parseManualOverride(question);

            // ✅ MANUAL STATUS OVERRIDE
            if (parsed) {
                const { awbs, status } = parsed;

                const url =
                    awbs.length === 1
                        ? `${process.env.NEXT_PUBLIC_API_URL}/api/status/manual-status-override`
                        : `${process.env.NEXT_PUBLIC_API_URL}/api/status/manual-status-override-bulk`;

                const body =
                    awbs.length === 1
                        ? { awb: awbs[0], status }
                        : { awbs, status };

                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });

                const data = await res.json();
                setLoading(false);

                if (!res.ok) {
                    setLines(prev => [
                        ...prev,
                        { type: "bot", text: "❌ Failed to update status. Please check the AWB number and try again." },
                    ]);
                    return;
                }

                if (awbs.length === 1) {
                    setLines(prev => [
                        ...prev,
                        {
                            type: "bot",
                            text: `✅ AWB ${awbs[0]} status updated to ${status}\n\nAnything else I can help you with?`,
                        },
                    ]);
                } else {
                    setLines(prev => [
                        ...prev,
                        {
                            type: "bot",
                            text: `✅ Bulk update completed:\n• ${data.updated?.length || 0} orders updated\n• ${data.notFound?.length || 0} orders not found\n\nAnything else I can help you with?`,
                        },
                    ]);
                }

                return;
            }

            // 🤖 FALLBACK FOR UNRECOGNIZED QUERIES
            setLoading(false);
            setLines(prev => [
                ...prev,
                {
                    type: "bot",
                    text: "🤔 I didn't understand that query.\n\n" +
                          "Try:\n" +
                          "• 'help' - See available commands\n" +
                          "• 'awb 24234332 delivered' - Update order status\n" +
                          "• 'hi' - Start a conversation\n\n" +
                          "What would you like to do?"
                },
            ]);

        } catch (error) {
            console.error(error);
            setLoading(false);
            setLines(prev => [
                ...prev,
                { type: "bot", text: "❌ Connection error. Please check your internet connection and try again." },
            ]);
        }
    };

    return (
        <>
            <div className={styles.fab} onClick={() => setOpen(o => !o)}>🤖</div>

            {open && (
                <div className={styles.terminal}>
                    <div className={styles.header}>Amigo · Orders AI</div>

                    <div className={styles.output}>
                        {lines.map((line, i) => (
                            <div key={i} className={`${styles.line} ${styles[line.type]}`}>
                                {line.type === "user" && <span className={styles.prompt}>$</span>}
                                {line.text}
                            </div>
                        ))}

                        {loading && (
                            <div className={`${styles.line} ${styles.bot}`}>
                                {SPINNER_FRAMES[spinnerIndex]}
                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    <div className={styles.inputRow}>
                        <span className={styles.prompt}>$</span>
                        <input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder="Try: hi, help, or awb 24234332 delivered"
                        />
                    </div>
                </div>
            )}
        </>
    );
}
