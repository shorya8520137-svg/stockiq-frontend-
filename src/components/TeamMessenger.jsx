"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./TeamMessenger.module.css";

const TEAM_MEMBERS = [
    { id: 1, name: "John Doe", avatar: "JD", status: "online", role: "Manager", color: "#3b82f6" },
    { id: 2, name: "Sarah Wilson", avatar: "SW", status: "online", role: "Developer", color: "#10b981" },
    { id: 3, name: "Mike Chen", avatar: "MC", status: "away", role: "Support", color: "#f59e0b" },
    { id: 4, name: "Emma Davis", avatar: "ED", status: "offline", role: "Analyst", color: "#8b5cf6" },
    { id: 5, name: "Alex Johnson", avatar: "AJ", status: "online", role: "Designer", color: "#ef4444" },
];

const CHANNELS = [
    { id: 1, name: "general", type: "public", unread: 0, description: "General team discussions" },
    { id: 2, name: "orders", type: "public", unread: 3, description: "Order management and updates" },
    { id: 3, name: "inventory", type: "public", unread: 1, description: "Inventory tracking and alerts" },
    { id: 4, name: "support", type: "private", unread: 0, description: "Customer support coordination" },
];

const INITIAL_MESSAGES = {
    1: [
        { 
            id: 1, 
            user: "John Doe", 
            avatar: "JD", 
            color: "#3b82f6",
            message: "Good morning team! 🌅 Ready for another productive day?", 
            timestamp: "9:00 AM", 
            type: "text"
        },
        { 
            id: 2, 
            user: "Sarah Wilson", 
            avatar: "SW", 
            color: "#10b981",
            message: "Morning John! Just deployed the new features to production 🚀", 
            timestamp: "9:05 AM", 
            type: "text"
        },
    ],
    2: [
        { 
            id: 4, 
            user: "Emma Davis", 
            avatar: "ED", 
            color: "#8b5cf6",
            message: "📈 We have 47 new orders this morning! Sales are looking strong.", 
            timestamp: "8:30 AM", 
            type: "text" 
        },
    ],
};

export default function SimpleTeamMessenger({ isOpen, onClose }) {
    const [activeChannel, setActiveChannel] = useState(1);
    const [activeTab, setActiveTab] = useState('channels');
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeChannel]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen, activeChannel]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        const currentUser = "You";
        const newMessage = {
            id: Date.now(),
            user: currentUser,
            avatar: "YU",
            color: "#6366f1",
            message: message.trim(),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: "text"
        };

        setMessages(prev => ({
            ...prev,
            [activeChannel]: [...(prev[activeChannel] || []), newMessage]
        }));

        setMessage("");
    };

    const currentChannel = CHANNELS.find(c => c.id === activeChannel);

    if (!isOpen) return null;

    return (
        <div className={styles.messengerOverlay} onClick={onClose}>
            <div className={styles.messengerContainer} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={styles.workspaceIcon}>💼</div>
                        <div className={styles.workspaceInfo}>
                            <h3>Amigo Orders Team</h3>
                            <span>{TEAM_MEMBERS.filter(m => m.status === 'online').length} online</span>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div className={styles.messengerBody}>
                    {/* Sidebar */}
                    <div className={styles.sidebar}>
                        {/* Tabs */}
                        <div className={styles.tabsContainer}>
                            <button
                                className={`${styles.tab} ${activeTab === 'channels' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('channels')}
                            >
                                Channels
                            </button>
                            <button
                                className={`${styles.tab} ${activeTab === 'direct' ? styles.activeTab : ''}`}
                                onClick={() => setActiveTab('direct')}
                            >
                                Direct Messages
                            </button>
                        </div>

                        {/* Channels Tab */}
                        {activeTab === 'channels' && (
                            <div className={styles.section}>
                                {CHANNELS.map(channel => (
                                    <div
                                        key={channel.id}
                                        className={`${styles.channelItem} ${activeChannel === channel.id ? styles.active : ''}`}
                                        onClick={() => setActiveChannel(channel.id)}
                                    >
                                        <span className={styles.channelIcon}>
                                            {channel.type === 'private' ? '🔒' : '#'}
                                        </span>
                                        <div className={styles.channelInfo}>
                                            <span className={styles.channelName}>{channel.name}</span>
                                            <span className={styles.channelDesc}>{channel.description}</span>
                                        </div>
                                        {channel.unread > 0 && (
                                            <span className={styles.unreadBadge}>{channel.unread}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Direct Messages Tab */}
                        {activeTab === 'direct' && (
                            <div className={styles.section}>
                                {TEAM_MEMBERS.map(user => (
                                    <div key={user.id} className={styles.userItem}>
                                        <div className={styles.userAvatar} style={{ backgroundColor: user.color }}>
                                            <span>{user.avatar}</span>
                                            <div className={`${styles.statusDot} ${styles[user.status]}`}></div>
                                        </div>
                                        <div className={styles.userInfo}>
                                            <span className={styles.userName}>{user.name}</span>
                                            <span className={styles.userRole}>{user.role}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Chat Area */}
                    <div className={styles.chatArea}>
                        {/* Chat Header */}
                        <div className={styles.chatHeader}>
                            <div className={styles.channelInfo}>
                                <h4>
                                    {currentChannel?.type === 'private' ? '🔒' : '#'} {currentChannel?.name}
                                </h4>
                                <span>{currentChannel?.description}</span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className={styles.messagesContainer}>
                            {(messages[activeChannel] || []).map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`${styles.message} ${msg.user === 'You' ? styles.own : ''}`}
                                >
                                    <div 
                                        className={styles.messageAvatar} 
                                        style={{ backgroundColor: msg.color }}
                                    >
                                        {msg.avatar}
                                    </div>
                                    <div className={styles.messageContent}>
                                        <div className={styles.messageHeader}>
                                            <span className={styles.messageUser}>{msg.user}</span>
                                            <span className={styles.messageTime}>{msg.timestamp}</span>
                                        </div>
                                        <div className={styles.messageText}>{msg.message}</div>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <form className={styles.messageForm} onSubmit={handleSendMessage}>
                            <div className={styles.inputContainer}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    className={styles.messageInput}
                                    placeholder={`Message #${currentChannel?.name || 'channel'}`}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                />
                                <button 
                                    type="submit" 
                                    className={styles.sendBtn} 
                                    disabled={!message.trim()}
                                    title="Send Message"
                                >
                                    📤
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}