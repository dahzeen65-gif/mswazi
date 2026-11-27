// mswazi1/js/cart.js — Multi-vendor cart grouping, quantity updates & sync
import { supabase } from "./supabase.js";
import { getCurrentUserContext } from "./app.js";

const LOCAL_CART_KEY = "mswazi_guest_cart";

export function readLocalCart() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CART_KEY) || "[]");
  } catch {
    return [];
  }
}

export function writeLocalCart(items) {
  localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
}

export async function loadCartItems() {
  const { user } = await getCurrentUserContext();
  if (!user) {
    return readLocalCart();
  }

  const { data, error } = await supabase
    .from("cart_items")
    .select(`
      id,
      product_id,
      vendor_id,
      quantity,
      products ( name, price_kes, unit_label ),
      vendors ( business_name )
    `)
    .eq("user_id", user.id);

  if (error || !data) {
    return readLocalCart();
  }

  return data.map((row) => ({
    id: row.id,
    product_id: row.product_id,
    product_name: row.products?.name || "Item",
    price_kes: Number(row.products?.price_kes || 0),
    unit_label: row.products?.unit_label || "unit",
    vendor_id: row.vendor_id,
    vendor_name: row.vendors?.business_name || "MSWAZI Stall",
    quantity: Number(row.quantity || 1)
  }));
}

export async function updateCartItemQuantity(productId, nextQty) {
  const { user } = await getCurrentUserContext();
  const localItems = readLocalCart();

  const updatedLocal = nextQty <= 0
    ? localItems.filter((i) => i.product_id !== productId)
    : localItems.map((i) => (i.product_id === productId ? { ...i, quantity: nextQty } : i));
  writeLocalCart(updatedLocal);

  if (user) {
    if (nextQty <= 0) {
      await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
    } else {
      await supabase.from("cart_items").update({ quantity: nextQty }).eq("user_id", user.id).eq("product_id", productId);
    }
  }

  return loadCartItems();
}

export function groupCartByVendor(items) {
  const groupsMap = new Map();

  for (const item of items) {
    const vId = item.vendor_id || "unknown-vendor";
    if (!groupsMap.has(vId)) {
      groupsMap.set(vId, {
        vendor_id: vId,
        vendor_name: item.vendor_name || "MSWAZI Stall",
        items: [],
        subtotal_kes: 0
      });
    }
    const group = groupsMap.get(vId);
    const lineTotal = Number(item.price_kes) * Number(item.quantity);
    group.items.push({ ...item, line_total_kes: lineTotal });
    group.subtotal_kes += lineTotal;
  }

  const groups = Array.from(groupsMap.values());
  const grandTotalKes = groups.reduce((sum, g) => sum + g.subtotal_kes, 0);
  return { groups, grandTotalKes };
}
export function removeCartItem(productId) {
  const cart = JSON.parse(localStorage.getItem('mswazi_cart') || '[]');
  const updated = cart.filter(item => item.id !== productId);
  localStorage.setItem('mswazi_cart', JSON.stringify(updated));
  return updated;
}