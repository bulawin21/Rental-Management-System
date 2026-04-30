"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
  type: string;
  address: string;
  description: string;
  status: string;
  created_at: string;
  unit_count?: number;
}

interface Unit {
  id: string;
  name: string;
  property_id: string;
  monthly_rent: number;
  status: string;
  notes: string;
  created_at: string;
}

interface Tenant {
  id: string;
  full_name: string;
  email: string;
  unit_id: string;
  move_in_date: string;
  account_status: string;
  units: {
    name: string;
  };
}

interface PropertyWithDetails extends Property {
  units: Unit[];
  tenants: Tenant[];
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<PropertyWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Fetch properties with description
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;

      // For each property, fetch its units and tenants
      const propertiesWithDetails: PropertyWithDetails[] = await Promise.all(
        (propertiesData || []).map(async (property) => {
          // Fetch units for this property
          const { data: unitsData, error: unitsError } = await supabase
            .from('units')
            .select('*')
            .eq('property_id', property.id)
            .order('created_at', { ascending: false });

          if (unitsError) {
            console.error("Error fetching units for property:", property.id, unitsError);
          }

          // Fetch tenants for units in this property
          const unitIds = unitsData?.map(unit => unit.id) || [];
          let tenantsData: Tenant[] = [];
          
          if (unitIds.length > 0) {
            const { data: tenants, error: tenantsError } = await supabase
              .from('tenants')
              .select(`
                *,
                units (
                  name
                ),
                profiles (
                  full_name,
                  email
                )
              `)
              .in('unit_id', unitIds)
              .order('move_in_date', { ascending: false });

            if (tenantsError) {
              console.error("Error fetching tenants for property:", property.id, tenantsError);
            } else {
              // Map the tenant data to include profile information
              tenantsData = (tenants || []).map(tenant => ({
                ...tenant,
                full_name: tenant.profiles?.full_name || "Unknown",
                email: tenant.profiles?.email || "Unknown",
                units: tenant.units
              }));
            }
          }

          return {
            ...property,
            unit_count: unitsData?.length || 0,
            units: unitsData || [],
            tenants: tenantsData
          };
        })
      );

      setProperties(propertiesWithDetails);
    } catch (err: any) {
      console.error("Error fetching properties:", err);
      setError(err.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this property? This will also delete all associated units.")) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      await fetchProperties();
    } catch (err: any) {
      console.error("Error deleting property:", err);
      setError(err.message || "Failed to delete property");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header>
            <h1 className="text-4xl font-bold text-white">Properties</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage your rental properties</p>
          </header>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-slate-300 mt-4">Loading properties...</p>
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
            <h1 className="text-4xl font-bold text-white">Properties</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage your rental properties</p>
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
            <h1 className="text-4xl font-bold text-white">Properties</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage your rental properties</p>
          </div>
          <Link
            href="/owner/properties/add"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium"
          >
            Add Property
          </Link>
        </header>

        {properties.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-12 text-center">
            <p className="text-slate-300 mb-4">No properties yet</p>
            <Link
              href="/owner/properties/add"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Add your first property
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 overflow-hidden hover:bg-white/20 transition-all duration-300"
              >
                {/* Property Header */}
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-6 border-b border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-2xl font-bold text-white">{property.name}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                          property.status === 'active' 
                            ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' 
                            : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                        }`}>
                          {property.status}
                        </span>
                      </div>
                      <p className="text-slate-200 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {property.address}
                      </p>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span className="text-slate-200">{property.type}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          <span className="text-slate-200">{property.unit_count || 0} units</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <span className="text-slate-200">{property.tenants.length} tenants</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{new Date(property.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => handleDelete(property.id)}
                        disabled={deletingId === property.id}
                        className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 border border-red-500/30 hover:border-red-500/50"
                      >
                        {deletingId === property.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Property Description */}
                {property.description && (
                  <div className="p-6 bg-white/5 border-b border-white/10">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description
                    </h4>
                    <p className="text-slate-300 leading-relaxed">{property.description}</p>
                  </div>
                )}

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 divide-x divide-white/10">
                  {/* Units Section */}
                  <div className="p-6">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Units ({property.units.length})
                    </h4>
                    {property.units.length === 0 ? (
                      <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                        <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <p className="text-slate-400 text-sm">No units added yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {property.units.map((unit) => (
                          <div key={unit.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                              <h5 className="font-semibold text-white">{unit.name}</h5>
                              <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                unit.status === 'occupied' 
                                  ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' 
                                  : 'bg-amber-500/30 text-amber-300 border border-amber-500/50'
                              }`}>
                                {unit.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-blue-300">₱{unit.monthly_rent.toLocaleString()}/month</p>
                              {unit.notes && (
                                <p className="text-xs text-slate-400 italic">{unit.notes}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tenants Section */}
                  <div className="p-6">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Tenants ({property.tenants.length})
                    </h4>
                    {property.tenants.length === 0 ? (
                      <div className="text-center py-8 bg-white/5 rounded-lg border border-white/10">
                        <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <p className="text-slate-400 text-sm">No tenants assigned yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {property.tenants.map((tenant) => (
                          <div key={tenant.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-white">{tenant.full_name}</p>
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    tenant.account_status === 'active' 
                                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' 
                                      : 'bg-white/10 text-slate-300 border border-white/30'
                                  }`}>
                                    {tenant.account_status}
                                  </span>
                                </div>
                                <p className="text-sm text-slate-300 mb-1">{tenant.email}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                  Unit: {tenant.units?.name || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
