import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// Simple CSV parser (no external dependency)
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}
import crypto from 'crypto';

// ARQIA company UUID - hardcoded for MVP
const ARQIA_COMPANY_ID = process.env.ARQIA_COMPANY_UUID || 'arqia-uuid-placeholder';

interface CSVRow {
  date?: string;
  campaign_name?: string;
  spend?: string | number;
  leads?: string | number;
  impressions?: string | number;
  clicks?: string | number;
}

interface NormalizedRow {
  date: string;
  campaign_name: string;
  campaign_id: string;
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  company_id: string;
  platform: string;
}

interface QuarantinedRow {
  row_number: number;
  raw_data: CSVRow;
  errors: string[];
}

interface ImportResult {
  status: 'success' | 'partial' | 'failed';
  import_id: string;
  timestamp: string;
  company_name: string;
  summary: {
    rows_received: number;
    rows_accepted: number;
    rows_deduped: number;
    rows_quarantined: number;
    campaigns_normalized: number;
    date_range: {
      earliest: string;
      latest: string;
      days_covered: number;
    };
  };
  quarantine_details: QuarantinedRow[];
  campaigns_created: Array<{
    id: string;
    name: string;
    spend: number;
    leads: number;
    cpl: number;
  }>;
}

// Validation functions
function validateRow(row: CSVRow, rowNumber: number): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!row.date || row.date.trim() === '') {
    errors.push('MISSING_DATE');
  }
  
  if (!row.campaign_name || row.campaign_name.trim() === '') {
    errors.push('MISSING_CAMPAIGN');
  }
  
  // Validate date format and range
  if (row.date) {
    const date = new Date(row.date);
    if (isNaN(date.getTime())) {
      errors.push('INVALID_DATE');
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date > today) {
        errors.push('FUTURE_DATE');
      }
    }
  }
  
  // Validate numeric fields
  const spend = parseFloat(String(row.spend || 0));
  if (isNaN(spend)) {
    errors.push('INVALID_SPEND');
  } else if (spend < 0) {
    errors.push('NEGATIVE_SPEND');
  }
  
  const leads = parseInt(String(row.leads || 0), 10);
  if (isNaN(leads)) {
    errors.push('INVALID_LEADS');
  } else if (leads < 0) {
    errors.push('NEGATIVE_LEADS');
  }
  
  return { valid: errors.length === 0, errors };
}

function normalizeCampaignName(name: string): { clean: string; id: string } {
  // 1. Strip whitespace
  let clean = name.trim();
  // 2. Collapse multiple spaces
  clean = clean.replace(/\s+/g, ' ');
  // 3. Truncate to 255 chars
  clean = clean.slice(0, 255);
  // 4. Generate ID from lowercase hash
  const dedupKey = clean.toLowerCase();
  const id = `csv:${crypto.createHash('md5').update(dedupKey).digest('hex').slice(0, 16)}`;
  
  return { clean, id };
}

function normalizeRow(row: CSVRow): NormalizedRow {
  const { clean: campaign_name, id: campaign_id } = normalizeCampaignName(row.campaign_name || '');
  
  return {
    date: row.date || '',
    campaign_name,
    campaign_id,
    spend: parseFloat(String(row.spend || 0)),
    leads: parseInt(String(row.leads || 0), 10),
    impressions: parseInt(String(row.impressions || 0), 10),
    clicks: parseInt(String(row.clicks || 0), 10),
    company_id: ARQIA_COMPANY_ID,
    platform: 'meta',
  };
}

function deduplicateRows(rows: NormalizedRow[]): { deduped: NormalizedRow[]; count: number } {
  const grouped = new Map<string, NormalizedRow>();
  
  for (const row of rows) {
    const key = `${row.date}:${row.campaign_id}`;
    
    if (grouped.has(key)) {
      // Merge with existing
      const existing = grouped.get(key)!;
      existing.spend += row.spend;
      existing.leads += row.leads;
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
    } else {
      grouped.set(key, { ...row });
    }
  }
  
  const deduped = Array.from(grouped.values());
  const count = rows.length - deduped.length;
  
  return { deduped, count };
}

