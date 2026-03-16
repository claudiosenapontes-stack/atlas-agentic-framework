import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Control | Atlas",
  description: "Atlas Control Center",
};

const controlNavItems = [
  { href: "/control", label: "Dashboard" },
  { href: "/control/fleet", label: "Fleet" },
  { href: "/control/agents", label: "Agents" },
  { href: "/control/costs", label: "Costs" },
  { href: "/control/integrations", label: "Integrations" },
  { href: "/control/audit", label: "Audit" },
  { href: "/control/incidents", label: "Incidents" },
];

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={controlNavItems} realmName="Control" />
      {children}
    </>
  );
}
