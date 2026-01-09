"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
    const router = useRouter();
    
    useEffect(() => {
        // Redirect to products page since dashboard is disabled
        router.push("/products");
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
                <p className="text-gray-600">Dashboard is disabled. Redirecting to Products...</p>
            </div>
        </div>
    );
}
