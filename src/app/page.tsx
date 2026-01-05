"use client";
import { useState, useCallback } from "react";
import React from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TextureLoader, SRGBColorSpace, ClampToEdgeWrapping, LinearFilter } from "three";
// 3D demo imports הוסרו

// HERO IMAGE PATH - change this path to update the hero image
const HERO_IMAGE = "/images/hero.jpg"; // Local optimized hero image

// נתוני דמו ישנים (נשארים לגיבוי אם אין materials.json)
const images = [
  {
    src: "/images/products/calacatta-sink.jpg",
    alt: "Calacatta Marble Sink",
    price: "1,250.00",
    colors: [
      { name: "Calacatta Gold", class: "bg-gray-100" },
      { name: "Statuario", class: "bg-white" },
      { name: "Carrara", class: "bg-gray-200" },
      { name: "Arabescato", class: "bg-gray-300" },
      { name: "Paonazzo", class: "bg-yellow-50" },
    ],
  },
  {
    src: "/images/products/nero-marquina.jpg",
    alt: "Nero Marquina Countertop",
    price: "980.00",
    colors: [
      { name: "Nero Marquina", class: "bg-gray-900" },
      { name: "Portoro", class: "bg-black" },
      { name: "Blackwood", class: "bg-gray-800" },
    ],
  },
  {
    src: "/images/products/travertine-wall.jpg",
    alt: "Travertine Wall Panels",
    price: "760.00",
    colors: [
      { name: "Classic Travertine", class: "bg-yellow-100" },
      { name: "Silver Travertine", class: "bg-gray-400" },
      { name: "Noce Travertine", class: "bg-yellow-800" },
      { name: "Scabas", class: "bg-orange-200" },
    ],
  },
  {
    src: "/images/products/emperador-dark.jpg",
    alt: "Emperador Dark Table",
    price: "1,400.00",
    colors: [
      { name: "Emperador Dark", class: "bg-yellow-900" },
      { name: "Light Emperador", class: "bg-yellow-700" },
    ],
  },
  {
    src: "/images/products/white-onyx.jpg",
    alt: "White Onyx Backlit Wall",
    price: "2,100.00",
    colors: [
      { name: "White Onyx", class: "bg-orange-50" },
      { name: "Honey Onyx", class: "bg-yellow-300" },
      { name: "Green Onyx", class: "bg-green-200" },
      { name: "Pink Onyx", class: "bg-pink-200" },
      { name: "Red Onyx", class: "bg-red-300" },
      { name: "Blue Onyx", class: "bg-blue-200" },
    ],
  },
  {
    src: "/images/products/stone-product-6.jpg",
    alt: "Luxury Stone Product",
    price: "1,850.00",
    colors: [
      { name: "Sodalite Blue", class: "bg-blue-700" },
      { name: "Lapis Lazuli", class: "bg-blue-900" },
      { name: "Malachite", class: "bg-green-600" },
    ],
  },
];

// טיפוס מינימלי לחומרים מה-JSON
type MaterialRecord = {
  id: string;
  name: string;
  category: "wood" | "metal" | "stone";
  colors?: string[];
  price?: number;
  images?: string[];
  variants?: Record<string, string[]>;
};

