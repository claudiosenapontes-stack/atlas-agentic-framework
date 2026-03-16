import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Hot Leads | Atlas",
  description: "Hot Leads Pipeline",
};

const hotLeadsNavItems = [
  { href: "/hot-leads", label: "Pipeline" },
];

export default function HotLeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={hotLeadsNavItems} realmName="Hot Leads" />
      {children}
    </>
  );
}
