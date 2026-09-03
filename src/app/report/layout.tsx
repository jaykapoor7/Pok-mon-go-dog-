// The page itself is a client component, so its metadata lives here.
export const metadata = {
  title: "Report a sighting, StrayPaw",
  description:
    "Report a street animal you have seen. Add a photo, a place and a condition, and it becomes a record the network can act on.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
