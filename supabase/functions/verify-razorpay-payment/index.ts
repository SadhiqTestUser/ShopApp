import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing auth header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = await req.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return jsonResponse({ error: "Missing payment verification fields" }, 400);
    }

    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "KWoTdJF9eiBy4sTvw4yv8m0o";
    if (!razorpayKeySecret) {
      return jsonResponse({ error: "Razorpay keys not configured" }, 500);
    }

    // Verify signature using HMAC SHA256
    // Expected signature = HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== razorpay_signature) {
      // Payment verification failed - mark order as failed
      if (order_id) {
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", order_id)
          .eq("user_id", userData.user.id);
      }
      return jsonResponse({ error: "Payment verification failed" }, 400);
    }

    // Payment verified - update order
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        razorpay_payment_id,
        razorpay_signature,
        payment_status: "paid",
        status: "processing",
      })
      .eq("id", order_id)
      .eq("user_id", userData.user.id);

    if (updateError) {
      console.error("Failed to update order:", updateError);
      return jsonResponse({ error: "Failed to update order" }, 500);
    }

    return jsonResponse({ success: true, order_id });
  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
