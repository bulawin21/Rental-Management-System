"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Payment {
  id: string;
  tenant_id: string;
  property_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  proof_image_url: string;
  status: string;
  created_at: string;
  tenants: {
    profiles: {
      full_name: string;
    };
  };
  properties: {
    name: string;
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, [filterStatus]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      let query = supabase
        .from('payments')
        .select(`
          *,
          tenants (
            profiles (
              full_name
            )
          ),
          properties (
            name
          )
        `)
        .eq('properties.owner_id', user.id);

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err: any) {
      console.error("Error loading payments:", err);
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      console.log("=== Approving payment ===");
      console.log("Payment ID:", paymentId);
      
      // Get payment details to find tenant_id
      const { data: paymentData, error: fetchError } = await supabase
        .from('payments')
        .select('tenant_id, payment_date')
        .eq('id', paymentId)
        .single();

      console.log("Payment data fetched:", paymentData);

      if (fetchError) {
        console.error("Fetch payment error:", fetchError);
        throw fetchError;
      }

      // Update payment status
      const { error } = await supabase
        .from('payments')
        .update({ status: 'approved' })
        .eq('id', paymentId);

      if (error) {
        console.error("Approve error:", error);
        throw error;
      }

      console.log("Payment status updated to approved");

      // Update tenant's last_payment_date to advance due date
      if (paymentData) {
        console.log("Updating tenant last_payment_date:", paymentData.payment_date, "for tenant:", paymentData.tenant_id);
        const { error: tenantError } = await supabase
          .from('tenants')
          .update({ last_payment_date: paymentData.payment_date })
          .eq('id', paymentData.tenant_id);

        if (tenantError) {
          console.error("Update tenant error:", tenantError);
          setError("Payment approved but failed to update due date: " + tenantError.message);
        } else {
          console.log("Tenant last_payment_date updated successfully");
        }
      }

      console.log("Payment approved successfully");
      await loadPayments();
    } catch (err: any) {
      console.error("Error approving payment:", err);
      setError(err.message || "Failed to approve payment");
    }
  };

  const handleReject = async (paymentId: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: 'rejected' })
        .eq('id', paymentId);

      if (error) throw error;
      await loadPayments();
    } catch (err: any) {
      console.error("Error rejecting payment:", err);
      setError(err.message || "Failed to reject payment");
    }
  };

  const handleDelete = async (paymentId: string) => {
    try {
      setDeletingId(paymentId);
      
      // Get payment details before deletion
      const { data: paymentData, error: fetchError } = await supabase
        .from('payments')
        .select('tenant_id, payment_date, status')
        .eq('id', paymentId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the payment
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      // If the deleted payment was approved, rollback the tenant's last_payment_date
      if (paymentData && paymentData.status === 'approved') {
        // Find the previous approved payment for this tenant
        const { data: previousPayments } = await supabase
          .from('payments')
          .select('payment_date')
          .eq('tenant_id', paymentData.tenant_id)
          .eq('status', 'approved')
          .neq('id', paymentId)
          .order('payment_date', { ascending: false })
          .limit(1);

        // Update tenant's last_payment_date to previous payment date or null
        const newLastPaymentDate = previousPayments && previousPayments.length > 0 
          ? previousPayments[0].payment_date 
          : null;

        const { error: tenantError } = await supabase
          .from('tenants')
          .update({ last_payment_date: newLastPaymentDate })
          .eq('id', paymentData.tenant_id);

        if (tenantError) {
          console.error("Error rolling back tenant last_payment_date:", tenantError);
        } else {
          console.log("Tenant last_payment_date rolled back successfully");
        }
      }

      await loadPayments();
      setShowDeleteConfirm(null);
    } catch (err: any) {
      console.error("Error deleting payment:", err);
      setError(err.message || "Failed to delete payment");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <header>
            <h1 className="text-4xl font-bold text-white">Payments</h1>
            <p className="text-slate-300 mt-2 text-lg">Manage tenant payments</p>
          </header>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-slate-300 mt-4">Loading payments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Payments</h1>
          <p className="text-slate-300 mt-2 text-lg">Manage tenant payments</p>
        </header>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                filterStatus === status
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-white/10 text-slate-300 hover:bg-white/20'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 mb-8">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {payments.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-12 text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-300 mb-2">No payments found</p>
            <p className="text-sm text-slate-400">Payments will appear here when tenants submit them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      payment.status === 'approved' ? 'bg-emerald-500/20' :
                      payment.status === 'rejected' ? 'bg-red-500/20' :
                      'bg-amber-500/20'
                    }`}>
                      <svg className={`w-5 h-5 ${
                        payment.status === 'approved' ? 'text-emerald-400' :
                        payment.status === 'rejected' ? 'text-red-400' :
                        'text-amber-400'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {payment.tenants?.profiles?.full_name || 'Unknown Tenant'}
                      </h3>
                      <p className="text-sm text-slate-400">{payment.properties?.name || 'Unknown Property'}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    payment.status === 'approved' ? 'bg-emerald-500/30 text-emerald-300' :
                    payment.status === 'rejected' ? 'bg-red-500/30 text-red-300' :
                    'bg-amber-500/30 text-amber-300'
                  }`}>
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Amount</span>
                    <span className="text-lg font-bold text-white">₱{payment.amount?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Method</span>
                    <span className="text-sm font-medium text-white">{payment.payment_method}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Payment Date</span>
                    <span className="text-sm font-medium text-white">
                      {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-400">Submitted</span>
                    <span className="text-sm font-medium text-white">
                      {new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  {payment.proof_image_url && (
                    <button
                      onClick={() => setSelectedProof(payment.proof_image_url)}
                      className="w-full px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors border border-blue-500/30 hover:border-blue-500/50"
                    >
                      View Proof
                    </button>
                  )}
                  {payment.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApprove(payment.id)}
                        className="px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors border border-emerald-500/30 hover:border-emerald-500/50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(payment.id)}
                        className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/30 hover:border-red-500/50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(payment.id)}
                    disabled={deletingId === payment.id}
                    className="w-full px-4 py-2 text-sm text-slate-400 hover:bg-slate-500/20 rounded-lg transition-colors border border-slate-500/30 hover:border-slate-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === payment.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Proof Image Modal */}
        {selectedProof && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setSelectedProof(null)}
          >
            <div className="max-w-4xl max-h-[90vh] mx-4">
              <img
                src={selectedProof}
                alt="Payment Proof"
                className="max-w-full max-h-[90vh] rounded-xl shadow-2xl"
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-md mx-4 border border-white/20 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-4">Delete Payment</h3>
              <p className="text-sm text-slate-300 mb-6">
                Are you sure you want to delete this payment? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={deletingId === showDeleteConfirm}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deletingId === showDeleteConfirm ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
