"use client";

import React from "react";

export default function PaymentsPage() {
  const handleApprove = (paymentId: string) => {
    if (confirm("Approve this payment? This will mark it as paid and the receipt as approved.")) {
      // TODO: Implement approve functionality
      console.log(`Approving payment: ${paymentId}`);
    }
  };

  const handleReject = (paymentId: string) => {
    if (confirm("Reject this payment? This will mark the receipt as rejected and payment as unpaid/overdue.")) {
      // TODO: Implement reject functionality
      console.log(`Rejecting payment: ${paymentId}`);
    }
  };

  const handleDelete = (paymentId: string) => {
    if (confirm("Are you sure you want to delete this payment record? This action cannot be undone.")) {
      // TODO: Implement delete functionality
      console.log(`Deleting payment: ${paymentId}`);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending Review':
        return 'bg-blue-100 text-blue-800';
      case 'Unpaid':
        return 'bg-gray-100 text-gray-800';
      case 'Overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getReceiptStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      case 'Not Submitted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#012a4a]">Payments</h1>
        <p className="text-slate-600 mt-2">Track and manage tenant rent payments.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Expected This Month</h3>
          <p className="mt-3 text-3xl font-bold text-[#012a4a]">₱0</p>
          <p className="text-xs text-slate-500 mt-2">From all units</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Received This Month</h3>
          <p className="mt-3 text-3xl font-bold text-green-600">₱0</p>
          <p className="text-xs text-slate-500 mt-2">0% collected</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Pending Review</h3>
          <p className="mt-3 text-3xl font-bold text-blue-600">₱0</p>
          <p className="text-xs text-slate-500 mt-2">Awaiting approval</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
          <h3 className="text-sm text-slate-500 font-medium">Overdue</h3>
          <p className="mt-3 text-3xl font-bold text-red-600">₱0</p>
          <p className="text-xs text-slate-500 mt-2">Action needed</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2 flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search payments..."
            className="flex-1 rounded-md border border-gray-200 p-2.5 text-sm"
          />
          <select className="rounded-md border border-gray-200 p-2.5 text-sm">
            <option value="">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="pending">Pending Review</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="rounded-lg bg-white shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Tenant</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Property / Unit</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Billing Month</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Amount</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Method</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Due Date</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Receipt Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Payment Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Empty state */}
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                  <p className="text-sm">No payments recorded yet</p>
                  <p className="text-xs mt-2">Payment records will appear here once tenants submit payments</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
