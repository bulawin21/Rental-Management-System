"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Property {
  id: string;
  name: string;
  type: string;
  address: string;
  description: string;
  status: string;
  owner_id: string;
  created_at: string;
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

export default function PropertyDetailsPage() {
  const params = useParams();
  const propertyId = params.id as string;
  
  const [property, setProperty] = useState<Property | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch property details
  const fetchProperty = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError) {
        console.error("Property fetch error:", fetchError);
        throw fetchError;
      }

      console.log("Fetched property:", data);
      return data;
    } catch (err: any) {
      console.error("Error fetching property:", err);
      throw err;
    }
  };

  // Fetch units for this property
  const fetchUnits = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('units')
        .select('*')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error("Units fetch error:", fetchError);
        throw fetchError;
      }

      console.log("Fetched units:", data);
      return data || [];
    } catch (err: any) {
      console.error("Error fetching units:", err);
      throw err;
    }
  };

  // Fetch tenants assigned to units under this property
  const fetchTenants = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('tenants')
        .select(`
          *,
          units (
            name,
            property_id
          ),
          profiles (
            full_name,
            email
          )
        `)
        .eq('units.property_id', propertyId)
        .order('move_in_date', { ascending: false });

      if (fetchError) {
        console.error("Tenants fetch error:", fetchError);
        throw fetchError;
      }

      console.log("Fetched tenants:", data);
      return data || [];
    } catch (err: any) {
      console.error("Error fetching tenants:", err);
      throw err;
    }
  };

  // Load all data
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [propertyData, unitsData, tenantsData] = await Promise.all([
        fetchProperty(),
        fetchUnits(),
        fetchTenants()
      ]);

      setProperty(propertyData);
      setUnits(unitsData);
      setTenants(tenantsData);
      
    } catch (err: any) {
      console.error("Error loading property details:", err);
      setError(err.message || "Failed to load property details");
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (propertyId) {
      loadData();
    }
  }, [propertyId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'occupied':
        return 'bg-green-100 text-green-800';
      case 'inactive':
      case 'vacant':
        return 'bg-orange-100 text-orange-800';
      case 'maintenance':
        return 'bg-blue-100 text-blue-800';
      case 'unavailable':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6">
        <header>
          <div className="flex items-center gap-4">
            <Link href="/owner/properties" className="text-sm text-[#012a4a] hover:underline">
              &larr; Back to Properties
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-[#012a4a] mt-4">Loading...</h1>
        </header>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="grid gap-6">
        <header>
          <div className="flex items-center gap-4">
            <Link href="/owner/properties" className="text-sm text-[#012a4a] hover:underline">
              &larr; Back to Properties
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-[#012a4a] mt-4">Error</h1>
        </header>
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>
    );
  }

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
        <h1 className="text-3xl font-semibold text-[#012a4a] mt-4">{property.name}</h1>
        <p className="text-slate-600 mt-2">View property information, units, and assigned tenants.</p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Property Information */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012a4a] mb-4">Property Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Property Name</h3>
            <p className="text-slate-900">{property.name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Type</h3>
            <p className="text-slate-900">{property.type}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Address</h3>
            <p className="text-slate-900">{property.address}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">Status</h3>
            <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(property.status)}`}>
              {property.status}
            </span>
          </div>
          <div className="md:col-span-2">
            <h3 className="text-sm font-medium text-slate-500 mb-1">Description</h3>
            <p className="text-slate-900">{property.description || 'No description provided'}</p>
          </div>
        </div>
      </div>

      {/* Units Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012a4a] mb-4">Units</h2>
        {units.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No units added to this property yet</p>
            <Link href="/owner/units/add" className="text-sm text-[#012a4a] hover:underline mt-2 inline-block">
              Add your first unit
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {units.map((unit) => (
              <div key={unit.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">{unit.name}</h4>
                  <p className="text-sm text-slate-600">Rent: ₱{unit.monthly_rent.toLocaleString()}/month</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(unit.status)}`}>
                  {unit.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tenants Section */}
      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-[#012a4a] mb-4">Assigned Tenants</h2>
        {tenants.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p className="text-sm">No tenants assigned to this property yet</p>
            <Link href="/owner/tenants/add" className="text-sm text-[#012a4a] hover:underline mt-2 inline-block">
              Add your first tenant
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="font-medium text-slate-900">{tenant.profiles?.full_name || 'Unknown Tenant'}</h4>
                  <p className="text-sm text-slate-600">{tenant.profiles?.email || 'No email'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Unit: {tenant.units?.name || 'N/A'} | Move-in: {tenant.move_in_date || 'N/A'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(tenant.account_status)}`}>
                  {tenant.account_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
