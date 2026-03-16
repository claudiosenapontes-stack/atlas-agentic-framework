import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Executive Ops | Atlas",
  description: "Executive Operations Center",
};

const executiveNavItems = [
  { href: "/executive-ops", label: "Overview" },
  { href: "/executive-ops/calendar", label: "Calendar & Meetings" },
  { href: "/executive-ops/watchlist", label: "Watchlist" },
  { href: "/executive-ops/approvals", label: "Approvals" },
  { href: "/executive-ops/followups", label: "Follow-ups" },
  { href: "/executive-ops/commands", label: "Commands" },
  { href: "/executive-ops/decisions", label: "Decisions" },
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
