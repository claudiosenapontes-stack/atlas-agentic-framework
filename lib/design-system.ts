/** @format */

/**
 * ATLAS Mission Control Design System
 * Unified dark theme with strict color palette
 * 
 * COLOR RULES:
 * - Orange (#FF6A00): Brand / primary action ONLY
 * - Green (#16C784): Success / operational / verified / completed / healthy
 * - Yellow (#FFB020): Warning / preview / partial / in-progress
 * - Red (#FF3B30): Failed / critical / error / down
 * - Gray (#6B7280, #9BA3AF): Muted text, inactive states
 * - White (#FFFFFF): Primary text
 * - NO purple/lilac/blue/violet accents
 * - NO white card backgrounds on /control
 * - NO pale green/amber/red panel backgrounds
 */

export const atlas = {
  // Backgrounds
  background: '#0B0B0C',
  panel: '#111214',
  surface: '#1F2226',
  
  // Borders
  border: '#1F2226',
  borderHover: '#6B7280',
  
  // Status Colors — Strict Usage
  primary: '#FF6A00',      // Orange: Brand, primary buttons, logo
  success: '#16C784',      // Green: Success, operational, verified, completed
  warning: '#FFB020',      // Yellow: Warning, preview, partial, in-progress  
  critical: '#FF3B30',     // Red: Failed, error, critical, down
  
  // Text
  text: {
    primary: '#FFFFFF',
    secondary: '#9BA3AF',
    tertiary: '#6B7280',
    muted: '#4B5563',
  },
  
  // Status mappings for consistent usage
  status: {
    operational: '#16C784',
    verified: '#16C784',
    completed: '#16C784',
    healthy: '#16C784',
    connected: '#16C784',
    
    partial: '#FFB020',
    preview: '#FFB020',
    warning: '#FFB020',
    in_progress: '#FFB020',
    validating: '#FFB020',
    
    failed: '#FF3B30',
    error: '#FF3B30',
    critical: '#FF3B30',
    down: '#FF3B30',
    
    pending: '#6B7280',
    inactive: '#6B7280',
    unknown: '#6B7280',
  }
};

export const card = {
  background: '#111214',
  border: '#1F2226',
  radius: '10px',
  padding: '16px',
};

export const layout = {
  maxWidth: 'none',
  background: '#0B0B0C',
};

// Status badge styles for consistent usage
export const statusBadge = {
  operational: 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]',
  success: 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]',
  verified: 'bg-[#16C784]/10 border-[#16C784]/30 text-[#16C784]',
  
  warning: 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]',
  partial: 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]',
  preview: 'bg-[#FFB020]/10 border-[#FFB020]/30 text-[#FFB020]',
  
  error: 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]',
  failed: 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]',
  critical: 'bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF3B30]',
  
  pending: 'bg-[#1F2226] border-[#1F2226] text-[#6B7280]',
  inactive: 'bg-[#1F2226] border-[#1F2226] text-[#6B7280]',
};
