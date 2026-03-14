import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json([
    { date: "Mar 7", spend: 1800, leads: 48 },
    { date: "Mar 8", spend: 2100, leads: 52 },
    { date: "Mar 9", spend: 1950, leads: 49 },
    { date: "Mar 10", spend: 2200, leads: 58 },
    { date: "Mar 11", spend: 2400, leads: 62 },
    { date: "Mar 12", spend: 2300, leads: 59 },
    { date: "Mar 13", spend: 2150, leads: 55 },
  ]);
}
