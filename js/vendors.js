// mswazi1/js/vendors.js — Approved stall queries, spotlight ordering, live location, media & stall subscriptions
import { supabase } from "./supabase.js";
import { MSWAZI_CONFIG } from "./config.js";

const DEMO_VENDORS = [
  {
    id: "v-101",
    slug: "fresh-groceries-stall",
    business_name: "Fresh Groceries & Produce Stall",
    category: "Grocery & Fresh Produce",
    description: "Morning farm vegetables, fruits, potatoes, and daily kitchen staples.",
    area_slug: "miritini",
    opening_hours: "06:30 AM - 09:00 PM",
    approval_status: "APPROVED",
    is_open: true,
    plan_tier: "SPOTLIGHT",
    billing_cycle: "MONTHLY",
    subscription_status: "LAUNCH_FREE",
    stall_media_url: null,
    stall_media_type: null,
    lat: -4.0065,
    lng: 39.6050,
    live_lat: -4.0065,
    live_lng: 39.6050
  },
  {
    id: "v-102",
    slug: "kitchen-grill-stall",
    business_name: "Kitchen & Grill Stall",
    category: "Food & Restaurants",
    description: "Hot meals, charcoal grilled platters, snacks, and local refreshments.",
    area_slug: "miritini",
    opening_hours: "11:00 AM - 10:30 PM",
    approval_status: "APPROVED",
    is_open: true,
    plan_tier: "STANDARD",
    billing_cycle: "WEEKLY",
    subscription_status: "LAUNCH_FREE",
    stall_media_url: null,
    stall_media_type: null,
    lat: -4.0052,
    lng: 39.6075,
    live_lat: -4.0052,
    live_lng: 39.6075
  },
  {
    id: "v-103",
    slug: "general-household-stall",
    business_name: "General & Household Stall",
    category: "General Retail",
    description: "Household supplies, dry goods, beverages, and everyday essentials.",
    area_slug: "miritini",
    opening_hours: "07:00 AM - 09:30 PM",
    approval_status: "APPROVED",
    is_open: true,
    plan_tier: "STANDARD",
    billing_cycle: "MONTHLY",
    subscription_status: "LAUNCH_FREE",
    stall_media_url: null,
    stall_media_type: null,
    lat: -4.0080,
    lng: 39.6032,
    live_lat: -4.0080,
    live_lng: 39.6032
  },
  {
    id: "v-104",
    slug: "builders-materials-stall",
    business_name: "Builders Materials & Hardware Stall",
    category: "Hardware & Building Supplies",
    description: "Cement, washed sand, ballast, timber, and construction hardware.",
    area_slug: "mikindani",
    opening_hours: "07:30 AM - 06:00 PM",
    approval_status: "APPROVED",
    is_open: true,
    plan_tier: "STANDARD",
    billing_cycle: "MONTHLY",
    subscription_status: "LAUNCH_FREE",
    stall_media_url: null,
    stall_media_type: null,
    lat: -4.0185,
    lng: 39.6010,
    live_lat: -4.0185,
    live_lng: 39.6010
  },
  {
    id: "v-105",
    slug: "wearables-studio-stall",
    business_name: "Wearables & Apparel Stall",
    category: "Fashion & Clothing",
    description: "Everyday apparel, footwear, and tailored outfits.",
    area_slug: "changamwe",
    opening_hours: "08:30 AM - 07:30 PM",
    approval_status: "APPROVED",
    is_open: true,
    plan_tier: "STANDARD",
    billing_cycle: "WEEKLY",
    subscription_status: "LAUNCH_FREE",
    stall_media_url: null,
    stall_media_type: null,
    lat: -4.0220,
    lng: 39.6220,
    live_lat: -4.0220,
    live_lng: 39.6220
  }
];

function sortVendorsBySpotlight(list) {
  return [...list].sort((a, b) => {
    const aSpot = a.plan_tier === "SPOTLIGHT" ? 0 : 1;
    const bSpot = b.plan_tier === "SPOTLIGHT" ? 0 : 1;
    if (aSpot !== bSpot) return aSpot - bSpot;
    return String(a.business_name || "").localeCompare(String(b.business_name || ""));
  });
}

function filterVendors(list, { areaSlugs = [], category = "All", search = "" }) {
  let out = list;

  if (areaSlugs.length > 0) {
    out = out.filter((v) => areaSlugs.includes(v.area_slug));
  }
  if (category && category !== "All") {
    out = out.filter((v) => v.category === category);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    out = out.filter(
      (v) =>
        v.business_name.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (v.description || "").toLowerCase().includes(q)
    );
  }

  return sortVendorsBySpotlight(out);
}

