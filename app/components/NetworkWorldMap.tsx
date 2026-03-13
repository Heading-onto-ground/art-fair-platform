"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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
  useEffect(() => {
    // Fix leaflet default icon issue in Next.js
    const L = require("leaflet");
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

  return (
    <>
      <style>{`
        .leaflet-container { background: #E8E3DB; font-family: inherit; }
        .leaflet-popup-content-wrapper { border-radius: 0; border: 1px solid #E8E3DB; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .leaflet-popup-tip { background: #FDFBF7; }
        .leaflet-popup-content-wrapper { background: #FDFBF7; padding: 0; }
        .leaflet-popup-content { margin: 0; }
        .leaflet-control-zoom a { border-radius: 0 !important; font-family: inherit; border-color: #E8E3DB !important; color: #4A4A4A !important; }
        .leaflet-control-zoom { border: 1px solid #E8E3DB !important; }
      `}</style>
      <MapContainer
        center={[25, 15]}
        zoom={2}
        minZoom={2}
        maxZoom={12}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
      >
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((m) => (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={m.type === "gallery" ? 7 : 5}
            pathOptions={{
              fillColor: m.type === "gallery" ? "#8B7355" : "#4A7A8B",
              fillOpacity: 0.85,
              color: "#FDFBF7",
              weight: 1.5,
            }}
          >
            <Popup>
              <div style={{ padding: "14px 16px", minWidth: 160 }}>
                <div style={{ fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: m.type === "gallery" ? "#8B7355" : "#4A7A8B", marginBottom: 6 }}>
                  {m.type === "gallery" ? "Gallery" : "Artist"}
                </div>
                <div style={{ fontFamily: S, fontSize: 16, fontWeight: 400, color: "#1A1A1A", marginBottom: 4 }}>{m.label}</div>
                {m.genre && <div style={{ fontFamily: F, fontSize: 10, color: "#8A8580" }}>{m.genre}</div>}
                <div style={{ fontFamily: F, fontSize: 10, color: "#B0AAA2", marginTop: 2 }}>{m.country}</div>
                {m.artistId && (
                  <a href={`/artist/public/${encodeURIComponent(m.artistId)}`}
                    style={{ display: "inline-block", marginTop: 10, fontFamily: F, fontSize: 9, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#8B7355", textDecoration: "underline" }}>
                    View Portfolio →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </>
  );
}
