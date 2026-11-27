// mswazi1/js/admin.js — Admin service area activation & vendor stall approval controls
import { supabase } from "./supabase.js";

export async function fetchAllServiceAreasAdmin() {
  const { data, error } = await supabase
    .from("service_areas")
    .select("*")
    .order("name", { ascending: true });

  if (error || !data) return [];
  return data;
}

export async function setServiceAreaActive(slug, isActive) {
  const { error } = await supabase
    .from("service_areas")
    .update({ is_active: Boolean(isActive) })
    .eq("slug", slug);

  if (error) {
    throw new Error(error.message || "Could not update service area status.");
  }
}

export async function fetchAllVendorsAdmin() {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data;
}

export async function setVendorApprovalStatus(vendorId, approvalStatus) {
  const allowed = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "SUSPENDED"];
  if (!allowed.includes(approvalStatus)) {
    throw new Error("Invalid approval status.");
  }

  const { error } = await supabase
    .from("vendors")
    .update({ approval_status: approvalStatus })
    .eq("id", vendorId);

  if (error) {
    throw new Error(error.message || "Could not update vendor status.");
  }
}