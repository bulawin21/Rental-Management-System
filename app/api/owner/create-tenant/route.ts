import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      fullName,
      email,
      password,
      propertyId,
      unitId,
      moveInDate,
      dueDay,
      monthlyRent,
      accountStatus,
    } = body;

    if (!fullName || !email || !password || !propertyId || !unitId || !dueDay || !monthlyRent) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createUserError || !createdUser.user) {
      return NextResponse.json(
        { error: `Auth user creation failed: ${createUserError?.message || "Unknown error"}` },
        { status: 400 }
      );
    }

    const tenantUserId = createdUser.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: tenantUserId,
      email,
      role: "tenant",
      full_name: fullName,
    });

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(tenantUserId);
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 400 }
      );
    }

    const { error: tenantError } = await supabaseAdmin.from("tenants").insert({
      profile_id: tenantUserId,
      property_id: Number(propertyId),
      unit_id: Number(unitId),
      move_in_date: moveInDate || null,
      due_day: String(dueDay),
      monthly_rent: Number(monthlyRent),
      account_status: accountStatus || "active",
    });

    if (tenantError) {
      await supabaseAdmin.from("profiles").delete().eq("id", tenantUserId);
      await supabaseAdmin.auth.admin.deleteUser(tenantUserId);
      return NextResponse.json(
        { error: `Tenant insert failed: ${tenantError.message}` },
        { status: 400 }
      );
    }

    const { error: unitUpdateError } = await supabaseAdmin
      .from("units")
      .update({ status: "occupied" })
      .eq("id", Number(unitId));

    if (unitUpdateError) {
      return NextResponse.json(
        { error: `Unit update failed: ${unitUpdateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error while creating tenant." },
      { status: 500 }
    );
  }
}