import type { AuthError } from "@supabase/supabase-js";

/** User-facing copy for common Supabase Auth errors (EN + Roman Urdu). */
export function authErrorMessage(error: AuthError): string {
  const code = error.code ?? "";
  const msg = error.message.toLowerCase();

  if (
    code === "over_email_send_rate_limit" ||
    msg.includes("email rate limit") ||
    msg.includes("email limit")
  ) {
    return (
      "Supabase ne email limit poori kar di (testing ke dauran common hai). " +
      "1 ghanta wait karein, ya Supabase dashboard mein Authentication → Providers → Email " +
      "par \"Confirm email\" band karein, phir dubara try karein."
    );
  }

  if (code === "user_already_registered" || msg.includes("already registered")) {
    return "Yeh email pehle se registered hai. Login karein.";
  }

  if (msg.includes("invalid login credentials")) {
    return "Email ya password galat hai.";
  }

  if (msg.includes("email not confirmed")) {
    return (
      "Email abhi confirm nahi hui. Inbox check karein, ya Supabase mein user ko manually confirm karein."
    );
  }

  return error.message;
}
