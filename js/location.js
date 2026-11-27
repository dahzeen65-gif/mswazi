// mswazi1/js/location.js — Service areas, activation status & nearby area expansion
import { supabase } from "./supabase.js";
import { MSWAZI_CONFIG } from "./config.js";

const DEMO_AREAS = [
  { slug: "miritini", name: "Miritini", sub_county: "Jomvu", county: "Mombasa", is_active: true, nearby_slugs: ["mikindani", "changamwe"], lat: -4.0065, lng: 39.6050, radius_km: 3.5 },
  { slug: "mikindani", name: "Mikindani", sub_county: "Jomvu", county: "Mombasa", is_active: true, nearby_slugs: ["miritini", "changamwe"], lat: -4.0185, lng: 39.6010, radius_km: 3.5 },
  { slug: "changamwe", name: "Changamwe", sub_county: "Changamwe", county: "Mombasa", is_active: true, nearby_slugs: ["miritini", "mikindani"], lat: -4.0220, lng: 39.6220, radius_km: 3.5 },
  { slug: "nyali", name: "Nyali", sub_county: "Nyali", county: "Mombasa", is_active: false, nearby_slugs: [], lat: -4.0350, lng: 39.6920, radius_km: 4.0 }
];

export async function fetchServiceAreas() {
  try {
    const { data, error } = await supabase
      .from("service_areas")
      .select("*")
      .order("name", { ascending: true });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
    return MSWAZI_CONFIG.demoMode ? DEMO_AREAS : [];
  } catch {
    return MSWAZI_CONFIG.demoMode ? DEMO_AREAS : [];
  }
}

export function getActiveAreaSlugs(areas, selectedSlug, includeNearby = false) {
  const current = areas.find((a) => a.slug === selectedSlug) || areas[0];
  if (!current || !current.is_active) {
    return [];
  }

  const slugs = new Set([current.slug]);
  if (includeNearby && Array.isArray(current.nearby_slugs)) {
    current.nearby_slugs.forEach((nSlug) => {
      const target = areas.find((a) => a.slug === nSlug && a.is_active);
      if (target) slugs.add(target.slug);
    });
  }
  return Array.from(slugs);
}

export function getSavedAreaSlug() {
  return localStorage.getItem("mswazi_selected_area") || MSWAZI_CONFIG.defaultAreaSlug;
}

export function saveAreaSlug(slug) {
  localStorage.setItem("mswazi_selected_area", slug);
}