// mswazi1/js/map.js — Interactive Leaflet map + Supabase Realtime live stall & rider tracking
import { supabase } from "./supabase.js";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Failed to load Leaflet map library."));
    document.head.appendChild(script);
  });
}

export function getStallCoordinates(stall, idx = 0) {
  const lat =
    typeof stall.live_lat === "number"
      ? stall.live_lat
      : typeof stall.lat === "number"
      ? stall.lat
      : -4.0065 + ((idx % 3) - 1) * 0.004;

  const lng =
    typeof stall.live_lng === "number"
      ? stall.live_lng
      : typeof stall.lng === "number"
      ? stall.lng
      : 39.6050 + (Math.floor(idx / 3) - 0.5) * 0.005;

  return [lat, lng];
}

export async function createMswaziMap(containerId, { center = [-4.0065, 39.6050], zoom = 13 } = {}) {
  const L = await loadLeaflet();
  const el = document.getElementById(containerId);
  if (!el) throw new Error(`Map container #${containerId} not found.`);

  const map = L.map(el).setView(center, zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const areaLayer = L.layerGroup().addTo(map);
  const stallLayer = L.layerGroup().addTo(map);
  const riderLayer = L.layerGroup().addTo(map);
  const stallMarkers = new Map();
  const riderMarkers = new Map();

  function renderAreas(areas = [], selectedSlug = "") {
    areaLayer.clearLayers();
    areas.forEach((a) => {
      if (typeof a.lat !== "number" || typeof a.lng !== "number") return;
      const isSelected = a.slug === selectedSlug;
      const circle = L.circle([a.lat, a.lng], {
        radius: (Number(a.radius_km) || 3) * 1000,
        color: a.is_active ? (isSelected ? "#f59e0b" : "#18235c") : "#94a3b8",
        fillColor: a.is_active ? (isSelected ? "#f59e0b" : "#22317d") : "#cbd5e1",
        fillOpacity: isSelected ? 0.16 : 0.07,
        weight: isSelected ? 2.5 : 1.5,
        dashArray: a.is_active ? null : "6 6"
      });
      circle.bindTooltip(`${a.name} (${a.is_active ? "Active" : "Inactive"})`);
      circle.addTo(areaLayer);
    });
  }

  function renderStalls(stalls = [], onSelectStall) {
    stallLayer.clearLayers();
    stallMarkers.clear();

    stalls.forEach((s, idx) => {
      const [lat, lng] = getStallCoordinates(s, idx);
      const isOpen = s.is_open !== false;

      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: isOpen ? "#f59e0b" : "#64748b",
        color: "#0c1230",
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95
      });

      marker.bindTooltip(`${s.business_name} (${isOpen ? "Live · Open" : "Closed"})`);
      marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:180px;">
          <strong>${s.business_name}</strong><br/>
          <span style="font-size:12px; color:#5a6380;">${s.category} · ${s.area_slug}</span><br/>
          <span style="font-size:11px; color:#166534; font-weight:700;">${isOpen ? "● Live Location Active" : "○ Currently Closed"}</span><br/>
          <button data-stall-id="${s.id}" style="margin-top:6px; padding:4px 10px; border:none; border-radius:999px; background:#f59e0b; color:#fff; font-weight:700; cursor:pointer;">
            Enter Stall
          </button>
        </div>
      `);

      marker.on("popupopen", () => {
        const btn = document.querySelector(`button[data-stall-id="${s.id}"]`);
        if (btn && typeof onSelectStall === "function") {
          btn.onclick = () => onSelectStall(s);
        }
      });

      marker.addTo(stallLayer);
      stallMarkers.set(s.id, marker);
    });
  }

  function focusStall(stall, idx = 0) {
    if (!stall) return;
    const [lat, lng] = getStallCoordinates(stall, idx);
    map.setView([lat, lng], 16, { animate: true });
    const marker = stallMarkers.get(stall.id);
    if (marker) marker.openPopup();
  }

  function upsertRiderPing(ping) {
    if (!ping || typeof ping.lat !== "number" || typeof ping.lng !== "number") return;
    const key = ping.trusted_rider_id || ping.id;
    const pos = [ping.lat, ping.lng];

    if (riderMarkers.has(key)) {
      riderMarkers.get(key).setLatLng(pos);
    } else {
      const m = L.circleMarker(pos, {
        radius: 8,
        fillColor: "#16a34a",
        color: "#ffffff",
        weight: 2.5,
        fillOpacity: 1
      }).bindTooltip("Live Rider Position");
      m.addTo(riderLayer);
      riderMarkers.set(key, m);
    }
  }

  async function loadInitialRiderPings() {
    const { data } = await supabase.from("rider_locations").select("*");
    if (Array.isArray(data)) data.forEach(upsertRiderPing);
  }

  function subscribeRealtime({ onStallChange, onRiderPing } = {}) {
    const channel = supabase
      .channel("mswazi-live-map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendors" },
        (payload) => {
          if (typeof onStallChange === "function") onStallChange(payload);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rider_locations" },
        (payload) => {
          const row = payload.new;
          if (row) {
            upsertRiderPing(row);
            if (typeof onRiderPing === "function") onRiderPing(row);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  function focusArea(area) {
    if (area && typeof area.lat === "number" && typeof area.lng === "number") {
      map.setView([area.lat, area.lng], 14, { animate: true });
    }
  }

  return {
    map,
    renderAreas,
    renderStalls,
    focusStall,
    upsertRiderPing,
    loadInitialRiderPings,
    subscribeRealtime,
    focusArea
  };
}