export async function fetchApprovedStalls({ areaSlugs = [], category = "All", search = "" } = {}) {
  if (Array.isArray(areaSlugs) && areaSlugs.length === 0) {
    return [];
  }

  try {
    let query = supabase
      .from("vendors")
      .select("*")
      .eq("approval_status", "APPROVED")
      .order("business_name", { ascending: true });

    if (areaSlugs.length > 0) {
      query = query.in("area_slug", areaSlugs);
    }
    if (category && category !== "All") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return filterVendors(data, { search });
    }

    return MSWAZI_CONFIG.demoMode
      ? filterVendors(DEMO_VENDORS, { areaSlugs, category, search })
      : [];
  } catch {
    return MSWAZI_CONFIG.demoMode
      ? filterVendors(DEMO_VENDORS, { areaSlugs, category, search })
      : [];
  }
}

export async function fetchVendorByIdOrSlug(identifier) {
  if (!identifier) return null;

  try {
    const byId = await supabase
      .from("vendors")
      .select("*")
      .eq("id", identifier)
      .maybeSingle();

    if (byId.data) return byId.data;

    const bySlug = await supabase
      .from("vendors")
      .select("*")
      .eq("slug", identifier)
      .maybeSingle();

    if (bySlug.data) return bySlug.data;
  } catch {
    // Handled below
  }

  if (!MSWAZI_CONFIG.demoMode) return null;
  return DEMO_VENDORS.find((v) => v.id === identifier || v.slug === identifier) || DEMO_VENDORS[0];
}

export async function updateVendorLiveLocation(vendorId, lat, lng) {
  if (!vendorId || typeof lat !== "number" || typeof lng !== "number") {
    throw new Error("Valid vendor ID and coordinates are required.");
  }

  const { error } = await supabase
    .from("vendors")
    .update({
      live_lat: lat,
      live_lng: lng,
      location_updated_at: new Date().toISOString()
    })
    .eq("id", vendorId);

  if (error) {
    throw new Error(error.message || "Failed to update live stall location.");
  }
}

export async function setVendorOpenStatus(vendorId, isOpen) {
  const { error } = await supabase
    .from("vendors")
    .update({ is_open: Boolean(isOpen) })
    .eq("id", vendorId);

  if (error) {
    throw new Error(error.message || "Failed to update stall open status.");
  }
}

export async function updateVendorStallMedia(vendorId, { mediaUrl, mediaType }) {
  if (!vendorId) throw new Error("Vendor ID is required.");

  const { error } = await supabase
    .from("vendors")
    .update({
      stall_media_url: mediaUrl || null,
      stall_media_type: mediaType || null
    })
    .eq("id", vendorId);

  if (error) {
    throw new Error(error.message || "Failed to update stall cover media.");
  }
}

export async function reorderVendorProducts(orderedProductIds) {
  if (!Array.isArray(orderedProductIds) || orderedProductIds.length === 0) return;

  const updates = orderedProductIds.map((productId, index) =>
    supabase
      .from("products")
      .update({ sort_order: index })
      .eq("id", productId)
  );

  const results = await Promise.all(updates);
  const failed = results.find((res) => res.error);
  if (failed?.error) {
    throw new Error(failed.error.message || "Failed to save product order.");
  }
}

export async function updateVendorSubscriptionPlan(vendorId, { planTier, billingCycle, paymentRef = "" }) {
  if (!vendorId) throw new Error("Vendor ID is required.");

  const now = new Date();
  const daysToAdd = billingCycle === "WEEKLY" ? 7 : 30;
  const nextExpiry = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

  const payload = {
    plan_tier: planTier === "SPOTLIGHT" ? "SPOTLIGHT" : "STANDARD",
    billing_cycle: billingCycle === "WEEKLY" ? "WEEKLY" : "MONTHLY",
    subscription_status: "ACTIVE",
    subscription_expires_at: nextExpiry
  };

  if (paymentRef && paymentRef.trim()) {
    payload.last_payment_ref = paymentRef.trim();
  }

  const { error } = await supabase
    .from("vendors")
    .update(payload)
    .eq("id", vendorId);

  if (error) {
    throw new Error(error.message || "Could not update stall subscription plan.");
  }
}