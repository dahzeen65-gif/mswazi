// mswazi1/js/payments.js — M-Pesa & Cash on Delivery (COD) payment helpers & status updates
import { supabase } from "./supabase.js";

export function normalizeKenyanPhone(rawPhone) {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) return `254${digits}`;
  return digits;
}

export function buildPaymentPayload({ method, amountKes, phoneNumber, orderId }) {
  if (method === "COD") {
    return {
      method: "COD",
      payment_status: "PENDING_COLLECTION",
      reference: `COD-${String(orderId || "").slice(0, 8).toUpperCase()}`,
      message: "Cash on Delivery selected. Pay the rider upon order handover."
    };
  }

  const normalizedPhone = normalizeKenyanPhone(phoneNumber);
  return {
    method: "MPESA",
    payment_status: "PENDING",
    phone: normalizedPhone,
    amount_kes: Number(amountKes),
    order_id: orderId,
    message: `M-Pesa prompt prepared for ${normalizedPhone} (${Number(amountKes).toLocaleString("en-KE")} KES).`
  };
}

export async function recordPaymentStatus(orderId, paymentStatus) {
  const allowed = ["PENDING", "PAID", "PENDING_COLLECTION", "FAILED"];
  if (!allowed.includes(paymentStatus)) {
    throw new Error("Invalid payment status.");
  }

  const { error } = await supabase
    .from("orders")
    .update({ payment_status: paymentStatus })
    .eq("id", orderId);

  if (error) {
    throw new Error(error.message || "Could not update payment status.");
  }
}