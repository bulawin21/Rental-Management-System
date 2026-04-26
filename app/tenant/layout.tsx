import React from "react";
import TenantSidebar from "./TenantSidebar";

export const metadata = {
  title: "Tenant - Rental Management",
};

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex">
      {/* Sidebar */}
      <TenantSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 pt-16 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
