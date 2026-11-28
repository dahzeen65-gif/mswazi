// mswazi1/js/orders.js — Customer order history, running-late toggle & per-sub-order direct payment confirmation
import { supabase } from "./supabase.js";
import { getCurrentUserContext } from "./app.js";

export async function fetchCustomerOrders() {
  const { user } = await getCurrentUserContext();
  if (!user) return [];

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      vendor_orders (
        id,
        vendor_id,
        subtotal_kes,
        status,
        payment_status,
        payment_reference,
        payment_confirmed_at,
        vendors (
          id,
          slug,
          business_name,
          payment_channel,
          payment_account_ref,
          payment_account_name,
          payment_instructions
        ),
        deliveries (
          id,
          trusted_rider_id,
          status,
          updated_at,
          trusted_riders (
            rider_label,
            vehicle_type,
            route_scope
          )
        )
      )
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !Array.isArray(data)) return [];
  return data;
}

export async function submitSubOrderPaymentProof(vendorOrderId, paymentReference) {
  const cleanRef = String(paymentReference || "").trim().toUpperCase();
  if (!vendorOrderId) {
    throw new Error("Sub-order ID is required.");
  }
  if (!cleanRef) {
    throw new Error("Enter an M-Pesa code or payment note before submitting.");
  }

  const { error } = await supabase
    .from("vendor_orders")
    .update({
      payment_status: "SENT_PENDING_CONFIRMATION",
      payment_reference: cleanRef
    })
    .eq("id", vendorOrderId);

  if (error) {
    throw new Error(error.message || "Could not submit payment reference.");
  }
}

export async function confirmSubOrderPaymentReceived(vendorOrderId) {
  if (!vendorOrderId) {
    throw new Error("Sub-order ID is required.");
  }

  const { error } = await supabase
    .from("vendor_orders")
    .update({
      payment_status: "PAID_CONFIRMED",
      payment_confirmed_at: new Date().toISOString()
    })
    .eq("id", vendorOrderId);

  if (error) {
    throw new Error(error.message || "Could not confirm payment receipt.");
  }
}

export async function toggleOrderRunningLate(orderId, runningLate, holdNote = "") {
  if (!orderId) {
    throw new Error("Order ID is required.");
  }

  const { error } = await supabase
    .from("orders")
    .update({
      running_late: Boolean(runningLate),
      hold_note: runningLate ? String(holdNote || "").trim() : ""
    })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message || "Could not update order delay status.");
  }
}

export function subscribeToOrderUpdates(onChange) {
  const channel = supabase
    .channel("mswazi-orders-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "vendor_orders" },
      (payload) => {
        if (typeof onChange === "function") onChange(payload);
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "deliveries" },
      (payload) => {
        if (typeof onChange === "function") onChange(payload);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}