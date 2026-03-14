import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEMO_TREND = [
  { date: "2025-03-07", spend: 1800, leads: 48 },
  { date: "2025-03-08", spend: 2100, leads: 52 },
  { date: "2025-03-09", spend: 1950, leads: 49 },
  { date: "2025-03-10", spend: 2200, leads: 58 },
  { date: "2025-03-11", spend: 2400, leads: 62 },
  { date: "2025-03-12", spend: 2300, leads: 59 },
  { date: "2025-03-13", spend: 2150, leads: 55 },
];

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ data: DEMO_TREND, source: "demo" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get last 7 days of metrics
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: metrics, error } = await supabase
      .from("campaign_daily_metrics")
      .select("metric_date, spend, leads")
      .gte("metric_date", sevenDaysAgo.toISOString().split("T")[0])
      .order("metric_date", { ascending: true });

    if (error) {
      return NextResponse.json({ data: DEMO_TREND, source: "demo", error: error.message });
    }

    // Aggregate by date
    const dateMap = new Map<string, { date: string; spend: number; leads: number }>();
    for (const m of metrics || []) {
      const date = m.metric_date;
      if (!dateMap.has(date)) {
        dateMap.set(date, { date, spend: 0, leads: 0 });
      }
      const entry = dateMap.get(date)!;
      entry.spend += m.spend || 0;
      entry.leads += m.leads || 0;
    }

    const data = Array.from(dateMap.values()).map(d => ({
      date: d.date,
      spend: parseFloat(d.spend.toFixed(2)),
      leads: d.leads,
    }));

    return NextResponse.json({ data: data.length > 0 ? data : DEMO_TREND, source: data.length > 0 ? "live" : "demo" });
  } catch (err) {
    return NextResponse.json({ data: DEMO_TREND, source: "demo", error: String(err) });
  }
}
