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

      const { data, error } = await supabase
        .from('units')
        .select(`
          *,
          properties (
            id,
            name
          )
        `)
        .eq('properties.owner_id', user.id);

      if (error) throw error;

      setUnits(data || []);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {units.map((unit) => (
              <div
                key={unit.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{unit.name}</h3>
                    <p className="text-slate-400 text-sm mt-1">{unit.properties.name}</p>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                    unit.status === 'occupied' 
                      ? 'bg-emerald-500/30 text-emerald-300' 
                      : 'bg-amber-500/30 text-amber-300'
                  }`}>
                    {unit.status}
                  </span>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Monthly Rent</p>
                    <p className="text-2xl font-bold text-white mt-1">₱{unit.monthly_rent.toLocaleString()}</p>
                  </div>
                  {unit.notes && (
                    <div>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Notes</p>
                      <p className="text-sm text-slate-300 mt-1">{unit.notes}</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDelete(unit.id)}
                  disabled={deletingId === unit.id}
                  className="w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 border border-red-500/30 hover:border-red-500/50"
                >
                  {deletingId === unit.id ? "Deleting..." : "Delete Unit"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
