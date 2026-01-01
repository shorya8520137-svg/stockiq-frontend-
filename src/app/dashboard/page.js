"use client";

import Dashboard from "./dashbord";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function DashboardPage() {
    return (
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    );
}
