import { NextResponse } from "next/server";

export async function GET() {
  const campaigns = [
    { spend: 12500, leads: 342, booked: 28, closed: 12 },
    { spend: 8400, leads: 156, booked: 19, closed: 8 },
    { spend: 5200, leads: 89, booked: 7, closed: 3 },
    { spend: 0, leads: 234, booked: 31, closed: 14 },
  ];
  
  const totals = campaigns.reduce((acc, c) => ({
    spend: acc.spend + c.spend,
    leads: acc.leads + c.leads,
    booked: acc.booked + c.booked,
    closed: acc.closed + c.closed,
  }), { spend: 0, leads: 0, booked: 0, closed: 0 });
  
  return NextResponse.json({
    ...totals,
    cpl: totals.leads > 0 ? totals.spend / totals.leads : 0,
    cac: totals.closed > 0 ? totals.spend / totals.closed : 0,
  });
}
