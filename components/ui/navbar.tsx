"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, Zap, LayoutDashboard, Users, Target, Flame, CheckSquare, Play, Lightbulb, Moon, Sun, Briefcase, BarChart3, DollarSign } from "lucide-react";

const navLinks = [
  { href: "/control", label: "Control", icon: LayoutDashboard },
  { href: "/executive-ops", label: "Executive", icon: Briefcase },
  { href: "/operations", label: "Operations", icon: BarChart3 },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/events", label: "Events", icon: Users },
  { href: "/campaigns", label: "Campaigns", icon: Target },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
];

// Realm entries only - no dropdowns per ATLAS-HENRY-REALM-NAV-STANDARD-001

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <nav className="bg-[#111214] border-b border-[#1F2226]">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/control" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FF6A00] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">ATLAS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm text-[#9BA3AF] hover:text-white hover:bg-[#1F2226] rounded-lg transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg hover:bg-[#1F2226] text-[#9BA3AF] hover:text-white transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-[#1F2226] text-[#9BA3AF] hover:text-white"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Mobile Menu */}
          <div className="lg:hidden bg-[#111214] border-t border-[#1F2226] relative z-50">
            <div className="px-4 py-2 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-[#9BA3AF] hover:text-white hover:bg-[#1F2226] rounded-lg transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </nav>
  );
}