// קומפוננטה קלה לתצוגת מדרגות תלת‑ממד בלי קובץ (פרוצדורלי)
function StairsPreview() {
  // Preset: 10 steps → landing (right) → 5 steps, matching LIVE dimensions
  const firstRunSteps = 10;
  // לאחר בקשה: לבטל את המדרגה החמישית אחרי הפודסט (כלומר 4 מדרגות מוצגות)
  const secondRunTotalSteps = 5; // לשמירת עיגון/offset של הקבוצה
  const secondRunSteps = 4;      // כמות מדרגות בפועל אחרי הפודסט
  // טקסטורת עץ WAVE – גוון "אלון" (Oak)
  const woodTextureUrl = "/images/materials/wave_carved_oak-v1766948002057-600.webp";
  const woodMap = useLoader(TextureLoader, woodTextureUrl);
  React.useEffect(() => {
    try {
      if (woodMap) {
        // @ts-ignore
        woodMap.colorSpace = SRGBColorSpace;
        woodMap.wrapS = woodMap.wrapT = ClampToEdgeWrapping;
        woodMap.generateMipmaps = false;
        woodMap.minFilter = LinearFilter;
        woodMap.needsUpdate = true;
      }
    } catch {}
  }, [woodMap]);
  const treadWidth = 0.90;       // רוחב מדרגה (Z)
  const treadThickness = 0.11;   // עובי תיבה "עבה"
  const treadDepth = 0.30;       // עומק/שליבה אופקית (X או Z)
  const rise = 0.16;             // רום
  const run = treadDepth;        // נוחות קריאה

  const totalX = firstRunSteps * run;
  const totalZ = secondRunTotalSteps * run;
  const eps = 0.002;            // הפרדה זעירה למניעת חפיפה חזותית
  // פרמטרים לכבלי נירוסטה
  const cableColor = "#c7ccd1";
  const cableRadius = 0.005;
  const cableSegments = 12;
  const cableSideGap = 0.01; // מרחק מהקצה הצדדי (1 ס"מ)
  const cableInlineOffset = 0.10; // מרווח בין כבלים על גבי כל מדרגה (10 ס"מ)
  const cableTopY = (firstRunSteps + secondRunSteps) * rise + 1.0; // גובה סופי לאנכי הכבל

  return (
    <group position={[-totalX * 0.45, 0, totalZ * 0.25]}>
      {/* First straight segment (along +X) */}
      {Array.from({ length: firstRunSteps }).map((_, i) => (
        <mesh key={`s1-${i}`} position={[i * run, i * rise, 0]} castShadow>
          {/* X = run, Y = thickness, Z = width */}
          <boxGeometry args={[treadDepth, treadThickness, treadWidth]} />
          <meshStandardMaterial map={woodMap} color="#ffffff" metalness={0.05} roughness={0.85} />
        </mesh>
      ))}
      {/* כבלי נירוסטה למקטע הראשון (על ציר X) – 3 כבלים לכל מדרגה בצד החיצוני (+Z) */}
      {Array.from({ length: firstRunSteps }).map((_, i) => {
        const stepTop = i * rise + treadThickness / 2;
        const spanH = Math.max(0.05, cableTopY - stepTop);
        const yCenter = stepTop + spanH / 2;
        const z = (treadWidth / 2) + cableSideGap;
        const xCenter = i * run;
        const offsets = [-cableInlineOffset, 0, cableInlineOffset];
        return offsets.map((off, k) => (
          <mesh key={`s1-cable-${i}-${k}`} position={[xCenter + off, yCenter, z]} castShadow receiveShadow>
            <cylinderGeometry args={[cableRadius, cableRadius, spanH, cableSegments]} />
            <meshStandardMaterial color={cableColor} metalness={1.0} roughness={0.35} envMapIntensity={0.6} />
          </mesh>
        ));
      })}

      {/* Landing (square 0.90 x 0.90) */}
      <mesh
        position={[
          // הנחה: הפודסט מתחיל בדיוק אחרי קצה המדרגה האחרונה + רווח זעיר
          firstRunSteps * run - run / 2 + treadWidth / 2 + eps,
          firstRunSteps * rise,
          0,
        ]}
        castShadow
      >
        {/* X = width, Y = thickness, Z = width */}
        <boxGeometry args={[treadWidth, treadThickness, treadWidth]} />
        <meshStandardMaterial map={woodMap} color="#ffffff" metalness={0.05} roughness={0.85} />
      </mesh>

      {/* Second straight segment, turned right (along -Z) */}
      {Array.from({ length: secondRunSteps }).map((_, j) => (
        <mesh
          key={`s2-${j}`}
          position={[
            // אותו X של מרכז הפודסט
            firstRunSteps * run - run / 2 + treadWidth / 2 + eps,
            // מתחילים גובה אחד מעל הפודסט, ואז ממשיכים בעלייה
            firstRunSteps * rise + (j + 1) * rise,
            // פנייה לצד ההפוך: התחלה אחרי קצה הפודסט בציר Z החיובי + רווח זעיר
            (treadWidth / 2 + run / 2 + eps) + j * run,
          ]}
          castShadow
        >
          {/* X = width, Y = thickness, Z = run */}
          <boxGeometry args={[treadWidth, treadThickness, treadDepth]} />
          <meshStandardMaterial map={woodMap} color="#ffffff" metalness={0.05} roughness={0.85} />
        </mesh>
      ))}
      {/* כבלי נירוסטה למקטע השני (על ציר Z) – 3 כבלים לכל מדרגה בצד החיצוני (+X) */}
      {Array.from({ length: secondRunSteps }).map((_, j) => {
        const stepTop = (firstRunSteps * rise) + (j + 1) * rise + treadThickness / 2;
        const spanH = Math.max(0.05, cableTopY - stepTop);
        const yCenter = stepTop + spanH / 2;
        // צד ההפוך: במקום +X, נעבור ל- X שלילי
        const xBase = firstRunSteps * run - run / 2 + treadWidth / 2 + eps - (treadWidth / 2) - cableSideGap;
        const zCenter = (treadWidth / 2 + run / 2 + eps) + j * run;
        const offsets = [-cableInlineOffset, 0, cableInlineOffset];
        return offsets.map((off, k) => (
          <mesh key={`s2-cable-${j}-${k}`} position={[xBase, yCenter, zCenter + off]} castShadow receiveShadow>
            <cylinderGeometry args={[cableRadius, cableRadius, spanH, cableSegments]} />
            <meshStandardMaterial color={cableColor} metalness={1.0} roughness={0.35} envMapIntensity={0.6} />
          </mesh>
        ));
      })}
    </group>
  );
}

