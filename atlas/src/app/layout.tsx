import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ATLAS — Mission Control",
  description: "Agent mission board, teams, runs, and artifacts.",
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
    >
      {label}
    </Link>
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <div className="mx-auto flex min-h-screen max-w-6xl">
          <aside className="hidden w-60 flex-col gap-2 border-r border-[color:var(--atlas-border)] bg-[color:var(--atlas-panel)] px-3 py-4 md:flex">
            <div className="px-3 pb-2 text-xs font-semibold tracking-[0.24em] text-zinc-500">
              ATLAS
            </div>
            <nav className="flex flex-col gap-1">
              <NavLink href="/missions" label="Missions" />
              <NavLink href="/teams" label="Teams" />
              <NavLink href="/agents" label="Agents" />
            </nav>
            <div className="mt-auto px-3 pt-4 text-xs text-zinc-500">
              Mission Control
            </div>
          </aside>
          <div className="flex-1">
            <header className="flex items-center justify-between border-b border-[color:var(--atlas-border)] bg-[color:var(--atlas-panel)] px-4 py-3 md:px-6">
              <div className="text-sm font-semibold tracking-tight">
                ATLAS Mission Control
              </div>
              <div className="text-xs text-zinc-500">Space UI · MVP</div>
            </header>
            <main className="px-4 py-6 md:px-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
