import { redirect } from "next/navigation";

export const metadata = {
  title: "Programmes, StrayPaw",
  description: "Published programmes, drives and field evidence on StrayPaw.",
};

export default function InterventionsPage() {
  redirect("/programmes");
}
