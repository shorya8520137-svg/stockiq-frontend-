"use client";

import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Package, Truck, AlertTriangle, Settings, Save, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/services/api/config';
import useRealTimeNotifications from '@/hooks/useRealTimeNotifications';
import styles from './preferences.module.css';

export default function NotificationPreferences() {
    const { user } = useAuth();
    const { requestNotificationPermission } = useRealTimeNotifications();
    const [preferences, setPreferences] = useState({
        // Email notifications
        email_mentions: true,
        email_dispatch_created: true,
        email_low_stock: true,
        email_order_updates: false,
        email_system_alerts: true,
        
        // Browser notifications
        browser_mentions: true,
        browser_dispatch_created: false,
        browser_low_stock: true,
        browser_order_updates: false,
        browser_system_alerts: true,
        
        // In-app notifications
        app_mentions: true,
        app_dispatch_created: true,
        app_low_stock: true,
        app_order_updates: true,
        app_system_alerts: true,
        
        // Notification frequency
        frequency: 'immediate', // immediate, hourly, daily
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        
        // Advanced settings
        group_similar: true,
        auto_mark_read: false,
        sound_enabled: true
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState(''); // 'success', 'error', ''
    const [browserPermission, setBrowserPermission] = useState(Notification.permission);

    // Load user preferences
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        setIsLoading(true);
        try {
            const response = await apiRequest('/notifications/preferences', {
                method: 'GET'
            });

            if (response.success && response.data) {
                setPreferences(prev => ({
                    ...prev,
                    ...response.data
                }));
            }
        } catch (error) {
            console.error('Failed to load notification preferences:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Save preferences
    const savePreferences = async () => {
        setIsSaving(true);
        setSaveStatus('');
        
        try {
            const response = await apiRequest('/notifications/preferences', {
                method: 'PUT',
                body: JSON.stringify(preferences)
            });

            if (response.success) {
                setSaveStatus('success');
                setTimeout(() => setSaveStatus(''), 3000);
            } else {
                setSaveStatus('error');
            }
        } catch (error) {
            console.error('Failed to save notification preferences:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle preference change
    const handlePreferenceChange = (key, value) => {
        setPreferences(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Request browser notification permission
    const handleRequestPermission = async () => {
        const granted = await requestNotificationPermission();
        setBrowserPermission(granted ? 'granted' : 'denied');
    };

    // Test notification
    const sendTestNotification = async () => {
        try {
            await apiRequest('/notifications/test', {
                method: 'POST',
                body: JSON.stringify({
                    title: 'Test Notification',
                    message: 'This is a test notification to verify your settings'
                })
            });
        } catch (error) {
            console.error('Failed to send test notification:', error);
        }
    };

    const notificationTypes = [
        {
            key: 'mentions',
            icon: <MessageSquare size={20} />,
            title: 'Mentions',
            description: 'When someone mentions you with @username'
        },
        {
            key: 'dispatch_created',
            icon: <Truck size={20} />,
            title: 'Dispatch Created',
            description: 'When new dispatches are created'
        },
        {
            key: 'low_stock',
            icon: <AlertTriangle size={20} />,
            title: 'Low Stock Alerts',
            description: 'When inventory levels are running low'
        },
        {
            key: 'order_updates',
            icon: <Package size={20} />,
            title: 'Order Updates',
            description: 'When order status changes'
        },
        {
            key: 'system_alerts',
            icon: <Settings size={20} />,
            title: 'System Alerts',
            description: 'Important system notifications and updates'
        }
    ];

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner}></div>
                    <p>Loading notification preferences...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <Bell size={24} />
                    <div>
                        <h1>Notification Preferences</h1>
                        <p>Customize how and when you receive notifications</p>
                    </div>
                </div>
                
                <div className={styles.headerActions}>
                    <button 
                        className={styles.testBtn}
                        onClick={sendTestNotification}
                    >
                        Send Test
                    </button>
                    <button 
                        className={`${styles.saveBtn} ${isSaving ? styles.saving : ''}`}
                        onClick={savePreferences}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <>
                                <div className={styles.spinner}></div>
                                Saving...
                            </>
                        ) : saveStatus === 'success' ? (
                            <>
                                <Check size={16} />
                                Saved
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className={styles.content}>
                {/* Browser Permission */}
                {browserPermission !== 'granted' && (
                    <div className={styles.permissionCard}>
                        <div className={styles.permissionContent}>
                            <Bell size={20} />
                            <div>
                                <h3>Enable Browser Notifications</h3>
                                <p>Allow browser notifications to receive real-time alerts even when the app is not active</p>
                            </div>
                        </div>
                        <button 
                            className={styles.permissionBtn}
                            onClick={handleRequestPermission}
                        >
                            Enable
                        </button>
                    </div>
                )}

                {/* Notification Types */}
                <div className={styles.section}>
                    <h2>Notification Types</h2>
                    <p>Choose which notifications you want to receive and how</p>
                    
                    <div className={styles.notificationTypes}>
                        {notificationTypes.map(type => (
                            <div key={type.key} className={styles.notificationType}>
                                <div className={styles.typeHeader}>
                                    <div className={styles.typeInfo}>
                                        {type.icon}
                                        <div>
                                            <h4>{type.title}</h4>
                                            <p>{type.description}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className={styles.typeOptions}>
                                    <div className={styles.option}>
                                        <Mail size={16} />
                                        <span>Email</span>
                                        <label className={styles.toggle}>
                                            <input
                                                type="checkbox"
                                                checked={preferences[`email_${type.key}`]}
                                                onChange={(e) => handlePreferenceChange(`email_${type.key}`, e.target.checked)}
                                            />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                    
                                    <div className={styles.option}>
                                        <Bell size={16} />
                                        <span>Browser</span>
                                        <label className={styles.toggle}>
                                            <input
                                                type="checkbox"
                                                checked={preferences[`browser_${type.key}`]}
                                                onChange={(e) => handlePreferenceChange(`browser_${type.key}`, e.target.checked)}
                                                disabled={browserPermission !== 'granted'}
                                            />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                    
                                    <div className={styles.option}>
                                        <MessageSquare size={16} />
                                        <span>In-App</span>
                                        <label className={styles.toggle}>
                                            <input
                                                type="checkbox"
                                                checked={preferences[`app_${type.key}`]}
                                                onChange={(e) => handlePreferenceChange(`app_${type.key}`, e.target.checked)}
                                            />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Frequency Settings */}
                <div className={styles.section}>
                    <h2>Frequency & Timing</h2>
                    <p>Control when and how often you receive notifications</p>
                    
                    <div className={styles.frequencyOptions}>
                        <div className={styles.option}>
                            <label>Notification Frequency</label>
                            <select
                                value={preferences.frequency}
                                onChange={(e) => handlePreferenceChange('frequency', e.target.value)}
                                className={styles.select}
                            >
                                <option value="immediate">Immediate</option>
                                <option value="hourly">Hourly Digest</option>
                                <option value="daily">Daily Digest</option>
                            </select>
                        </div>
                        
                        <div className={styles.option}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={preferences.quiet_hours_enabled}
                                    onChange={(e) => handlePreferenceChange('quiet_hours_enabled', e.target.checked)}
                                />
                                Enable Quiet Hours
                            </label>
                            <p>Pause notifications during specified hours</p>
                        </div>
                        
                        {preferences.quiet_hours_enabled && (
                            <div className={styles.quietHours}>
                                <div className={styles.timeInput}>
                                    <label>From</label>
                                    <input
                                        type="time"
                                        value={preferences.quiet_hours_start}
                                        onChange={(e) => handlePreferenceChange('quiet_hours_start', e.target.value)}
                                        className={styles.timeField}
                                    />
                                </div>
                                <div className={styles.timeInput}>
                                    <label>To</label>
                                    <input
                                        type="time"
                                        value={preferences.quiet_hours_end}
                                        onChange={(e) => handlePreferenceChange('quiet_hours_end', e.target.value)}
                                        className={styles.timeField}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Advanced Settings */}
                <div className={styles.section}>
                    <h2>Advanced Settings</h2>
                    <p>Additional notification behavior options</p>
                    
                    <div className={styles.advancedOptions}>
                        <div className={styles.option}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={preferences.group_similar}
                                    onChange={(e) => handlePreferenceChange('group_similar', e.target.checked)}
                                />
                                Group Similar Notifications
                            </label>
                            <p>Combine multiple notifications of the same type</p>
                        </div>
                        
                        <div className={styles.option}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={preferences.auto_mark_read}
                                    onChange={(e) => handlePreferenceChange('auto_mark_read', e.target.checked)}
                                />
                                Auto-mark as Read
                            </label>
                            <p>Automatically mark notifications as read when viewed</p>
                        </div>
                        
                        <div className={styles.option}>
                            <label className={styles.checkboxLabel}>
                                <input
                                    type="checkbox"
                                    checked={preferences.sound_enabled}
                                    onChange={(e) => handlePreferenceChange('sound_enabled', e.target.checked)}
                                />
                                Enable Notification Sounds
                            </label>
                            <p>Play sound when receiving notifications</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Status */}
            {saveStatus && (
                <div className={`${styles.saveStatus} ${styles[saveStatus]}`}>
                    {saveStatus === 'success' ? (
                        <>
                            <Check size={16} />
                            Preferences saved successfully
                        </>
                    ) : (
                        <>
                            <AlertTriangle size={16} />
                            Failed to save preferences
                        </>
                    )}
                </div>
            )}
        </div>
    );
}