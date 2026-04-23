"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  property_id: string;
}

export default function AddTenant() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [dueDay, setDueDay] = useState("1");
  const [monthlyRent, setMonthlyRent] = useState("");
  const [accountStatus, setAccountStatus] = useState("active");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);

  // Load properties and units on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        
        // Load properties
        const { data: propsData, error: propsError } = await supabase
          .from("properties")
          .select("id, name")
          .order("name");

        if (propsError) throw propsError;
        setProperties(propsData || []);

        // Load units
        const { data: unitsData, error: unitsError } = await supabase
          .from("units")
          .select("id, name, property_id")
          .order("name");

        if (unitsError) throw unitsError;
        setUnits(unitsData || []);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load properties and units");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Filter units when property changes
  useEffect(() => {
    if (propertyId) {
      console.log("Property ID:", propertyId, "Type:", typeof propertyId);
      console.log("Units:", units);
      const filtered = units.filter((unit) => String(unit.property_id) === String(propertyId));
      console.log("Filtered units:", filtered);
      setFilteredUnits(filtered);
      setUnitId(""); // Reset unit selection
    } else {
      setFilteredUnits([]);
      setUnitId("");
    }
  }, [propertyId, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!propertyId || !unitId) {
        setError("Please select a property and unit");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/owner/create-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          propertyId,
          unitId,
          moveInDate: moveInDate || null,
          dueDay: parseInt(dueDay),
          monthlyRent: parseFloat(monthlyRent),
          accountStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create tenant account");
        setLoading(false);
        return;
      }

      // Redirect on success
      router.push("/owner/tenants");
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
      setLoading(false);
    }
  };

  const selectedProperty = properties.find((p) => p.id === propertyId);
  const selectedUnit = units.find((u) => u.id === unitId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white">Add Tenant</h1>
          <Link href="/owner/dashboard" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Back
          </Link>
        </header>

        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-sm text-red-200">
              {error}
            </div>
          )}

          {loadingData ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-slate-300 mt-4">Loading properties and units...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tenant Information */}
            <div className="border-b border-white/10 pb-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Tenant Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Jane Doe"
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="jane@example.com"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-slate-400">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Secure password"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            {/* Property & Unit Assignment */}
            <div className="border-b border-white/10 pb-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Property & Unit</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400">Property</label>
                  <select
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading}
                    required
                  >
                    <option value="" className="bg-slate-800">Select a property</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id} className="bg-slate-800">
                        {prop.name}
                      </option>
                    ))}
                  </select>
                  {selectedProperty && (
                    <p className="text-xs text-slate-500 mt-1">ID: {propertyId}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm text-slate-400">Unit</label>
                  <select
                    value={unitId}
                    onChange={(e) => setUnitId(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading || !propertyId}
                    required
                  >
                    <option value="" className="bg-slate-800">
                      {propertyId ? "Select a unit" : "Select property first"}
                    </option>
                    {filteredUnits.map((unit) => (
                      <option key={unit.id} value={unit.id} className="bg-slate-800">
                        {unit.name}
                      </option>
                    ))}
                  </select>
                  {selectedUnit && (
                    <p className="text-xs text-slate-500 mt-1">ID: {unitId}</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-slate-400">Move-In Date (Optional)</label>
                <input
                  type="date"
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Rent Details */}
            <div className="border-b border-white/10 pb-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Rent Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400">Due Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400">Monthly Rent</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="1250.00"
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Account Status */}
            <div className="pb-6">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">Account Status</h2>
              <div>
                <label className="block text-sm text-slate-400">Status</label>
                <select
                  value={accountStatus}
                  onChange={(e) => setAccountStatus(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={loading}
                >
                  <option value="active" className="bg-slate-800">Active</option>
                  <option value="inactive" className="bg-slate-800">Inactive</option>
                </select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creating..." : "Create Tenant"}
              </button>
              <Link
                href="/owner/dashboard"
                className="rounded-xl border border-white/20 px-6 py-3 text-slate-300 hover:bg-white/10 transition-colors"
              >
                Cancel
              </Link>
            </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}