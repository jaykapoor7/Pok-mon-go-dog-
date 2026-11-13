import { notFound, redirect } from "next/navigation";
import { COURSES } from "@/sp/learn/content";

export const dynamicParams = false;
export function generateStaticParams() { return COURSES.map((c) => ({ course: c.id })); }
export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  const c = COURSES.find((x) => x.id === course);
  if (!c) notFound();
  redirect(`/learn/courses/${c.id}/${c.lessons[0].id}`);
}
