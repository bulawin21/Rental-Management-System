"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const [sidebarLabel, setSidebarLabel] = useState<string>("Landowner");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        console.log("=== Loading Owner Profile for Sidebar ===");
        
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
        let label = "Landowner";
        if (profile?.full_name) {
          label = profile.full_name;
        }

        console.log("Final sidebar label:", label);
        console.log("=== End Loading Owner Profile ===");

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
    <aside className="w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-lg bg-[#012a4a] text-white grid place-items-center font-bold text-lg">R</div>
          <span className="font-semibold text-[#012a4a] text-lg">
            {loading ? "Loading..." : sidebarLabel}
          </span>
        </div>

        <nav className="space-y-2">
          <Link
            href="/owner/dashboard"
            className="block px-4 py-3 rounded-lg text-sm font-medium text-slate-700 hover:bg-gray-100 hover:text-[#012a4a] transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/owner/properties"
            className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
          >
            Properties
          </Link>
          <Link
            href="/owner/units"
            className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
          >
            Units
          </Link>
          <Link
            href="/owner/tenants"
            className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
          >
            Tenants
          </Link>
          <Link
            href="/owner/payments"
            className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
          >
            Payments
          </Link>
          <Link
            href="/owner/messages"
            className="block px-4 py-3 rounded-lg text-sm text-slate-600 hover:bg-gray-100 hover:text-slate-900 transition-colors"
          >
            Messages
          </Link>
        </nav>
      </div>

      <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-gray-200">
        <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
          Sign Out
        </a>
      </div>
    </aside>
  );
}
