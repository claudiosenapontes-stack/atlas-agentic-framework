import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    console.log("[Test] Starting env check");
    
    // Check env vars
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("[Test] URL exists:", !!url);
    console.log("[Test] Key exists:", !!key);
    
    // Try to get admin client
    console.log("[Test] Getting admin client...");
    const admin = getSupabaseAdmin();
    console.log("[Test] Admin client created");
    
    // Try a simple query
    console.log("[Test] Querying tasks...");
    const { data, error } = await admin
      .from("tasks")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (error) {
      console.error("[Test] Query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log("[Test] Query success, count:", data?.length || 0);
    
    return NextResponse.json({
      env_url_set: !!url,
      env_key_set: !!key,
      tasks_count: data?.length || 0,
      tasks: data || []
    });
    
  } catch (err: any) {
    console.error("[Test] Exception:", err?.message || String(err));
    return NextResponse.json({
      error: err?.message || "Unknown error",
      stack: err?.stack
    }, { status: 500 });
  }
}