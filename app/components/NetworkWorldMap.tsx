"use client";

import { useEffect, useRef } from "react";
import { F, S } from "@/lib/design";

type Marker = {
  id: string;
  label: string;
  type: "artist" | "gallery";
  country: string;
  genre: string;
  image: string | null;
  artistId: string | null;
  lat: number;
  lng: number;
};

export default function NetworkWorldMap({ markers }: { markers: Marker[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const map = L.map(mapRef.current, {
        center: [25, 15],
        zoom: 2,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: true,
        maxBounds: L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
        maxBoundsViscosity: 1,
      });
      mapInstanceRef.current = map;

      // Light tile layer (CartoDB) — noWrap prevents Australia/Oceania etc. from appearing twice
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
        noWrap: true,
      }).addTo(map);

      // Add markers
      markers.forEach((m) => {
        const color = m.type === "gallery" ? "#8B7355" : "#4A7A8B";
        const circle = L.circleMarker([m.lat, m.lng], {
          radius: m.type === "gallery" ? 7 : 5,
          fillColor: color,
          fillOpacity: 0.85,
          color: "#FDFBF7",
          weight: 1.5,
        });

        const portfolioLink = m.artistId
          ? `<a href="/artist/public/${encodeURIComponent(m.artistId)}" style="display:inline-block;margin-top:8px;font-size:10px;color:#8B7355;text-decoration:underline;">View Portfolio →</a>`
          : "";

        circle.bindPopup(`
          <div style="padding:12px 14px;min-width:140px;font-family:sans-serif;">
            <div style="font-size:9px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${color};margin-bottom:4px;">
              ${m.type === "gallery" ? "Gallery" : "Artist"}
            </div>
            <div style="font-size:15px;color:#1A1A1A;margin-bottom:2px;">${m.label}</div>
            ${m.genre ? `<div style="font-size:10px;color:#8A8580;">${m.genre}</div>` : ""}
            <div style="font-size:10px;color:#B0AAA2;">${m.country}</div>
            ${portfolioLink}
          </div>
        `, { maxWidth: 220 });

        circle.addTo(map);
      });

      // Style tweaks
      const style = document.createElement("style");
      style.textContent = `
        .leaflet-container { background: #E8E3DB; }
        .leaflet-popup-content-wrapper { border-radius: 0; border: 1px solid #E8E3DB; box-shadow: 0 2px 12px rgba(0,0,0,0.08); background: #FDFBF7; }
        .leaflet-popup-tip { background: #FDFBF7; }
        .leaflet-popup-content { margin: 0; }
        .leaflet-control-zoom a { border-radius: 0 !important; border-color: #E8E3DB !important; color: #4A4A4A !important; }
        .leaflet-control-zoom { border: 1px solid #E8E3DB !important; }
      `;
      document.head.appendChild(style);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [markers]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />;
}
