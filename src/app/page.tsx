import { redirect } from "next/navigation";

/**
 * Root page — redirect to login.
 * After authentication, users are sent to /{tenantSlug}.
 */
export default function RootPage() {
  redirect("/login");
}
