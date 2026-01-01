"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SlackMessenger.module.css";

const TEAM_MEMBERS = [
    { id: 1, name: "John Doe", avatar: "JD", status: "online", role: "Manager", color: "#3b82f6" },
    { id: 2, name: "Sarah Wilson", avatar: "SW", status: "online", role: "Developer", color: "#10b981" },
    { id: 3, name: "Mike Chen", avatar: "MC", status: "away", role: "Support", color: "#f59e0b" },
    { id: 4, name: "Emma Davis", avatar: "ED", status: "offline", role: "Analyst", color: "#8b5cf6" },
];

const CHANNELS = [
    { id: 1, name: "General", icon: "💬", unread: 0, color: "#64748b" },
    { id: 2, name: "Orders", icon: "📦", unread: 3, color: "#3b82f6" },
    { id: 3, name: "Inventory", icon: "📊", unread: 1, color: "#10b981" },
    { id: 4, name: "Support", icon: "🛠️", unread: 0, color: "#f59e0b" },
];

const MESSAGES = {
    1: [
        { id: 1, user: "John Doe", avatar: "JD", message: "Good morning team! Ready for another productive day?", timestamp: "9:00 AM", type: "text", color: "#3b82f6" },
        { id: 2, user: "Sarah Wilson", avatar: "SW", message: "Morning John! Just deployed the new features to production", timestamp: "9:05 AM", type: "text", color: "#10b981" },
        { id: 3, user: "Mike Chen", avatar: "MC", message: "Great work Sarah! I'll monitor the system for any issues", timestamp: "9:10 AM", type: "text", color: "#f59e0b" },
    ],
    2: [
        { id: 4, user: "Emma Davis", avatar: "ED", message: "We have 47 new orders this morning", timestamp: "8:30 AM", type: "text", color: "#8b5cf6" },
        { id: 5, user: "John Doe", avatar: "JD", message: "Excellent! Any priority orders we should focus on?", timestamp: "8:35 AM", type: "text", color: "#3b82f6" },
        { id: 6, user: "Emma Davis", avatar: "ED", message: "Order #12345 needs urgent processing - customer requested same-day delivery", timestamp: "8:40 AM", type: "text", color: "#8b5cf6" },
    ],
    3: [
        { id: 7, user: "Mike Chen", avatar: "MC", message: "Inventory levels are looking good across all warehouses", timestamp: "7:45 AM", type: "text", color: "#f59e0b" },
    ],
};

export default function TeamMessenger({ activeTab, onTabChange }) {
    const [activeChannel, setActiveChannel] = useState(1);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState(MESSAGES);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeChannel]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const newMessage = {
            id: Date.now(),
            user: "You",
            avatar: "YO",
            message: message.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: "text",
            color: "#1e293b"
        };

        setMessages(prev => ({
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), newMessage]
        }));

        setMessage("");

        // Simulate typing and response
        setIsTyping(true);
        setTimeout(() => {
            setIsTyping(false);
            const responses = [
                "Thanks for the update!",
                "Got it, I'll look into that right away",
                "Perfect timing! I was just about to ask about this",
                "Noted. Let me check the system and get back to you",
                "Great work on this!"
            ];
            
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            const responseUser = TEAM_MEMBERS[Math.floor(Math.random() * TEAM_MEMBERS.length)];
            
            const responseMessage = {
                id: Date.now() + 1,
                user: responseUser.name,
                avatar: responseUser.avatar,
                message: randomResponse,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                type: "text",
                color: responseUser.color
            };

            setMessages(prev => ({
                ...prev,
                [activeChannel]: [...(prev[activeChannel] || []), responseMessage]
            }));
        }, 1500);
    };

    if (activeTab !== 'messenger') return null;

    return (
        <motion.div
            className={styles.messengerContainer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
        >
            <div className={styles.messengerLayout}>
                {/* Sidebar */}
                <div className={styles.sidebar}>
                    {/* Channels Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionTitle}>Channels</span>
                            <span className={styles.sectionCount}>{CHANNELS.length}</span>
                        </div>
                        <div className={styles.channelList}>
                            {CHANNELS.map(channel => (
                                <motion.div
                                    key={channel.id}
                                    className={`${styles.channelItem} ${activeChannel === channel.id ? styles.active : ''}`}
                                    onClick={() => setActiveChannel(channel.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className={styles.channelIcon} style={{ color: channel.color }}>
                                        {channel.icon}
                                    </div>
                                    <span className={styles.channelName}>{channel.name}</span>
                                    {channel.unread > 0 && (
                                        <span className={styles.unreadBadge}>{channel.unread}</span>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Team Members Section */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <span className={styles.sectionTitle}>Team</span>
                            <span className={styles.sectionCount}>{TEAM_MEMBERS.length}</span>
                        </div>
                        <div className={styles.memberList}>
                            {TEAM_MEMBERS.map(member => (
                                <div key={member.id} className={styles.memberItem}>
                                    <div className={styles.memberAvatar} style={{ backgroundColor: member.color }}>
                                        <span>{member.avatar}</span>
                                        <div className={`${styles.statusDot} ${styles[member.status]}`}></div>
                                    </div>
                                    <div className={styles.memberInfo}>
                                        <span className={styles.memberName}>{member.name}</span>
                                        <span className={styles.memberRole}>{member.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Chat Area */}
                <div className={styles.chatArea}>
                    {/* Chat Header */}
                    <div className={styles.chatHeader}>
                        <div className={styles.channelInfo}>
                            <div className={styles.channelIcon} style={{ color: CHANNELS.find(c => c.id === activeChannel)?.color }}>
                                {CHANNELS.find(c => c.id === activeChannel)?.icon}
                            </div>
                            <div className={styles.channelDetails}>
                                <h3>{CHANNELS.find(c => c.id === activeChannel)?.name}</h3>
                                <span>{TEAM_MEMBERS.length} members online</span>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className={styles.messagesContainer}>
                        <AnimatePresence>
                            {(messages[activeChannel] || []).map((msg, index) => (
                                <motion.div
                                    key={msg.id}
                                    className={`${styles.message} ${msg.user === 'You' ? styles.own : ''}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                >
                                    <div className={styles.messageAvatar} style={{ backgroundColor: msg.color }}>
                                        {msg.avatar}
                                    </div>
                                    <div className={styles.messageContent}>
                                        <div className={styles.messageHeader}>
                                            <span className={styles.messageUser}>{msg.user}</span>
                                            <span className={styles.messageTime}>{msg.timestamp}</span>
                                        </div>
                                        <div className={styles.messageText}>{msg.message}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Typing Indicator */}
                        {isTyping && (
                            <motion.div
                                className={styles.typingIndicator}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <div className={styles.typingAvatar}>
                                    <div className={styles.typingDots}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                </div>
                                <span className={styles.typingText}>Someone is typing...</span>
                            </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <form className={styles.messageForm} onSubmit={handleSendMessage}>
                        <div className={styles.inputWrapper}>
                            <input
                                type="text"
                                className={styles.messageInput}
                                placeholder={`Message ${CHANNELS.find(c => c.id === activeChannel)?.name}...`}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <button type="submit" className={styles.sendBtn} disabled={!message.trim()}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M2 21L23 12L2 3V10L17 12L2 14V21Z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </motion.div>
    );
}