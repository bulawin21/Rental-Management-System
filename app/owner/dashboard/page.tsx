"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface DashboardStats {
  totalProperties: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  totalTenants: number;
  occupancyRate: number;
  monthlyRevenue: number;
}

interface Activity {
  id: string;
  type: 'tenant' | 'property' | 'unit' | 'payment';
  description: string;
  timestamp: string;
}

interface PaymentSubmission {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  tenant_name?: string;
  property_name?: string;
  created_at: string;
}

export default function OwnerDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    vacantUnits: 0,
    totalTenants: 0,
    occupancyRate: 0,
    monthlyRevenue: 0
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [recentPayments, setRecentPayments] = useState<PaymentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Fetching dashboard stats for user:", user.id);

      // Query 1: Count properties for the logged-in owner
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('id')
        .eq('owner_id', user.id);

      if (propertiesError) {
        console.error("Properties count error:", propertiesError);
        throw propertiesError;
      }

      const totalProperties = propertiesData?.length || 0;
      console.log("Total properties:", totalProperties);

      // Query 2: Count units for the logged-in owner's properties
      const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select(`
          id,
          properties (
            owner_id
          )
        `)
        .eq('properties.owner_id', user.id);

      if (unitsError) {
        console.error("Units count error:", unitsError);
        throw unitsError;
      }

      const totalUnits = unitsData?.length || 0;
      console.log("Total units:", totalUnits);

      // Query 3: Count tenants for the logged-in owner's properties
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id,
          units (
            property_id,
            properties (
              owner_id
            )
          )
        `)
        .eq('units.properties.owner_id', user.id);

      if (tenantsError) {
        console.error("Tenants count error:", tenantsError);
        throw tenantsError;
      }

      const totalTenants = tenantsData?.length || 0;
      console.log("Total tenants:", totalTenants);

      // Calculate occupied and vacant units
      const occupiedUnits = totalTenants; // Each tenant represents an occupied unit
      const vacantUnits = totalUnits - occupiedUnits;
      const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      console.log("Occupied units:", occupiedUnits);
      console.log("Vacant units:", vacantUnits);
      console.log("Occupancy rate:", occupancyRate);

      setStats({
        totalProperties,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        totalTenants,
        occupancyRate,
        monthlyRevenue: 0
      });

      // Calculate monthly revenue from approved payments
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: approvedPayments } = await supabase
        .from('payments')
        .select('amount, properties (owner_id)')
        .eq('properties.owner_id', user.id)
        .eq('status', 'approved')
        .gte('payment_date', firstDayOfMonth.toISOString())
        .lte('payment_date', lastDayOfMonth.toISOString());

      const monthlyRevenue = approvedPayments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

      setStats(prev => ({
        ...prev,
        monthlyRevenue
      }));

      // Fetch recent activities
      const activities: Activity[] = [];
      
      // Get recent tenants
      const { data: recentTenants } = await supabase
        .from('tenants')
        .select(`
          id,
          created_at,
          profiles (full_name),
          units (name),
          properties (name)
        `)
        .eq('units.properties.owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentTenants) {
        recentTenants.forEach(tenant => {
          activities.push({
            id: tenant.id,
            type: 'tenant',
            description: `New tenant added: ${tenant.profiles?.full_name || 'Unknown'} to ${tenant.units?.name || 'Unknown'}`,
            timestamp: tenant.created_at
          });
        });
      }

      // Get recent properties
      const { data: recentProperties } = await supabase
        .from('properties')
        .select('id, name, created_at')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentProperties) {
        recentProperties.forEach(property => {
          activities.push({
            id: property.id,
            type: 'property',
            description: `New property added: ${property.name}`,
            timestamp: property.created_at
          });
        });
      }

      // Get recent units
      const { data: recentUnits } = await supabase
        .from('units')
        .select('id, name, created_at, properties (name)')
        .eq('properties.owner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentUnits) {
        recentUnits.forEach(unit => {
          activities.push({
            id: unit.id,
            type: 'unit',
            description: `New unit added: ${unit.name} at ${unit.properties?.name || 'Unknown'}`,
            timestamp: unit.created_at
          });
        });
      }

      // Sort activities by timestamp and take top 10
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 10));

      // Fetch recent pending payment submissions
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_method,
          payment_date,
          status,
          created_at,
          tenants (profiles (full_name)),
          properties (name)
        `)
        .eq('properties.owner_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (paymentsData) {
        const payments: PaymentSubmission[] = paymentsData.map(payment => ({
          id: payment.id,
          amount: payment.amount,
          payment_method: payment.payment_method,
          payment_date: payment.payment_date,
          status: payment.status,
          tenant_name: payment.tenants?.profiles?.full_name || 'Unknown',
          property_name: payment.properties?.name || 'Unknown',
          created_at: payment.created_at
        }));
        setRecentPayments(payments);
      }
      
    } catch (err: any) {
      console.error("Error fetching dashboard stats:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-white">Owner Dashboard</h1>
            <p className="text-slate-300 mt-2 text-lg">Overview of your rental properties and performance</p>
          </header>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-slate-300 mt-4">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-white">Owner Dashboard</h1>
            <p className="text-slate-300 mt-2 text-lg">Overview of your rental properties and performance</p>
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
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white">Owner Dashboard</h1>
              <p className="text-slate-300 mt-2 text-lg">Overview of your rental properties and performance</p>
            </div>
            <div className="hidden sm:block">
              <div className="text-sm text-slate-400">
                Last updated: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </header>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Total Properties</h3>
                <p className="mt-3 text-4xl font-bold text-white">{stats.totalProperties}</p>
                <p className="text-sm text-slate-400 mt-2">Active properties</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Total Units</h3>
                <p className="mt-3 text-4xl font-bold text-white">{stats.totalUnits}</p>
                <p className="text-sm text-slate-400 mt-2">Across all properties</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Occupied Units</h3>
                <p className="mt-3 text-4xl font-bold text-emerald-400">{stats.occupiedUnits}</p>
                <p className="text-sm text-slate-400 mt-2">{stats.occupancyRate}% occupancy rate</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Vacant Units</h3>
                <p className="mt-3 text-4xl font-bold text-amber-400">{stats.vacantUnits}</p>
                <p className="text-sm text-slate-400 mt-2">Available for rent</p>
              </div>
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row of Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Total Tenants</h3>
                <p className="mt-3 text-4xl font-bold text-white">{stats.totalTenants}</p>
                <p className="text-sm text-slate-400 mt-2">Active tenants</p>
              </div>
              <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Monthly Revenue</h3>
                <p className="mt-3 text-4xl font-bold text-white">₱{stats.monthlyRevenue.toLocaleString()}</p>
                <p className="text-sm text-slate-400 mt-2">From approved payments</p>
              </div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Due Payments</h3>
                <p className="mt-3 text-4xl font-bold text-blue-400">0</p>
                <p className="text-sm text-slate-400 mt-2">Payments due this month</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Overdue Payments</h3>
                <p className="mt-3 text-4xl font-bold text-red-400">0</p>
                <p className="text-sm text-slate-400 mt-2">Action needed</p>
              </div>
              <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            <span className="text-sm text-slate-400">Latest updates</span>
          </div>
          {recentActivities.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <svg className="w-16 h-16 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-slate-400">No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    activity.type === 'tenant' ? 'bg-indigo-500/20' :
                    activity.type === 'property' ? 'bg-blue-500/20' :
                    activity.type === 'unit' ? 'bg-purple-500/20' :
                    'bg-emerald-500/20'
                  }`}>
                    {activity.type === 'tenant' && (
                      <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                    {activity.type === 'property' && (
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                    {activity.type === 'unit' && (
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payment Submissions Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Recent Payment Submissions</h2>
            <span className="text-sm text-slate-400">Pending review</span>
          </div>
          {recentPayments.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <svg className="w-16 h-16 mx-auto text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-slate-400">No payment submissions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">₱{payment.amount?.toFixed(2)}</p>
                      <p className="text-xs text-slate-400 mt-1">{payment.tenant_name} • {payment.property_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{payment.payment_method}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(payment.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
