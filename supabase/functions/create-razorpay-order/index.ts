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

    const { amount, shipping_name, shipping_phone, shipping_address, shipping_pincode, shipping_city, shipping_state, items } = await req.json();

    if (!amount || amount <= 0) {
      return jsonResponse({ error: "Invalid amount" }, 400);
    }

    // Create order in database first
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userData.user.id,
        total: amount,
        shipping_name,
        shipping_phone,
        shipping_address,
        shipping_pincode,
        shipping_city,
        shipping_state,
        payment_status: "pending",
        status: "pending",
      })
      .select()
      .single();

    if (orderError || !order) {
      return jsonResponse({ error: "Failed to create order" }, 500);
    }

    // Insert order items if provided
    if (items && Array.isArray(items) && items.length > 0) {
      const orderItems = items.map((item: {
        product_id: string;
        quantity: number;
        price: number;
        customization_data: Record<string, unknown> | null;
      }) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        customization_data: item.customization_data ?? null,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        console.error("Failed to insert order items:", itemsError);
      }
    }

    // Create Razorpay order
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "rzp_test_Tc0TSFKjgEysQm";
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "KWoTdJF9eiBy4sTvw4yv8m0o";

    if (!razorpayKeyId || !razorpayKeySecret) {
      return jsonResponse({ error: "Razorpay keys not configured" }, 500);
    }

    const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to paise
        currency: "INR",
        receipt: order.id,
        notes: {
          order_id: order.id,
          user_id: userData.user.id,
        },
      }),
    });

    if (!razorpayResponse.ok) {
      const errBody = await razorpayResponse.text();
      console.error("Razorpay order creation failed:", errBody);
      return jsonResponse({ error: "Failed to create Razorpay order" }, 500);
    }

    const razorpayOrder = await razorpayResponse.json();

    // Update order with Razorpay order ID
    await supabase
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", order.id);

    return jsonResponse({
      order_id: order.id,
      razorpay_order_id: razorpayOrder.id,
      razorpay_key_id: razorpayKeyId,
      amount: Math.round(amount * 100),
      currency: "INR",
    });
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
