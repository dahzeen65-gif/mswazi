// mswazi1/js/products.js — Vendor stall products, ordering, media, availability toggles & cart addition
import { supabase } from "./supabase.js";
import { MSWAZI_CONFIG } from "./config.js";
import { getCurrentUserContext } from "./app.js";
import { readLocalCart, writeLocalCart } from "./cart.js";

const DEMO_PRODUCTS = [
  {
    id: "p-1",
    vendor_id: "v-101",
    name: "Fresh Potatoes (5kg Bag)",
    description: "Sorted highland potatoes packed for household cooking.",
    category: "Grocery & Fresh Produce",
    price_kes: 350,
    unit_label: "bag",
    stock_qty: 24,
    is_available: true,
    sort_order: 0,
    media: []
  },
  {
    id: "p-2",
    vendor_id: "v-101",
    name: "Tomatoes & Leafy Greens Bundle",
    description: "Fresh ripe tomatoes paired with morning greens.",
    category: "Grocery & Fresh Produce",
    price_kes: 140,
    unit_label: "bundle",
    stock_qty: 40,
    is_available: true,
    sort_order: 1,
    media: []
  },
  {
    id: "p-3",
    vendor_id: "v-102",
    name: "Spiced Rice & Grill Platter",
    description: "Freshly prepared platter with grilled meat and accompaniments.",
    category: "Food & Restaurants",
    price_kes: 450,
    unit_label: "plate",
    stock_qty: 15,
    is_available: true,
    sort_order: 0,
    media: []
  },
  {
    id: "p-4",
    vendor_id: "v-103",
    name: "Cooking Oil & Maize Flour Pack",
    description: "Everyday household pantry bundle ready for local dispatch.",
    category: "General Retail",
    price_kes: 620,
    unit_label: "pack",
    stock_qty: 30,
    is_available: true,
    sort_order: 0,
    media: []
  },
  {
    id: "p-5",
    vendor_id: "v-104",
    name: "Portland Cement (50kg Bag)",
    description: "Standard 50kg construction cement bag for masonry and slab work.",
    category: "Hardware & Building Supplies",
    price_kes: 820,
    unit_label: "bag",
    stock_qty: 85,
    is_available: true,
    sort_order: 0,
    media: []
  },
  {
    id: "p-6",
    vendor_id: "v-105",
    name: "Breathable Cotton Casual Shirt",
    description: "Lightweight everyday shirt available in standard sizes.",
    category: "Fashion & Clothing",
    price_kes: 1650,
    unit_label: "piece",
    stock_qty: 12,
    is_available: true,
    sort_order: 0,
    media: []
  }
];

function sortByDisplayOrder(list) {
  return [...list].sort((a, b) => {
    const aOrder = Number.isFinite(Number(a.sort_order)) ? Number(a.sort_order) : 9999;
    const bOrder = Number.isFinite(Number(b.sort_order)) ? Number(b.sort_order) : 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

export async function fetchProductsByVendor(vendorId) {
  if (!vendorId) return [];

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("vendor_id", vendorId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return sortByDisplayOrder(data);
    }
  } catch {
    // Handled below
  }

  return MSWAZI_CONFIG.demoMode
    ? sortByDisplayOrder(DEMO_PRODUCTS.filter((p) => p.vendor_id === vendorId))
    : [];
}

export async function fetchProductById(productId) {
  if (!productId) return null;

  try {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (!error && data) {
      return data;
    }
  } catch {
    // Handled below
  }

  if (!MSWAZI_CONFIG.demoMode) return null;
  return DEMO_PRODUCTS.find((p) => p.id === productId) || DEMO_PRODUCTS[0];
}

export async function toggleProductAvailability(productId, isAvailable) {
  const { error } = await supabase
    .from("products")
    .update({ is_available: Boolean(isAvailable) })
    .eq("id", productId);

  if (error) {
    throw new Error(error.message || "Could not update item availability.");
  }
}

export async function addProductToCart({ product, vendor, quantity = 1 }) {
  const qty = Math.max(1, Number(quantity) || 1);
  const localItems = readLocalCart();
  const existing = localItems.find((i) => i.product_id === product.id);

  if (existing) {
    existing.quantity += qty;
  } else {
    localItems.push({
      product_id: product.id,
      product_name: product.name,
      price_kes: Number(product.price_kes),
      unit_label: product.unit_label || "unit",
      vendor_id: vendor?.id || product.vendor_id,
      vendor_name: vendor?.business_name || "MSWAZI Stall",
      quantity: qty
    });
  }
  writeLocalCart(localItems);

  const { user } = await getCurrentUserContext();
  if (user) {
    const { data: dbRow } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (dbRow) {
      await supabase
        .from("cart_items")
        .update({ quantity: Number(dbRow.quantity || 0) + qty })
        .eq("id", dbRow.id);
    } else {
      await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id: product.id,
        vendor_id: vendor?.id || product.vendor_id,
        quantity: qty
      });
    }
  }
}
export async function addProductToCart({ product, vendor, quantity = 1 }) {
  const qty = Math.max(1, Number(quantity) || 1);
  const mediaList = Array.isArray(product.media) ? product.media : [];
  const primaryImageUrl =
    mediaList.find((m) => m.type === "image")?.url ||
    mediaList[0]?.url ||
    product.image_url ||
    null;

  const localItems = readLocalCart();
  const existing = localItems.find((i) => i.product_id === product.id);

  if (existing) {
    existing.quantity += qty;
    if (!existing.media_url && primaryImageUrl) {
      existing.media_url = primaryImageUrl;
    }
  } else {
    localItems.push({
      product_id: product.id,
      product_name: product.name,
      price_kes: Number(product.price_kes),
      unit_label: product.unit_label || "unit",
      vendor_id: vendor?.id || product.vendor_id,
      vendor_name: vendor?.business_name || "MSWAZI Stall",
      media_url: primaryImageUrl,
      quantity: qty
    });
  }
  writeLocalCart(localItems);

  const { user } = await getCurrentUserContext();
  if (user) {
    const { data: dbRow } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();

    if (dbRow) {
      await supabase
        .from("cart_items")
        .update({ quantity: Number(dbRow.quantity || 0) + qty })
        .eq("id", dbRow.id);
    } else {
      await supabase.from("cart_items").insert({
        user_id: user.id,
        product_id: product.id,
        vendor_id: vendor?.id || product.vendor_id,
        quantity: qty
      });
    }
  }
}