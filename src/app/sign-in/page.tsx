import { Suspense } from "react";
import { SignIn } from "@/sp3/entry/SignIn";

export const metadata = { title: "Sign in · StrayPaw", description: "Sign in to your organisation's StrayPaw workspace.", robots: { index: false, follow: true } };

export default function SignInPage() {
  return <Suspense fallback={null}><SignIn /></Suspense>;
}
