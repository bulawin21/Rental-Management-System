"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AddPropertyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    propertyName: "",
    propertyType: "",
    address: "",
    description: "",
    status: "active"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Insert property into Supabase
      const { data, error: insertError } = await supabase
        .from('properties')
        .insert({
          name: formData.propertyName,
          type: formData.propertyType,
          address: formData.address,
          description: formData.description,
          status: formData.status,
          owner_id: user.id
        })
        .select()
        .single();

      if (insertError) {
        console.error("Supabase error:", insertError);
        throw insertError;
      }

      console.log("Property saved successfully:", data);
      
      // Redirect to properties page on success
      router.push('/owner/properties');
      
    } catch (err: any) {
      console.error("Error saving property:", err);
      setError(err.message || "Failed to save property. Please try again.");
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
              href="/owner/properties" 
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              &larr; Back to Properties
            </Link>
          </div>
          <h1 className="text-4xl font-bold text-white mt-4">Add Property</h1>
          <p className="text-slate-300 mt-2 text-lg">Add a new rental property to your portfolio</p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-8">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Name */}
            <div>
              <label htmlFor="propertyName" className="block text-sm font-medium text-slate-300 mb-2">
                Property Name
              </label>
              <input
                type="text"
                id="propertyName"
                name="propertyName"
                value={formData.propertyName}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., Downtown Complex"
              />
            </div>

            {/* Property Type */}
            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium text-slate-300 mb-2">
                Property Type
              </label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="" className="bg-slate-800">Select property type</option>
                <option value="apartment" className="bg-slate-800">Apartment Building</option>
                <option value="house" className="bg-slate-800">Single Family House</option>
                <option value="condo" className="bg-slate-800">Condominium</option>
                <option value="townhouse" className="bg-slate-800">Townhouse</option>
                <option value="commercial" className="bg-slate-800">Commercial</option>
              </select>
            </div>

            {/* Address */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-2">
                Address
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="e.g., 123 Main Street, Downtown"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Describe the property, amenities, location highlights..."
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
                <option value="active" className="bg-slate-800">Active</option>
                <option value="inactive" className="bg-slate-800">Inactive</option>
                <option value="maintenance" className="bg-slate-800">Under Maintenance</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-white text-sm hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "Save Property"}
              </button>
              <Link
                href="/owner/properties"
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
