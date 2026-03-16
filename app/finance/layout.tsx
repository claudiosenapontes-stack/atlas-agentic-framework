import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Finance | Atlas",
  description: "Finance & Legal Center",
};

const financeNavItems = [
  { href: "/finance", label: "Overview" },
  { href: "/finance/approvals", label: "Approvals" },
  { href: "/finance/budgets", label: "Budgets" },
  { href: "/finance/invoices", label: "Invoices" },
  { href: "/finance/contracts", label: "Contracts" },
  { href: "/finance/legal-privilege", label: "Legal" },
];

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={financeNavItems} realmName="Finance" />
      {children}
    </>
  );
}
