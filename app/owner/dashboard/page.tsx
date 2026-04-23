"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  occupancyRate: number;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    totalTenants: 0,
    occupancyRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Fetching dashboard stats for user:", user.id);

      // Query 1: Count properties for the logged-in owner
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', user.id);

      if (propertiesError) {
        console.error("Properties count error:", propertiesError);
        throw propertiesError;
      }

      const totalProperties = propertiesData?.length || 0;
      console.log("Total properties:", totalProperties);

      // Query 2: Count units for the logged-in owner's properties
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          properties (
            owner_id
          )
        `)
        .eq('properties.owner_id', user.id);

      if (unitsError) {
        console.error("Units count error:", unitsError);
        throw unitsError;
      }

      const totalUnits = unitsData?.length || 0;
      console.log("Total units:", totalUnits);

      // Query 3: Count tenants for the logged-in owner's properties
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id,
          units (
            property_id,
            properties (
              owner_id
            )
          )
        `)
        .eq('units.properties.owner_id', user.id);

      if (tenantsError) {
        console.error("Tenants count error:", tenantsError);
        throw tenantsError;
      }

      const totalTenants = tenantsData?.length || 0;
      console.log("Total tenants:", totalTenants);

      // Calculate occupied and vacant units
      const occupiedUnits = totalTenants; // Each tenant represents an occupied unit
      const vacantUnits = totalUnits - occupiedUnits;
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      console.log("Occupied units:", occupiedUnits);
      console.log("Vacant units:", vacantUnits);
      console.log("Occupancy rate:", occupancyRate);

      setStats({
        totalProperties,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        totalTenants,
        occupancyRate
      });
      
    } catch (err: any) {
      console.error("Error fetching dashboard stats:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6">
        <header>
          <h1 className="text-3xl font-semibold text-[#012a4a]">Owner Dashboard</h1>
          <p className="text-slate-600 mt-2">Manage your properties, units, and tenant payments.</p>
        </header>
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-6">
        <header>
          <h1 className="text-3xl font-semibold text-[#012a4a]">Owner Dashboard</h1>
          <p className="text-slate-600 mt-2">Manage your properties, units, and tenant payments.</p>
        </header>
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#012a4a]">Owner Dashboard</h1>
        <p className="text-slate-600 mt-2">Manage your properties, units, and tenant payments.</p>
      </header>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Total Properties</h3>
          <p className="mt-3 text-3xl font-bold text-[#012a4a]">{stats.totalProperties}</p>
          <p className="text-xs text-slate-500 mt-2">Active properties</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Total Units</h3>
          <p className="mt-3 text-3xl font-bold text-[#012a4a]">{stats.totalUnits}</p>
          <p className="text-xs text-slate-500 mt-2">Across all properties</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Occupied Units</h3>
          <p className="mt-3 text-3xl font-bold text-green-600">{stats.occupiedUnits}</p>
          <p className="text-xs text-slate-500 mt-2">{stats.occupancyRate}% occupancy</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Vacant Units</h3>
          <p className="mt-3 text-3xl font-bold text-orange-500">{stats.vacantUnits}</p>
          <p className="text-xs text-slate-500 mt-2">Available</p>
        </div>
      </div>

      {/* Second Row of Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Total Tenants</h3>
          <p className="mt-3 text-3xl font-bold text-[#012a4a]">{stats.totalTenants}</p>
          <p className="text-xs text-slate-500 mt-2">Active tenants</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Monthly Revenue</h3>
          <p className="mt-3 text-3xl font-bold text-[#012a4a]">₱0</p>
          <p className="text-xs text-slate-500 mt-2">Expected rent</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Due Payments</h3>
          <p className="mt-3 text-3xl font-bold text-blue-600">0</p>
          <p className="text-xs text-slate-500 mt-2">Payments due this month</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Overdue Payments</h3>
          <p className="mt-3 text-3xl font-bold text-red-600">0</p>
          <p className="text-xs text-slate-500 mt-2">Action needed</p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012a4a] mb-4">Recent Activity</h2>
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No recent activity</p>
        </div>
      </div>

      {/* Recent Payment Submissions Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012a4a] mb-4">Recent Payment Submissions</h2>
        <div className="text-center py-8 text-slate-500">
          <p className="text-sm">No payment submissions yet</p>
        </div>
      </div>
    </div>
  );
}
