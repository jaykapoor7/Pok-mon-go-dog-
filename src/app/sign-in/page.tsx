import { Suspense } from "react";
import { Enter } from "@/sp/onboard/Enter";

export const metadata = { title: "Sign in, StrayPaw", description: "Sign in to StrayPaw, or get started, with your email and a six-character code. No password.", robots: { index: false, follow: true } };

export default function SignInPage() {
  return <Suspense fallback={null}><Enter /></Suspense>;
}
