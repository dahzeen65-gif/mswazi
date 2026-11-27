// mswazi1/js/auth.js — Sign in, registration, sign out & SHOP / MY_BUSINESS mode switch
import { supabase } from "./supabase.js";
import { resolveHref, showToast } from "./app.js";

export async function signInWithIdentifier({ identifier, password }) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");

  // Note: If signing in by phone, configure phone auth in Supabase or map to account email
  const credentials = isEmail
    ? { email: trimmed, password }
    : { email: trimmed, password };

  const { data, error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    throw new Error(error.message || "Unable to sign in. Check your credentials.");
  }
  return data;
}

export async function registerAccount({ fullName, phoneNumber, email, password, defaultAreaSlug, accountPurpose }) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim()
      }
    }
  });

  if (error) {
    throw new Error(error.message || "Registration failed.");
  }

  const userId = data.user?.id;
  if (userId && data.session) {
    const initialMode = accountPurpose === "VENDOR" ? "MY_BUSINESS" : "SHOP";

    await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim(),
      active_mode: initialMode
    });

    if (defaultAreaSlug) {
      await supabase.from("addresses").insert({
        user_id: userId,
        label: "Primary Area",
        area_slug: defaultAreaSlug,
        street_or_landmark: "Selected during onboarding",
        is_default: true
      });
    }
  }

  return data;
}

export async function switchAccountMode(userId, nextMode) {
  if (!["SHOP", "MY_BUSINESS"].includes(nextMode)) {
    throw new Error("Invalid mode.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_mode: nextMode })
    .eq("id", userId);

  if (error) {
    throw new Error(error.message || "Could not switch account mode.");
  }

  showToast(nextMode === "MY_BUSINESS" ? "Switched to MY BUSINESS mode" : "Switched to SHOP mode");
  window.location.href = resolveHref(
    nextMode === "MY_BUSINESS" ? "pages/vendor-dashboard.html" : "pages/stalls.html"
  );
}

export async function signOutAccount() {
  await supabase.auth.signOut();
  window.location.href = resolveHref("index.html");
}