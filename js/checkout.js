// mswazi1/js/checkout.js — Creates parent order + vendor sub-orders + order_items + initial deliveries
import { supabase } from "./supabase.js";
import { getCurrentUserContext } from "./app.js";
import { groupCartByVendor, writeLocalCart } from "./cart.js";
import { buildPaymentPayload } from "./payments.js";

export async function placeCombinedOrder({ items, areaSlug, deliveryAddress, paymentMethod, phoneNumber }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Your cart is empty.");
  }
  if (!deliveryAddress || !deliveryAddress.trim()) {
    throw new Error("Please enter a delivery address or landmark.");
  }

  const { user } = await getCurrentUserContext();
  if (!user) {
    throw new Error("Please sign in to place a combined multi-vendor order.");
  }

  const { groups, grandTotalKes } = groupCartByVendor(items);
  const paymentMeta = buildPaymentPayload({
    method: paymentMethod,
    amountKes: grandTotalKes,
    phoneNumber
  });

  // 1. Insert parent order
  const { data: parentOrder, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: user.id,
      area_slug: areaSlug,
      delivery_address: deliveryAddress.trim(),
      payment_method: paymentMethod,
      payment_status: paymentMeta.payment_status,
      total_kes: grandTotalKes
    })
    .select("*")
    .single();

  if (orderError || !parentOrder) {
    throw new Error(orderError?.message || "Failed to create order.");
  }

  // 2. Create one vendor_order sub-order per vendor stall + line items + delivery record
  for (const grp of groups) {
    const { data: subOrder, error: subError } = await supabase
      .from("vendor_orders")
      .insert({
        parent_order_id: parentOrder.id,
        vendor_id: grp.vendor_id,
        subtotal_kes: grp.subtotal_kes,
        status: "CONFIRMED"
      })
      .select("*")
      .single();

    if (subError || !subOrder) {
      throw new Error(subError?.message || `Failed creating sub-order for ${grp.vendor_name}.`);
    }

    const lineRows = grp.items.map((it) => ({
      vendor_order_id: subOrder.id,
      product_id: it.product_id,
      product_name_snapshot: it.product_name,
      unit_price_snapshot: it.price_kes,
      quantity: it.quantity
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(lineRows);
    if (itemsError) {
      throw new Error(itemsError.message || "Failed saving order items.");
    }

    await supabase.from("deliveries").insert({
      vendor_order_id: subOrder.id,
      status: "AWAITING_ASSIGNMENT"
    });
  }

  // 3. Clear user's cart
  await supabase.from("cart_items").delete().eq("user_id", user.id);
  writeLocalCart([]);

  return {
    parentOrder,
    subOrderCount: groups.length,
    paymentMeta: buildPaymentPayload({
      method: paymentMethod,
      amountKes: grandTotalKes,
      phoneNumber,
      orderId: parentOrder.id
    })
  };
}