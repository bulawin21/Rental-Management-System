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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">My Unit</h1>
          <p className="text-slate-300 mt-2 text-lg">Your assigned unit details and information</p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <h2 className="text-lg font-semibold text-white mb-4">No Unit Assignment</h2>
            <p className="text-slate-300">You don't have any unit assignments yet.</p>
            <p className="text-sm text-slate-400 mt-2">Contact your property manager for more information.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Property & Unit Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <h2 className="text-lg font-semibold text-emerald-400 mb-6">Property & Unit Information</h2>
              <div className="space-y-5">
                {/* Property Name */}
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Property Name</h3>
                  <p className="text-lg font-semibold text-white">{property?.name || "Loading..."}</p>
                </div>
                {/* Address */}
                {property?.address && (
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Address</h3>
                    <p className="text-white">{property.address}</p>
                  </div>
                )}
                {/* Unit Name */}
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Unit Name</h3>
                  <p className="text-lg font-semibold text-white">{unit?.name || "Loading..."}</p>
                </div>
                {/* Status */}
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Status</h3>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                    unit?.status === 'occupied' 
                      ? 'bg-emerald-500/30 text-emerald-300' 
                      : 'bg-white/10 text-slate-300'
                  }`}>
                    {unit?.status || "Loading..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <h2 className="text-lg font-semibold text-emerald-400 mb-6">Financial Information</h2>
              <div className="space-y-5">
                {/* Monthly Rent */}
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Monthly Rent</h3>
                  <p className="text-2xl font-bold text-white">
                    ₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}
                  </p>
                </div>
                {/* Due Day */}
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Due Day</h3>
                  <p className="text-lg text-white">
                    Day {tenantData.due_day || "Loading..."} of each month
                  </p>
                </div>
                {/* Move-in Date */}
                {tenantData.move_in_date && (
                  <div>
                    <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Move-in Date</h3>
                    <p className="text-lg text-white">
                      {new Date(tenantData.move_in_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {/* Account Status */}
                <div className="flex items-center gap-3">
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide">Account Status</h3>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                    tenantData.account_status === 'active' 
                      ? 'bg-emerald-500/30 text-emerald-300' 
                      : 'bg-white/10 text-slate-300'
                  }`}>
                    {tenantData.account_status || "Loading..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Contact & Guidelines */}
            <div className="md:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
              <h2 className="text-lg font-semibold text-emerald-400 mb-6">Contact & Guidelines</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Property Owner Contact</h3>
                  <p className="text-white text-sm">Contact your property owner for any questions or maintenance requests.</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Emergency Contact</h3>
                  <p className="text-white text-sm">For urgent maintenance issues, <Link href="/tenant/contact" className="text-emerald-400 hover:text-emerald-300 transition-colors">contact us</Link>.</p>
                </div>
                <div>
                  <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Community Guidelines</h3>
                  <p className="text-white text-sm">Please review community rules and regulations.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
