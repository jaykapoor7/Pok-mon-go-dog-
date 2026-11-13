import { redirect } from "next/navigation";

/* The Academy lists its courses on /learn; this address leads there. */
export default function CoursesIndex() { redirect("/learn"); }
