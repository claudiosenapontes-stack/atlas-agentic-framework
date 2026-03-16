import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Operations | Atlas",
  description: "Tactical Operations Center",
};

const operationsNavItems = [
  { href: "/operations", label: "Dashboard" },
  { href: "/operations/tasks", label: "Task Graph" },
  { href: "/operations/milestones", label: "Milestones" },
  { href: "/operations/delegation", label: "Delegation" },
  { href: "/operations/productivity", label: "Productivity" },
];

export default function OperationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={operationsNavItems} realmName="Operations" />
      {children}
    </>
  );
}
