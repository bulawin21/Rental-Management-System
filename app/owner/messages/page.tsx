"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  owner_id: string;
  tenant_profile_id: string;
  sender_role: 'owner' | 'tenant';
  message: string;
  created_at: string;
}

interface Tenant {
  id: string;
  profile_id: string;
  profiles: {
    full_name: string;
  };
  units: {
    name: string;
    properties: {
      name: string;
    };
  };
}

export default function MessagesPage() {
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");

  // Load tenants on mount
  useEffect(() => {
    loadTenants();
  }, []);

  // Load messages when tenant is selected
  useEffect(() => {
    if (selectedTenant) {
      loadMessages();
    }
  }, [selectedTenant]);

  const loadTenants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          profiles (
            full_name
          ),
          units (
            name,
            properties (
              name
            )
          )
        `)
        .eq('units.properties.owner_id', user.id);

      if (error) throw error;
      console.log("Tenants data:", data);
      setTenants(data || []);
    } catch (err: any) {
      console.error("Error loading tenants:", err);
      setError(err.message || "Failed to load tenants");
    }
  };

  const loadMessages = async () => {
    if (!selectedTenant) return;

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("owner_id", user.id)
        .eq("tenant_profile_id", selectedTenant.profile_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err: any) {
      console.error("Error loading messages:", err);
      setError(err.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedTenant) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("messages")
        .insert({
          owner_id: user.id,
          tenant_profile_id: selectedTenant.profile_id,
          sender_role: 'owner',
          message: messageInput.trim(),
        });

      if (error) throw error;

      setMessageInput("");
      await loadMessages();
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError(err.message || "Failed to send message");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Messages</h1>
          <p className="text-slate-300 mt-2 text-lg">Communicate with your tenants</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          {/* Tenant List */}
          <div className="lg:col-span-1 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <h2 className="font-medium text-white">Tenants</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tenants.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  <p className="text-sm">No tenants found</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {tenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => setSelectedTenant(tenant)}
                      className={`w-full p-4 text-left hover:bg-white/10 transition-colors ${
                        selectedTenant?.id === tenant.id ? 'bg-blue-500/20' : ''
                      }`}
                    >
                      <div className="font-medium text-white">
                        {tenant.profiles?.full_name || 'Unknown Tenant'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {Array.isArray(tenant.units) 
                          ? `${tenant.units[0]?.name || 'Unknown Unit'} - ${tenant.units[0]?.properties?.name || 'Unknown Property'}`
                          : `${tenant.units?.name || 'Unknown Unit'} - ${tenant.units?.properties?.name || 'Unknown Property'}`
                        }
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 flex flex-col">
            {!selectedTenant ? (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p className="text-sm">Select a tenant to start messaging</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="font-medium text-white">
                    {selectedTenant.profiles?.full_name || 'Unknown Tenant'}
                  </div>
                  <div className="text-xs text-slate-400">
                    {Array.isArray(selectedTenant.units) 
                      ? `${selectedTenant.units[0]?.name || 'Unknown Unit'} - ${selectedTenant.units[0]?.properties?.name || 'Unknown Property'}`
                      : `${selectedTenant.units?.name || 'Unknown Unit'} - ${selectedTenant.units?.properties?.name || 'Unknown Property'}`
                    }
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-white/5">
                  {loading ? (
                    <div className="text-center text-slate-400">
                      <p className="text-sm">Loading messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-slate-400">
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs mt-2">Start the conversation with a message</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => {
                        const isOwnMessage = message.sender_role === 'owner';
                        const alignment = isOwnMessage ? 'justify-end' : 'justify-start';
                        const bubbleStyle = isOwnMessage ? 'bg-blue-500 text-white' : 'bg-white/10 text-white';
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex ${alignment}`}
                          >
                            <div
                              className={`max-w-xs rounded-xl px-4 py-2 text-sm ${bubbleStyle}`}
                            >
                              <div>{message.message}</div>
                              <div className="text-xs mt-1 opacity-70">
                                {new Date(message.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="p-4 border-t border-white/10">
                  {error && (
                    <div className="mb-2 p-2 bg-red-500/20 border border-red-500/50 rounded-lg">
                      <p className="text-sm text-red-200">{error}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 text-white text-sm hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
