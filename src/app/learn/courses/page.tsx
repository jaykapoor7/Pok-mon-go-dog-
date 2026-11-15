import { redirect } from "next/navigation";

/* The Academy lists its courses on /learn; this address leads there, as it always has. */
export default function CoursesIndex() { redirect("/learn"); }
