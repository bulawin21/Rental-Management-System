"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Tenant {
  id: string;
  full_name: string;
  email: string;
  property_name: string;
  unit_name: string;
  move_in_date: string | null;
  account_status: string;
}

export default function TenantsList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load tenant data on mount
  useEffect(() => {
    loadTenants();
  }, []);

  const handleDelete = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to delete tenant "${tenantName}"? This will fully remove their account from the system and cannot be undone.`)) {
      return;
    }

    try {
      console.log(`Deleting tenant with ID: ${tenantId}`);
      
      // Call the server-side delete API
      const response = await fetch("/api/owner/delete-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      const data = await response.json();

      // Log full API response for debugging
      console.log("Delete API Response Status:", response.status);
      console.log("Delete API Response Data:", data);

      if (!response.ok) {
        // Show the exact error message from the API
        const errorMessage = data.error || data.message || "Failed to delete tenant";
        console.error("Delete API Error:", errorMessage);
        setError(errorMessage);
        return;
      }

      console.log("Tenant deleted successfully from system");

      // Refresh the tenant list
      await loadTenants();

    } catch (err: any) {
      console.error("Unexpected error during deletion:", err);
      setError(`Unexpected error: ${err.message}`);
    }
  };

  // Separate function for loading tenants to reuse after deletion
  const loadTenants = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("=== Owner Tenants Page Debug ===");
      console.log("Auth user ID:", user.id);

      // Step 1: Load owner's properties
      const { data: properties, error: propsError } = await supabase
        .from("properties")
        .select("id, name")
        .eq("owner_id", user.id);

      if (propsError) {
        console.error("Properties error:", propsError);
        throw propsError;
      }

      console.log("Properties query result:", properties);
      console.log("Properties query result length:", properties?.length || 0);
      
      if (!properties || properties.length === 0) {
        console.log("No properties found for this owner");
        setTenants([]);
        return;
      }

      // Step 2: Collect property IDs
      const propertyIds = properties.map(p => p.id);
      console.log("Property IDs for tenants query:", propertyIds);

      // Step 3: Load tenants for these properties
      const { data: tenantRows, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .in("property_id", propertyIds);

      if (tenantsError) {
        console.error("Tenants error:", tenantsError);
        throw tenantsError;
      }

      console.log("Tenants query result:", tenantRows);
      console.log("Tenants query result length:", tenantRows?.length || 0);

      if (!tenantRows || tenantRows.length === 0) {
        console.log("No tenants found for these properties");
        setTenants([]);
        return;
      }

      // Step 4: Load profiles for tenant names and emails
      const profileIds = tenantRows.map(t => t.profile_id);
      console.log("Profile IDs for profiles query:", profileIds);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);

      if (profilesError) {
        console.error("Profiles error:", profilesError);
        throw profilesError;
      }

      console.log("Profiles query result:", profiles);
      console.log("Profiles query result length:", profiles?.length || 0);

      // Step 5: Load units for unit names
      const unitIds = tenantRows.map(t => t.unit_id);
      const { data: units, error: unitsError } = await supabase
        .from("units")
        .select("id, name")
        .in("id", unitIds);

      if (unitsError) {
        console.error("Units error:", unitsError);
        throw unitsError;
      }

      console.log("Units query result:", units);
      console.log("Units query result length:", units?.length || 0);

      // Step 6: Map data together
      console.log("=== Profile Mapping Debug ===");
      console.log("Tenant rows:", tenantRows);
      console.log("Profile rows:", profiles);
      
      const mappedTenants: Tenant[] = tenantRows.map(tenant => {
        console.log(`Mapping tenant with profile_id: ${tenant.profile_id}`);
        const profile = profiles?.find(p => p.id === tenant.profile_id);
        console.log(`Found profile:`, profile);
        
        const unit = units?.find(u => u.id === tenant.unit_id);
        const property = properties?.find(p => p.id === tenant.property_id);

        const mappedTenant = {
          id: tenant.id,
          full_name: profile?.full_name || "Unknown",
          email: profile?.email || "Unknown",
          property_name: property?.name || "Unknown",
          unit_name: unit?.name || "Unknown",
          move_in_date: tenant.move_in_date,
          account_status: tenant.account_status || "active",
        };
        
        console.log(`Mapped tenant:`, mappedTenant);
        return mappedTenant;
      });

      console.log("Final mapped tenant list:", mappedTenants);
      console.log("Final tenants for rendering:", mappedTenants);
      console.log("=== End Owner Tenants Debug ===");

      setTenants(mappedTenants);

    } catch (err: any) {
      console.error("Error loading tenants:", err);
      setError(err.message || "Failed to load tenants");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Tenants</h1>
          <p className="text-slate-300 mt-2 text-lg">Manage tenant accounts and assignments</p>
        </header>

        {/* Actions Bar */}
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search tenants..."
              className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <Link
            href="/owner/tenants/add"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium"
          >
            Add Tenant
          </Link>
        </div>

        {/* Tenants Table */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden">
          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500/50">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Full Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Assigned Property</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Assigned Unit</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Move-in Date</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Account Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-300">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      <p className="text-sm">Loading tenants...</p>
                    </td>
                  </tr>
                ) : tenants.length === 0 ? (
                  /* Empty state */
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                      <p className="text-sm">No tenants added yet</p>
                      <p className="text-xs mt-2">Add your first tenant to get started</p>
                    </td>
                  </tr>
                ) : (
                  /* Real tenant data */
                  tenants.map((tenant) => (
                    <tr key={tenant.id}>
                      <td className="px-6 py-4 text-sm text-white">{tenant.full_name}</td>
                      <td className="px-6 py-4 text-sm text-white">{tenant.email}</td>
                      <td className="px-6 py-4 text-sm text-white">{tenant.property_name}</td>
                      <td className="px-6 py-4 text-sm text-white">{tenant.unit_name}</td>
                      <td className="px-6 py-4 text-sm text-white">
                        {tenant.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString() : "Not set"}
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          tenant.account_status === 'active' 
                            ? 'bg-emerald-500/30 text-emerald-300' 
                            : 'bg-white/10 text-slate-300'
                        }`}>
                          {tenant.account_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-white">
                        <button
                          onClick={() => handleDelete(tenant.id, tenant.full_name)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
