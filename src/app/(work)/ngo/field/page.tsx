import type { Metadata } from "next";
import { Field } from "@/nx/pages/ngo/Field";
export const metadata: Metadata = { title: "Field mode, StrayPaw", robots: { index: false, follow: false } };
export default function Page() { return <Field />; }
