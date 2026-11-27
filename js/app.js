// mswazi1/js/app.js — Auth context, toast notifications & selectable currency formatting
import { supabase } from "./supabase.js";
import { MSWAZI_CONFIG } from "./config.js";

const CURRENCY_STORAGE_KEY = "mswazi_currency";

export function getSelectedCurrencyCode() {
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
  const valid = MSWAZI_CONFIG.supportedCurrencies.some((c) => c.code === saved);
  return valid ? saved : MSWAZI_CONFIG.currency || "KES";
}

export function setSelectedCurrencyCode(code) {
  const valid = MSWAZI_CONFIG.supportedCurrencies.some((c) => c.code === code);
  const nextCode = valid ? code : MSWAZI_CONFIG.currency || "KES";
  localStorage.setItem(CURRENCY_STORAGE_KEY, nextCode);
  return nextCode;
}

export function getCurrencyMeta(code = getSelectedCurrencyCode()) {
  return (
    MSWAZI_CONFIG.supportedCurrencies.find((c) => c.code === code) ||
    MSWAZI_CONFIG.supportedCurrencies[0]
  );
}

export function convertFromKes(amountKes, targetCode = getSelectedCurrencyCode()) {
  const base = Number(amountKes) || 0;
  const meta = getCurrencyMeta(targetCode);
  return base * (Number(meta.rateFromKes) || 1);
}

export function formatKES(amountKes, currencyCode = getSelectedCurrencyCode()) {
  const meta = getCurrencyMeta(currencyCode);
  const converted = convertFromKes(amountKes, currencyCode);

  if (meta.code === "KES") {
    return `KES ${Math.round(converted).toLocaleString("en-KE")}`;
  }

  return `${meta.symbol}${converted.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${meta.code}`;
}

export function buildCurrencySelectorHtml(id = "currencySelect") {
  const current = getSelectedCurrencyCode();
  return `
    <select class="field" id="${id}" style="width:auto; min-height:36px; padding:0.25rem 0.65rem; font-size:0.78rem;" aria-label="Select currency">
      ${MSWAZI_CONFIG.supportedCurrencies
        .map((c) => `<option value="${c.code}" ${c.code === current ? "selected" : ""}>${c.code}</option>`)
        .join("")}
    </select>
  `;
}

export function showToast(message) {
  let toast = document.getElementById("mswaziToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "mswaziToast";
    toast.style.cssText =
      "position:fixed; bottom:1.1rem; left:50%; transform:translateX(-50%); background:#0c1230; color:#fff; border:1px solid #f59e0b; padding:0.65rem 1.1rem; border-radius:999px; font-size:0.84rem; font-weight:700; z-index:9999; box-shadow:0 8px 24px rgba(0,0,0,0.22);";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.display = "block";
  clearTimeout(window.__mswaziToastTimer);
  window.__mswaziToastTimer = setTimeout(() => {
    toast.style.display = "none";
  }, 2600);
}

export async function getCurrentUserContext() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user || null;
    if (!user) return { user: null, profile: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    return { user, profile: profile || null };
  } catch {
    return { user: null, profile: null };
  }
}
export function resolveHref(targetPath) {
  if (!targetPath) return "./";
  if (/^(https?:\/\/|mailto:|tel:|#)/i.test(targetPath)) return targetPath;

  const clean = targetPath.replace(/^\.?\//, "");
  const inPagesDir = window.location.pathname.includes("/pages/");

  if (inPagesDir) {
    return clean.startsWith("pages/") ? `./${clean.slice("pages/".length)}` : `../${clean}`;
  }
  return `./${clean}`;
}