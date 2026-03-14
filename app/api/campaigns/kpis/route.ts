import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEMO_KPIS = {
  total_spend: 26100,
  total_leads: 821,
  avg_cpl: 31.79,
  total_booked_calls: 85,
  total_closed_deals: 37,
  avg_cac: 705.41,
};

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ kpis: DEMO_KPIS, source: "demo" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: metrics, error } = await supabase
      .from("campaign_daily_metrics")
      .select("spend, leads, calls_booked, deals_closed");

    if (error) {
      return NextResponse.json({ kpis: DEMO_KPIS, source: "demo", error: error.message });
    }

    const totals = (metrics || []).reduce((acc, m) => ({
      spend: acc.spend + (m.spend || 0),
      leads: acc.leads + (m.leads || 0),
      booked: acc.booked + (m.calls_booked || 0),
      closed: acc.closed + (m.deals_closed || 0),
    }), { spend: 0, leads: 0, booked: 0, closed: 0 });

    const kpis = {
      total_spend: parseFloat(totals.spend.toFixed(2)),
      total_leads: totals.leads,
      avg_cpl: totals.leads > 0 ? parseFloat((totals.spend / totals.leads).toFixed(2)) : 0,
      total_booked_calls: totals.booked,
      total_closed_deals: totals.closed,
      avg_cac: totals.closed > 0 ? parseFloat((totals.spend / totals.closed).toFixed(2)) : 0,
    };

    return NextResponse.json({ kpis, source: "live" });
  } catch (err) {
    return NextResponse.json({ kpis: DEMO_KPIS, source: "demo", error: String(err) });
  }
}
