import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

function createAuthCallbackClient(
  cookieStore: ReturnType<typeof cookies>,
  confirmedPath: string
) {
  let response = NextResponse.redirect(confirmedPath);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
          response = NextResponse.redirect(confirmedPath);
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
          response = NextResponse.redirect(confirmedPath);
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  return { supabase, getResponse: () => response };
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const confirmedPath = `${origin}/auth/confirmed`;
  const confirmedFail = `${confirmedPath}?error=1`;
  const confirmedMaybe = `${confirmedPath}?hint=check_login`;

  const code = requestUrl.searchParams.get("code");
  const tokenHash =
    requestUrl.searchParams.get("token_hash") ??
    requestUrl.searchParams.get("token");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;

  const cookieStore = cookies();
  const { supabase, getResponse } = createAuthCallbackClient(
    cookieStore,
    confirmedPath
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return getResponse();
    return NextResponse.redirect(confirmedFail);
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) return getResponse();
    return NextResponse.redirect(confirmedFail);
  }

  // Supabase may have already confirmed the email before redirecting here
  // (e.g. hash-only tokens handled on /auth/confirmed in the browser).
  return NextResponse.redirect(confirmedMaybe);
}
