// The page itself is a client component, so its metadata lives here.
export const metadata = {
  title: "Report a dog, StrayPaw",
  description:
    "Report a street animal you have seen. Add a photo, a place and a condition, and it is added to the shared record that partner NGOs can see.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
