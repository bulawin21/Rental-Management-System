"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Unit {
  id: string;
  name: string;
  property_id: string;
  monthly_rent: number;
  status: string;
  notes: string;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
  owner_id: string;
}

interface UnitWithProperty extends Unit {
  propertyName: string;
  tenantName: string;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<UnitWithProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch units for the logged-in owner with property information
  const fetchUnits = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("=== Owner Units Page Debug ===");
      console.log("Auth user ID:", user.id);

      // Step 1: Load properties for this owner
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id, name')
        .eq('owner_id', user.id);

      if (propertiesError) {
        console.error("Properties fetch error:", propertiesError);
        throw propertiesError;
      }

      console.log("Properties query result:", propertiesData);
      console.log("Properties query result length:", propertiesData?.length || 0);

      if (!propertiesData || propertiesData.length === 0) {
        console.log("No properties found for this owner");
        setUnits([]);
        return;
      }

      // Step 2: Load units for these properties
      const propertyIds = propertiesData.map(p => p.id);
      console.log("Property IDs for units query:", propertyIds);

      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('*')
        .in('property_id', propertyIds)
        .order('created_at', { ascending: false });

      if (unitsError) {
        console.error("Units fetch error:", unitsError);
        throw unitsError;
      }

      console.log("Raw units rows:", unitsData);
      console.log("Units query result length:", unitsData?.length || 0);

      // Step 3: Load tenant assignments for these units
      const unitIds = unitsData.map(u => u.id);
      console.log("Unit IDs for tenant query:", unitIds);
      
      const { data: tenantRows, error: tenantsError } = await supabase
        .from('tenants')
        .select('unit_id, profile_id')
        .in('unit_id', unitIds);

      if (tenantsError) {
        console.error("Tenants fetch error:", tenantsError);
        throw tenantsError;
      }

      console.log("Raw tenant rows:", tenantRows);
      console.log("Tenants query result length:", tenantRows?.length || 0);

      // Step 4: Load profiles for tenant names
      const profileIds = tenantRows?.map(t => t.profile_id) || [];
      console.log("Profile IDs for profiles query:", profileIds);

      let profilesData: any[] = [];
      if (profileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', profileIds);

        if (profilesError) {
          console.error("Profiles fetch error:", profilesError);
          throw profilesError;
        }

        profilesData = profiles || [];
        console.log("Raw profile rows:", profilesData);
        console.log("Profiles query result length:", profilesData?.length || 0);
      }

      // Step 5: Map all data together
      const propertyMap = new Map(propertiesData.map(p => [p.id, p.name]));
      const profileMap = new Map(profilesData.map(p => [p.id, p.full_name]));
      const tenantMap = new Map(tenantRows?.map(t => [t.unit_id, t.profile_id]) || []);

      const unitsWithProperty: UnitWithProperty[] = unitsData.map(unit => {
        const profileId = tenantMap.get(unit.id);
        const tenantName = profileId ? profileMap.get(profileId) || "Unknown" : "-";
        
        return {
          ...unit,
          propertyName: propertyMap.get(unit.property_id) || "Unknown Property",
          tenantName: tenantName
        };
      });

      console.log("Final mapped units list:", unitsWithProperty);
      console.log("Final units for rendering:", unitsWithProperty);
      console.log("=== End Owner Units Debug ===");

      setUnits(unitsWithProperty);
      
    } catch (err: any) {
      console.error("Error fetching units:", err);
      setError(err.message || "Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  // Delete unit with confirmation
  const handleDelete = async (unit: UnitWithProperty) => {
    if (confirm(`Are you sure you want to delete "${unit.name}"? This action cannot be undone.`)) {
      try {
        const { error: deleteError } = await supabase
          .from('units')
          .delete()
          .eq('id', unit.id);

        if (deleteError) {
          console.error("Delete error:", deleteError);
          throw deleteError;
        }

        console.log("Unit deleted successfully:", unit.name);
        
        // Refresh the units list
        await fetchUnits();
        
      } catch (err: any) {
        console.error("Error deleting unit:", err);
        setError(err.message || "Failed to delete unit");
      }
    }
  };

  // Fetch units on component mount
  useEffect(() => {
    fetchUnits();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return 'bg-green-100 text-green-800';
      case 'vacant':
        return 'bg-orange-100 text-orange-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800';
      case 'unavailable':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#012a4a]">Units</h1>
        <p className="text-slate-600 mt-2">View and manage all rental units across your properties.</p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search units..."
            className="flex-1 rounded-md border border-gray-200 p-2.5 text-sm"
          />
          <select className="rounded-md border border-gray-200 p-2.5 text-sm">
            <option value="">All Status</option>
            <option value="occupied">Occupied</option>
            <option value="vacant">Vacant</option>
          </select>
        </div>
        <Link
          href="/owner/units/add"
          className="rounded-md bg-[#012a4a] px-4 py-2.5 text-white text-sm hover:bg-[#0a1f35]"
        >
          Add Unit
        </Link>
      </div>

      {/* Units Table */}
      <div className="rounded-lg bg-white shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">Loading units...</p>
          </div>
        ) : units.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No units added yet</p>
            <p className="text-xs mt-2">Add units to your properties to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Unit</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Property</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Tenant</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Rent</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-slate-900">{unit.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{unit.propertyName}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{unit.tenantName}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(unit.status)}`}>
                        {unit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">₱{unit.monthly_rent.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDelete(unit)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
