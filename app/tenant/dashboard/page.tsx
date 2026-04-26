"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface TenantData {
  id: string;
  profile_id: string;
  property_id: string;
  unit_id: string;
  move_in_date: string | null;
  last_payment_date: string | null;
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

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  created_at: string;
}

export default function TenantDashboard() {
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Calculate next payment due date from last payment date or move-in date
  const getNextDueDate = (moveInDate: string | null, lastPaymentDate: string | null): { date: Date; isOverdue: boolean; daysUntilDue: number } | null => {
    const baseDate = lastPaymentDate || moveInDate;
    if (!baseDate) return null;

    const base = new Date(baseDate);
    const now = new Date();
    
    // Calculate next due date based on the base date (last payment or move-in)
    // JavaScript automatically handles edge cases (e.g., Jan 31 → Feb 28/29)
    let nextDueDate = new Date(base);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    
    // If the calculated due date has already passed, add another month
    if (now > nextDueDate) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
    
    const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;
    
    return { date: nextDueDate, isOverdue, daysUntilDue };
  };

  const nextDueInfo = tenantData?.move_in_date ? getNextDueDate(tenantData.move_in_date, tenantData.last_payment_date) : null;

  // Load tenant data on mount
  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      console.log("=== Loading Tenant Dashboard Data ===");
      
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Loading dashboard for tenant auth UID:", user.id);

      // Load tenant row for this user
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
      console.log("Tenant last_payment_date:", tenantRow.last_payment_date);
      console.log("Tenant move_in_date:", tenantRow.move_in_date);

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
      console.log("=== End Loading Tenant Dashboard Data ===");

      setTenantData(tenantRow);
      setProperty(propertyRow);
      setUnit(unitRow);

      // Load payments for this tenant
      const { data: paymentRows, error: paymentError } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantRow.id)
        .order("created_at", { ascending: false });

      if (paymentError) {
        console.error("Error loading payments:", paymentError);
      } else {
        setPayments(paymentRows || []);
      }

    } catch (err: any) {
      console.error("Error loading tenant dashboard:", err);
      setError(err.message || "Failed to load tenant data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Tenant Dashboard</h1>
          <p className="text-slate-300 mt-2 text-lg">Your rental information and payment overview</p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-white/20 rounded w-2/4 mb-2"></div>
                  <div className="h-4 bg-white/20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
            <p className="text-red-200">{error}</p>
          </div>
        ) : !tenantData ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6">
            <h2 className="text-xl font-bold text-white mb-4">No Assignment Found</h2>
            <p className="text-slate-300">You don't have any property or unit assignments yet.</p>
            <p className="text-sm text-slate-400 mt-2">Contact your property manager for more information.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Assigned Property</h3>
                  <p className="mt-3 text-2xl font-bold text-white">{property?.name || "Loading..."}</p>
                  {property?.address && (
                    <p className="text-sm text-slate-400 mt-2">{property.address}</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Unit</h3>
                  <p className="mt-3 text-2xl font-bold text-white">{unit?.name || "Loading..."}</p>
                  {unit && (
                    <p className="text-sm text-slate-400 mt-2">
                      Status: <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        unit.status === 'occupied' 
                          ? 'bg-emerald-500/30 text-emerald-300' 
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {unit.status}
                      </span>
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Monthly Rent</h3>
                  <p className="mt-3 text-2xl font-bold text-white">
                    ₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}
                  </p>
                  {nextDueInfo ? (
                    <p className={`text-sm mt-2 ${
                      nextDueInfo.isOverdue 
                        ? 'text-red-400' 
                        : nextDueInfo.daysUntilDue <= 3
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}>
                      {nextDueInfo.isOverdue 
                        ? `Overdue by ${Math.abs(nextDueInfo.daysUntilDue)} days (Due - ${nextDueInfo.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})` 
                        : nextDueInfo.daysUntilDue === 0
                        ? 'Due today'
                        : `Due - ${nextDueInfo.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      }
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 mt-2">Move-in date not set</p>
                  )}
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Account Status</h3>
                  <p className="mt-3 text-2xl font-bold">
                    <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                      tenantData.account_status === 'active' 
                        ? 'bg-emerald-500/30 text-emerald-300' 
                        : 'bg-white/10 text-slate-300'
                    }`}>
                      {tenantData.account_status || "Loading..."}
                    </span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Status Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Payment Status</h2>
            <span className="text-sm text-slate-400">Your payment history</span>
          </div>
          <div className="space-y-4">
            {payments.length === 0 ? (
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-xl border border-white/10">
                <div>
                  <p className="text-sm font-medium text-white">Payment Records</p>
                  <p className="text-xs text-slate-400 mt-1">No payment record yet</p>
                </div>
                <span className="px-3 py-1 bg-slate-600 text-white text-xs rounded-full">No Data</span>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">₱{payment.amount?.toFixed(2)}</p>
                      <p className="text-xs text-slate-400 mt-1">
                        {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      payment.status === 'approved' 
                        ? 'bg-emerald-500/30 text-emerald-300' 
                        : payment.status === 'rejected'
                        ? 'bg-red-500/30 text-red-300'
                        : 'bg-amber-500/30 text-amber-300'
                    }`}>
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Community Guidelines Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Community Guidelines</h2>
            <span className="text-sm text-slate-400">Rules and expectations</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Pay Rent on Time</h3>
                  <p className="text-xs text-slate-400">Submit your monthly rent payment before the due date to avoid late fees.</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Keep Unit Clean</h3>
                  <p className="text-xs text-slate-400">Maintain cleanliness and proper condition of your rental unit.</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Respect Neighbors</h3>
                  <p className="text-xs text-slate-400">Be considerate of other tenants and keep noise levels reasonable.</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1">Report Issues</h3>
                  <p className="text-xs text-slate-400">Report maintenance issues promptly through the Contact page.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
