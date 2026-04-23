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
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#012a4a]">Tenants</h1>
        <p className="text-slate-600 mt-2">Manage tenant accounts and assignments.</p>
      </header>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search tenants..."
            className="w-full rounded-md border border-gray-200 p-2.5 text-sm"
          />
        </div>
        <Link
          href="/owner/tenants/add"
          className="rounded-md bg-[#012a4a] px-4 py-2.5 text-white text-sm hover:bg-[#0a1f35]"
        >
          Add Tenant
        </Link>
      </div>

      {/* Tenants Table */}
      <div className="rounded-lg bg-white shadow-sm border border-gray-100 overflow-hidden">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Full Name</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Email</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Assigned Property</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Assigned Unit</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Move-in Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Account Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <p className="text-sm">Loading tenants...</p>
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                /* Empty state */
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                    <p className="text-sm">No tenants added yet</p>
                    <p className="text-xs mt-2">Add your first tenant to get started</p>
                  </td>
                </tr>
              ) : (
                /* Real tenant data */
                tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 text-sm text-slate-900">{tenant.full_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{tenant.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{tenant.property_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{tenant.unit_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      {tenant.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString() : "Not set"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        tenant.account_status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {tenant.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">
                      <button
                        onClick={() => handleDelete(tenant.id, tenant.full_name)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
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
  );
}
