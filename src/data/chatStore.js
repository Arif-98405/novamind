import { supabase } from "../lib/supabaseClient.js";

// Chat persistence layer: conversations + messages live in Supabase so they
// survive refresh and are scoped per signed-in user by RLS policies.

export async function listConversations() {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createConversation(title) {
  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title || "New conversation" })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function loadMessages(conversationId) {
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, text, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []).map((m) => ({ id: m.id, role: m.role, text: m.text, at: Date.parse(m.created_at) }));
}

export async function addMessage(conversationId, role, text) {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, role, text })
    .select("id, created_at")
    .single();
  if (error) throw error;
  // Bump the conversation's updated_at so it sorts to the top of recent lists.
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId);
  return { id: data.id, role, text, at: Date.parse(data.created_at) };
}

export async function deleteConversation(conversationId) {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);
  if (error) throw error;
}

export async function renameConversation(conversationId, title) {
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", conversationId);
  if (error) throw error;
}
