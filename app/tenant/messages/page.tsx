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

export default function TenantMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [messageInput, setMessageInput] = useState("");
  const [error, setError] = useState("");

  // Load messages on mount
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      console.log("=== Loading Tenant Messages ===");
      
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Loading messages for tenant auth UID:", user.id);

      // Load messages for this tenant
      const { data: messageRows, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("tenant_profile_id", user.id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Messages error:", messagesError);
        throw messagesError;
      }

      console.log("Loaded messages:", messageRows);
      console.log("=== End Loading Tenant Messages ===");

      setMessages(messageRows || []);

    } catch (err: any) {
      console.error("Error loading messages:", err);
      setError(err.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) {
      return;
    }

    try {
      console.log("=== Sending Tenant Message ===");
      console.log("Message:", messageInput);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("User not authenticated");
      }

      console.log("Auth user ID:", user.id);

      // Load tenant row for this user
      const { data: tenantRows, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("profile_id", user.id);

      if (tenantError) {
        console.error("Error loading tenant row:", tenantError);
        throw tenantError;
      }

      console.log("Tenant query result:", tenantRows);

      if (!tenantRows || tenantRows.length === 0) {
        throw new Error("No tenant assignment found");
      }

      const tenantRow = tenantRows[0];
      console.log("Selected tenant row:", tenantRow);

      // Load related property to get owner_id
      const { data: propertyRow, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", tenantRow.property_id)
        .single();

      if (propertyError) {
        console.error("Error loading property:", propertyError);
        throw propertyError;
      }

      console.log("Property row:", propertyRow);

      // Prepare insert payload
      const insertPayload = {
        owner_id: propertyRow.owner_id,
        tenant_profile_id: user.id,
        sender_role: 'tenant',
        message: messageInput.trim(),
      };

      console.log("Insert payload:", insertPayload);

      // Insert message
      const { error: sendError } = await supabase
        .from("messages")
        .insert(insertPayload);

      if (sendError) {
        console.error("Send message error:", sendError);
        setError(sendError.message || "Failed to send message");
        return;
      }

      console.log("Message sent successfully");
      console.log("=== End Sending Tenant Message ===");

      // Clear input and refresh messages
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
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white">Messages</h1>
          <p className="text-slate-300 mt-2 text-lg">Communicate with your property owner</p>
        </header>

        {/* Messages Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          {/* Chat Panel */}
          <div className="lg:col-span-3 bg-white/10 backdrop-blur-lg rounded-xl shadow-lg border border-white/20 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10">
              <div>
                <div className="font-medium text-white">Property Owner</div>
                <div className="text-xs text-slate-400">Messages will appear here from your property owner</div>
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
                      // Tenant perspective: my messages are from tenant role
                      const isOwnMessage = message.sender_role === 'tenant';
                      const alignment = isOwnMessage ? 'justify-end' : 'justify-start';
                      const bubbleStyle = isOwnMessage ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white';
                      
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
                  className="flex-1 rounded-xl bg-white/10 border border-white/20 p-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSendMessage();
                    }
                  }}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-white text-sm hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-emerald-500/50 font-medium"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
