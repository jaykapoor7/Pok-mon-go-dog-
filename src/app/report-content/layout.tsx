// The page itself is a client component, so its metadata lives here.
export const metadata = {
  title: "Report content, StrayPaw",
  description:
    "Flag a record, photo or account that breaches our community guidelines.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
