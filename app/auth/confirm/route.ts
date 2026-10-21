import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Target of the e-mail confirmation link.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const supabase = await createClient();

  if (tokenHash && type) {
    const ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
    return NextResponse.redirect(new URL(ok ? "/dashboard" : "/login", request.url));
  }
  if (code) {
    if (!(await supabase.auth.exchangeCodeForSession(code)).error) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    // Supabase only sends a code after the address is verified. The exchange
    // fails when the link is opened in another browser (e.g. a phone's mail
    // app), so the account is confirmed and the person just needs to sign in.
    return NextResponse.redirect(new URL("/login?confirmed=1", request.url));
  }
  return NextResponse.redirect(new URL("/login", request.url));
}