function generateRollup(rows: NormalizedRow[]) {
  const campaigns = new Map<string, { name: string; spend: number; leads: number }>();
  const dates = new Set<string>();
  let totalSpend = 0;
  let totalLeads = 0;
  
  for (const row of rows) {
    dates.add(row.date);
    totalSpend += row.spend;
    totalLeads += row.leads;
    
    if (!campaigns.has(row.campaign_id)) {
      campaigns.set(row.campaign_id, { name: row.campaign_name, spend: 0, leads: 0 });
    }
    const camp = campaigns.get(row.campaign_id)!;
    camp.spend += row.spend;
    camp.leads += row.leads;
  }
  
  const sortedDates = Array.from(dates).sort();
  
  return {
    summary: {
      total_spend: parseFloat(totalSpend.toFixed(2)),
      total_leads: totalLeads,
      avg_cpl: totalLeads > 0 ? parseFloat((totalSpend / totalLeads).toFixed(2)) : 0,
    },
    campaigns: Array.from(campaigns.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      spend: parseFloat(data.spend.toFixed(2)),
      leads: data.leads,
      cpl: data.leads > 0 ? parseFloat((data.spend / data.leads).toFixed(2)) : 0,
    })),
    date_range: {
      earliest: sortedDates[0] || '',
      latest: sortedDates[sortedDates.length - 1] || '',
      days_covered: sortedDates.length,
    },
  };
}

export async function POST(request: NextRequest) {
  const importId = `imp_${crypto.randomBytes(8).toString('hex')}`;
  const timestamp = new Date().toISOString();
  
  try {
    const formData = await request.formData();
    const file = formData.get('csv_file') as File;
    const companyId = formData.get('company_id') as string || ARQIA_COMPANY_ID;
    
    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided' }, { status: 400 });
    }
    
    // Read and parse CSV
    const fileBuffer = await file.arrayBuffer();
    const fileContent = new TextDecoder().decode(fileBuffer);
    
    const records = parseCSV(fileContent) as CSVRow[];
    
    const rowsReceived = records.length;
    const validRows: NormalizedRow[] = [];
    const quarantineDetails: QuarantinedRow[] = [];
    
    // Validate each row
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const validation = validateRow(record, i + 2); // +2 for header and 1-indexing
      
      if (validation.valid) {
        validRows.push(normalizeRow(record));
      } else {
        quarantineDetails.push({
          row_number: i + 2,
          raw_data: record,
          errors: validation.errors,
        });
      }
    }
    
    // Deduplicate
    const { deduped: dedupedRows, count: dedupedCount } = deduplicateRows(validRows);
    
    // Generate rollup
    const rollup = generateRollup(dedupedRows);
    
    // Store in database (if Supabase is configured)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    if (supabaseUrl && supabaseKey && supabaseUrl !== 'http://localhost:54321') {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Insert campaign daily metrics
      for (const row of dedupedRows) {
        await supabase.from('campaign_daily_metrics').upsert({
          campaign_id: row.campaign_id,
          company_id: row.company_id,
          platform: row.platform,
          metric_date: row.date,
          spend: row.spend,
          leads: row.leads,
          impressions: row.impressions,
          clicks: row.clicks,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'campaign_id,metric_date',
        });
      }
      
      // Insert/update campaigns
      for (const row of dedupedRows) {
        await supabase.from('campaigns').upsert({
          id: row.campaign_id,
          company_id: row.company_id,
          campaign_name: row.campaign_name,
          platform: row.platform,
          source_platform: 'csv_manual',
          campaign_status: 'active',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
        });
      }
    }
    
    const result: ImportResult = {
      status: quarantineDetails.length === 0 ? 'success' : 'partial',
      import_id: importId,
      timestamp,
      company_name: 'ARQIA',
      summary: {
        rows_received: rowsReceived,
        rows_accepted: dedupedRows.length,
        rows_deduped: dedupedCount,
        rows_quarantined: quarantineDetails.length,
        campaigns_normalized: rollup.campaigns.length,
        date_range: rollup.date_range,
      },
      quarantine_details: quarantineDetails.map(q => ({
        row_number: q.row_number,
        raw_data: q.raw_data,
        errors: q.errors,
      })),
      campaigns_created: rollup.campaigns,
    };
    
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      status: 'failed',
      import_id: importId,
      timestamp,
      company_name: 'ARQIA',
      summary: {
        rows_received: 0,
        rows_accepted: 0,
        rows_deduped: 0,
        rows_quarantined: 0,
        campaigns_normalized: 0,
        date_range: { earliest: '', latest: '', days_covered: 0 },
      },
      quarantine_details: [],
      campaigns_created: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
