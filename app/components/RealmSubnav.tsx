"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
}

interface RealmSubnavProps {
  items: NavItem[];
  realmName: string;
}

export function RealmSubnav({ items, realmName }: RealmSubnavProps) {
  const pathname = usePathname();

  return (
    <div className="bg-[#0B0B0C] border-b border-[#1F2226]">
      <div className="px-4 sm:px-6">
        <div className="flex items-center h-12 gap-1">
          <span className="text-[#9BA3AF] text-sm font-medium mr-4">{realmName}</span>
          <div className="h-4 w-px bg-[#1F2226] mr-2" />
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#FF6A00]/20 text-[#FF6A00] font-medium"
                    : "text-[#9BA3AF] hover:text-white hover:bg-[#1F2226]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
