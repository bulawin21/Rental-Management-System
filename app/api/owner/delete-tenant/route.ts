import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  console.log("=== DELETE TENANT API ROUTE STARTED ===");
  
  try {
    const body = await req.json();
    const { tenantId } = body;

    console.log("Incoming request body:", body);
    console.log("Extracted tenantId:", tenantId);

    if (!tenantId) {
      console.log("ERROR: Missing tenant ID");
      return NextResponse.json(
        { error: "Missing tenant ID", details: "No tenantId provided in request body" },
        { status: 400 }
      );
    }

    console.log("=== Step 1: Finding tenant row ===");
    console.log("Querying tenants table for ID:", tenantId);
    
    const { data: tenantRow, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("profile_id, unit_id")
      .eq("id", tenantId)
      .single();

    console.log("Tenant query result:", { data: tenantRow, error: tenantError });

    if (tenantError) {
      console.error("ERROR: Failed to find tenant:", tenantError);
      return NextResponse.json(
        { 
          error: `Failed to find tenant: ${tenantError.message}`,
          details: {
            code: tenantError.code,
            details: tenantError.details,
            hint: tenantError.hint
          }
        },
        { status: 400 }
      );
    }

    if (!tenantRow) {
      console.log("ERROR: Tenant not found in database");
      return NextResponse.json(
        { error: "Tenant not found", details: `No tenant found with ID: ${tenantId}` },
        { status: 404 }
      );
    }

    const { profile_id, unit_id } = tenantRow;
    console.log("SUCCESS: Found tenant - profile_id:", profile_id, "unit_id:", unit_id);

    console.log("=== Step 2: Deleting tenant row ===");
    console.log("Deleting from tenants table where ID =", tenantId);
    
    const { error: deleteTenantError } = await supabaseAdmin
      .from("tenants")
      .delete()
      .eq("id", tenantId);

    console.log("Tenant delete result:", { error: deleteTenantError });

    if (deleteTenantError) {
      console.error("ERROR: Failed to delete tenant row:", deleteTenantError);
      return NextResponse.json(
        { 
          error: `Failed to delete tenant row: ${deleteTenantError.message}`,
          details: {
            code: deleteTenantError.code,
            details: deleteTenantError.details,
            hint: deleteTenantError.hint
          }
        },
        { status: 400 }
      );
    }

    console.log("SUCCESS: Tenant row deleted from tenants table");

    console.log("=== Step 3: Deleting profile row ===");
    console.log("Deleting from profiles table where ID =", profile_id);
    
    const { error: deleteProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", profile_id);

    console.log("Profile delete result:", { error: deleteProfileError });

    if (deleteProfileError) {
      console.error("ERROR: Failed to delete profile row:", deleteProfileError);
      return NextResponse.json(
        { 
          error: `Failed to delete profile row: ${deleteProfileError.message}`,
          details: {
            code: deleteProfileError.code,
            details: deleteProfileError.details,
            hint: deleteProfileError.hint
          }
        },
        { status: 400 }
      );
    }

    console.log("SUCCESS: Profile row deleted from profiles table");

    console.log("=== Step 4: Deleting auth user ===");
    console.log("Deleting auth user with ID =", profile_id);
    
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      profile_id
    );

    console.log("Auth user delete result:", { error: deleteAuthError });

    if (deleteAuthError) {
      console.error("ERROR: Failed to delete auth user:", deleteAuthError);
      return NextResponse.json(
        { 
          error: `Failed to delete auth user: ${deleteAuthError.message}`,
          details: deleteAuthError
        },
        { status: 400 }
      );
    }

    console.log("SUCCESS: Auth user deleted from Supabase Auth");

    console.log("=== Step 5: Updating unit status ===");
    console.log("Updating units table where ID =", unit_id, "to status = vacant");
    
    const { error: updateUnitError } = await supabaseAdmin
      .from("units")
      .update({ status: "vacant" })
      .eq("id", unit_id);

    console.log("Unit update result:", { error: updateUnitError });

    if (updateUnitError) {
      console.warn("WARNING: Failed to update unit status:", updateUnitError);
      console.log("Unit status update failed, but tenant was fully removed");
    } else {
      console.log("SUCCESS: Unit status updated to vacant");
    }

    console.log("=== DELETE TENANT FLOW COMPLETED SUCCESSFULLY ===");

    return NextResponse.json(
      {
        success: true,
        message: "Tenant account fully removed from system",
        details: {
          steps_completed: [
            "tenant_row_deleted",
            "profile_row_deleted", 
            "auth_user_deleted",
            "unit_status_updated"
          ]
        }
      },
      { status: 200 }
    );

  } catch (err: any) {
    console.error("=== UNEXPECTED ERROR IN DELETE TENANT ===");
    console.error("Error details:", err);
    console.error("Error stack:", err.stack);
    
    return NextResponse.json(
      { 
        error: err?.message || "Server error while deleting tenant",
        details: {
          stack: err.stack,
          name: err.name
        }
      },
      { status: 500 }
    );
  }
}
