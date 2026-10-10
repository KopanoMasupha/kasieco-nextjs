import type { Metadata } from "next";
import SignInPanel from "./SignInPanel";

export const metadata: Metadata = {
  title: "Shop owner sign in — KasiEco",
};

/**
 * Server shell for the sign-in page: it reads `?next=` (set by the /owner guard)
 * and hands the target to the client panel, so the form itself still renders on
 * the server.
 */
export default function SignInPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  return <SignInPanel next={searchParams?.next} />;
}
