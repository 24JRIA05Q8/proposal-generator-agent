import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export async function saveProposalSession({
  clientName,
  clientType,
  conversation,
  proposal,
}) {
  if (!supabase) {
    throw new Error("Supabase URL or anon key is missing in .env file.");
  }

  const { error } = await supabase.from("proposal_sessions").insert([
    {
      client_name: clientName,
      client_type: clientType,
      conversation: conversation,
      proposal: proposal,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}