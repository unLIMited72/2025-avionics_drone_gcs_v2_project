import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { clientId } = await req.json();

    if (!clientId || typeof clientId !== "string") {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "INVALID_CLIENT_ID",
          message: "clientId is required",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    // Get the lock record
    const { data: lockRecord } = await supabase
      .from("gcs_lock")
      .select("*")
      .eq("id", "gcs_main")
      .maybeSingle();

    // Only release if the client owns the lock
    if (lockRecord && lockRecord.owner_id === clientId) {
      await supabase
        .from("gcs_lock")
        .update({
          owner_id: null,
          updated_at: now.toISOString(),
        })
        .eq("id", "gcs_main")
        .eq("owner_id", clientId);
    }

    // Always return success, even if lock wasn't owned by this client
    return new Response(
      JSON.stringify({ ok: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
