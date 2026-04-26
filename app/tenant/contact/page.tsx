"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function TenantContact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          console.log("No user found");
          return;
        }

        console.log("User email:", user.email);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        console.log("Profile data:", profile);
        console.log("Profile error:", profileError);

        setFormData(prev => ({
          ...prev,
          name: profile?.full_name || "",
          email: user.email || ""
        }));
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Contact Us</h1>
          <Link href="/tenant/dashboard" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Back to Dashboard
          </Link>
        </header>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-8">
          <form
            action="https://formspree.io/f/maqakape"
            method="POST"
            className="space-y-6"
          >
            <div>
              <label className="block text-sm text-slate-400 mb-2">Name</label>
              <input
                type="text"
                name="name"
                value={profileLoading ? "Loading..." : formData.name}
                onChange={handleChange}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Your name"
                required
                disabled={profileLoading}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={profileLoading ? "Loading..." : formData.email}
                onChange={handleChange}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="your@email.com"
                required
                disabled={profileLoading}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Message</label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={6}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder="Your message..."
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium"
            >
              Send Message
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-sm text-slate-400 text-center">
              Need immediate assistance? Contact us 091213718
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
