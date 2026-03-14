import { NextResponse } from "next/server";

const MOCK_CAMPAIGNS = [
  { id: "camp_001", name: "ARQIA Q1 Lead Gen", platform: "Meta Ads", company: "ARQIA", status: "active", spend: 12500, leads: 342, booked: 28, closed: 12, revenue: 48000 },
  { id: "camp_002", name: "ARQIA Retargeting", platform: "Meta Ads", company: "ARQIA", status: "active", spend: 8400, leads: 156, booked: 19, closed: 8, revenue: 32000 },
  { id: "camp_003", name: "ARQIA Lookalike", platform: "Meta Ads", company: "ARQIA", status: "paused", spend: 5200, leads: 89, booked: 7, closed: 3, revenue: 12000 },
  { id: "camp_004", name: "ManyChat Sequences", platform: "ManyChat", company: "ARQIA", status: "active", spend: 0, leads: 234, booked: 31, closed: 14, revenue: 56000 },
];

export async function GET() {
  return NextResponse.json(MOCK_CAMPAIGNS);
}
