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
      console.log("Approving payment:", paymentId);
      const { error } = await supabase
        .from('payments')
        .update({ status: 'approved' })
        .eq('id', paymentId);

      if (error) {
        console.error("Approve error:", error);
        throw error;
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
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
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
            <p className="text-slate-300">No payments found</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6 hover:bg-white/20 transition-all duration-300"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {payment.tenants?.profiles?.full_name || 'Unknown Tenant'}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        payment.status === 'approved' ? 'bg-emerald-500/30 text-emerald-300' :
                        payment.status === 'rejected' ? 'bg-red-500/30 text-red-300' :
                        'bg-amber-500/30 text-amber-300'
                      }`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-slate-400">{payment.properties?.name || 'Unknown Property'}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Amount:</span>
                        <span className="ml-2 font-medium text-white">₱{payment.amount?.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Method:</span>
                        <span className="ml-2 font-medium text-white">{payment.payment_method}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Payment Date:</span>
                        <span className="ml-2 font-medium text-white">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Submitted:</span>
                        <span className="ml-2 font-medium text-white">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 ml-4">
                    {payment.proof_image_url && (
                      <button
                        onClick={() => setSelectedProof(payment.proof_image_url)}
                        className="px-4 py-2 text-sm text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                      >
                        View Proof
                      </button>
                    )}
                    {payment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(payment.id)}
                          className="px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(payment.id)}
                          className="px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setShowDeleteConfirm(payment.id)}
                      disabled={deletingId === payment.id}
                      className="px-4 py-2 text-sm text-slate-400 hover:bg-slate-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === payment.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
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
