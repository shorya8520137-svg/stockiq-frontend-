import "./globals.css";
import "react-chat-elements/dist/main.css";

import ClientLayout from "./layout.client";
import { AuthProvider } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata = {
    title: "Inventory App",
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" data-theme="modern">
        <body className="h-screen w-screen overflow-hidden">
        <ThemeProvider>
            <AuthProvider>
                <PermissionsProvider>
                    <ClientLayout>
                        {children}
                    </ClientLayout>
                </PermissionsProvider>
            </AuthProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
