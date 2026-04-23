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
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#0b4a81]">My Unit</h1>
        <p className="text-slate-600 mt-2">Your assigned unit details and information.</p>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <h2 className="text-lg font-semibold text-slate-900 mb-4">No Unit Assignment</h2>
          <p className="text-slate-600">You don't have any unit assignments yet.</p>
          <p className="text-sm text-slate-500 mt-2">Contact your property manager for more information.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Property Information */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#0b4a81] mb-4">Property Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Property Name</h3>
                <p className="text-lg text-slate-900">{property?.name || "Loading..."}</p>
              </div>
              {property?.address && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Address</h3>
                  <p className="text-slate-900">{property.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Unit Information */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#0b4a81] mb-4">Unit Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Unit Name</h3>
                <p className="text-lg text-slate-900">{unit?.name || "Loading..."}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Status</h3>
                <p className="text-lg">
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                    unit?.status === 'occupied' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {unit?.status || "Loading..."}
                  </span>
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Monthly Rent</h3>
                <p className="text-lg text-slate-900">
                  ₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Due Day</h3>
                <p className="text-lg text-slate-900">
                  {tenantData.due_day || "Loading..."}
                </p>
              </div>
              {tenantData.move_in_date && (
                <div>
                  <h3 className="text-sm font-medium text-slate-700">Move-in Date</h3>
                  <p className="text-lg text-slate-900">
                    {new Date(tenantData.move_in_date).toLocaleDateString()}
                  </p>
                </div>
              )}
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

          {/* Additional Details */}
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-[#0b4a81] mb-4">Rental Details</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Property Manager Contact</h3>
                <p className="text-slate-900">Contact your property manager for any questions or maintenance requests.</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Emergency Contact</h3>
                <p className="text-slate-900">For urgent maintenance issues, contact emergency services.</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-700">Community Guidelines</h3>
                <p className="text-slate-900">Please review community rules and regulations.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
