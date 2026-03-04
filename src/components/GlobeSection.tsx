"use client";

import { useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

// קואורדינטות מרכז (lat, lng) למדינות לפי קוד
const countryCoords: Record<string, [number, number]> = {
  "380": [41.9, 12.6],   // Italy
  "076": [-14.2, -51.9], // Brazil
  "356": [20.6, 78.9],   // India
  "056": [50.5, 4.5],    // Belgium
  "442": [49.8, 6.1],    // Luxembourg
};

type CountryInfo = { name: string; flag: string; title: string };
type CountriesInfo = Record<string, CountryInfo>;

export default function GlobeSection({
  countriesInfo,
  onPointHover,
}: {
  countriesInfo: CountriesInfo;
  onPointHover: (label: string) => void;
}) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 450 });

  const pointsData = Object.entries(countriesInfo).map(([id, info]) => {
    const [lat, lng] = countryCoords[id] ?? [0, 0];
    return {
      lat,
      lng,
      id,
      label: `${info.flag} ${info.name} — ${info.title}`,
    };
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ width: el.offsetWidth, height: el.offsetHeight });
    });
    ro.observe(el);
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[320px]">
      <Globe
        ref={globeRef}
        width={size.width}
        height={size.height}
        globeImageUrl="https://unpkg.com/three-globe/example/img/earth-day.jpg"
        backgroundColor="rgba(241,245,249,0.01)"
        showAtmosphere
        atmosphereColor="#e2e8f0"
        atmosphereAltitude={0.15}
        onGlobeReady={() => {
          const ctrl = globeRef.current?.controls?.();
          if (ctrl) {
            ctrl.autoRotate = true;
            ctrl.autoRotateSpeed = 0.6;
          }
        }}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointLabel="label"
        pointColor={() => "#1a1a2e"}
        pointAltitude={0.02}
        pointRadius={0.4}
        onPointHover={(p: { label?: string } | null) => {
          onPointHover(p?.label ?? "");
        }}
      />
    </div>
  );
}
