"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push("/dashboard");
            } else {
                router.push("/login");
            }
        }
    }, [user, loading, router]);

    return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
            <div className="text-slate-900 text-lg">Loading...</div>
        </div>
    );
}
