"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Tenant {
  id: string;
  full_name: string;
  email: string;
}

interface Message {
  id: string;
  owner_id: string;
  tenant_profile_id: string;
  sender_role: 'owner' | 'tenant';
  message: string;
  created_at: string;
}

export default function MessagesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");

  // Load tenants on mount
  useEffect(() => {
    loadTenants();
  }, []);

  // Load messages when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      loadMessages(selectedTenant);
    } else {
      setMessages([]);
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    try {
      setLoadingTenants(true);
      console.log("=== Owner Messages Page Debug ===");
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Auth user ID:", user.id);

      // Step 1: Load owner's properties
      const { data: properties, error: propsError } = await supabase
        .from("properties")
        .select("id, name")
        .eq("owner_id", user.id);

      if (propsError) {
        console.error("Properties error:", propsError);
        throw propsError;
      }

      console.log("Properties query result:", properties);
      console.log("Properties query result length:", properties?.length || 0);
      
      if (!properties || properties.length === 0) {
        console.log("No properties found for this owner");
        setTenants([]);
        return;
      }

      // Step 2: Collect property IDs
      const propertyIds = properties.map(p => p.id);
      console.log("Property IDs for tenants query:", propertyIds);

      // Step 3: Load tenants for these properties
      const { data: tenantRows, error: tenantsError } = await supabase
        .from("tenants")
        .select("profile_id, property_id")
        .in("property_id", propertyIds);

      if (tenantsError) {
        console.error("Tenants error:", tenantsError);
        throw tenantsError;
      }

      console.log("Tenants query result:", tenantRows);
      console.log("Tenants query result length:", tenantRows?.length || 0);

      if (!tenantRows || tenantRows.length === 0) {
        console.log("No tenants found for these properties");
        setTenants([]);
        return;
      }

      // Step 4: Load profiles for tenant names and emails
      const profileIds = tenantRows.map(t => t.profile_id);
      console.log("Profile IDs for profiles query:", profileIds);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", profileIds);

      if (profilesError) {
        console.error("Profiles error:", profilesError);
        throw profilesError;
      }

      console.log("Profiles query result:", profiles);
      console.log("Profiles query result length:", profiles?.length || 0);

      // Step 5: Map data together
      const mappedTenants: Tenant[] = tenantRows.map(tenant => {
        const profile = profiles?.find(p => p.id === tenant.profile_id);
        
        return {
          id: tenant.profile_id,
          full_name: profile?.full_name || "Unknown",
          email: profile?.email || "Unknown",
        };
      });

      console.log("Final mapped tenant list:", mappedTenants);
      console.log("Final tenants for rendering:", mappedTenants);
      console.log("=== End Owner Messages Debug ===");

      setTenants(mappedTenants);

    } catch (err: any) {
      console.error("Error loading tenants:", err);
      setError(err.message || "Failed to load tenants");
    } finally {
      setLoadingTenants(false);
    }
  };

  const loadMessages = async (tenantProfileId: string) => {
    try {
      setLoadingMessages(true);
      console.log("=== Loading Messages ===");
      console.log("Loading messages for tenant:", tenantProfileId);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Load messages for this owner and tenant
      const { data: messageRows, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("owner_id", user.id)
        .eq("tenant_profile_id", tenantProfileId)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Messages error:", messagesError);
        throw messagesError;
      }

      console.log("Loaded messages:", messageRows);
      console.log("=== End Loading Messages ===");

      setMessages(messageRows || []);

    } catch (err: any) {
      console.error("Error loading messages:", err);
      setError(err.message || "Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedTenant) {
      return;
    }

    try {
      console.log("=== Sending Message ===");
      console.log("To tenant:", selectedTenant);
      console.log("Message:", messageInput);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Insert message
      const { error: sendError } = await supabase
        .from("messages")
        .insert({
          owner_id: user.id,
          tenant_profile_id: selectedTenant,
          sender_role: 'owner',
          message: messageInput.trim(),
        });

      if (sendError) {
        console.error("Send message error:", sendError);
        setError(sendError.message || "Failed to send message");
        return;
      }

      console.log("Message sent successfully");
      console.log("=== End Sending Message ===");

      // Clear input and refresh messages
      setMessageInput("");
      await loadMessages(selectedTenant);

    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    }
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header>
        <h1 className="text-3xl font-semibold text-[#012a4a]">Messages</h1>
        <p className="text-slate-600 mt-2">Communicate with tenants and manage inquiries.</p>
      </header>

      {/* Messages Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-125">
        {/* Conversations List */}
        <div className="lg:col-span-1 rounded-lg bg-white shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search tenants..."
              className="w-full rounded-md border border-gray-200 p-2 text-sm"
            />
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loadingTenants ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">Loading tenants...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No tenant conversations yet</p>
                <p className="text-xs mt-2">Tenants you add will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    onClick={() => setSelectedTenant(tenant.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedTenant === tenant.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="font-medium text-sm text-slate-900">{tenant.full_name}</div>
                    <div className="text-xs text-slate-500 mt-1">{tenant.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-2 rounded-lg bg-white shadow-sm border border-gray-100 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200">
            {selectedTenant ? (
              <div>
                <div className="font-medium text-slate-900">
                  {tenants.find(t => t.id === selectedTenant)?.full_name}
                </div>
                <div className="text-xs text-slate-500">
                  {tenants.find(t => t.id === selectedTenant)?.email}
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <p className="text-sm">Select a tenant conversation to start messaging</p>
              </div>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
            {loadingMessages ? (
              <div className="text-center text-slate-500">
                <p className="text-sm">Loading messages...</p>
              </div>
            ) : messages.length === 0 && selectedTenant ? (
              <div className="text-center text-slate-500">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-2">Start the conversation with a message</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender_role === 'owner' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-4 py-2 text-sm ${
                        message.sender_role === 'owner'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-slate-900'
                      }`}
                    >
                      <div>{message.message}</div>
                      <div className="text-xs mt-1 opacity-70">
                        {new Date(message.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-200">
            {error && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={selectedTenant ? "Type your message..." : "Select a tenant to message..."}
                className="flex-1 rounded-md border border-gray-200 p-2.5 text-sm"
                disabled={!selectedTenant}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!selectedTenant || !messageInput.trim()}
                className="rounded-md bg-[#012a4a] px-4 py-2.5 text-white text-sm hover:bg-[#0a1f35] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
