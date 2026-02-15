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
      className="rounded px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 text-zinc-950 antialiased dark:bg-black dark:text-zinc-50`}
      >
        <div className="mx-auto flex min-h-screen max-w-6xl">
          <aside className="hidden w-56 flex-col gap-2 border-r border-zinc-200 bg-white px-3 py-4 dark:border-zinc-800 dark:bg-zinc-950 md:flex">
            <div className="px-3 pb-2 text-xs font-semibold tracking-wide text-zinc-500">
              ATLAS
            </div>
            <nav className="flex flex-col gap-1">
              <NavLink href="/missions" label="Missions" />
              <NavLink href="/teams" label="Teams" />
              <NavLink href="/agents" label="Agents" />
            </nav>
            <div className="mt-auto px-3 pt-4 text-xs text-zinc-500">
              Mission Control (MVP)
            </div>
          </aside>
          <div className="flex-1">
            <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950 md:px-6">
              <div className="text-sm font-semibold">ATLAS Mission Control</div>
              <div className="text-xs text-zinc-500">Next.js + Prisma (SQLite)</div>
            </header>
            <main className="px-4 py-6 md:px-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
