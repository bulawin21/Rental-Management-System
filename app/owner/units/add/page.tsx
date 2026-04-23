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
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-4">
          <Link 
            href="/owner/units" 
            className="text-sm text-[#012a4a] hover:underline"
          >
            &larr; Back to Units
          </Link>
        </div>
        <h1 className="text-3xl font-semibold text-[#012a4a] mt-4">Add Unit</h1>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <p className="text-slate-600 mt-2">Add a new rental unit to a property.</p>
      </header>

      {/* Form Card */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Unit Name / Number */}
          <div>
            <label htmlFor="unitName" className="block text-sm font-medium text-slate-700 mb-2">
              Unit Name / Number
            </label>
            <input
              type="text"
              id="unitName"
              name="unitName"
              value={formData.unitName}
              onChange={handleInputChange}
              required
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
              placeholder="e.g., Unit 1A, Apt 203, Studio B"
            />
          </div>

          {/* Property Dropdown */}
          <div>
            <label htmlFor="propertyId" className="block text-sm font-medium text-slate-700 mb-2">
              Property
            </label>
            <select
              id="propertyId"
              name="propertyId"
              value={formData.propertyId}
              onChange={handleInputChange}
              required
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
            >
              <option value="">Select a property</option>
              {properties.map((property: {id: string, name: string}) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          {/* Monthly Rent */}
          <div>
            <label htmlFor="monthlyRent" className="block text-sm font-medium text-slate-700 mb-2">
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
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
              placeholder="e.g., 1500.00"
            />
          </div>

          {/* Status */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-2">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
            >
              <option value="vacant">Vacant</option>
              <option value="occupied">Occupied</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-2">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
              placeholder="Additional notes about the unit, features, amenities, etc."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-[#012a4a] px-6 py-2.5 text-white text-sm hover:bg-[#0a1f35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Unit"}
            </button>
            <Link
              href="/owner/units"
              className="rounded-md border border-gray-200 px-6 py-2.5 text-slate-700 text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
