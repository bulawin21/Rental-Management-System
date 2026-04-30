"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface TenantData {
  id: string;
  profile_id: string;
  property_id: string;
  unit_id: string;
  move_in_date: string | null;
  last_payment_date: string | null;
  monthly_rent: number;
  account_status: string;
}

interface PropertyDetails {
  name: string;
}

interface UnitDetails {
  name: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  status: string;
  created_at: string;
}

export default function TenantPayments() {
  const [tenantData, setTenantData] = useState<TenantData | null>(null);
  const [propertyDetails, setPropertyDetails] = useState<PropertyDetails | null>(null);
  const [unitDetails, setUnitDetails] = useState<UnitDetails | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("GCash");
  const [paymentDate, setPaymentDate] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  // Calculate next payment due date from last payment date or move-in date
  const getNextDueDate = (moveInDate: string | null, lastPaymentDate: string | null): { date: Date; isOverdue: boolean; daysUntilDue: number } | null => {
    const baseDate = lastPaymentDate || moveInDate;
    if (!baseDate) return null;

    const base = new Date(baseDate);
    const now = new Date();
    
    // Calculate next due date based on the base date (last payment or move-in)
    // JavaScript automatically handles edge cases (e.g., Jan 31 → Feb 28/29)
    let nextDueDate = new Date(base);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    
    // If the calculated due date has already passed, add another month
    if (now > nextDueDate) {
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    }
    
    const daysUntilDue = Math.ceil((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysUntilDue < 0;
    
    return { date: nextDueDate, isOverdue, daysUntilDue };
  };

  // Load tenant data on mount
  useEffect(() => {
    loadTenantData();
  }, []);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      console.log("=== Loading Tenant Payments Data ===");
      
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Loading payments for tenant auth UID:", user.id);

      // Load tenant row for this User
      const { data: tenantRows, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("profile_id", user.id);

      if (tenantError) {
        console.error("Error loading tenant row:", tenantError);
        throw tenantError;
      }

      console.log("Tenant query result:", tenantRows);
      console.log("Tenant query result length:", tenantRows?.length || 0);

      if (!tenantRows || tenantRows.length === 0) {
        console.log("No tenant assignment found for this user");
        setTenantData(null);
        return;
      }

      if (tenantRows.length > 1) {
        console.warn("Warning: Multiple tenant assignments found for user:", tenantRows.length);
      }

      const tenantRow = tenantRows[0];
      console.log("Selected tenant row:", tenantRow);

      console.log("=== End Loading Tenant Payments Data ===");

      setTenantData(tenantRow);

      // Load property details
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("name")
        .eq("id", tenantRow.property_id)
        .single();

      if (propertyError) {
        console.error("Error loading property:", propertyError);
      } else {
        setPropertyDetails(propertyData);
      }

      // Load unit details
      const { data: unitData, error: unitError } = await supabase
        .from("units")
        .select("name")
        .eq("id", tenantRow.unit_id)
        .single();

      if (unitError) {
        console.error("Error loading unit:", unitError);
      } else {
        setUnitDetails(unitData);
      }

      // Load payments for this tenant
      const { data: paymentRows, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantRow.id)
        .order("created_at", { ascending: false });

      if (paymentsError) {
        console.error("Error loading payments:", paymentsError);
      } else {
        console.log("Payment records loaded:", paymentRows);
        setPayments(paymentRows || []);
      }

    } catch (err: any) {
      console.error("Error loading tenant payments:", err);
      setError(err.message || "Failed to load tenant data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPayment(true);
    setPaymentError(null);
    setPaymentSuccess(null);

    try {
      if (!tenantData) {
        throw new Error("No tenant data found");
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Upload proof image to Supabase Storage if provided
      let proofImageUrl = null;
      if (proofImage) {
        const fileExt = proofImage.name.split('.').pop();
        const fileName = `payment-proof-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, proofImage);

        if (uploadError) {
          throw new Error(`Failed to upload proof: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);

        proofImageUrl = publicUrl;
      }

      // Debug: Log what we're trying to insert
      const paymentData = {
        tenant_id: tenantData.id,
        property_id: tenantData.property_id,
        amount: tenantData.monthly_rent,
        payment_method: paymentMethod,
        payment_date: paymentDate,
        proof_image_url: proofImageUrl,
        status: 'pending',
        user_id: user.id
      };

      console.log("Attempting to insert payment data:", paymentData);

      // Insert payment record
      const { data, error: insertError } = await supabase
        .from('payments')
        .insert(paymentData);

      if (insertError) {
        console.error("Insert error details:", insertError);
        throw new Error(`Failed to submit payment: ${insertError.message}`);
      }

      console.log("Payment inserted successfully:", data);

      setPaymentSuccess("Payment submitted successfully! Your payment is now pending approval.");
      setShowPaymentForm(false);
      setProofImage(null);
      setPaymentMethod("GCash");
      setPaymentDate("");

      // Reload payments after submission
      const { data: newPayments } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false });
      setPayments(newPayments || []);

    } catch (err: any) {
      console.error("Payment submission error:", err);
      setPaymentError(err.message || "Failed to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Payments</h1>
          <p className="text-slate-300 mt-2 text-lg">Your payment history and upcoming rent information</p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-white/20 rounded w-2/4 mb-2"></div>
                  <div className="h-4 bg-white/20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6">
            <p className="text-red-200">{error}</p>
          </div>
        ) : !tenantData ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">No Assignment Found</h2>
            <p className="text-slate-300">You don't have any property or unit assignments yet.</p>
            <p className="text-sm text-slate-400 mt-2">Contact your property manager for more information.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Payment Summary Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-8 hover:bg-white/20 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Payment Summary</h2>
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-white font-medium hover:from-emerald-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-emerald-500/50"
                >
                  Submit Payment
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Monthly Rent</h3>
                  </div>
                  <p className="text-3xl font-bold text-white">
                    ₱{tenantData.monthly_rent?.toFixed(2) || "Loading..."}
                  </p>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Next Due Date</h3>
                  </div>
                  {(() => {
                    const nextDueInfo = tenantData?.move_in_date ? getNextDueDate(tenantData.move_in_date, tenantData.last_payment_date) : null;
                    if (!nextDueInfo) return <p className="text-lg text-slate-400">Move-in date not set</p>;
                    return (
                      <p className={`text-lg font-semibold ${
                        nextDueInfo.isOverdue 
                          ? 'text-red-400' 
                          : nextDueInfo.daysUntilDue <= 3
                          ? 'text-amber-400'
                          : 'text-white'
                      }`}>
                        {nextDueInfo.isOverdue 
                          ? `Overdue by ${Math.abs(nextDueInfo.daysUntilDue)} days (Due - ${nextDueInfo.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })})` 
                          : nextDueInfo.daysUntilDue === 0
                          ? 'Due today'
                          : `Due - ${nextDueInfo.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                        }
                      </p>
                    );
                  })()}
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Account Status</h3>
                  </div>
                  <span className={`inline-flex px-4 py-2 text-sm font-medium rounded-full ${
                    tenantData.account_status === 'active' 
                      ? 'bg-emerald-500/30 text-emerald-300' 
                      : 'bg-white/10 text-slate-300'
                  }`}>
                    {tenantData.account_status || "Loading..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Records Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 p-8 hover:bg-white/20 transition-all duration-300">
              <h2 className="text-2xl font-bold text-white mb-6">Payment History</h2>
              
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-slate-300 mb-2">No payment records yet</p>
                  <p className="text-sm text-slate-400">Submit your first payment to see your history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-5 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          payment.status === 'approved'
                            ? 'bg-emerald-500/20'
                            : payment.status === 'rejected'
                            ? 'bg-red-500/20'
                            : 'bg-amber-500/20'
                        }`}>
                          <svg className={`w-6 h-6 ${
                            payment.status === 'approved'
                              ? 'text-emerald-400'
                              : payment.status === 'rejected'
                              ? 'text-red-400'
                              : 'text-amber-400'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-white">₱{payment.amount?.toFixed(2)}</p>
                          <p className="text-sm text-slate-400 mt-1">
                            {payment.payment_method} • {new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className={`px-4 py-2 text-sm font-medium rounded-full ${
                        payment.status === 'approved'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : payment.status === 'rejected'
                          ? 'bg-red-500/30 text-red-300'
                          : 'bg-amber-500/30 text-amber-300'
                      }`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-md mx-4 border border-white/20 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Submit Payment</h3>

            {paymentError && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-sm text-red-200">{paymentError}</p>
                </div>
              )}

              {paymentSuccess && (
                <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
                  <p className="text-sm text-emerald-200">{paymentSuccess}</p>
                </div>
              )}

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                {/* Property and Unit Info (Auto-filled) */}
                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                  <p className="text-sm text-slate-300">
                    <strong>Property:</strong> {propertyDetails?.name || "Loading..."}
                  </p>
                  <p className="text-sm text-slate-300">
                    <strong>Unit:</strong> {unitDetails?.name || "Loading..."}
                  </p>
                  <p className="text-sm text-slate-300">
                    <strong>Amount:</strong> ₱{tenantData?.monthly_rent?.toFixed(2) || "Loading..."}
                  </p>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="GCash" className="bg-slate-800">GCash</option>
                    <option value="Bank Transfer" className="bg-slate-800">Bank Transfer</option>
                    <option value="Counter" className="bg-slate-800">Counter Payment</option>
                  </select>
                </div>

                {/* Payment Date */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    required
                  />
                </div>

                {/* Proof Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Payment Proof Image
                  </label>
                  <div className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center bg-white/5 hover:bg-white/10 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setProofImage(e.target.files?.[0] || null)}
                      className="hidden"
                      id="proof-upload-modal"
                      required
                    />
                    <label
                      htmlFor="proof-upload-modal"
                      className="cursor-pointer"
                    >
                      {proofImage ? (
                        <div className="text-sm text-slate-300">
                          Selected: {proofImage.name}
                        </div>
                      ) : (
                        <div className="text-sm text-slate-300">
                          Click to upload payment proof image
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentForm(false);
                      setProofImage(null);
                      setPaymentMethod("GCash");
                      setPaymentDate("");
                      setPaymentError(null);
                      setPaymentSuccess(null);
                    }}
                    className="flex-1 rounded-xl border border-white/20 px-4 py-2 text-sm text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-white text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-emerald-500/50"
                  >
                    {submittingPayment ? "Submitting..." : "Submit Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
