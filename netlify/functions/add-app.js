// netlify/functions/add-app.js - DEBUGGING VERSION

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: We are creating a special client here that bypasses RLS
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    // This part is crucial for bypassing RLS
    global: {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}`
      }
    }
  }
);

export const handler = async (event) => {
  try {
    const appData = JSON.parse(event.body);

    // We use the new `supabaseAdmin` client
    const { data, error } = await supabaseAdmin
      .from('apps')
      .insert(appData)
      .select()
      .single();

    if (error) {
      // If there's an error, log it with more detail
      console.error("Supabase insert error:", error);
      throw error;
    }

    return {
      statusCode: 201,
      body: JSON.stringify(data)
    };

  } catch (err) {
    console.error("Catch block error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "An error occurred in the function.",
        error: err.message,
        details: err.details || 'No details'
      }),
    };
  }
};