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
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-4">
          <Link 
            href="/owner/properties" 
            className="text-sm text-[#012a4a] hover:underline"
          >
            &larr; Back to Properties
          </Link>
        </div>
        <h1 className="text-3xl font-semibold text-[#012a4a] mt-4">Add Property</h1>
        <p className="text-slate-600 mt-2">Add a new rental property to your portfolio.</p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Form Card */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Property Name */}
          <div>
            <label htmlFor="propertyName" className="block text-sm font-medium text-slate-700 mb-2">
              Property Name
            </label>
            <input
              type="text"
              id="propertyName"
              name="propertyName"
              value={formData.propertyName}
              onChange={handleInputChange}
              required
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
              placeholder="e.g., Downtown Complex"
            />
          </div>

          {/* Property Type */}
          <div>
            <label htmlFor="propertyType" className="block text-sm font-medium text-slate-700 mb-2">
              Property Type
            </label>
            <select
              id="propertyType"
              name="propertyType"
              value={formData.propertyType}
              onChange={handleInputChange}
              required
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
            >
              <option value="">Select property type</option>
              <option value="apartment">Apartment Building</option>
              <option value="house">Single Family House</option>
              <option value="condo">Condominium</option>
              <option value="townhouse">Townhouse</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-2">
              Address
            </label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              required
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
              placeholder="e.g., 123 Main Street, Downtown"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="w-full rounded-md border border-gray-200 p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#012a4a] focus:border-transparent"
              placeholder="Describe the property, amenities, location highlights..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Under Maintenance</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-[#012a4a] px-6 py-2.5 text-white text-sm hover:bg-[#0a1f35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Property"}
            </button>
            <Link
              href="/owner/properties"
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
