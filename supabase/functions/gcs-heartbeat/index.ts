import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const LOCK_TIMEOUT_MS = 60000; // 60 seconds

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
    const { data: lockRecord, error: fetchError } = await supabase
      .from("gcs_lock")
      .select("*")
      .eq("id", "gcs_main")
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching lock:", fetchError);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DATABASE_ERROR",
          message: "Failed to fetch lock status",
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

    // Check if client owns the lock
    if (!lockRecord || lockRecord.owner_id !== clientId) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "NOT_OWNER_OR_EXPIRED",
          message: "락이 만료되었거나 다른 클라이언트가 사용 중입니다.",
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Check if lock has expired
    const updatedAt = new Date(lockRecord.updated_at);
    const timeSinceUpdate = now.getTime() - updatedAt.getTime();
    const lockExpired = timeSinceUpdate > LOCK_TIMEOUT_MS;

    if (lockExpired) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "NOT_OWNER_OR_EXPIRED",
          message: "락이 만료되었거나 다른 클라이언트가 사용 중입니다.",
        }),
        {
          status: 409,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update heartbeat
    const { error: updateError } = await supabase
      .from("gcs_lock")
      .update({
        updated_at: now.toISOString(),
      })
      .eq("id", "gcs_main")
      .eq("owner_id", clientId);

    if (updateError) {
      console.error("Error updating heartbeat:", updateError);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DATABASE_ERROR",
          message: "Failed to update heartbeat",
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
