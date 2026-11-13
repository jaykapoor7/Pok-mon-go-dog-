import { redirect } from "next/navigation";

/* Offline work lives in Field mode's Offline tab. */
export default function NgoOfflinePage() { redirect("/ngo/field?mode=offline"); }
