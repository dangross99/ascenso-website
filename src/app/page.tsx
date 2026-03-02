"use client";
import { useState, useCallback } from "react";
import React from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
// 3D demo imports הוסרו

// HERO IMAGE PATH - change this path to update the hero image
const HERO_IMAGE = "/images/hero12.png"; // Hero visual – לוחות חיפוי

// הוסרו נתוני דמו – נטען רק חומרים אמיתיים מ-materials.json

// טיפוס מינימלי לחומרים מה-JSON
type MaterialRecord = {
  id: string;
  name: string;
  category: "metal" | "stone";
  colors?: string[];
  price?: number;
  images?: string[];
  variants?: Record<string, string[]>;
};

// לוח חיפוי 300×150 ס"מ, עובי 25 מ"מ — תצוגה רגילה או חתך (שכבת אבן, Honeycomb, גב אלומיניום)
function PanelPreview({ sectionView = false }: { sectionView?: boolean }) {
  // מידות במטרים: 300×150 ס"מ = 3×1.5 מ', עובי 25 מ"מ = 0.025 מ'
  const widthM = 3;
  const heightM = 1.5;
  const thicknessM = 0.025;
  const stoneLayer = 0.004;      // שכבת אבן דקה ~4 מ"מ
  const honeycombCore = 0.016;   // ליבת Honeycomb
  const aluminumBack = 0.005;    // גב אלומיניום ~5 מ"מ

  if (sectionView) {
    return (
      <group position={[0, 0.75, 0.5]} rotation={[0, Math.PI / 6, 0]}>
        {/* חתך לוח: אבן (למעלה) | Honeycomb (אפור) | אלומיניום (מתכת) */}
        <mesh position={[0, 0, (thicknessM / 2) - stoneLayer / 2]} castShadow receiveShadow>
          <boxGeometry args={[widthM, heightM, stoneLayer]} />
          <meshStandardMaterial color="#e8e4df" roughness={0.6} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0, (thicknessM / 2) - stoneLayer - honeycombCore / 2]} castShadow receiveShadow>
          <boxGeometry args={[widthM, heightM, honeycombCore]} />
          <meshStandardMaterial color="#9ca3af" roughness={0.8} metalness={0.05} />
        </mesh>
        <mesh position={[0, 0, -(aluminumBack / 2)]} castShadow receiveShadow>
          <boxGeometry args={[widthM, heightM, aluminumBack]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  return (
    <group position={[0, 0.75, 0.5]} rotation={[0, Math.PI / 6, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM, thicknessM]} />
        <meshStandardMaterial color="#e8e4df" roughness={0.5} metalness={0.15} />
      </mesh>
    </group>
  );
}

// Magnifier for desktop: circular lens that follows cursor over an image
function MagnifyImage(props: { src: string; alt: string; className?: string }) {
  const { src, alt, className } = props;
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const [show, setShow] = React.useState(false);
  const [lensPos, setLensPos] = React.useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const [bgPos, setBgPos] = React.useState<{ x: number; y: number; sizeX: number; sizeY: number }>({
    x: 0,
    y: 0,
    sizeX: 0,
    sizeY: 0,
  });
  const lensSize = 160; // px
  const zoom = 2.0; // desktop zoom

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;
    const cRect = container.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();
    // position relative to image content (object-contain may add margins)
    const relX = Math.max(0, Math.min(iRect.width, e.clientX - iRect.left));
    const relY = Math.max(0, Math.min(iRect.height, e.clientY - iRect.top));
    // lens position relative to container
    const left = (iRect.left - cRect.left) + relX - lensSize / 2;
    const top = (iRect.top - cRect.top) + relY - lensSize / 2;
    setLensPos({ left, top });
    setBgPos({
      x: -(relX * zoom - lensSize / 2),
      y: -(relY * zoom - lensSize / 2),
      sizeX: iRect.width * zoom,
      sizeY: iRect.height * zoom,
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onMouseMove={handleMove}
    >
      <img
        ref={imgRef}
        src={encodeURI(src)}
        alt={alt}
        className={className || ""}
      />
      {/* Lens is desktop-only */}
      {show && (
        <div
          className="hidden md:block pointer-events-none absolute z-20 rounded-full ring-2 ring-white/70 shadow-xl"
          style={{
            left: lensPos.left,
            top: lensPos.top,
            width: lensSize,
            height: lensSize,
            backgroundImage: `url(${encodeURI(src)})`,
            backgroundRepeat: "no-repeat",
            backgroundSize: `${bgPos.sizeX}px ${bgPos.sizeY}px`,
            backgroundPosition: `${bgPos.x}px ${bgPos.y}px`,
          }}
        />
      )}
    </div>
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
          const all = Array.isArray(json) ? json : [];
          const byId = new Map(all.map((m) => [m.id, m]));
          const pick = (id: string, variant?: string): MaterialRecord | null => {
            const base = byId.get(id);
            if (!base) return null;
            if (variant && (base as any).variants && (base as any).variants[variant]?.[0]) {
              return { ...base, images: [(base as any).variants[variant][0]] };
            }
            return base;
          };
          // סדר קבוע לדף הבית – מתכת ואבן טבעית בלבד (10 פריטים)
          const selected: MaterialRecord[] = [
            pick("stone_amazonas_brazil"),
            pick("golden_rust"),
            pick("stone_green_alpi"),
            pick("rose_gold"),
            pick("stone_travertine_silver"),
            pick("silver"),
            pick("stone_land_stone"),
          ].filter(Boolean) as MaterialRecord[];
          setTopMaterials(selected);
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
  const [panelSectionView, setPanelSectionView] = React.useState(false);

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
      {/* 1. Hero Section – בהשראת STONESIZE: גרדיאנט כהה, טקסט יוקרתי, מחסנית לוחות */}
      <section
        className="relative w-screen min-h-[195px] md:min-h-[216px] lg:min-h-[266px] flex items-center overflow-hidden"
        style={{
          marginLeft: "calc(50% - 50vw)",
          width: "100vw",
          background: "linear-gradient(135deg, #2c2520 0%, #1e2a35 50%, #1a2332 100%)",
        }}
        dir="rtl"
      >
        <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-6 py-4 lg:py-6 px-4 md:px-6 lg:px-8">
          {/* צד שמאל (ב-RTL): טקסט + CTA – שוליים רק מצד הטקסט */}
          <div className="flex-1 min-w-0 text-center lg:text-right order-2 lg:order-1">
            <p className="text-white/70 text-sm md:text-base tracking-[0.2em] uppercase font-light mb-1">
              MIRZA
            </p>
            <h1 className="text-white text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight mb-2">
              אבן טבעית ומתכת
            </h1>
            <p className="text-white/80 text-lg md:text-xl font-light tracking-wide mb-2">
              לוחות חיפוי פורמט גדול
            </p>
            <p className="text-white/60 text-sm md:text-base max-w-md mx-auto lg:mx-0 mb-6">
              Ultra Performance — ליבת Honeycomb, שכבת אבן דקה וגב אלומיניום. מערכות תלייה יבשה.
            </p>
            <a
              href="/materials"
              className="inline-block px-8 md:px-10 py-3 md:py-3.5 bg-white text-[#1a2332] text-sm md:text-base font-bold rounded-md hover:bg-white/95 transition-all duration-300 shadow-lg"
            >
              לצפייה במוצרים
            </a>
          </div>

          {/* צד ימין (ב-RTL): תמונת HERO12 – קרוב לשוליים, בלי הגזמה */}
          <div className="flex-1 min-w-0 w-full lg:flex-[1.6] lg:min-w-[52%] flex justify-center lg:justify-end order-1 lg:order-2 items-center">
            <div className="relative w-full max-w-[88vw] sm:max-w-[80vw] lg:max-w-[54vw] xl:max-w-[56vw]">
              <div className="hero-hero12-wrap relative aspect-[4/3] md:aspect-[3/2] overflow-visible bg-transparent" style={{ background: "transparent" }}>
                <Image
                  src={HERO_IMAGE}
                  alt="לוחות חיפוי אבן טבעית ומתכת – MIRZA"
                  fill
                  className="object-cover transition-transform duration-300 ease-out hover:scale-105"
                  sizes="(max-width: 768px) 95vw, (max-width: 1024px) 75vw, 60vw"
                  priority
                />
                {/* כיתוב לכיוון סוף הדף – מחוץ לתמונה (right-full = שמאל ויזואלי ב-RTL) + חץ לכל פאנל */}
                <div className="absolute inset-y-0 right-full mr-2 sm:mr-3 flex flex-col justify-between py-3 sm:py-4 pointer-events-none">
                  <div className="flex items-center gap-1.5 justify-end text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">אבן טבעית / מתכת</span>
                    <span className="hero-arrow flex-shrink-0" aria-hidden>←</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">רשת פיברגלס</span>
                    <span className="hero-arrow flex-shrink-0" aria-hidden>←</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">חלת דבש אלומיניום</span>
                    <span className="hero-arrow flex-shrink-0" aria-hidden>←</span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    <span className="text-xs sm:text-sm font-medium whitespace-nowrap">אלומיניום</span>
                    <span className="hero-arrow flex-shrink-0" aria-hidden>←</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <style jsx global>{`
          /* תמונת HERO12 – ללא רקע (מיכל ו־Next/Image) */
          .hero-hero12-wrap,
          .hero-hero12-wrap span,
          .hero-hero12-wrap img {
            background: transparent !important;
          }
          .hero-arrow {
            font-size: 0.9em;
            opacity: 0.95;
          }
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

      {/* JSON-LD: WebSite + Service (חיפוי קירות, מערכות תלייה) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MIRZA",
            url: "https://ascenso.co.il",
            inLanguage: "he-IL",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://ascenso.co.il/?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            serviceType: "Large Format Lightweight Stone & Metal Systems",
            name: "חיפוי קירות הנדסי ומערכות תלייה יבשה",
            provider: {
              "@type": "Organization",
              name: "MIRZA",
              url: "https://ascenso.co.il",
            },
            areaServed: {
              "@type": "Country",
              name: "IL",
            },
            offers: {
              "@type": "Offer",
              priceCurrency: "ILS",
              availability: "https://schema.org/InStock",
              url: "https://ascenso.co.il/materials",
            },
          }),
        }}
      />


      {/* High-end Materials Section */}
      {/* moved below to the former “הבטחת ASCENSO” position */}

      {/* טקסטורות מובילות */}
      <section className="bg-white mt-4 md:mt-6 py-4 md:py-6">
        <div className="container mx-auto px-1">
          
          <div className="relative">
            <div className="overflow-hidden py-2 md:py-4" ref={emblaRef}>
              <div className="flex -ml-4 md:-ml-8">
                {topMaterials.map((mat, index) => (
                <div className="flex-[0_0_45%] sm:flex-[0_0_28%] md:flex-[0_0_22%] lg:flex-[0_0_18%] pl-4 md:pl-8" key={mat.id ?? index}>
                    <a href="/materials" className="block group">
                    <div className="relative overflow-hidden aspect-[3/4] rounded-t-[9999px] rounded-b-none mb-3 md:mb-5 shadow-sm transition-transform duration-300 group-hover:scale-[1.03]">
                        {mat.images?.[0] ? (
                        <Image
                            src={mat.images[0]}
                            alt={mat.name}
                          fill
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                        />
                        ) : (
                          <div className="w-full h-full bg-[#dcdcdc] animate-pulse" />
                        )}
                      </div>
                      
                    </a>
                  </div>
                ))}
                {!topMaterials.length &&
                  Array.from({ length: 6 }).map((_, index) => (
                  <div className="flex-[0_0_45%] sm:flex-[0_0_28%] md:flex-[0_0_22%] lg:flex-[0_0_18%] pl-4 md:pl-8" key={`skeleton-${index}`}>
                      <div className="relative overflow-hidden aspect-[3/4] rounded-t-[9999px] rounded-b-none mb-3 md:mb-5 shadow-sm">
                        <div className="w-full h-full bg-[#dcdcdc] animate-pulse" />
                        </div>
                      </div>
                  ))
                }
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
          <div className="text-center mt-6 md:mt-6" dir="rtl">
            <a
              href="/materials"
              className="inline-block px-14 py-3.5 bg-[#1a1a2e] text-white text-sm md:text-base font-bold tracking-widest rounded-md transition-colors duration-300 hover:opacity-90"
            >
              לכל הטקסטורות
            </a>
          </div>
        </div>
      </section>

      {/* High-end Materials Section – “swatch” cards with overlay text */}
      <section className="w-full mt-8 md:mt-0 pt-4 pb-0 md:py-8" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2 md:gap-x-20 md:gap-y-12 lg:gap-x-24 lg:gap-y-16 xl:gap-x-28 xl:gap-y-20 overflow-visible">
            {/* Stone */}
            <div className="relative flex flex-col gap-1">
              <a href="/materials?cat=stone" className="block">
                <img
                  src={encodeURI("/images/ChatGPT Image Jan 10, 2026, 08_04_27 PM.png")}
                  alt="אבן טבעית"
                  className="w-full h-[414px] md:h-[598px] object-contain bg-transparent translate-y-4 md:translate-y-0 md:scale-[1.4] md:origin-left md:object-left lg:-translate-y-44"
                />
              </a>
              <div className="absolute inset-x-0 bottom-72 md:bottom-auto md:top-32 lg:top-72 z-10 px-1 text-center" dir="rtl">
                <h3 className="text-lg md:text-2xl font-semibold text-[#1a1a2e] tracking-tight">אבן טבעית (Natural Stone)</h3>
                <p className="text-base md:text-lg text-gray-700">
                  אנו בוחרים ידנית כל לוח ממחצבות העילית של איטליה, ברזיל וקולומביה. כל גיד וטקסטורה הם עדות לתהליך של מיליוני שנים, המעניקים לכל פריט זהות ייחודית שאין לה עותק. יצירה של{"\u00A0"}הטבע.
                </p>
                <div className="mt-1 flex items-center justify-center gap-3 text-[#1a1a2e] text-sm md:text-base w-max mx-auto">
                  <span className="inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.29 7-12a7 7 0 1 0-14 0c0 5.71 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.6"/></svg>
                    איטליה
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.29 7-12a7 7 0 1 0-14 0c0 5.71 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.6"/></svg>
                    ברזיל
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6.29 7-12a7 7 0 1 0-14 0c0 5.71 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.6"/></svg>
                    קולומביה
                  </span>
        </div>
          </div>
        </div>
            {/* נירוסטה אמנותית / אבנים אקזוטיות */}
            <div className="relative flex flex-col gap-1 lg:col-start-3">
              <a href="/materials?cat=metal" className="block">
                <img
                  src={encodeURI("/images/ChatGPT Image Jan 10, 2026, 11_01_37 PM.png")}
                  alt="נירוסטה אמנותית"
                  className="block w-full h-[414px] md:h-[598px] object-contain bg-transparent translate-y-6 md:translate-y-0 md:scale-[1.4] md:origin-center lg:-translate-y-44"
                />
              </a>
              <div className="absolute inset-x-0 bottom-72 md:bottom-auto md:top-32 lg:top-72 z-10 px-1 text-center">
                <h3 className="text-lg md:text-2xl font-semibold text-[#1a1a2e] tracking-tight">נירוסטה אמנותית (Artistic Stainless)</h3>
                <p className="text-base md:text-lg text-gray-700">מתכות אצילות, גימורים ייחודיים ואבנים אקזוטיות — קטלוג B2B לאדריכלים ולקבלנים. מערכות תלייה יבשה ופרטי Z-Clips.</p>
                <div className="mt-1 flex items-center justify-center gap-3 text-[#1a1a2e] text-sm md:text-base w-max mx-auto">
                  <span className="inline-flex items-center gap-1">אבנים אקזוטיות</span>
                  <span className="inline-flex items-center gap-1">נירוסטה</span>
                </div>
              </div>
            </div>
            {/* Metal */}
            <div className="relative flex flex-col gap-1 lg:col-start-2 lg:-mt-[32rem] lg:z-10">
              <a href="/materials?cat=metal" className="block">
                <img
                  src={encodeURI("/images/ChatGPT Image Jan 6, 2026, 05_44_10 PM.png")}
                  alt="מתכת"
                  className="w-full h-[414px] md:h-[598px] object-contain bg-transparent translate-y-3 md:translate-y-0 md:scale-[1.4] md:origin-right md:object-right lg:-translate-y-[60px] lg:translate-x-28 lg:scale-[1.55]"
                />
              </a>
              <div className="absolute inset-x-0 bottom-64 md:bottom-auto md:top-32 lg:-top-[180px] z-10 px-1 text-center" dir="rtl">
                <h3 className="text-lg md:text-2xl font-semibold text-[#1a1a2e] tracking-tight">מתכת (METAL)</h3>
                <p className="text-base md:text-lg text-gray-700">מתכות אצילות שעוברות תהליכי עיבוד וחימצון ייחודיים ליצירת עומק ויזואלי מהפנט. הטקסטורות המטאליות שלנו הן תוצאה של דיוק ומגע יד אנושית, המעניקים לכל משטח אופי תעשייתי מתוחכם וגימור מרהיב שמשתנה עם האור.</p>
                <div className="mt-1 flex items-center justify-center gap-6 md:gap-8 text-[#1a1a2e] text-sm md:text-base w-max mx-auto">
                  {/* Industrial */}
                  <span className="inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3l8 4-8 4-8-4 8-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M20 7v8l-8 4-8-4V7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M12 11v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                    תעשייתי
                  </span>
                  {/* Easy maintenance */}
                  <span className="inline-flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3l1.2 3.6L17 8l-3.8 1.3L12 13l-1.2-3.7L7 8l3.8-1.4L12 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                      <path d="M18.5 12l.8 2.2L22 15l-1.9.7L19.5 18l-.6-1.9L17 15l1.9-.6.6-1.4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    </svg>
                    תחזוקה קלה
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4.5. Premium Collections Section (removed per request) */}

      {/* 5. תהליך העבודה */}
      <section className="bg-white -mt-24 md:mt-0 lg:-mt-[17rem] pt-0 pb-4 md:py-6 relative z-30" dir="rtl">
        <div className="w-full px-8 md:px-16 lg:px-24">
          <div className="relative">
            {/* Mobile/Tablet: Slider */}
            <div
              className="overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar lg:hidden"
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

            {/* Desktop: straight row right-to-left */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-5 gap-6 xl:gap-8 w-full" dir="rtl">
                {/* 1 */}
                <div className="bg-white rounded-lg p-8 text-center min-h-[260px] flex flex-col justify-start" dir="rtl">
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                    <span className="text-5xl font-bold text-[#1a1a2e]">1</span>
            </div>
                  <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">בחירת דגם וטקסטורה</h3>
                  <p className="text-gray-700 leading-relaxed text-base">נכנסים להדמייה LIVE, בוחרים צורה, חומר ומעקה.</p>
              </div>
                {/* 2 */}
                <div className="bg-white rounded-lg p-8 text-center min-h-[260px] flex flex-col justify-start" dir="rtl">
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                    <span className="text-5xl font-bold text-[#1a1a2e]">2</span>
                </div>
                  <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">מחיר מיידי</h3>
                  <p className="text-gray-700 leading-relaxed text-base">רואים את המחיר מתעדכן בזמן אמת לפי הבחירות שלכם.</p>
                      </div>
                {/* 3 */}
                <div className="bg-white rounded-lg p-8 text-center min-h-[260px] flex flex-col justify-start" dir="rtl">
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                    <span className="text-5xl font-bold text-[#1a1a2e]">3</span>
                    </div>
                  <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">תיאום מדידה בשטח</h3>
                  <p className="text-gray-700 leading-relaxed text-base">קובעים ביקור למדידה, התאמות וסגירת מפרט.</p>
                      </div>
                {/* 4 */}
                <div className="bg-white rounded-lg p-8 text-center min-h-[260px] flex flex-col justify-start" dir="rtl">
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                    <span className="text-5xl font-bold text-[#1a1a2e]">4</span>
                    </div>
                  <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">תכנון וייצור</h3>
                  <p className="text-gray-700 leading-relaxed text-base">מהנדס מלווה, תכנון מוקפד וייצור קפדני.</p>
                      </div>
                {/* 5 */}
                <div className="bg-white rounded-lg p-8 text-center min-h-[260px] flex flex-col justify-start" dir="rtl">
                  <div className="w-28 h-28 mx-auto mb-6 rounded-full border-2 border-[#1a1a2e] flex items-center justify-center">
                    <span className="text-5xl font-bold text-[#1a1a2e]">5</span>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#1a1a2e] mb-2">התקנה נקייה ומהירה</h3>
                  <p className="text-gray-700 leading-relaxed text-base">צוות התקנה מקצועי, עמידה בזמנים ותוצאה מושלמת.</p>
                    </div>
                  </div>
                </div>

            {/* Dots pagination */}
            <div className="flex items-center justify-center gap-3 mt-2 lg:hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                      <button
                  key={i}
                  onClick={() => scrollToStep(i)}
                  className={`w-2.5 h-2.5 rounded-full border border-[#1a1a2e] ${i === stepsIndex ? 'bg-[#1a1a2e]' : 'bg-transparent'} transition-colors`}
                  aria-label={`Go to slide ${i + 1}`}
                />
                    ))}
                </div>

            <div className="text-center mt-2 flex flex-wrap justify-center gap-3">
              <a href="/materials" className="inline-block px-10 py-3 bg-[#1a1a2e] text-white text-sm font-bold rounded-md hover:opacity-90">Explore the Collection</a>
              <a href="/materials#specs" className="inline-block px-10 py-3 border-2 border-[#1a1a2e] text-[#1a1a2e] text-sm font-bold rounded-md hover:bg-[#1a1a2e] hover:text-white">Technical Specifications</a>
              <a href="/materials#samples" className="inline-block px-10 py-3 border-2 border-[#1a1a2e] text-[#1a1a2e] text-sm font-bold rounded-md hover:bg-[#1a1a2e] hover:text-white">Order Sample Box</a>
            </div>
          </div>
        </div>
      </section>

      {/* 5.5. תמונה אחת רוחב מלא */}
      <section className="w-full bg-white py-2 md:py-4" dir="rtl">
        <div
          className="relative w-screen"
          style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
        >
          <div className="relative h-[180px] sm:h-[220px] md:h-[300px] lg:h-[380px] overflow-hidden">
            <img
              src={encodeURI("/images/צילום מסך 2026-01-07 233213.png")}
              alt="ASCENSO showcase"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {/* Central fashion-style banner overlay */}
            <div className="absolute inset-0 bg-black/35 z-10" aria-hidden="true"></div>
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center px-4 select-none">
              <div className="text-white/85 text-xs md:text-sm mb-1">
                מערכות כבלים 8 מ"מ בציפוי PVD
                      </div>
              <div className="text-white font-prosto tracking-[0.1em] leading-none text-4xl md:text-7xl lg:text-8xl">
                OFF 10%
                        </div>
              <div className="text-white/85 text-xs md:text-sm mt-1">
                בתוקף עד סוף חודש פברואר
                      </div>
              <a href="/materials" className="mt-3 md:mt-5 inline-block px-14 py-3.5 rounded-md bg-white text-[#1a1a2e] text-sm md:text-base font-bold tracking-widest transition-colors duration-300 hover:bg-white/95">
                Explore the Collection
              </a>
                    </div>
                  </div>
              </div>
      </section>

      {/* 6. תלת‑ממד – סקירה קצרה (במיקום ובצבע הרקע הקודמים) */}
      <section className="w-full bg-gray-200 py-4 md:py-6" dir="rtl">
        <div className="w-full px-8 md:px-16 lg:px-24">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* תלת‑ממד קליל (בלי קובץ) */}
            <div className="order-1 lg:order-2">
              <div className="relative h-[220px] md:h-[520px] bg-transparent overflow-hidden rounded" onPointerDown={() => setShow3DHint(false)}>
                <Canvas camera={{ position: [2.5, 1.2, 2.2], fov: 28 }} dpr={[1, 2]} gl={{ alpha: true, toneMappingExposure: 1.2 }} style={{ background: 'transparent' }}>
                  <hemisphereLight args={['#ffffff', '#d4d4d4', 0.95]} />
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[6, 10, 4]} intensity={0.3} />
                  <directionalLight position={[-6, 8, -4]} intensity={0.22} />
                  <PanelPreview sectionView={panelSectionView} />
                  <OrbitControls
                    ref={previewOrbitRef}
                    enablePan={false}
                    enableZoom={false}
                    rotateSpeed={0.6}
                    target={[0, 0.75, 0.5]}
                />
                </Canvas>
                <button
                  type="button"
                  onClick={() => setPanelSectionView((v) => !v)}
                  className="absolute bottom-2 left-2 z-20 px-3 py-1.5 rounded bg-[#1a1a2e]/80 text-white text-xs font-medium hover:bg-[#1a1a2e]"
                >
                  {panelSectionView ? 'תצוגה רגילה' : 'מבט חתך'}
                </button>
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
            <div className="order-2 lg:order-1 text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-5">
                לוח 300×150 ס"מ — אבן, Honeycomb, אלומיניום
              </h2>
              <p className="text-gray-700 leading-relaxed mb-5 text-base md:text-lg">
                מערכות Stonesize: שכבת אבן דקה, ליבת Honeycomb קלת משקל וגב אלומיניום. צפו במבט חתך ובמפרט ההנדסי.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a href="/materials" className="inline-block px-8 py-3 bg-[#1a1a2e] text-white text-sm font-bold tracking-widest rounded-md hover:opacity-90">
                  Explore the Collection
                </a>
                <a href="/materials#specs" className="inline-block px-8 py-3 border-2 border-[#1a1a2e] text-[#1a1a2e] text-sm font-bold rounded-md hover:bg-[#1a1a2e] hover:text-white transition-colors">
                  Technical Specifications
                </a>
                <a href="/materials#samples" className="inline-block px-8 py-3 border-2 border-[#1a1a2e] text-[#1a1a2e] text-sm font-bold rounded-md hover:bg-[#1a1a2e] hover:text-white transition-colors">
                  Order Sample Box
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Luxury Collections Section (removed per request) */}

      {/* 8. פנייה מהירה – WhatsApp (באנר בסגנון אופנה) */}
      <section
        className="relative w-screen bg-[#1a1a2e] text-white overflow-hidden"
        style={{ marginLeft: "calc(50% - 50vw)", width: "100vw" }}
        dir="rtl"
      >
        <div className="relative max-w-5xl mx-auto px-4 py-8 md:py-10 lg:py-12 text-center flex flex-col items-center gap-4">
          <div className="flex items-center justify-center mb-1" aria-hidden="true">
            {/* Personal Guidance (Headset) icon */}
            <svg
              className="w-16 h-16 md:w-24 md:h-24 lg:w-28 lg:h-28 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M4 12a8 8 0 0116 0v4" />
              <rect x="3" y="12" width="4" height="7" rx="2" />
              <rect x="17" y="12" width="4" height="7" rx="2" />
              <path d="M9.5 19.5h5a3 3 0 003-3" />
            </svg>
          </div>
          <span className="sr-only">ליווי אישי</span>
          <p className="text-base md:text-2xl text-gray-200 max-w-3xl leading-relaxed">
            ייעוץ לאדריכלים ולקבלנים — חיפוי קירות הנדסי, מערכות תלייה יבשה ומפרטים טכניים. מענה מהיר ב‑WhatsApp.
          </p>
          <a
            href={`https://api.whatsapp.com/send?phone=972539994995&text=${
              encodeURIComponent(
                [
                  '\u202B*MIRZA*',
                  'היי! מעוניינ/ת בייעוץ בנושא חיפוי קירות הנדסי ומערכות תלייה יבשה.',
                  'אשמח לקבל מפרטים טכניים (Z-Clips וכו\') ולפרטים על מארז דוגמאות. תודה!',
                  '\u202C',
                ].join('\n')
              )
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 md:px-10 py-3 md:py-3.5 rounded-full bg-white text-[#1a1a2e] text-sm md:text-base font-bold tracking-wider transition-colors duration-300 hover:bg-white/95 shadow-sm"
            aria-label="צ'אט WhatsApp עם MIRZA"
          >
            התחילו שיחה ב‑WhatsApp
          </a>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="bg-gray-900 text-white">{/* Footer content */}</footer>
    </div>
  );
}

