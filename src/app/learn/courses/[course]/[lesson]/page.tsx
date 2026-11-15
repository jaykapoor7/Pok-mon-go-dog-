import { notFound } from "next/navigation";
import { COURSES, findLesson } from "@/sp/learn/content";
import { PubPage } from "@/sp4/pub/kit";
import { Lesson } from "@/sp4/pub/learn/Learn";

export const dynamicParams = false;
export function generateStaticParams() { return COURSES.flatMap((c) => c.lessons.map((l) => ({ course: c.id, lesson: l.id }))); }
export async function generateMetadata({ params }: { params: Promise<{ course: string; lesson: string }> }) {
  const { course, lesson } = await params;
  const f = findLesson(course, lesson);
  return f ? { title: `${f.l.title}, ${f.c.title}, StrayPaw Academy`, description: f.l.takeaway } : {};
}
export default async function LessonPage({ params }: { params: Promise<{ course: string; lesson: string }> }) {
  const { course, lesson } = await params;
  if (!findLesson(course, lesson)) notFound();
  return <PubPage><Lesson course={course} lesson={lesson} /></PubPage>;
}
