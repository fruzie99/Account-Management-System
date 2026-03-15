const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabase };