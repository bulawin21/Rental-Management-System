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
        return 'bg-emerald-500/30 text-emerald-300';
      case 'inactive':
      case 'vacant':
        return 'bg-amber-500/30 text-amber-300';
      case 'maintenance':
        return 'bg-blue-500/30 text-blue-300';
      case 'unavailable':
        return 'bg-slate-500/30 text-slate-300';
      default:
        return 'bg-slate-500/30 text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header>
            <div className="flex items-center gap-4">
              <Link href="/owner/properties" className="text-sm text-slate-400 hover:text-white transition-colors">
                &larr; Back to Properties
              </Link>
            </div>
            <h1 className="text-3xl font-semibold text-white mt-4">Loading...</h1>
          </header>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-slate-300 mt-4">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header>
            <div className="flex items-center gap-4">
              <Link href="/owner/properties" className="text-sm text-slate-400 hover:text-white transition-colors">
                &larr; Back to Properties
              </Link>
            </div>
            <h1 className="text-3xl font-semibold text-white mt-4">Error</h1>
          </header>
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mt-6">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-4">
            <Link 
              href="/owner/properties" 
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              &larr; Back to Properties
            </Link>
          </div>
          <h1 className="text-3xl font-semibold text-white mt-4">{property.name}</h1>
          <p className="text-slate-300 mt-2">View property information, units, and assigned tenants.</p>
        </header>

        {/* Property Information */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 mt-8 hover:bg-white/20 transition-all duration-300">
          <h2 className="text-lg font-semibold text-emerald-400 mb-6">Property Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Property Name</h3>
              <p className="text-lg text-white">{property.name}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Type</h3>
              <p className="text-lg text-white">{property.type}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Address</h3>
              <p className="text-white">{property.address}</p>
            </div>
            <div>
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Status</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(property.status)}`}>
                {property.status}
              </span>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Description</h3>
              <p className="text-white">{property.description || 'No description provided'}</p>
            </div>
          </div>
        </div>

        {/* Units Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 mt-6 hover:bg-white/20 transition-all duration-300">
          <h2 className="text-lg font-semibold text-emerald-400 mb-6">Units</h2>
          {units.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No units added to this property yet</p>
              <Link href="/owner/units/add" className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-block transition-colors">
                Add your first unit
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {units.map((unit) => (
                <div key={unit.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div>
                    <h4 className="font-medium text-white">{unit.name}</h4>
                    <p className="text-sm text-slate-400">Rent: ₱{unit.monthly_rent.toLocaleString()}/month</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(unit.status)}`}>
                    {unit.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tenants Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 mt-6 hover:bg-white/20 transition-all duration-300">
          <h2 className="text-lg font-semibold text-emerald-400 mb-6">Assigned Tenants</h2>
          {tenants.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">No tenants assigned to this property yet</p>
              <Link href="/owner/tenants/add" className="text-sm text-emerald-400 hover:text-emerald-300 mt-2 inline-block transition-colors">
                Add your first tenant
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div>
                    <h4 className="font-medium text-white">{tenant.profiles?.full_name || 'Unknown Tenant'}</h4>
                    <p className="text-sm text-slate-400">{tenant.profiles?.email || 'No email'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Unit: {tenant.units?.name || 'N/A'} | Move-in: {tenant.move_in_date || 'N/A'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.account_status)}`}>
                    {tenant.account_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
