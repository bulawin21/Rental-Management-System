"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AddUnitPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    unitName: "",
    propertyId: "",
    monthlyRent: "",
    status: "vacant",
    notes: ""
  });
  const [properties, setProperties] = useState<Array<{id: string, name: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch properties for dropdown
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('id, name')
          .order('name');
        
        if (error) throw error;
        setProperties(data || []);
      } catch (err: any) {
        console.error("Error fetching properties:", err);
        setError("Failed to load properties");
      }
    };

    fetchProperties();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Insert unit into Supabase
      const { data, error: insertError } = await supabase
        .from('units')
        .insert({
          name: formData.unitName,
          property_id: formData.propertyId,
          monthly_rent: parseFloat(formData.monthlyRent),
          status: formData.status,
          notes: formData.notes
        })
        .select()
        .single();

      if (insertError) {
        console.error("Supabase error:", insertError);
        throw insertError;
      }

      console.log("Unit saved successfully:", data);
      
      // Redirect to units page on success
      router.push('/owner/units');
      
    } catch (err: any) {
      console.error("Error saving unit:", err);
      setError(err.message || "Failed to save unit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/owner/units" 
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              &larr; Back to Units
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-white mt-4">Add Unit</h1>
          <p className="text-slate-300 mt-2 text-lg">Add a new rental unit to a property</p>
        </header>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-8">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Unit Name / Number */}
            <div>
              <label htmlFor="unitName" className="block text-sm font-medium text-slate-300 mb-2">
                Unit Name / Number
              </label>
              <input
                type="text"
                id="unitName"
                name="unitName"
                value={formData.unitName}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Unit 1A, Apt 203, Studio B"
              />
            </div>

            {/* Property Dropdown */}
            <div>
              <label htmlFor="propertyId" className="block text-sm font-medium text-slate-300 mb-2">
                Property
              </label>
              <select
                id="propertyId"
                name="propertyId"
                value={formData.propertyId}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="" className="bg-slate-800">Select a property</option>
                {properties.map((property: {id: string, name: string}) => (
                  <option key={property.id} value={property.id} className="bg-slate-800">
                    {property.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Monthly Rent */}
            <div>
              <label htmlFor="monthlyRent" className="block text-sm font-medium text-slate-300 mb-2">
                Monthly Rent
              </label>
              <input
                type="number"
                id="monthlyRent"
                name="monthlyRent"
                value={formData.monthlyRent}
                onChange={handleInputChange}
                required
                min="0"
                step="0.01"
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., 1500.00"
              />
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="vacant" className="bg-slate-800">Vacant</option>
                <option value="occupied" className="bg-slate-800">Occupied</option>
                <option value="maintenance" className="bg-slate-800">Under Maintenance</option>
                <option value="unavailable" className="bg-slate-800">Unavailable</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-2">
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Additional notes about the unit, features, amenities, etc."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-white text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Unit"}
              </button>
              <Link
                href="/owner/units"
                className="rounded-xl border border-white/20 px-6 py-3 text-slate-300 text-sm hover:bg-white/10 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
