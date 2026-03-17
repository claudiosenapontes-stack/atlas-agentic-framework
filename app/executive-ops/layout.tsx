import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Executive Ops | Atlas",
  description: "Executive Operations Center",
};

const executiveNavItems = [
  { href: "/executive-ops/feed", label: "Feed" },
  { href: "/executive-ops", label: "Dashboard" },
  { href: "/executive-ops/calendar", label: "Calendar" },
  { href: "/executive-ops/watchlist", label: "Watchlist" },
  { href: "/executive-ops/approvals", label: "Approvals" },
  { href: "/executive-ops/followups", label: "Follow-ups" },
];

export default function ExecutiveOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={executiveNavItems} realmName="Executive Ops" />
      {children}
    </>
  );
}
