"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function TenantSidebar() {
  const [sidebarLabel, setSidebarLabel] = useState<string>("Tenant");
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        console.log("=== Loading Tenant Profile for Sidebar ===");
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No authenticated user found");
          return;
        }

        console.log("Auth user ID:", user.id);

        // Load profile for this user
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error("Profile error:", profileError);
          return;
        }

        console.log("Profile row:", profile);

        // Set label based on profile data
        let label = "Tenant";
        if (profile?.full_name) {
          label = `Tenant - ${profile.full_name}`;
        }

        console.log("Final sidebar label:", label);
        console.log("=== End Loading Tenant Profile ===");

        setSidebarLabel(label);

      } catch (err: any) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-lg bg-[#0b4a81] text-white grid place-items-center font-bold text-lg">R</div>
            <span className="font-semibold text-[#0b4a81] text-lg">
              {loading ? "Loading..." : sidebarLabel}
            </span>
          </div>

          <nav className="space-y-2">
            <Link
              href="/tenant/dashboard"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-[#0b4a81] transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/tenant/my-unit"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
            >
              My Unit
            </Link>
            <Link
              href="/tenant/payments"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
            >
              Payments
            </Link>
            <Link
              href="/tenant/messages"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
            >
              Messages
            </Link>
            <Link
              href="/tenant/contact"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-gray-200">
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Sign Out
          </a>
        </div>
      </aside>
    </>
  );
}
