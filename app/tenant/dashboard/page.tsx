"use client";

import React, { useState, useEffect } from "react";
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

export default function TenantDashboard() {
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

    } catch (err: any) {
      console.error("Error loading tenant dashboard:", err);
      setError(err.message || "Failed to load tenant data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#0b4a81]">Tenant Dashboard</h1>
        <p className="text-slate-600 mt-2">Your rental information and payment overview.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm text-slate-500 font-medium">Assigned Property</h3>
            <p className="mt-3 text-lg font-bold text-[#0b4a81]">{property?.name || "Loading..."}</p>
            {property?.address && (
              <p className="text-xs text-slate-500 mt-2">{property.address}</p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm text-slate-500 font-medium">Unit</h3>
            <p className="mt-3 text-lg font-bold text-[#0b4a81]">{unit?.name || "Loading..."}</p>
            {unit && (
              <p className="text-xs text-slate-500 mt-2">
                Status: <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  unit.status === 'occupied' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {unit.status}
                </span>
              </p>
            )}
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm text-slate-500 font-medium">Monthly Rent</h3>
            <p className="mt-3 text-lg font-bold text-[#0b4a81]">
              ₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              Due on day {tenantData.due_day || "Loading..."} of each month
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm text-slate-500 font-medium">Account Status</h3>
            <p className="mt-3 text-lg font-bold">
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
      )}

          {/* Payment Status Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-[#0b4a81] mb-4">Payment Status</h2>
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

      {/* Notifications Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-[#0b4a81] mb-4">Notifications & Messages</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-4 py-3 border-b border-gray-100">
            <div className="w-2 h-2 rounded-full bg-slate-300 mt-2"></div>
            <div>
              <p className="text-sm text-slate-700">No notifications yet</p>
              <p className="text-xs text-slate-500 mt-1">Updates from your property manager will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
