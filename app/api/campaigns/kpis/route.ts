import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const DEMO_KPIS = {
  total_spend: 26100,
  total_leads: 821,
  avg_cpl: 31.79,
  total_booked_calls: 85,
  total_closed_deals: 37,
  avg_cac: 705.41,
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data: metrics, error } = await supabase
      .from("campaign_daily_metrics")
      .select("spend, leads");

    if (error) {
      return NextResponse.json({ kpis: DEMO_KPIS, source: "demo", error: error.message });
    }

    const totals = (metrics || []).reduce((acc, m) => ({
      spend: acc.spend + (m.spend || 0),
      leads: acc.leads + (m.leads || 0),
    }), { spend: 0, leads: 0 });

    const kpis = {
      total_spend: parseFloat(totals.spend.toFixed(2)),
      total_leads: totals.leads,
      avg_cpl: totals.leads > 0 ? parseFloat((totals.spend / totals.leads).toFixed(2)) : 0,
      total_booked_calls: 0, // Column not in current schema
      total_closed_deals: 0, // Column not in current schema
      avg_cac: 0,
    };

    return NextResponse.json({ kpis, source: "live" });
  } catch (err) {
    return NextResponse.json({ kpis: DEMO_KPIS, source: "demo", error: String(err) });
  }
}
