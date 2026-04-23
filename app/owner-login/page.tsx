"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function OwnerLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setError("Sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      // Fetch profile to verify role
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        setError("Profile not found. Please contact support.");
        setLoading(false);
        return;
      }

      // Redirect based on role
      if (profile.role === "owner") {
        router.push("/owner/dashboard");
      } else {
        setError("Access denied. Owner role required.");
        setLoading(false);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 grid place-items-center">
      <div className="w-full max-w-md bg-white rounded-xl p-8 shadow-md">
        <h1 className="text-2xl font-semibold text-[#012a4a]">Owner Login</h1>
        <p className="text-sm text-slate-600 mt-2">Sign in to your owner account.</p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-600">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 p-2"
              placeholder="you@company.com"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 p-2"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-block rounded-md bg-[#012a4a] px-4 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
            <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">Back</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
