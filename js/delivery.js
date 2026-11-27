// mswazi1/js/delivery.js — Invite-only trusted riders & delivery dispatch tracking
import { supabase } from "./supabase.js";
import { getCurrentUserContext } from "./app.js";

export async function inviteTrustedRider({ riderLabel, vehicleType, routeScope = "LOCAL", riderUserId = null }) {
  const { user } = await getCurrentUserContext();
  if (!user) {
    throw new Error("Sign in required to invite a trusted rider.");
  }

  const { data, error } = await supabase
    .from("trusted_riders")
    .insert({
      invited_by_user_id: user.id,
      rider_user_id: riderUserId || null,
      rider_label: riderLabel.trim(),
      vehicle_type: vehicleType.trim(),
      route_scope: routeScope,
      is_active: true
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Could not add trusted rider.");
  }
  return data;
}

export async function fetchTrustedRiders() {
  const { data, error } = await supabase
    .from("trusted_riders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function fetchDeliveriesWithSubOrders() {
  const { data, error } = await supabase
    .from("deliveries")
    .select(`
      *,
      trusted_riders ( rider_label, vehicle_type ),
      vendor_orders (
        id,
        subtotal_kes,
        status,
        vendors ( business_name, area_slug ),
        orders ( delivery_address, area_slug, payment_method, running_late, hold_note )
      )
    `)
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function updateDeliveryLeg(deliveryId, { trustedRiderId, status }) {
  const payload = { status };
  if (trustedRiderId !== undefined) {
    payload.trusted_rider_id = trustedRiderId || null;
  }

  const { error } = await supabase
    .from("deliveries")
    .update(payload)
    .eq("id", deliveryId);

  if (error) {
    throw new Error(error.message || "Failed updating delivery status.");
  }
}