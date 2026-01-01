"use client";

import { useState } from "react";
import TeamMessenger from "@/components/TeamMessenger";

export default function TeamMessengerWrapper() {
    const [showMessenger, setShowMessenger] = useState(false);

    return (
        <>
            <button 
                onClick={() => setShowMessenger(true)}
                className="flex items-center gap-3 w-full p-2 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
                <span>💬</span>
                <span>Team Chat</span>
            </button>
            
            {showMessenger && (
                <TeamMessenger 
                    isOpen={showMessenger} 
                    onClose={() => setShowMessenger(false)} 
                />
            )}
        </>
    );
}