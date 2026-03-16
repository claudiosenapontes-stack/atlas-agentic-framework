'use client';

import { useState } from 'react';
import { Shield, Lock, AlertTriangle, AlertCircle } from 'lucide-react';

export default function LegalPrivilegePage() {
  const [dataSource] = useState<'restricted' | 'unavailable'>('restricted');

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FF3B30]/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#FF3B30]" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Legal Privilege</h1>
              <p className="text-sm text-[#6B7280]">Attorney-client privileged documents</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dataSource === 'restricted' ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF3B30]/10 border border-[#FF3B30]/30">
                <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
                <span className="text-xs text-[#FF3B30]">RESTRICTED</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#6B7280]/10 border border-[#6B7280]/30">
                <AlertCircle className="w-4 h-4 text-[#6B7280]" />
                <span className="text-xs text-[#6B7280]">NOT CONNECTED</span>
              </div>
            )}
          </div>
        </div>

        {/* Restricted Access Banner */}
        <div className="mb-6 p-4 bg-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-[10px]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FF3B30] mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-[#FF3B30] mb-1">Restricted Access - Shell Only</h3>
              <p className="text-xs text-[#9BA3AF]">
                This module contains attorney-client privileged information and is subject to legal hold requirements.
                Integration with document management systems requires controlled access protocols.
              </p>
            </div>
          </div>
        </div>

        {/* Shell State */}
        <div className="flex flex-col items-center justify-center py-16 bg-[#111214] rounded-[10px] border border-[#1F2226]">
          <div className="w-16 h-16 rounded-full bg-[#1F2226] flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-[#6B7280]" />
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Legal Privilege Module</h2>
          <p className="text-sm text-[#9BA3AF] max-w-md text-center mb-2">
            This is a shell interface awaiting controlled integration.
          </p>
          <p className="text-xs text-[#6B7280] max-w-md text-center mb-6">
            Attorney-client privileged documents require secure document management integration 
            with proper access controls and audit logging. This module will remain restricted 
            until legal compliance review is complete.
          </p>
          <div className="flex items-center gap-2 px-3 py-2 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-[#FF3B30]" />
            <span className="text-xs text-[#FF3B30]">Awaiting controlled integration</span>
          </div>
        </div>
      </div>
    </div>
  );
}
