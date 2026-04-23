"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Property {
  id: string;
  name: string;
  type: string;
  address: string;
  description: string;
  status: string;
  owner_id: string;
  created_at: string;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch properties for the logged-in owner
  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("=== Owner Properties Page Debug ===");
      console.log("Auth user ID:", user.id);

      // Supabase query: Select properties where owner_id matches the logged-in user
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("Supabase fetch error:", fetchError);
        throw fetchError;
      }

      console.log("Raw query result:", data);
      console.log("Query result length:", data?.length || 0);
      console.log("Final properties for rendering:", data || []);
      console.log("=== End Owner Properties Debug ===");

      setProperties(data || []);
      
    } catch (err: any) {
      console.error("Error fetching properties:", err);
      setError(err.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  // Delete property with confirmation
  const handleDelete = async (property: Property) => {
    try {
      console.log("=== Property Delete Safety Check ===");
      console.log("Checking property for deletion:", property.name, "ID:", property.id);

      // Check if property has units
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('id, name')
        .eq('property_id', property.id);

      if (unitsError) {
        console.error("Error checking units:", unitsError);
        throw unitsError;
      }

      console.log("Units found:", unitsData?.length || 0);

      // Check if property has tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, profile_id')
        .eq('property_id', property.id);

      if (tenantsError) {
        console.error("Error checking tenants:", tenantsError);
        throw tenantsError;
      }

      console.log("Tenants found:", tenantsData?.length || 0);

      // Block deletion if property has units or tenants
      if (unitsData && unitsData.length > 0) {
        const errorMessage = `Cannot delete property "${property.name}" because it has ${unitsData.length} unit(s). Please delete all units first.`;
        console.error(errorMessage);
        setError(errorMessage);
        return;
      }

      if (tenantsData && tenantsData.length > 0) {
        const errorMessage = `Cannot delete property "${property.name}" because it has ${tenantsData.length} tenant(s). Please reassign all tenants first.`;
        console.error(errorMessage);
        setError(errorMessage);
        return;
      }

      console.log("Property is safe to delete - no units or tenants found");

      // Proceed with deletion if safe
      if (confirm(`Are you sure you want to delete "${property.name}"? This action cannot be undone.`)) {
        const { error: deleteError } = await supabase
          .from('properties')
          .delete()
          .eq('id', property.id);

        if (deleteError) {
          console.error("Delete error:", deleteError);
          throw deleteError;
        }

        console.log("Property deleted successfully:", property.name);
        
        // Refresh the properties list
        await fetchProperties();
      }
      
    } catch (err: any) {
      console.error("Error deleting property:", err);
      setError(err.message || "Failed to delete property");
    }
  };

  // Fetch properties on component mount
  useEffect(() => {
    fetchProperties();
  }, []);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#012a4a]">Properties</h1>
        <p className="text-slate-600 mt-2">Manage and view all your rental properties.</p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search properties..."
            className="w-full rounded-md border border-gray-200 p-2.5 text-sm"
          />
        </div>
        <Link
          href="/owner/properties/add"
          className="rounded-md bg-[#012a4a] px-4 py-2.5 text-white text-sm hover:bg-[#0a1f35]"
        >
          Add Property
        </Link>
      </div>

      {/* Properties List */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Loading properties...</p>
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No properties added yet</p>
            <p className="text-xs mt-2">Add your first property to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div key={property.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{property.name}</h3>
                    <p className="text-sm text-slate-600 mt-1">{property.address}</p>
                    <div className="flex gap-4 mt-3 text-xs text-slate-500">
                      <span>Type: {property.type}</span>
                      <span>Status: {property.status}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/owner/properties/${property.id}`}
                      className="text-sm text-[#012a4a] hover:underline"
                    >
                      View
                    </Link>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => handleDelete(property)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
