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

    // Check if lock is available
    let canAcquire = false;

    if (!lockRecord) {
      // No record exists, create one
      canAcquire = true;
    } else if (!lockRecord.owner_id) {
      // Lock is available (no owner)
      canAcquire = true;
    } else if (lockRecord.owner_id === clientId) {
      // Same client trying to reconnect
      canAcquire = true;
    } else {
      // Check if lock has expired
      const updatedAt = new Date(lockRecord.updated_at);
      const timeSinceUpdate = now.getTime() - updatedAt.getTime();
      const lockExpired = timeSinceUpdate > LOCK_TIMEOUT_MS;

      if (lockExpired) {
        canAcquire = true;
      }
    }

    if (!canAcquire) {
      return new Response(
        JSON.stringify({
          ok: false,
          code: "LOCKED",
          message: "현재 다른 사용자가 GCS에 접속 중입니다.",
          ownerId: lockRecord?.owner_id,
        }),
        {
          status: 423,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Acquire the lock
    const { error: updateError } = await supabase
      .from("gcs_lock")
      .upsert({
        id: "gcs_main",
        owner_id: clientId,
        updated_at: now.toISOString(),
      });

    if (updateError) {
      console.error("Error acquiring lock:", updateError);
      return new Response(
        JSON.stringify({
          ok: false,
          code: "DATABASE_ERROR",
          message: "Failed to acquire lock",
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