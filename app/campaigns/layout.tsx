import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Campaigns | Atlas",
  description: "Marketing Campaigns Center",
};

const campaignsNavItems = [
  { href: "/campaigns", label: "Overview" },
  { href: "/campaigns/realtime-example", label: "Realtime" },
];

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={campaignsNavItems} realmName="Campaigns" />
      {children}
    </>
  );
}
