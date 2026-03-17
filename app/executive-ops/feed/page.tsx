import ExecutiveFeed from '@/app/components/ExecutiveFeed';
import { Zap } from 'lucide-react';

export const metadata = {
  title: "Executive Feed | Atlas",
  description: "5-second executive awareness",
};

export default function ExecutiveFeedPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0C]">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF6A00]/20 to-[#FF3B30]/10 border border-[#FF6A00]/30 flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#FF6A00]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Executive Feed</h1>
            <p className="text-sm text-[#6B7280]">What matters. What needs action.</p>
          </div>
        </div>

        {/* The Feed */}
        <ExecutiveFeed />

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <a 
            href="/executive-ops/approvals" 
            className="p-3 bg-[#111214] border border-[#1F2226] rounded-lg text-center hover:border-[#FF6A00]/30 transition-colors"
          >
            <p className="text-sm text-white">Approvals</p>
            <p className="text-xs text-gray-500">Review pending</p>
          </a>
          <a 
            href="/executive-ops/calendar" 
            className="p-3 bg-[#111214] border border-[#1F2226] rounded-lg text-center hover:border-[#FF6A00]/30 transition-colors"
          >
            <p className="text-sm text-white">Calendar</p>
            <p className="text-xs text-gray-500">Today's schedule</p>
          </a>
        </div>
      </div>
    </div>
  );
}
