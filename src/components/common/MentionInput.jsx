"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { apiRequest } from '@/services/api/config';
import styles from './MentionInput.module.css';

/**
 * MentionInput Component
 * Provides @username mention functionality with autocomplete
 */
export default function MentionInput({
    value = '',
    onChange,
    onMention,
    placeholder = 'Type @ to mention users...',
    className = '',
    disabled = false,
    maxLength = 500,
    rows = 3,
    entityType = 'comment',
    entityId = null
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStart, setMentionStart] = useState(-1);
    const [isLoading, setIsLoading] = useState(false);
    
    const textareaRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    // Load users for mentions
    const loadUsers = useCallback(async (query = '') => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            setIsLoading(true);
            try {
                const response = await apiRequest(`/users/search?q=${encodeURIComponent(query)}&limit=10`, {
                    method: 'GET'
                });

                if (response.success) {
                    setSuggestions(response.data.users || []);
                } else {
                    setSuggestions([]);
                }
            } catch (error) {
                console.error('Failed to load users:', error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);
    }, []);

    // Handle input change
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        onChange?.(newValue);

        // Check for @ mentions
        const textBeforeCursor = newValue.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

        if (mentionMatch) {
            const query = mentionMatch[1];
            const start = cursorPosition - mentionMatch[0].length;
            
            setMentionQuery(query);
            setMentionStart(start);
            setShowSuggestions(true);
            setSelectedIndex(0);
            
            // Load users matching the query
            loadUsers(query);
        } else {
            setShowSuggestions(false);
            setMentionQuery('');
            setMentionStart(-1);
            setSuggestions([]);
        }
    };

    // Handle key down events
    const handleKeyDown = (e) => {
        if (!showSuggestions || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            
            case 'Enter':
            case 'Tab':
                if (suggestions[selectedIndex]) {
                    e.preventDefault();
                    insertMention(suggestions[selectedIndex]);
                }
                break;
            
            case 'Escape':
                setShowSuggestions(false);
                break;
        }
    };

    // Insert mention into text
    const insertMention = (user) => {
        if (mentionStart === -1) return;

        const textarea = textareaRef.current;
        const beforeMention = value.substring(0, mentionStart);
        const afterMention = value.substring(textarea.selectionStart);
        const mentionText = `@${user.name}`;
        
        const newValue = beforeMention + mentionText + ' ' + afterMention;
        const newCursorPosition = mentionStart + mentionText.length + 1;

        onChange?.(newValue);
        
        // Set cursor position after mention
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);

        // Hide suggestions
        setShowSuggestions(false);
        setMentionQuery('');
        setMentionStart(-1);

        // Notify parent about mention
        onMention?.({
            mentionedUser: user,
            mentionText: mentionText,
            contextText: newValue,
            entityType: entityType,
            entityId: entityId
        });
    };

    // Handle suggestion click
    const handleSuggestionClick = (user) => {
        insertMention(user);
    };

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // Calculate suggestion position
    const getSuggestionPosition = () => {
        if (!textareaRef.current || mentionStart === -1) return {};

        const textarea = textareaRef.current;
        const textBeforeMention = value.substring(0, mentionStart);
        const lines = textBeforeMention.split('\n');
        const currentLine = lines.length - 1;
        const charInLine = lines[currentLine].length;

        // Approximate position (this is a simplified calculation)
        const lineHeight = 20;
        const charWidth = 8;
        
        return {
            top: (currentLine + 1) * lineHeight,
            left: charInLine * charWidth
        };
    };

    return (
        <div className={`${styles.mentionInputContainer} ${className}`}>
            <textarea
                ref={textareaRef}
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                maxLength={maxLength}
                rows={rows}
                className={styles.mentionInput}
            />
            
            {showSuggestions && (
                <div 
                    ref={suggestionsRef}
                    className={styles.mentionSuggestions}
                    style={getSuggestionPosition()}
                >
                    {isLoading ? (
                        <div className={styles.suggestionItem}>
                            <div className={styles.loadingSpinner}></div>
                            <span>Loading users...</span>
                        </div>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((user, index) => (
                            <div
                                key={user.id}
                                className={`${styles.suggestionItem} ${
                                    index === selectedIndex ? styles.selected : ''
                                }`}
                                onClick={() => handleSuggestionClick(user)}
                            >
                                <div className={styles.userAvatar}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.userInfo}>
                                    <span className={styles.userName}>{user.name}</span>
                                    <span className={styles.userRole}>{user.role}</span>
                                </div>
                            </div>
                        ))
                    ) : mentionQuery.length > 0 ? (
                        <div className={styles.suggestionItem}>
                            <span>No users found for "{mentionQuery}"</span>
                        </div>
                    ) : (
                        <div className={styles.suggestionItem}>
                            <span>Type to search users...</span>
                        </div>
                    )}
                </div>
            )}
            
            {/* Character count */}
            {maxLength && (
                <div className={styles.characterCount}>
                    {value.length}/{maxLength}
                </div>
            )}
        </div>
    );
}

/**
 * Hook for using mention functionality
 */
export const useMentions = () => {
    const [mentions, setMentions] = useState([]);

    const addMention = useCallback((mentionData) => {
        setMentions(prev => [...prev, mentionData]);
    }, []);

    const clearMentions = useCallback(() => {
        setMentions([]);
    }, []);

    const extractMentions = useCallback((text) => {
        const mentionRegex = /@(\w+)/g;
        const matches = [];
        let match;

        while ((match = mentionRegex.exec(text)) !== null) {
            matches.push({
                username: match[1],
                start: match.index,
                end: match.index + match[0].length,
                text: match[0]
            });
        }

        return matches;
    }, []);

    return {
        mentions,
        addMention,
        clearMentions,
        extractMentions
    };
};