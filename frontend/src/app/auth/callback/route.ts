import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSafeReturnTo } from "@/src/lib/authRedirect";

function loginErrorRedirect(request: NextRequest, returnTo: string) {
  const url = new URL("/login", request.url);
  url.searchParams.set("authError", "callback_failed");
  url.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnTo = getSafeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  if (request.nextUrl.searchParams.has("error")) {
    return loginErrorRedirect(request, returnTo);
  }

  if (!code) {
    return NextResponse.redirect(new URL(returnTo, request.url));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase environment variables in auth callback.");
    return loginErrorRedirect(request, returnTo);
  }

  const callbackClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await callbackClient.auth.exchangeCodeForSession(code);
  if (error || !data.session) {
    console.error("Unable to complete Supabase auth callback.", error);
    return loginErrorRedirect(request, returnTo);
  }

  const destination = new URL(returnTo, request.url);
  destination.hash = new URLSearchParams({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: String(data.session.expires_in),
    token_type: data.session.token_type,
    type: "signup",
  }).toString();
  return NextResponse.redirect(destination);
}
