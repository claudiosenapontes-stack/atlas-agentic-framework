import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Sales & Marketing | Atlas",
  description: "Sales Pipeline & Marketing Center",
};

const salesMarketingNavItems = [
  { href: "/sales-marketing", label: "Overview" },
  { href: "/sales-marketing/pipeline", label: "Pipeline" },
  { href: "/sales-marketing/campaigns", label: "Campaigns" },
  { href: "/sales-marketing/leads", label: "Leads" },
  { href: "/sales-marketing/analytics", label: "Analytics" },
];

export default function SalesMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={salesMarketingNavItems} realmName="Sales & Marketing" />
      {children}
    </>
  );
}
