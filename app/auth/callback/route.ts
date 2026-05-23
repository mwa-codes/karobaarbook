import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/types/database";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const confirmedPath = `${origin}/auth/confirmed`;

  if (!code) {
    const fail = new URL(confirmedPath);
    fail.searchParams.set("error", "1");
    return NextResponse.redirect(fail);
  }

  const cookieStore = cookies();
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const fail = new URL(confirmedPath);
    fail.searchParams.set("error", "1");
    return NextResponse.redirect(fail);
  }

  return response;
}