export default function Home() {
  // טקסטורות אמיתיות מתוך materials.json לשימוש ב"פס מוצרים" בדף הבית
  const [topMaterials, setTopMaterials] = useState<MaterialRecord[]>([]);
  // מניעת Hydration mismatch במרכיבים רגישים לדפדפן/תוספים
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/data/materials.json?ts=${Date.now()}`, { cache: "no-store" });
        const json: MaterialRecord[] = await res.json();
        if (!cancelled) {
          // בחר כמה טקסטורות ראשיות להצגה (עד 10)
          setTopMaterials((json || []).slice(0, 10));
        }
      } catch {
        // נשתמש בדמו (images) אם נכשל
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    dragFree: true,
    containScroll: "trimSnaps",
  });

  // Steps slider (native scroll-snap)
  const stepsScrollRef = React.useRef<HTMLDivElement>(null);
  const [stepsIndex, setStepsIndex] = React.useState(0);
  const scrollToStep = React.useCallback((idx: number) => {
    const el = stepsScrollRef.current;
    if (!el) return;
    const cards = el.querySelectorAll<HTMLDivElement>(".step-card");
    const target = cards[idx];
    if (target) target.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }, []);
  React.useEffect(() => {
    const el = stepsScrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const cards = Array.from(el.querySelectorAll<HTMLDivElement>(".step-card"));
      const containerRect = el.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let nearestIdx = 0;
      let minDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < cards.length; i++) {
        const r = cards[i].getBoundingClientRect();
        const cardCenter = r.left + r.width / 2;
        const dist = Math.abs(cardCenter - containerCenter);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }
      setStepsIndex(nearestIdx);
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // שליטת מבט התחלתית לתצוגת התלת־ממד הקטנה (כך שהזווית ההתחלתית תהיה “בול”)
  const previewOrbitRef = React.useRef<any>(null);
  React.useEffect(() => {
    const c = previewOrbitRef.current;
    if (!c) return;
    try {
			// זווית התחלה "פרונט" (מבטים מהחזית): אזימוט 0 ופולר מעט מעל האופק
			c.setAzimuthalAngle(0);     // 0 ≈ מבט חזיתי (לא באלכסון)
			c.setPolarAngle(1.52);      // קרוב לאופק (π/2 ≈ 1.57) כדי שלא ייראה מלמעלה
      c.update();
    } catch {}
  }, []);

  // רמז אינטראקטיביות לתלת‑ממד – כפתור “סיבוב”
  const [show3DHint, setShow3DHint] = React.useState(true);

  // Timeline visibility + count-up animation for durations
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const [tlActive, setTlActive] = React.useState(false);
  const [tlCounts, setTlCounts] = React.useState<number[]>([0, 0, 0, 0, 0]);

  React.useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTlActive(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  React.useEffect(() => {
    if (!tlActive) return;
    const targets = [10, 0, 2, 4, 1]; // minutes, immediate, days, weeks, day
    const durationMs = 1000;
    let start: number | null = null;
    let raf = 0;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const p = Math.min(1, (ts - start) / durationMs);
      const vals = targets.map((t) => Math.round(t * p));
      setTlCounts(vals);
      if (p < 1) {
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tlActive]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // removed legacy embla scroll handlers for steps slider

  type Continent = "AF" | "EU" | "AS" | "NA" | "SA" | "OC";
  const [selectedContinent, setSelectedContinent] = useState<Continent | null>(
    null
  );
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // מצבי הדמו התלת‑ממדי הוסרו

  const continentCenters: Record<Continent, [number, number]> = {
    AF: [20, 0], // אפריקה
    EU: [10, 50], // אירופה
    AS: [100, 40], // אסיה
    NA: [-100, 40], // צפון אמריקה
    SA: [-60, -20], // דרום אמריקה
    OC: [150, -20], // אוקיאניה
  };

  const continentNames: Record<Continent, string> = {
    AF: "Africa",
    EU: "Europe",
    AS: "Asia",
    NA: "North America",
    SA: "South America",
    OC: "Oceania",
  };

  // מדינות לייבוא
  const importCountries = [
    "380",
    "076",
    "356",
    "056",
    "442",
    "724",
    "276",
    "250",
    "756",
    "300",
    "792",
    "840",
    "124",
    "710",
    "818",
    "784",
    "392",
    "156",
    "410",
    "036",
    "554",
    "032",
  ];

  // הסבר קצר לכל מדינה
  const explanations: Record<string, { title: string; description: string }> = {
    "380": {
      title: "Italy",
      description:
        "Italy is the main source for classic marbles such as Calacatta, Statuario, and Carrara. Centuries-old tradition in stone craftsmanship and a wide variety of white and colorful marble.",
    },
    "076": {
      title: "Brazil",
      description:
        "Brazil offers a wide variety of unique natural stones, including colorful granite, rare quartz, and exotic stone selections.",
    },
    "356": {
      title: "India",
      description:
        "India is a key source for granite, marble, sandstone, and quartzite, with a rich tradition in stone processing.",
    },
    "056": {
      title: "Belgium",
      description:
        "Belgium is known for its prestigious blue limestone and high-quality local stones.",
    },
    "442": {
      title: "Luxembourg",
      description:
        "Luxembourg offers high-quality natural stones and a unique local selection.",
    },
    "724": {
      title: "Spain",
      description:
        "Spain is famous for quality marble and limestone, with a rich color palette.",
    },
    "276": {
      title: "Germany",
      description:
        "Germany specializes in limestone and granite, known for their durability.",
    },
    "250": {
      title: "France",
      description:
        "France offers luxurious marble and limestone, with an elegant stone tradition.",
    },
    "756": {
      title: "Switzerland",
      description:
        "Switzerland is known for high-quality natural stones and unique alpine selections.",
    },
    "300": {
      title: "Greece",
      description:
        "Greece is a source for travertine and limestone, with a Mediterranean stone tradition.",
    },
    "792": {
      title: "Turkey",
      description:
        "Turkey specializes in marble and travertine, with rich color and texture.",
    },
    "840": {
      title: "USA",
      description:
        "The USA supplies granite and unique stones, with a diverse stone selection.",
    },
    "124": {
      title: "Canada",
      description:
        "Canada is known for quality granite and a wide range of natural stones.",
    },
    "710": {
      title: "South Africa",
      description:
        "South Africa offers granite and colorful stones, with an exotic African selection.",
    },
    "818": {
      title: "Egypt",
      description:
        "Egypt specializes in limestone and marble, with an ancient stone tradition.",
    },
    "784": {
      title: "UAE",
      description:
        "The UAE imports luxury stones, with a premium selection for high-end projects.",
    },
    "392": {
      title: "Japan",
      description:
        "Japan is known for finely crafted stones and unique Japanese quality.",
    },
    "156": {
      title: "China",
      description:
        "China supplies a wide range of natural stones at competitive pricing.",
    },
    "410": {
      title: "South Korea",
      description:
        "South Korea imports quality stones for modern applications.",
    },
    "036": {
      title: "Australia",
      description:
        "Australia is known for granite and colorful stones, with a unique Australian selection.",
    },
    "554": {
      title: "New Zealand",
      description:
        "New Zealand offers unique natural stones and high-quality local materials.",
    },
    "032": {
      title: "Argentina",
      description:
        "Argentina supplies quality marble and granite, with distinctive South American stones.",
    },
  };

  const geoUrl =
    "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
  const [tooltip, setTooltip] = useState("");

  // הגדרת ה-features
  const features = [
    {
      title: "Premium Quality",
      description:
        "We source only the finest natural stones from around the world, ensuring exceptional quality and durability.",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      title: "Expert Craftsmanship",
      description:
        "Our skilled artisans bring decades of experience in stone processing and installation.",
      icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    },
    {
      title: "Sustainability",
      description:
        "We are committed to responsible sourcing and sustainable practices in all our operations.",
      icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];

  // מידע על המדינות
  const countriesInfo = {
    "380": {
      name: "Italy",
      flag: "🇮🇹",
      title: "בירת השיש העולמית",
      description:
        "איטליה היא המקור העיקרי לשיש קלאסי כמו קלאקאטה, סטטואריו וקרארה. המסורת האיטלקית בעיבוד אבן טבעית היא בת מאות שנים.",
      specialties: ["שיש לבן", "שיש צבעוני", "אבן גיר", "טרוורטין"],
      image: "https://placehold.co/800x600/e2e8f0/334155?text=Italy",
    },
    "076": {
      name: "Brazil",
      flag: "🇧🇷",
      title: "אבנים אקזוטיות",
      description:
        "ברזיל מציעה מגוון רחב של אבנים טבעיות ייחודיות, כולל גרניט צבעוני ואבני קוורץ נדירות.",
      specialties: ["גרניט", "קוורץ", "אבני חן", "אבנים צבעוניות"],
      image: "https://placehold.co/800x600/e2e8f0/334155?text=Brazil",
    },
    "356": {
      name: "India",
      flag: "🇮🇳",
      title: "מגוון עשיר של אבנים",
      description:
        "הודו היא מקור חשוב לגרניט, שיש ואבנים טבעיות אחרות, עם מסורת ארוכת שנים בעיבוד אבן.",
      specialties: ["גרניט", "שיש", "אבני חול", "אבני קוורץ"],
      image: "https://placehold.co/800x600/e2e8f0/334155?text=India",
    },
    "056": {
      name: "Belgium",
      flag: "🇧🇪",
      title: "אבן כחולה יוקרתית",
      description:
        "בלגיה ידועה באבן הכחולה שלה, חומר יוקרתי המשמש לבנייה ועיצוב כבר מאות שנים.",
      specialties: ["אבן כחולה", "אבן גיר", "אבן חול"],
      image: "https://placehold.co/800x600/e2e8f0/334155?text=Belgium",
    },
    "442": {
      name: "Luxembourg",
      flag: "🇱🇺",
      title: "אבנים ייחודיות",
      description:
        "לוקסמבורג מציעה מגוון של אבנים טבעיות ייחודיות, עם דגש על איכות ויוקרה.",
      specialties: ["אבן גיר", "אבן חול", "אבנים מקומיות"],
      image: "https://placehold.co/800x600/e2e8f0/334155?text=Luxembourg",
    },
  };

  return (
    <div className="w-full bg-white overflow-x-hidden">
      {/* 1. Hero Section */}
      <section
        className="relative w-screen min-h-[320px] md:min-h-[400px] lg:min-h-[500px] flex items-end bg-gray-50 overflow-hidden"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
      >
        {/* To change the hero image, update the HERO_IMAGE variable above */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-100 transition-all duration-300"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        ></div>
        {/* Overlay gradient for better text readability */}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black/70 via-black/25 to-transparent"></div>
        <div className="relative z-10 w-full flex flex-col gap-3 justify-center items-center px-4 md:px-14 lg:px-20 pb-8 md:pb-14 lg:pb-16 md:flex-row md:items-end md:justify-between" dir="rtl">
          {/* Right side: Text (RTL) */}
          <div className="text-center md:text-right w-full md:w-[60%] max-w-none lg:whitespace-nowrap">
            <h1
              className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-2 md:mb-4 leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
              style={{ fontFamily: "Heebo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}
            >
              מדרגות מרחפות
            </h1>
            <p
              className="text-gray-100 text-sm md:text-xl lg:text-2xl max-w-2xl"
              style={{ fontFamily: "Heebo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}
            >
              בחרו צורה, טקסטורה ומעקה – וראו הכל בהדמייה LIVE עם חישוב מחיר משוער.
            </p>
          </div>

          {/* Left side: CTA */}
          <div className="flex flex-col w-full md:w-auto md:mr-auto">
            <a
              href="/live"
              className="mx-auto md:mx-0 px-6 py-2 bg-white/80 text-[#1a1a2e]/90 text-base md:text-lg font-semibold shadow-sm hover:bg-white/70 transition-all duration-300 active:scale-[0.98] rounded-md border border-white/40"
            >
              התחל הזמנה
            </a>
          </div>
        </div>
        <style jsx global>{`
          /* Hide horizontal scrollbar across browsers for the steps viewport */
          #steps-viewport {
            -ms-overflow-style: none; /* IE/Edge */
            scrollbar-width: none; /* Firefox */
          }
          #steps-viewport::-webkit-scrollbar {
            width: 0px;
            height: 0px;
            background: transparent;
          }
          #steps-viewport::-webkit-scrollbar-thumb {
            background: transparent;
          }
          #steps-viewport::-webkit-scrollbar-track {
            background: transparent;
          }
        `}</style>
      </section>
      

      {/* High-end Materials Section */}
      {/* moved below to the former “הבטחת ASCENSO” position */}

      {/* טקסטורות מובילות */}
      <section className="bg-white mt-4 md:mt-6 py-4 md:py-6">
        <div className="container mx-auto px-1">
          
          <div className="relative">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex -ml-3 md:-ml-6">
                {(topMaterials.length ? topMaterials : []).map((mat, index) => (
                  <div className="flex-[0_0_40%] sm:flex-[0_0_33%] md:flex-[0_0_25%] lg:flex-[0_0_20%] pl-3 md:pl-6" key={mat.id ?? index}>
                    <a href="/materials" className="block group">
                      <div className="relative overflow-hidden aspect-square rounded-full mb-2 md:mb-4">
                        <Image
                          src={mat.images?.[0] || "/images/products/white-onyx.jpg"}
                          alt={mat.name}
                          fill
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      
                    </a>
                  </div>
                ))}
                {!topMaterials.length &&
                  images.map((img, index) => (
                    <div className="flex-[0_0_40%] sm:flex-[0_0_33%] md:flex-[0_0_25%] lg:flex-[0_0_20%] pl-3 md:pl-6" key={`fallback-${index}`}>
                    <div className="block group">
                      <div className="relative overflow-hidden aspect-square rounded-full mb-2 md:mb-4">
                        <Image
                          src={img.src}
                          alt={img.alt}
                          fill
                          className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {mounted && (
              <>
            <button
              onClick={scrollPrev}
              className="absolute top-[40%] -translate-y-1/2 -left-16 z-10 flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md hover:bg-gray-100 transition-all"
              aria-label="Previous slide"
                  suppressHydrationWarning
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              onClick={scrollNext}
              className="absolute top-[40%] -translate-y-1/2 -right-16 z-10 flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md hover:bg-gray-100 transition-all"
              aria-label="Next slide"
                  suppressHydrationWarning
            >
              <svg
                className="w-6 h-6 text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
              </>
            )}
          </div>
          <div className="text-center mt-12" dir="rtl">
            <a
              href="/materials"
              className="inline-block px-12 py-3 bg-[#1a1a2e] text-white text-sm font-bold tracking-widest rounded-md transition-colors duration-300 hover:opacity-90"
            >
              לכל הטקסטורות
            </a>
          </div>
        </div>
      </section>

      {/* High-end Materials Section – placed where “הבטחת ASCENSO” was */}
      <section className="w-full py-4 md:py-6" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          {/* Columns */}
          <div className="materials-group flex flex-col md:flex-row gap-3 md:gap-4 h-[828px] md:h-[966px]">
            {/* Stone */}
            <div className="materials-col relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#C5A059]">
              {/* Stone: image full */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src="/images/products/white-onyx.jpg"
                  alt="Marble placeholder"
                  className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
            </div>

            {/* Wood */}
            <div className="materials-col relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#C5A059]">
              {/* Wood: image full */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src="/images/products/travertine-wall.jpg"
                  alt="Oak wood placeholder"
                  className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
            </div>

            {/* Metal */}
            <div className="materials-col relative overflow-hidden group focus:outline-none focus:ring-2 focus:ring-[#C5A059]">
              {/* Metal: image full */}
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src="/images/products/nero-marquina.jpg"
                  alt="Brushed metal placeholder"
                  className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
            </div>
          </div>

          {/* Social proof ticker removed per request */}
        </div>

        <style jsx>{`
          .materials-group .materials-col {
            flex: 1 1 0%;
            transition: flex 400ms ease, transform 400ms ease;
          }
          @media (min-width: 768px) {
            .materials-group:hover .materials-col {
              flex: 1 1 0%;
            }
            .materials-group .materials-col:hover {
              flex: 1.35 1 0%;
            }
          }
        `}</style>
      </section>

      {/* 4.5. Premium Collections Section (removed per request) */}

      {/* 5. תהליך העבודה */}
      <section className="bg-white py-4 md:py-6" dir="rtl">
        <div className="w-full px-8 md:px-16 lg:px-24">
          <div className="relative">
            <div
              className="overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
              ref={stepsScrollRef}
              id="steps-viewport"
              dir="rtl"
            >
              <div className="flex gap-0 px-0">
                {/* Slide 1 */}
                <div className="step-card snap-start flex-[0_0_100%] sm:flex-[0_0_100%] md:flex-[0_0_100%] lg:flex-[0_0_100%]">
                  <div className="bg-white rounded-lg p-8 text-center min-h-[260px] md:min-h-[280px] flex flex-col justify-start">
                    <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-bold text-[#1a1a2e]">1</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">בחירת דגם וטקסטורה</h3>
                    <p className="text-gray-700 leading-relaxed text-base">נכנסים להדמייה LIVE, בוחרים צורה, חומר ומעקה.</p>
                    
                  </div>
                </div>
                {/* Slide 2 */}
                <div className="step-card snap-start flex-[0_0_100%] sm:flex-[0_0_100%] md:flex-[0_0_100%] lg:flex-[0_0_100%]">
                  <div className="bg-white rounded-lg p-8 text-center min-h-[260px] md:min-h-[280px] flex flex-col justify-start">
                    <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-bold text-[#1a1a2e]">2</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">מחיר מיידי</h3>
                    <p className="text-gray-700 leading-relaxed text-base">רואים את המחיר מתעדכן בזמן אמת לפי הבחירות שלכם.</p>
                    
                  </div>
                </div>
                {/* Slide 3 */}
                <div className="step-card snap-start flex-[0_0_100%] sm:flex-[0_0_100%] md:flex-[0_0_100%] lg:flex-[0_0_100%]">
                  <div className="bg-white rounded-lg p-8 text-center min-h-[260px] md:min-h-[280px] flex flex-col justify-start">
                    <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-bold text-[#1a1a2e]">3</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">תיאום מדידה בשטח</h3>
                    <p className="text-gray-700 leading-relaxed text-base">קובעים ביקור למדידה, התאמות וסגירת מפרט.</p>
                    
                  </div>
                </div>
                {/* Slide 4 */}
                <div className="step-card snap-start flex-[0_0_100%] sm:flex-[0_0_100%] md:flex-[0_0_100%] lg:flex-[0_0_100%]">
                  <div className="bg-white rounded-lg p-8 text-center min-h-[260px] md:min-h-[280px] flex flex-col justify-start">
                    <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-bold text-[#1a1a2e]">4</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">תכנון וייצור</h3>
                    <p className="text-gray-700 leading-relaxed text-base">מהנדס מלווה, תכנון מוקפד וייצור קפדני.</p>
                    
                  </div>
                </div>
                {/* Slide 5 */}
                <div className="step-card snap-start flex-[0_0_100%] sm:flex-[0_0_100%] md:flex-[0_0_100%] lg:flex-[0_0_100%]">
                  <div className="bg-white rounded-lg p-8 text-center min-h-[260px] md:min-h-[280px] flex flex-col justify-start">
                    <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                      <span className="text-4xl md:text-5xl font-bold text-[#1a1a2e]">5</span>
                    </div>
                    <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">התקנה נקייה ומהירה</h3>
                    <p className="text-gray-700 leading-relaxed text-base">צוות התקנה מקצועי, עמידה בזמנים ותוצאה מושלמת.</p>
                    
                  </div>
                </div>
              </div>
            </div>

            {/* Dots pagination */}
            <div className="flex items-center justify-center gap-3 mt-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => scrollToStep(i)}
                  className={`w-2.5 h-2.5 rounded-full border border-[#1a1a2e] ${i === stepsIndex ? 'bg-[#1a1a2e]' : 'bg-transparent'} transition-colors`}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>

            <div className="text-center mt-10">
              <a
                href="/live"
                className="inline-block px-12 py-3 bg-[#1a1a2e] text-white text-sm font-bold tracking-widest rounded-md transition-colors duration-300 hover:opacity-90"
              >
                התחל הזמנה
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5.5. Wide banner – short height */}
      <section className="w-full bg-white py-2 md:py-3" dir="rtl">
        {/* Full-bleed container */}
        <div
          className="relative w-screen"
          style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
        >
          <div className="relative h-[120px] sm:h-[140px] md:h-[180px] lg:h-[220px] overflow-hidden">
            <img
              src="/images/products/nero-marquina.jpg"
              alt="ASCENSO banner"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>
      </section>

      {/* 6. תלת‑ממד – סקירה קצרה (במיקום ובצבע הרקע הקודמים) */}
      <section className="w-full bg-gray-200 py-4 md:py-6" dir="rtl">
        <div className="w-full px-8 md:px-16 lg:px-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* תלת‑ממד קליל (בלי קובץ) */}
            <div className="order-1 lg:order-2">
              <div className="relative h-[220px] md:h-[260px] bg-transparent overflow-hidden rounded" onPointerDown={() => setShow3DHint(false)}>
                <Canvas camera={{ position: [3, 7, 1.7], fov: 23 }} dpr={[1, 2]} gl={{ alpha: true, toneMappingExposure: 1.2 }} style={{ background: 'transparent' }}>
                  <hemisphereLight args={['#ffffff', '#d4d4d4', 0.95]} />
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[6, 10, 4]} intensity={0.3} />
                  <directionalLight position={[-6, 8, -4]} intensity={0.22} />
                  <StairsPreview />
                  <OrbitControls
                    ref={previewOrbitRef}
                    enablePan={false}
                    enableZoom={false}
                    rotateSpeed={0.6}
                    target={[0, 1.1, 0.5]}
                  />
                </Canvas>
                {show3DHint && (
                  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setShow3DHint(false)}
                      className="pointer-events-auto w-14 h-14 md:w-16 md:h-16 rounded-full bg-[#1a1a2e]/85 text-white shadow-lg hover:bg-[#1a1a2e] transition-colors flex items-center justify-center"
                      aria-label="לחץ כדי להתחיל לסובב"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 6v3l4-4-4-4v3C6.48 4 2 8.48 2 14c0 2.08.64 4 1.73 5.59l1.46-1.46A7.94 7.94 0 0 1 4 14c0-4.42 3.58-8 8-8Zm8.27-1.59L18.81 5.87A7.94 7.94 0 0 1 20 14c0 4.42-3.58 8-8 8v-3l-4 4 4 4v-3c5.52 0 10-4.48 10-10 0-2.08-.64-4-1.73-5.59Z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
                </div>
            {/* טקסט */}
            <div className="order-2 lg:order-1">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                תלת‑ממד LIVE — רואים לפני שמחליטים
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                בהדמייה שלנו אתם בונים את המדרגות בזמן אמת: בוחרים צורה ,טקסטורות, חומרים, וסוג מעקה — זכוכית, מתכת או כבלי נירוסטה. תראו איך המדרגות זורמות בחלל, איך הפודסטים והפניות מתחברים טבעית והמעקה משלים את הקו — והמחיר מתעדכן בכל שינוי. אפשר לשמור הדמיות, לשתף ב‑WhatsApp ולקבוע מדידה בשטח — הכל במקום אחד.
              </p>
              
                  <a
                href="/live"
                className="inline-block px-12 py-3 bg-[#1a1a2e] text-white text-sm font-bold tracking-widest rounded-md transition-colors duration-300 hover:opacity-90"
                  >
                התחל הזמנה
                  </a>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Luxury Collections Section (removed per request) */}

      {/* 8. פנייה מהירה – WhatsApp */}
      <section className="relative bg-[#1a1a2e] text-white py-4 md:py-6" dir="rtl">
        <div className="relative max-w-2xl mx-auto text-center px-4">
          <div className="flex items-center justify-center mb-3">
            <h2 className="text-2xl md:text-3xl font-semibold">
              שאלות? דברו איתנו ב‑WhatsApp
            </h2>
          </div>
          <p className="text-sm md:text-base text-gray-300 max-w-xl mx-auto mb-5 leading-relaxed">
            צריכים הכוונה מהירה בבחירת דגם, טקסטורה או מעקה? אנחנו זמינים ב‑WhatsApp ונשמח לעזור.
          </p>
          <a
            href={`https://api.whatsapp.com/send?phone=972539994995&text=${encodeURIComponent('*ASCENSO*\nהיי! ראיתי את האתר ואני מעוניינ/ת להתקדם.\nאשמח לשיחת ייעוץ קצרה ולקבל פרטים נוספים. תודה!')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-[#0b1a13] font-bold text-sm px-6 py-3 rounded-full shadow-lg hover:brightness-95 transition-all duration-300 hover:shadow-xl"
            aria-label="צ'אט WhatsApp עם ASCENSO"
          >
            דברו איתנו ב‑WhatsApp
          </a>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-gray-900 text-white">{/* Footer content */}</footer>
    </div>
  );
}

