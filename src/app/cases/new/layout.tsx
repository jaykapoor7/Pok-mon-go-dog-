// The page itself is a client component, so its metadata lives here.
export const metadata = {
  title: "New case, StrayPaw",
  description:
    "Open a field case against a sighting and assign it to a partner organisation.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
