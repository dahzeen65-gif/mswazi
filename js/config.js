// mswazi1/js/config.js — White-label brand, selectable currency, tier pricing & Supabase runtime wiring
const env = typeof window !== "undefined" && window.__MSWAZI_ENV__ ? window.__MSWAZI_ENV__ : {};

export const MSWAZI_CONFIG = {
  appName: "MSWAZI",
  logoLetter: "M",
  tagline: "Every Stall Has a Story. Every Business Has a Place.",
  regionLabel: "Neighbourhood Marketplace",
  currency: "KES",
  supportedCurrencies: [
    { code: "KES", symbol: "KES", label: "KES — Kenyan Shilling", rateFromKes: 1 },
    { code: "USD", symbol: "$", label: "USD — US Dollar", rateFromKes: 0.0077 },
    { code: "EUR", symbol: "€", label: "EUR — Euro", rateFromKes: 0.0071 },
    { code: "GBP", symbol: "£", label: "GBP — British Pound", rateFromKes: 0.0060 }
  ],
  stallPlans: {
    launchMonths: 3,
    standardWeeklyKes: 200,
    standardMonthlyKes: 650,
    spotlightWeeklyKes: 450,
    spotlightMonthlyKes: 1500
  },
  defaultAreaSlug: "miritini",
  mapCenter: [-4.0065, 39.6050],
  mapZoom: 13,
  paymentMethods: {
    mobileMoneyLabel: "M-Pesa",
    codLabel: "Cash on Delivery (COD)"
  },
  demoMode: typeof env.demoMode === "boolean" ? env.demoMode : true,
  supabaseUrl: env.supabaseUrl || "https://eyfpyevofqdkuyuktfku.supabase.co",
  supabaseAnonKey: env.supabaseAnonKey || "sb_publishable_CWlw-rAh3h1SE98Yu1b2OA_cB-7itp1"
};