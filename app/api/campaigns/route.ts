import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Demo data for when tables don't exist yet
const DEMO_CAMPAIGNS = [
  { id: "camp_001", name: "ARQIA Q1 Lead Gen", platform: "Meta Ads", status: "active", spend: 12500, leads: 342, cpl: 36.55 },
  { id: "camp_002", name: "ARQIA Retargeting", platform: "Meta Ads", status: "active", spend: 8400, leads: 156, cpl: 53.85 },
  { id: "camp_003", name: "ARQIA Lookalike", platform: "Meta Ads", status: "paused", spend: 5200, leads: 89, cpl: 58.43 },
  { id: "camp_004", name: "ManyChat Sequences", platform: "ManyChat", status: "active", spend: 0, leads: 234, cpl: 0 },
];

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    // Fetch campaigns with aggregated metrics from daily metrics
    const { data: campaigns, error } = await supabase
      .from("campaigns")
      .select("id, campaign_name, platform, campaign_status");

    if (error) {
      // Table doesn't exist - return demo data
      return NextResponse.json({ campaigns: DEMO_CAMPAIGNS, source: "demo", error: error.message });
    }

    // Aggregate metrics from campaign_daily_metrics
    const { data: metrics, error: metricsError } = await supabase
      .from("campaign_daily_metrics")
      .select("campaign_id, spend, leads");

    if (metricsError) {
      return NextResponse.json({ campaigns: DEMO_CAMPAIGNS, source: "demo", error: metricsError.message });
    }

    // Build campaign summaries
    const campaignMap = new Map();
    for (const c of campaigns || []) {
      campaignMap.set(c.id, {
        id: c.id,
        name: c.campaign_name,
        platform: c.platform,
        status: c.campaign_status || "active",
        spend: 0,
        leads: 0,
        cpl: 0,
      });
    }

    for (const m of metrics || []) {
      const c = campaignMap.get(m.campaign_id);
      if (c) {
        c.spend += m.spend || 0;
        c.leads += m.leads || 0;
      }
    }

    // Calculate CPL
    const campaignArray = Array.from(campaignMap.values());
    for (const c of campaignArray) {
      c.cpl = c.leads > 0 ? c.spend / c.leads : 0;
    }

    return NextResponse.json({ campaigns: campaignArray, source: "live" });
  } catch (err) {
    return NextResponse.json({ campaigns: DEMO_CAMPAIGNS, source: "demo", error: String(err) });
  }
}
