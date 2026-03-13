import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { seed } from "@/lib/seed";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await seed(user.id);

    return NextResponse.json({
      workspace_id: result.workspace_id,
      documents_ingested: result.documents_ingested,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Seeding failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
