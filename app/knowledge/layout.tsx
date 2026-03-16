import { RealmSubnav } from "../components/RealmSubnav";

export const metadata = {
  title: "Knowledge | Atlas",
  description: "Knowledge Brain - Agent memory, skills, and documents",
};

const knowledgeNavItems = [
  { href: "/knowledge", label: "Overview" },
  { href: "/knowledge/search", label: "Search" },
  { href: "/knowledge/documents", label: "Documents" },
  { href: "/knowledge/skills", label: "Skills" },
  { href: "/knowledge/memory", label: "Memory" },
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
