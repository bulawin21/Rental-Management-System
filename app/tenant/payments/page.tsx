"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface TenantData {
  id: string;
  profile_id: string;
  property_id: string;
  unit_id: string;
  due_day: number;
  monthly_rent: number;
  account_status: string;
}

export default function TenantPayments() {
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load tenant data on mount
  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      console.log("=== Loading Tenant Payments Data ===");
      
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Loading payments for tenant auth UID:", user.id);

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

      console.log("=== End Loading Tenant Payments Data ===");

      setTenantData(tenantRow);

    } catch (err: any) {
      console.error("Error loading tenant payments:", err);
      setError(err.message || "Failed to load tenant data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#0b4a81]">Payments</h1>
        <p className="text-slate-600 mt-2">Your payment history and upcoming rent information.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg bg-red-50 border border-red-200 p-6">
          <p className="text-red-700">{error}</p>
        </div>
      ) : !tenantData ? (
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">No Assignment Found</h2>
          <p className="text-slate-600">You don't have any property or unit assignments yet.</p>
          <p className="text-sm text-slate-500 mt-2">Contact your property manager for more information.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Payment Summary */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#0b4a81] mb-4">Payment Summary</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Monthly Rent</h3>
                <p className="text-2xl font-bold text-[#0b4a81]">
                  ₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  Due on day {tenantData.due_day || "Loading..."} of each month
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Account Status</h3>
                <p className="text-lg">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    tenantData.account_status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {tenantData.account_status || "Loading..."}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment Records */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#0b4a81] mb-4">Payment Records</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="text-sm font-medium text-slate-900">Payment Records</p>
                  <p className="text-xs text-slate-500 mt-1">No payment record yet</p>
                </div>
                <span className="px-3 py-1 bg-gray-600 text-white text-xs rounded-full">No Data</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
