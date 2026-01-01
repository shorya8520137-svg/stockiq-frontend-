"use client";

import { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    useEffect(() => {
        // Always use modern theme - no toggle needed
        document.documentElement.setAttribute("data-theme", "modern");
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: "modern" }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}

