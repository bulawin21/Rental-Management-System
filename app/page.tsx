"use client";

import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 antialiased">
      <main className="max-w-4xl mx-auto py-24 px-6">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold text-[#012a4a]">Rental Management</h1>
          <p className="text-slate-600 mt-2">Choose how you'd like to continue.</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Link
            href="/owner-login"
            className="block rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#012a4a] text-white font-semibold">O</div>
              <div>
                <h2 className="text-lg font-semibold text-[#012a4a]">Property Owner</h2>
                <p className="text-sm text-slate-600 mt-1">Manage properties, view income, and track maintenance.</p>
              </div>
            </div>
          </Link>

          <Link
            href="/tenant-login"
            className="block rounded-xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow border border-gray-100"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b4a81] text-white font-semibold">T</div>
              <div>
                <h2 className="text-lg font-semibold text-[#0b4a81]">Tenant</h2>
                <p className="text-sm text-slate-600 mt-1">Pay rent, submit requests, and view lease details.</p>
              </div>
            </div>
          </Link>
        </section>

        <footer className="mt-12 text-sm text-slate-500">Front-end prototype — no auth or backend yet.</footer>
      </main>
    </div>
  );
}
