import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Knowledge | Atlas",
  description: "Knowledge Brain & Agent Skills",
};

const knowledgeNavItems = [
  { href: "/knowledge", label: "Overview" },
  { href: "/knowledge/skills", label: "Agent Skills" },
  { href: "/knowledge/memory", label: "Memory" },
  { href: "/knowledge/soul", label: "SOUL.md" },
];

export default function KnowledgeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <RealmSubnav items={knowledgeNavItems} realmName="Knowledge" />
      {children}
    </>
  );
}
