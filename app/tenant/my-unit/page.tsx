"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface TenantData {
  id: string;
  profile_id: string;
  property_id: string;
  unit_id: string;
  move_in_date: string | null;
  due_day: number;
  monthly_rent: number;
  account_status: string;
}

interface Property {
  id: string;
  name: string;
  address?: string;
}

interface Unit {
  id: string;
  name: string;
  property_id: string;
  status: string;
}

export default function MyUnit() {
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load tenant data on mount
  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      console.log("=== Loading My Unit Data ===");
      
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Loading my unit for tenant auth UID:", user.id);

      // Load tenant row for this User
      const { data: tenantRows, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("profile_id", user.id);

      if (tenantError) {
        console.error("Error loading tenant row:", tenantError);
        throw tenantError;
      }

      console.log("Tenant query result:", tenantRows);
      console.log("Tenant query result length:", tenantRows?.length || 0);

      if (!tenantRows || tenantRows.length === 0) {
        console.log("No tenant assignment found for this user");
        setTenantData(null);
        return;
      }

      if (tenantRows.length > 1) {
        console.warn("Warning: Multiple tenant assignments found for user:", tenantRows.length);
      }

      const tenantRow = tenantRows[0];
      console.log("Selected tenant row:", tenantRow);

      // Load related property
      const { data: propertyRow, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", tenantRow.property_id)
        .single();

      if (propertyError) {
        console.error("Error loading property:", propertyError);
        throw propertyError;
      }

      console.log("Property row:", propertyRow);

      // Load related unit
      const { data: unitRow, error: unitError } = await supabase
        .from("units")
        .select("*")
        .eq("id", tenantRow.unit_id)
        .single();

      if (unitError) {
        console.error("Error loading unit:", unitError);
        throw unitError;
      }

      console.log("Unit row:", unitRow);
      console.log("=== End Loading My Unit Data ===");

      setTenantData(tenantRow);
      setProperty(propertyRow);
      setUnit(unitRow);

    } catch (err: any) {
      console.error("Error loading my unit:", err);
      setError(err.message || "Failed to load unit data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Background Elements */}
      <div 
        className="absolute inset-0 opacity-10" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      ></div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <header className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">My Unit</h1>
              <p className="text-slate-300 text-lg">Your assigned unit details and information</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-8">
                <div className="animate-pulse">
                  <div className="h-6 bg-white/20 rounded w-1/3 mb-4"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-white/20 rounded w-full"></div>
                    <div className="h-4 bg-white/20 rounded w-3/4"></div>
                    <div className="h-4 bg-white/20 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-200">{error}</p>
          </div>
        ) : !tenantData ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-12 text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-3">No Unit Assignment</h2>
            <p className="text-slate-300 mb-2">You don't have any unit assignments yet.</p>
            <p className="text-sm text-slate-400">Contact your property manager for more information.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Unit Overview Card */}
            <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-xl p-8 border border-emerald-500/30 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-2xl font-bold text-white">{unit?.name || "Loading..."}</h2>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      unit?.status === 'occupied' 
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' 
                        : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                    }`}>
                      {unit?.status || "Loading..."}
                    </span>
                  </div>
                  <p className="text-slate-200 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {property?.name || "Loading..."}
                  </p>
                  {property?.address && (
                    <p className="text-slate-300 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {property.address}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Monthly Rent</p>
                    <p className="text-2xl font-bold text-white">₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Financial Details */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-6 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Financial Information
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Monthly Rent</span>
                      <span className="text-white font-semibold">₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Payment Due Day</span>
                      <span className="text-white font-semibold">Day {tenantData.due_day || "Loading..."}</span>
                    </div>
                  </div>
                  {tenantData.move_in_date && (
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Move-in Date</span>
                        <span className="text-white font-semibold">{new Date(tenantData.move_in_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">Account Status</span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        tenantData.account_status === 'active' 
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' 
                          : 'bg-white/10 text-slate-300 border border-white/30'
                      }`}>
                        {tenantData.account_status || "Loading..."}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 border-b border-white/10">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Quick Actions
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <Link href="/tenant/payments" className="block bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Make Payment</p>
                          <p className="text-slate-400 text-sm">Submit your monthly rent</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                  
                  <Link href="/tenant/messages" className="block bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Contact Owner</p>
                          <p className="text-slate-400 text-sm">Send a message</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>

                  <Link href="/tenant/contact" className="block bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-medium">Maintenance Request</p>
                          <p className="text-slate-400 text-sm">Report an issue</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            {/* Important Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Important Information
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium mb-2">Property Owner</h4>
                    <p className="text-slate-300 text-sm">Contact your property owner for any questions or maintenance requests.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium mb-2">Emergency Contact</h4>
                    <p className="text-slate-300 text-sm">For urgent maintenance issues, use the contact form.</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h4 className="text-white font-medium mb-2">Community Guidelines</h4>
                    <p className="text-slate-300 text-sm">Please review community rules and regulations.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
