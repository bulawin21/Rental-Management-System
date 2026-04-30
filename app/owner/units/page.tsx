"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Unit {
  id: string;
  name: string;
  monthly_rent: number;
  status: string;
  notes: string;
  properties: {
    id: string;
    name: string;
  };
  tenants?: {
    id: string;
    full_name: string;
    email: string;
    move_in_date: string;
    account_status: string;
  } | null;
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUnits = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Fetch units with properties
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          *,
          properties (
            id,
            name
          )
        `)
        .eq('properties.owner_id', user.id);

      if (unitsError) throw unitsError;

      // Fetch tenants for these units
      if (unitsData && unitsData.length > 0) {
        const unitIds = unitsData.map(unit => unit.id);
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select(`
            *,
            profiles (
              full_name,
              email
            )
          `)
          .in('unit_id', unitIds);

        if (tenantsError) throw tenantsError;

        // Map tenants to units
        const unitsWithTenants = unitsData.map(unit => {
          const tenant = tenantsData?.find(t => t.unit_id === unit.id);
          return {
            ...unit,
            tenants: tenant ? {
              id: tenant.id,
              full_name: tenant.profiles?.full_name || "Unknown",
              email: tenant.profiles?.email || "Unknown",
              move_in_date: tenant.move_in_date,
              account_status: tenant.account_status
            } : null
          };
        });

        setUnits(unitsWithTenants);
      } else {
        setUnits([]);
      }
    } catch (err: any) {
      console.error("Error fetching units:", err);
      setError(err.message || "Failed to load units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this unit?")) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      await fetchUnits();
    } catch (err: any) {
      console.error("Error deleting unit:", err);
      setError(err.message || "Failed to delete unit");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header>
            <h1 className="text-4xl font-bold text-white">Units</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage your rental units</p>
          </header>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-slate-300 mt-4">Loading units...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header>
            <h1 className="text-4xl font-bold text-white">Units</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage your rental units</p>
          </header>
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">Units</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage your rental units</p>
          </div>
          <Link
            href="/owner/units/add"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium"
          >
            Add Unit
          </Link>
        </header>

        {units.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-12 text-center">
            <p className="text-slate-300 mb-4">No units yet</p>
            <Link
              href="/owner/units/add"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Add your first unit
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Total Units</p>
                    <p className="text-2xl font-bold text-white">{units.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 rounded-xl p-4 border border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-emerald-300 text-sm font-medium">Occupied</p>
                    <p className="text-2xl font-bold text-white">{units.filter(u => u.status === 'occupied').length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-xl p-4 border border-amber-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-amber-300 text-sm font-medium">Available</p>
                    <p className="text-2xl font-bold text-white">{units.filter(u => u.status === 'available').length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-xl p-4 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/30 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Total Rent</p>
                    <p className="text-2xl font-bold text-white">₱{units.reduce((sum, unit) => sum + unit.monthly_rent, 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Units List */}
            <div className="space-y-4">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden hover:bg-white/20 transition-all duration-300"
                >
                  {/* Unit Header */}
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-6 border-b border-white/10">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-white">{unit.name}</h3>
                          <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                            unit.status === 'occupied' 
                              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' 
                              : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                          }`}>
                            {unit.status}
                          </span>
                        </div>
                        <p className="text-slate-200 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          {unit.properties.name}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-slate-200">₱{unit.monthly_rent.toLocaleString()}/month</span>
                          </div>
                          {unit.tenants && (
                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                              <span className="text-slate-200">{unit.tenants.full_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={() => handleDelete(unit.id)}
                          disabled={deletingId === unit.id}
                          className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 border border-red-500/30 hover:border-red-500/50"
                        >
                          {deletingId === unit.id ? "Deleting..." : "Delete Unit"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Unit Details */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Unit Information */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Unit Information
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 text-sm">Monthly Rent</span>
                              <span className="text-white font-semibold">₱{unit.monthly_rent.toLocaleString()}</span>
                            </div>
                          </div>
                          {unit.notes && (
                            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                              <p className="text-slate-400 text-sm mb-1">Notes</p>
                              <p className="text-slate-300">{unit.notes}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tenant Information */}
                      <div>
                        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          Assigned Tenant
                        </h4>
                        {unit.tenants ? (
                          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-white">{unit.tenants.full_name}</p>
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    unit.tenants.account_status === 'active' 
                                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' 
                                      : 'bg-white/10 text-slate-300 border border-white/30'
                                  }`}>
                                    {unit.tenants.account_status}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-300 mb-1">{unit.tenants.email}</p>
                                {unit.tenants.move_in_date && (
                                  <p className="text-xs text-slate-400">
                                    Moved in: {new Date(unit.tenants.move_in_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                            <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            <p className="text-slate-400 text-sm">No tenant assigned</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
