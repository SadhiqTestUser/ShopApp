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

    const { phone, purpose, full_name } = await req.json();

    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return jsonResponse({ error: "Invalid phone number" }, 400);
    }

    if (purpose !== "login" && purpose !== "signup") {
      return jsonResponse({ error: "Invalid purpose" }, 400);
    }

    // Rate limit: max 3 OTP requests per phone in 5 minutes
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", fiveMinAgo);

    if (count !== null && count >= 3) {
      return jsonResponse(
        { error: "Too many OTP requests. Please wait a few minutes and try again." },
        429
      );
    }

    // For login, check if user exists. For signup, check if user does NOT exist.
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.phone === phone
    );

    if (purpose === "login" && !existingUser) {
      return jsonResponse(
        { error: "No account found for this phone number. Please sign up first." },
        404
      );
    }

    if (purpose === "signup" && existingUser) {
      return jsonResponse(
        { error: "This phone number is already registered. Please sign in instead." },
        409
      );
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP in database (expires in 5 minutes)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({
        phone,
        code,
        full_name: purpose === "signup" ? full_name ?? null : null,
        purpose,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return jsonResponse({ error: "Failed to send OTP" }, 500);
    }

    // Check if Twilio is configured (production mode)
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFromNumber = Deno.env.get("TWILIO_FROM_NUMBER");

    if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
      // Production: send SMS via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const bodyText = `Your Printcraft verification code is ${code}. It expires in 5 minutes.`;

      const twilioResponse = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: twilioFromNumber,
          To: phone,
          Body: bodyText,
        }),
      });

      if (!twilioResponse.ok) {
        const errBody = await twilioResponse.text();
        console.error("Twilio SMS failed:", errBody);
        return jsonResponse(
          { error: "Failed to send SMS. Please try again." },
          500
        );
      }

      return jsonResponse({ success: true, sent: true });
    } else {
      // Development mode: return OTP in response (no SMS sent)
      console.log(`[DEV MODE] OTP for ${phone}: ${code}`);
      return jsonResponse({ success: true, sent: false, dev_code: code });
    }
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
