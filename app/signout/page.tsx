import type { Metadata } from "next";
import SignOutPanel from "./SignOutPanel";

export const metadata: Metadata = {
  title: "Sign out — KasiEco",
};

export default function SignOutPage() {
  return <SignOutPanel />;
}
