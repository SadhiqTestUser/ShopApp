import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function phoneToEmail(phone: string): string {
  return `${phone.replace(/\+/g, "")}@phone.printcraft.app`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phone, code } = await req.json();

    if (!phone || !/^\+\d{10,15}$/.test(phone)) {
      return jsonResponse({ error: "Invalid phone number" }, 400);
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return jsonResponse({ error: "Invalid OTP code" }, 400);
    }

    // Look up the most recent unused, unexpired OTP for this phone
    const now = new Date().toISOString();
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_codes")
      .select("id, code, full_name, purpose, expires_at, used_at")
      .eq("phone", phone)
      .is("used_at", null)
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("OTP lookup error:", otpError);
      return jsonResponse({ error: "Verification failed" }, 500);
    }

    if (!otpRecord) {
      return jsonResponse(
        { error: "OTP has expired or was not requested. Please request a new one." },
        400
      );
    }

    if (code !== otpRecord.code) {
      return jsonResponse({ error: "Incorrect OTP. Please check and try again." }, 400);
    }

    // Atomically mark OTP as used (prevents replay)
    const { error: markError } = await supabase
      .from("otp_codes")
      .update({ used_at: now })
      .eq("id", otpRecord.id)
      .is("used_at", null);

    if (markError) {
      console.error("Failed to mark OTP as used:", markError);
      return jsonResponse({ error: "Verification failed" }, 500);
    }

    const email = phoneToEmail(phone);

    // Find existing user by email, or create a new one
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    let authUser = existingUsers?.users?.find((u) => u.email === email) ?? null;

    if (!authUser && otpRecord.purpose === "signup") {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        phone,
        phone_confirm: true,
        user_metadata: { full_name: otpRecord.full_name ?? "Customer" },
      });

      if (createError || !newUser) {
        console.error("Failed to create user:", createError);
        return jsonResponse({ error: "Failed to create account" }, 500);
      }

      authUser = newUser;
    } else if (!authUser && otpRecord.purpose === "login") {
      return jsonResponse(
        { error: "No account found for this phone number. Please sign up first." },
        404
      );
    }

    if (!authUser) {
      return jsonResponse({ error: "Account error" }, 500);
    }

    // Create profile if it doesn't exist
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authUser.id,
        phone,
        full_name: otpRecord.full_name ?? authUser.user_metadata?.full_name ?? "Customer",
        role: "customer",
      });

      if (profileError) {
        console.error("Failed to create profile:", profileError);
      }
    }

    // Generate a magic link for the user's deterministic email
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    if (linkError || !linkData) {
      console.error("Failed to generate link:", linkError);
      return jsonResponse({ error: "Failed to create session" }, 500);
    }

    const hashedToken = linkData.properties?.hashed_token;
    if (!hashedToken) {
      console.error("No hashed token in link data");
      return jsonResponse({ error: "Failed to create session" }, 500);
    }

    // Exchange the token hash for a real session using the anon client
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
      type: "magiclink",
      token_hash: hashedToken,
    });

    if (verifyError || !verifyData.session) {
      console.error("Failed to verify link for session:", verifyError);
      return jsonResponse({ error: "Failed to create session" }, 500);
    }

    return jsonResponse({
      success: true,
      access_token: verifyData.session.access_token,
      refresh_token: verifyData.session.refresh_token,
      expires_at: verifyData.session.expires_at,
      user_id: authUser.id,
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
