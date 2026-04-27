"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  // Set up real-time subscription for messages
  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const setupSubscription = async () => {
      if (!selectedTenant || !mounted) return;

      const userResponse = await supabase.auth.getUser();
      const user = userResponse.data?.user;
      if (!user || !mounted) return;

      channel = supabase
        .channel(`messages-${selectedTenant.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const newMessage = payload.new as Message;
            // Check if this message is for the current conversation
            if (newMessage.owner_id === user.id && newMessage.tenant_profile_id === selectedTenant.profile_id) {
              console.log('New message received:', payload);
              loadMessages();
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });
    };

    setupSubscription();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
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
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Tenant List - Hidden on mobile when chat is open */}
      <div className={`${selectedTenant ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-col border-r border-white/20 bg-white/10 backdrop-blur-lg`}>
        <div className="p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-emerald-400">Tenants</h2>
          <p className="text-xs text-slate-400 mt-1">Select a tenant to view messages</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {tenants.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm">No tenants found</p>
              <Link href="/owner/tenants/add" className="text-xs text-emerald-400 hover:text-emerald-300 mt-2 inline-block transition-colors">
                Add your first tenant
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => setSelectedTenant(tenant)}
                  className={`w-full p-4 text-left hover:bg-white/10 transition-all duration-200 ${
                    selectedTenant?.id === tenant.id ? 'bg-blue-500/20 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                      {tenant.profiles?.full_name?.charAt(0).toUpperCase() || 'T'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">
                        {tenant.profiles?.full_name || 'Unknown Tenant'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1 truncate">
                        {Array.isArray(tenant.units) 
                          ? `${tenant.units[0]?.name || 'Unknown Unit'} • ${tenant.units[0]?.properties?.name || 'Unknown Property'}`
                          : `${tenant.units?.name || 'Unknown Unit'} • ${tenant.units?.properties?.name || 'Unknown Property'}`
                        }
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - Hidden on mobile when no tenant selected */}
      <div className={`${!selectedTenant ? 'hidden md:flex' : 'flex'} flex-1 flex flex-col`}>
        {!selectedTenant ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm">Select a tenant to start messaging</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-5 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile back button */}
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="md:hidden p-2 text-slate-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
                  {selectedTenant.profiles?.full_name?.charAt(0).toUpperCase() || 'T'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {selectedTenant.profiles?.full_name || 'Unknown Tenant'}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {Array.isArray(selectedTenant.units) 
                      ? `${selectedTenant.units[0]?.name || 'Unknown Unit'} • ${selectedTenant.units[0]?.properties?.name || 'Unknown Property'}`
                      : `${selectedTenant.units?.name || 'Unknown Unit'} • ${selectedTenant.units?.properties?.name || 'Unknown Property'}`
                    }
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-white/5 space-y-4 min-h-0">
              {loading ? (
                <div className="text-center text-slate-400">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-white mb-2"></div>
                  <p className="text-sm">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-2">Start the conversation with a message</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwnMessage = message.sender_role === 'owner';
                    const alignment = isOwnMessage ? 'justify-end' : 'justify-start';
                    const bubbleStyle = isOwnMessage 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm' 
                      : 'bg-white/10 text-white rounded-bl-sm';
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${alignment}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl px-4 py-3 text-sm ${bubbleStyle}`}
                        >
                          <div className="break-words">{message.message}</div>
                          <div className={`text-xs mt-2 ${isOwnMessage ? 'text-blue-100' : 'text-slate-400'}`}>
                            {new Date(message.created_at).toLocaleString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10 flex-shrink-0">
              {error && (
                <div className="mb-3 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-xl bg-white/10 border border-white/20 p-4 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-8 py-4 text-white text-sm hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-blue-500/50 font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
