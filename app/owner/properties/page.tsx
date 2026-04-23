"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface Property {
  id: string;
  name: string;
  type: string;
  address: string;
  status: string;
  created_at: string;
  unit_count?: number;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
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

      const { data, error } = await supabase
        .from('properties')
        .select('*, units(id)')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add unit count to each property
      const propertiesWithCount = (data || []).map(property => ({
        ...property,
        unit_count: property.units?.length || 0
      }));

      setProperties(propertiesWithCount);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <div
                key={property.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300 flex flex-col"
              >
                <Link
                  href={`/owner/properties/${property.id}`}
                  className="flex-1"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">{property.name}</h3>
                    <span className={`px-3 py-1 text-xs rounded-full font-medium ${
                      property.status === 'active' 
                        ? 'bg-emerald-500/30 text-emerald-300' 
                        : 'bg-amber-500/30 text-amber-300'
                    }`}>
                      {property.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{property.address}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-slate-300">{property.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      <span className="text-slate-300">{property.unit_count || 0} units</span>
                    </div>
                  </div>
                </Link>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs text-slate-500">{new Date(property.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDelete(property.id)}
                    disabled={deletingId === property.id}
                    className="px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {deletingId === property.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
