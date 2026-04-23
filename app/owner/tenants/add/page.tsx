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
  status: string;
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

  // Load properties for the logged-in owner on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingData(true);
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("User not authenticated");
        }

        console.log("Loading data for user:", user.id);

        // Step 1: Load properties for the logged-in owner
        const { data: propsData, error: propsError } = await supabase
          .from("properties")
          .select("id, name")
          .eq("owner_id", user.id)
          .order("name");

        if (propsError) {
          console.error("Properties fetch error:", propsError);
          throw propsError;
        }

        console.log("Fetched properties:", propsData);
        setProperties(propsData || []);

        // Step 2: Load units using property IDs array
        if (propsData && propsData.length > 0) {
          const propertyIds = propsData.map(prop => prop.id);
          console.log("Loading units for property IDs:", propertyIds);

          const { data: unitsData, error: unitsError } = await supabase
            .from("units")
            .select("id, name, property_id, status")
            .in("property_id", propertyIds)
            .order("name");

          if (unitsError) {
            console.error("Units fetch error:", unitsError);
            throw unitsError;
          }

          console.log("Fetched units:", unitsData);
          setUnits(unitsData || []);
        } else {
          console.log("No properties found, skipping units load");
          setUnits([]);
        }
        
      } catch (err: any) {
        console.error("Error loading data:", err);
        setError(err.message || "Failed to load properties and units");
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Filter units when property changes
  useEffect(() => {
    console.log("=== Unit Filtering Debug ===");
    console.log("selectedPropertyId:", propertyId);
    console.log("all loaded units:", units);
    console.log("units count:", units?.length);
    
    if (propertyId) {
      // Debug each unit's properties
      units.forEach((unit, index) => {
        console.log(`Unit ${index}:`, {
          id: unit.id,
          name: unit.name,
          property_id: unit.property_id,
          property_id_type: typeof unit.property_id,
          status: unit.status,
          status_type: typeof unit.status,
          status_lowercase: String(unit.status).toLowerCase()
        });
      });
      
      // Fix type comparison issues
      const filtered = units.filter((unit) => {
        const propertyMatch = String(unit.property_id) === String(propertyId);
        const statusMatch = String(unit.status).toLowerCase() === "vacant";
        
        console.log(`Unit ${unit.name} - Property Match: ${propertyMatch}, Status Match: ${statusMatch}`);
        
        return propertyMatch && statusMatch;
      });
      
      console.log("filtered units result:", filtered);
      console.log("filtered units count:", filtered.length);
      console.log("=== End Unit Filtering Debug ===");
      
      setFilteredUnits(filtered);
      setUnitId(""); // Reset unit selection
    } else {
      console.log("No property selected, clearing filtered units");
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

      // Log full API response for debugging
      console.log("API Response Status:", response.status);
      console.log("API Response Data:", data);

      if (!response.ok) {
        // Show the exact error message from the API
        const errorMessage = data.error || data.message || "Failed to create tenant account";
        console.error("API Error:", errorMessage);
        setError(errorMessage);
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
    <div className="grid gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#012a4a]">Add Tenant</h1>
        <Link href="/owner/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
          Back
        </Link>
      </header>

      <div className="max-w-2xl rounded-lg bg-white p-6 shadow-sm">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}

        {loadingData ? (
          <div className="text-center py-8">
            <p className="text-slate-600">Loading properties and units...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant Information */}
          <div className="border-b pb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Tenant Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 p-2"
                  placeholder="Jane Doe"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 p-2"
                  placeholder="jane@example.com"
                  disabled={loading}
                  required
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-slate-600">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 p-2"
                placeholder="Secure password"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Property & Unit Assignment */}
          <div className="border-b pb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Property & Unit</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600">Property</label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 p-2"
                  disabled={loading}
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map((prop) => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
                {selectedProperty && (
                  <p className="text-xs text-slate-500 mt-1">ID: {propertyId}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-600">Unit</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 p-2"
                  disabled={loading || !propertyId}
                  required
                >
                  <option value="">
                    {propertyId ? "Select a unit" : "Select property first"}
                  </option>
                  {filteredUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
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
              <label className="block text-sm text-slate-600">Move-In Date (Optional)</label>
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 p-2"
                disabled={loading}
              />
            </div>
          </div>

          {/* Rent Details */}
          <div className="border-b pb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Rent Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600">Due Day (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 p-2"
                  disabled={loading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600">Monthly Rent</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 p-2"
                  placeholder="1250.00"
                  disabled={loading}
                  required
                />
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="pb-4">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Account Status</h2>
            <div>
              <label className="block text-sm text-slate-600">Status</label>
              <select
                value={accountStatus}
                onChange={(e) => setAccountStatus(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 p-2"
                disabled={loading}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-[#012a4a] px-6 py-2 text-white disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Tenant"}
            </button>
            <Link
              href="/owner/dashboard"
              className="rounded-md border border-gray-200 px-6 py-2 text-slate-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
          </div>
          </form>
        )}
      </div>
    </div>
  );
}