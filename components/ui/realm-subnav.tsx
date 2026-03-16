'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface RealmSubnavProps {
  realm: string;
  realmHref: string;
  items: NavItem[];
}

export function RealmSubnav({ realm, realmHref, items }: RealmSubnavProps) {
  const pathname = usePathname();

  return (
    <div className="border-b border-[#1F2226] bg-[#111214] px-4 py-3">
      {/* Realm Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={realmHref} className="text-lg font-semibold text-white hover:text-[#FF6A00] transition-colors">
          {realm}
        </Link>
      </div>
      
      {/* Subnav Items */}
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition-colors
                ${isActive 
                  ? 'text-white bg-[#1F2226] border border-[#2A2D32]' 
                  : 'text-[#6B7280] hover:text-white hover:bg-[#1F2226]'
                }
              `}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
