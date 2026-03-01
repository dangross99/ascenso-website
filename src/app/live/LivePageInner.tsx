'use client';

import Image from 'next/image';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useProgress, Environment } from '@react-three/drei';
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three';
import Footer from '@/components/Footer';
import Panel3D, { getPanelCenter } from './stairs/Panel3D';

/** מרכז הקיר (גריד פלטות + מרווחים) למטרת OrbitControls */
function getWallCenter(
	panelsAlongHeight: number,
	panelSizeH: number,
	gapM: number
): [number, number, number] {
	const totalHeight = panelsAlongHeight * panelSizeH + (panelsAlongHeight - 1) * gapM;
	return [0, totalHeight / 2, 0];
}

import type { PathSegment } from './shared/path';
import { encodePath, decodePath } from './shared/path';
import { BookingModal } from './components/BookingModal';
import { BrandWordmark } from './components/BrandWordmark';
import { Schematic } from './components/Schematic';
import type { MaterialKind } from './components/MaterialKindPicker';
import { NonWoodTexturePicker } from './components/NonWoodTexturePicker';

// Overlay ׳˜׳¢׳™׳ ׳” ׳׳§׳ ׳‘׳¡ ג€“ ׳׳•׳¦׳’ ׳‘׳–׳׳ ׳˜׳¢׳™׳ ׳× ׳˜׳§׳¡׳˜׳•׳¨׳•׳×/׳ ׳›׳¡׳™׳
function CanvasLoadingOverlay() {
	const { active, progress } = useProgress();
	if (!active) return null;
	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-white/55 backdrop-blur-sm">
			<div className="flex flex-col items-center gap-3">
				<div className="w-12 h-12 rounded-full border-2 border-[#1a1a2e]/25 border-t-[#1a1a2e] animate-spin" />
				<div className="text-sm text-[#1a1a2e] font-medium">{Math.round(progress)}%</div>
			</div>
		</div>
	);
}

type MaterialRecord = {
	id: string;
	name: string;
	category: 'wood' | 'metal' | 'stone';
	colors?: string[];
	price?: number;
	images: string[];
	variants?: Record<string, string[]>;
	pbr?: { bump?: string[]; roughness?: string[] };
	pbrVariants?: Record<string, { bump?: string[]; roughness?: string[] }>;
	// ׳¢׳‘׳•׳¨ ׳₪׳¨׳™׳˜׳™ ׳׳×׳›׳×/׳׳‘׳ ׳‘׳’׳•׳•׳ ׳׳—׳™׳“ ׳׳׳ ׳˜׳§׳¡׳˜׳•׳¨׳”
	solid?: string; // hex ׳›׳׳• '#111111' ׳׳• '#F5F5F5'
};

type PriceListData = {
	stairs?: {
		models?: Array<{ id: string; priceMultiplier?: number }>;
		pricing?: { baseSetup?: number; landingMultiplier?: number };
		textures?: Array<{ id: string; pricePerStep?: number }>;
	};
	railings?: {
		glass?: { unitPrice?: number; toneMultiplier?: number; toneMultiplierIds?: string[] };
		cables?: { unitPrice?: number; unitPriceCoated?: number; naturalCableId?: string };
	};
};

// ׳¦׳‘׳¢׳™ ׳¢׳¥ ׳׳•׳¦׳’׳™׳ ׳‘׳׳‘׳“: ׳˜׳‘׳¢׳™, ׳׳’׳•׳–, ׳©׳—׳•׳¨, ׳׳‘׳
const WOOD_SWATCHES: { id: string; label: string }[] = [
	{ id: 'oak', label: '׳˜׳‘׳¢׳™' },
	{ id: 'walnut', label: '׳׳’׳•׳–' },
	{ id: 'black', label: '׳©׳—׳•׳¨' },
	{ id: 'white', label: '׳׳‘׳' },
];

const COLOR_HEX: Record<string, string> = {
	black: '#111111',
	graphite: '#3E3E3E',
	white: '#F5F5F5',
	natural: '#D5C4A1',
	walnut: '#7B5A39',
	oak: '#C8A165',
};

// ׳§׳•׳ ׳₪׳™׳’׳•׳¨׳¦׳™׳” ׳₪׳¨׳˜׳ ׳™׳× ׳׳›׳ ׳“׳’׳ (׳˜׳™׳™׳׳™׳ ׳’ ׳•׳¢׳•׳׳§ bump ׳¨׳¦׳•׳™)
const MODEL_CONFIG: Record<string, { tile?: number; bump?: number; inset?: number }> = {
	'wave-carved': { tile: 0.9, bump: 0.35 },
	// ׳—׳™׳×׳•׳ ׳׳©׳•׳׳™׳™׳ ׳›׳”׳™׳ ׳‘׳˜׳§׳¡׳˜׳•׳¨׳•׳× ׳׳×׳›׳× ׳¡׳₪׳¦׳™׳₪׳™׳•׳×
	// ׳”׳§׳˜׳ ׳× ׳—׳™׳×׳•׳ ׳›׳“׳™ ׳׳”׳™׳׳ ׳¢ ׳"׳—׳•׳¨׳™׳"/׳©׳•׳׳™׳™׳ ׳›׳”׳™׳ ׳‘׳˜׳§׳¡׳˜׳•׳¨׳•׳× ׳§׳˜׳ ׳•׳×
	'antique_gold': { inset: 0.08, tile: 2.0 },
	'antique_silver': { inset: 0.08, tile: 2.0 },
	'gold_silver': { inset: 0.06, tile: 2.0 },
};
const DEFAULT_MODEL_CONFIG = { tile: 1.5, bump: 0.18, inset: 0 };
function LivePageInner() {
	const router = useRouter();
	const search = useSearchParams();

	// כדי להימנע מ-mismatch בהידרציה – נרנדר את גוף העמוד רק אחרי mount
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => setMounted(true), []);
	const [isPending, startTransition] = React.useTransition();
	const priceRef = React.useRef<HTMLDivElement | null>(null);
	const [pricePing, setPricePing] = React.useState(false);
	const shareRef = React.useRef<HTMLDivElement | null>(null);
	const [shareToast, setShareToast] = React.useState<string | null>(null);
	const [saveToast, setSaveToast] = React.useState<string | null>(null);
	// מודאל לתיאום מדידה בשטח
	const [bookingOpen, setBookingOpen] = React.useState(false);
	const [bookingSubmitted, setBookingSubmitted] = React.useState(false);
	const [fullName, setFullName] = React.useState('');
	const [phoneNumber, setPhoneNumber] = React.useState('');
	const [projectAddress, setProjectAddress] = React.useState('');
	const [preferredDate, setPreferredDate] = React.useState('');
	const [preferredTime, setPreferredTime] = React.useState<string>('');
	// אשף צ'אט: שאלה אחת בכל פעם
	const [bookingStep, setBookingStep] = React.useState<'name' | 'city' | 'date' | 'time'>('name');
	// צעדי האשף והתקדמות
	const BOOKING_STEPS: ReadonlyArray<'name' | 'city' | 'date' | 'time'> = ['name', 'city', 'date', 'time'];
	const stepIndex = React.useMemo(() => Math.max(0, BOOKING_STEPS.indexOf(bookingStep)), [bookingStep]);
	const stepTotal = BOOKING_STEPS.length;
	const stepPercent = React.useMemo(() => Math.round(((stepIndex + 1) / stepTotal) * 100), [stepIndex, stepTotal]);
	// רוחב תשובה: 5% קטן יותר מבועת השאלה
	const questionRef = React.useRef<HTMLDivElement | null>(null);
	const [answerWidthPx, setAnswerWidthPx] = React.useState<number | null>(null);
	React.useLayoutEffect(() => {
		const update = () => {
			if (questionRef.current) {
				const w = questionRef.current.getBoundingClientRect().width;
				const target = Math.max(Math.round(w * 0.95), 220);
				setAnswerWidthPx(target);
			}
		};
		update();
		window.addEventListener('resize', update);
		return () => window.removeEventListener('resize', update);
	}, [bookingStep]);
	const BOOKING_EMAIL = process.env.NEXT_PUBLIC_BOOKING_EMAIL || '';
	const firstInputRef = React.useRef<HTMLInputElement | null>(null);
	const dialogRef = React.useRef<HTMLDivElement | null>(null);
	// רשימת תאריכים גלילה: מהיום ועד שבועיים קדימה (14 ימים כולל היום), ללא ימי שישי/שבת,
	// והיום העבודה הראשון חסום (לא זמין) לצורך מרווח הפעלה.
	const twoWeeksDates = React.useMemo(() => {
		type Item = { value: string; label: string; weekday: string; disabled: boolean };
		const list: Array<Item> = [];
		const start = new Date();
		start.setHours(0, 0, 0, 0);
		let firstWorkingBlocked = false;
		for (let i = 0; i < 14; i++) {
			const d = new Date(start);
			d.setDate(start.getDate() + i);
			const day = d.getDay(); // 0=א', 5=ו', 6=ש'
			// דלג על שישי/שבת
			if (day === 5 || day === 6) continue;
			const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
			const label = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
			const weekday = d.toLocaleDateString('he-IL', { weekday: 'long' });
			let disabled = false;
			if (!firstWorkingBlocked) {
				disabled = true; // חסום את יום העבודה הראשון
				firstWorkingBlocked = true;
			}
			list.push({ value: iso, label, weekday, disabled });
		}
		return list;
	}, []);
	// ברירת מחדל: היום העבודה הראשון הפנוי (לא חסום)
	React.useEffect(() => {
		if (!preferredDate && twoWeeksDates.length) {
			const firstAvailable = twoWeeksDates.find(d => !d.disabled);
			if (firstAvailable) setPreferredDate(firstAvailable.value);
		}
	}, [preferredDate, twoWeeksDates]);
	// אין ברירת מחדל לחלון זמן – המשתמש יבחר מפורשות בשלב 4
	// Google Places (אוטו‑קומפליט לכתובת) – אופציונלי עם מפתח
	const GOOGLE_PLACES_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY || '';
	// פירוק כתובת ל־3 שדות נפרדים
	const [city, setCity] = React.useState('');
	const [street, setStreet] = React.useState('');
	const [houseNumber, setHouseNumber] = React.useState('');
	// הצעות fallback (OSM) כאשר אין Google Places
	const [cityOptions, setCityOptions] = React.useState<string[]>([]);
	const [streetOptions, setStreetOptions] = React.useState<string[]>([]);
	// Refs לשדות אוטו‑קומפליט
	const cityInputRef = React.useRef<HTMLInputElement | null>(null);
	const streetInputRef = React.useRef<HTMLInputElement | null>(null);
	const placesLoadedRef = React.useRef(false);
	const autocompleteRef = React.useRef<any>(null);

	const ensureGooglePlaces = React.useCallback(async () => {
		if (!GOOGLE_PLACES_KEY) return;
		const w = window as any;
		if (w.google?.maps?.places) {
			placesLoadedRef.current = true;
			return;
		}
		if (document.querySelector('script[data-ascenso="places"]')) return;
		await new Promise<void>((resolve) => {
			const s = document.createElement('script');
			s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_KEY}&libraries=places&language=he&region=IL`;
			s.async = true;
			s.defer = true;
			s.setAttribute('data-ascenso', 'places');
			s.onload = () => {
				placesLoadedRef.current = true;
				resolve();
			};
			document.head.appendChild(s);
		});
	}, [GOOGLE_PLACES_KEY]);

	const initAddressAutocomplete = React.useCallback(() => {
		try {
			const w = window as any;
			if (!w.google?.maps?.places || !streetInputRef.current) return;
			autocompleteRef.current = new w.google.maps.places.Autocomplete(streetInputRef.current, {
				fields: ['address_components', 'formatted_address'],
				types: ['address'],
				componentRestrictions: { country: ['il'] },
			});
			autocompleteRef.current.addListener('place_changed', () => {
				const place = autocompleteRef.current.getPlace?.();
				if (!place) return;
				const comps = (place.address_components || []) as Array<any>;
				const comp = (type: string) => comps.find(c => c.types?.includes(type))?.long_name || '';
				const newCity = comp('locality') || comp('administrative_area_level_3') || comp('administrative_area_level_2') || '';
				const newStreet = comp('route') || '';
				const newNum = comp('street_number') || '';
				setCity(newCity);
				setStreet(newStreet || streetInputRef.current?.value || '');
				setHouseNumber(newNum);
			});
		} catch {}
	}, []);

	// Drag & Drop למסלול – בוטל לפי בקשה

	// גזירת מחרוזת כתובת מלאה לשדות ההודעה/מייל
	React.useEffect(() => {
		const parts = [street, houseNumber, city].filter(Boolean).join(' ');
		setProjectAddress(parts);
	}, [street, houseNumber, city]);

	// הצעות OSM לעיר בעת הקלדה (כאשר אין Google Places)
	React.useEffect(() => {
		let t: any;
		if (!city || GOOGLE_PLACES_KEY) {
			setCityOptions([]);
			return;
		}
		t = setTimeout(async () => {
			try {
				const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=il&accept-language=he&q=${encodeURIComponent(
					city
				)}`;
				const res = await fetch(url, { headers: { Accept: 'application/json' } });
				const data = await res.json();
				const opts: string[] = [];
				for (const d of data) {
					const a = d.address || {};
					const name = a.city || a.town || a.village;
					if (name && !opts.includes(name)) opts.push(name);
				}
				setCityOptions(opts.slice(0, 6));
			} catch {
				setCityOptions([]);
			}
		}, 250);
		return () => clearTimeout(t);
	}, [city, GOOGLE_PLACES_KEY]);

	// הצעות OSM לרחוב לפי עיר (כאשר אין Google Places)
	React.useEffect(() => {
		let t: any;
		if (!street || !city || GOOGLE_PLACES_KEY) {
			setStreetOptions([]);
			return;
		}
		t = setTimeout(async () => {
			try {
				const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&countrycodes=il&accept-language=he&city=${encodeURIComponent(
					city
				)}&street=${encodeURIComponent(street)}`;
				const res = await fetch(url, { headers: { Accept: 'application/json' } });
				const data = await res.json();
				const opts: string[] = [];
				for (const d of data) {
					const a = d.address || {};
					const s = a.road || a.pedestrian || a.path || a.cycleway || a.footway;
					if (s && !opts.includes(s)) opts.push(s);
				}
				setStreetOptions(opts.slice(0, 8));
			} catch {
				setStreetOptions([]);
			}
		}, 250);
		return () => clearTimeout(t);
	}, [street, city, GOOGLE_PLACES_KEY]);

	const openBooking = React.useCallback(() => {
		// reset form when opening
		setFullName('');
		setProjectAddress('');
		setPreferredDate('');
		setPreferredTime('');
		setBookingStep('name');
		setBookingSubmitted(false);
		setBookingOpen(true);
		// פוקוס לשדה הראשון לנגישות
		setTimeout(() => firstInputRef.current?.focus(), 0);
		// טען והפעל אוטו‑קומפליט לכתובת אם יש מפתח
		setTimeout(async () => {
			try {
				await ensureGooglePlaces();
				initAddressAutocomplete();
			} catch {}
		}, 0);
	}, []);

	// יוגדר מאוחר יותר כפונקציה רגילה (הצהרה מונעת TDZ)
	// מספר וואטסאפ יעד לשיחה ישירה
	const whatsappPhone = '+972539994995';
	// עוגן ל־Canvas לצילום תמונות
	const canvasWrapRef = React.useRef<HTMLDivElement | null>(null);
	// שליטה במצלמה/אורביט
	const orbitRef = React.useRef<any>(null);
	// עוגן לפאנל הקטגוריות (דסקטופ) כדי ליישר אליו את סרגל הסיכום הקבוע
	const asideRef = React.useRef<HTMLDivElement | null>(null);
	const assignAsideRef = React.useCallback((el: HTMLDivElement | null) => {
		asideRef.current = el;
		if (el) {
			const rect = el.getBoundingClientRect();
			setDesktopBarPos({ left: rect.left, width: rect.width });
		}
	}, []);
	// dumpCam הוסר לפי בקשה
	// מצב מסך מלא לקנבס + מאזין לשינוי
	const [isFullscreen, setIsFullscreen] = React.useState(false);
	React.useEffect(() => {
		const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
		document.addEventListener('fullscreenchange', onFsChange);
		return () => document.removeEventListener('fullscreenchange', onFsChange);
	}, []);
	// גובה קנבס במובייל (יחס 16/9) עבור פריסת fixed + ספייסר תואם
	const [mobileCanvasH, setMobileCanvasH] = React.useState<number>(0);
	const [mobileHeaderH, setMobileHeaderH] = React.useState<number>(0);
	const [mobileTabsH, setMobileTabsH] = React.useState<number>(0);
	const [isDesktopViewport, setIsDesktopViewport] = React.useState(true);
	const topTabsRef = React.useRef<HTMLDivElement | null>(null);
	// זיהוי מקלדת מובייל (visualViewport) כדי להתאים יישור מודאל/סרגל תחתון
	const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
	React.useLayoutEffect(() => {
		const update = () => {
			if (typeof window === 'undefined') return;
			const isMobile = window.innerWidth < 1024;
			setIsDesktopViewport(!isMobile);
			if (isMobile) {
				// מדידה מדויקת לפי רוחב האלמנט בפועל (מונע סטיות/חפיפה)
				const w = (() => {
					try {
						const el = canvasWrapRef.current;
						if (el) {
							const rect = el.getBoundingClientRect();
							if (rect && rect.width) return Math.round(rect.width);
						}
					} catch {}
					return window.innerWidth;
				})();
				// יחס 16/9 → גובה = רוחב * 9/16
				const h = Math.round((w * 9) / 16);
				setMobileCanvasH(h);
				// מדידת גובה כותרת ראשית (header) + סרגל טאבים עליון
				try {
					const hdr = document.querySelector('.ascenso-sticky-header') || document.querySelector('header');
					if (hdr) {
						const rect = (hdr as HTMLElement).getBoundingClientRect();
						setMobileHeaderH(Math.round(rect.height));
					}
					const tabsEl = document.getElementById('live-top-tabs');
					if (tabsEl) {
						const tr = tabsEl.getBoundingClientRect();
						setMobileTabsH(Math.round(tr.height));
					} else {
						setMobileTabsH(0);
					}
				} catch {}
			} else {
				// בדסקטופ – ביטול אילוצי מובייל
				setMobileCanvasH(0);
				setMobileHeaderH(0);
				setMobileTabsH(0);
			}
		};
		update();
		window.addEventListener('resize', update);
		window.addEventListener('orientationchange', update);
		// האזן ל-visualViewport כדי לזהות פתיחת מקלדת
		try {
			// @ts-ignore
			const vv: VisualViewport | undefined = window.visualViewport;
			if (vv) {
				const onVV = () => {
					const diff = Math.max(0, window.innerHeight - vv.height);
					setIsKeyboardOpen(diff > 140); // סף אמפירי לזיהוי מקלדת
				};
				vv.addEventListener('resize', onVV);
				vv.addEventListener('scroll', onVV);
				onVV();
				return () => {
					vv.removeEventListener('resize', onVV);
					vv.removeEventListener('scroll', onVV);
					window.removeEventListener('resize', update);
					window.removeEventListener('orientationchange', update);
				};
			}
		} catch {}
		return () => {
			window.removeEventListener('resize', update);
			window.removeEventListener('orientationchange', update);
		};
	}, []);
	const toggleFullscreen = React.useCallback(() => {
		const el = canvasWrapRef.current as any;
		if (!el) return;
		if (document.fullscreenElement) {
			document.exitFullscreen?.();
		} else {
			el.requestFullscreen?.();
		}
	}, []);
	// מיקום ורוחב לסרגל הסיכום הקבוע בדסקטופ (מיושר לפאנל הקטגוריות)
	const [desktopBarPos, setDesktopBarPos] = React.useState<{ left: number; width: number } | null>(null);
	React.useLayoutEffect(() => {
		const recalc = () => {
			const el = asideRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			setDesktopBarPos({ left: rect.left, width: rect.width });
		};
		recalc();
		window.addEventListener('resize', recalc);
		window.addEventListener('scroll', recalc, { passive: true });
		return () => {
			window.removeEventListener('resize', recalc);
			window.removeEventListener('scroll', recalc as any);
		};
	}, []);

	const qMaterial = (search.get('material') as 'wood' | 'metal' | 'stone') || 'stone';
	const qMaterialSafe = qMaterial === 'wood' ? 'stone' : qMaterial;
	const qColor = search.get('color') || 'oak';
	const qModel = search.get('model') || '';
	const qShape = (search.get('shape') as 'straight' | 'L' | 'U') || 'straight';
	const qSteps = parseInt(search.get('steps') || '', 10);
	const qTex = search.get('tex') || '';
	let qBox = (search.get('box') as 'thick' | 'thin' | 'rounded' | 'taper' | 'wedge' | 'ridge' | 'hitech' | 'accordion' | 'plates' | 'sawtooth' | 'chamfer') || 'thick';
	// תאימות לאחור: אם יש קישור ישן ל-plates / sawtooth / accordion / hitech – ניפול ל-"thick"
	if (qBox === 'plates' || qBox === 'sawtooth' || qBox === 'accordion' || qBox === 'hitech' || qBox === 'chamfer') { qBox = 'thick'; }
	const qPath = search.get('path') || '';

	const [records, setRecords] = React.useState<MaterialRecord[]>([]);
	const [priceList, setPriceList] = React.useState<PriceListData | null>(null);
	const [activeMaterial, setActiveMaterial] = React.useState<MaterialKind>(qMaterialSafe);
	const [activeColor, setActiveColor] = React.useState<string>(qColor);
	const [activeModelId, setActiveModelId] = React.useState<string | null>(qModel || null);
	const [activeTexId, setActiveTexId] = React.useState<string | null>(qTex || null); // למתכת/אבן (סנכרון תצוגה)
	// מזהים ייעודיים לכל קטגוריה כדי לשמר בחירה בין מעברים
	const [activeMetalTexId, setActiveMetalTexId] = React.useState<string | null>(activeMaterial === 'metal' ? (qTex || null) : null);
	const [activeStoneTexId, setActiveStoneTexId] = React.useState<string | null>(activeMaterial === 'stone' ? (qTex || null) : null);
	// לוחות חיפוי – בקרים הנדסיים
	const [panelThicknessMm, setPanelThicknessMm] = React.useState<16 | 25>(25);
	const [shadowGapMm, setShadowGapMm] = React.useState<3 | 5 | 10>(5);
	/** מידות לוח (מ'): רוחב×גובה – 2900×1450 = אנכי (גובה 2.9מ', רוחב 1.45מ') */
	const PANEL_SIZE_OPTIONS: Array<{ id: string; w: number; h: number; label: string }> = [
		{ id: '2900x1450', w: 1.45, h: 2.9, label: '2900×1450' },
		{ id: '2900x725', w: 0.725, h: 2.9, label: '2900×725' },
		{ id: '1450x1450', w: 1.45, h: 1.45, label: '1450×1450' },
		{ id: '1450x725', w: 0.725, h: 1.45, label: '1450×725' },
		{ id: '725x725', w: 0.725, h: 0.725, label: '725×725' },
	];
	const [panelSizeW, setPanelSizeW] = React.useState(1.45);
	const [panelSizeH, setPanelSizeH] = React.useState(2.9);
	const setPanelSize = (w: number, h: number) => {
		setPanelSizeW(w);
		setPanelSizeH(h);
	};
	/** גודל הקיר אומדן (מ') – הלקוח מזין רוחב×גובה קיר */
	const [wallWidthM, setWallWidthM] = React.useState(6);
	const [wallHeightM, setWallHeightM] = React.useState(3.5);
	const [box, setBox] = React.useState<'thick' | 'thin' | 'rounded' | 'taper' | 'wedge' | 'ridge'>(qBox as any);
	const [railing, setRailing] = React.useState<'none' | 'glass' | 'metal' | 'cable'>('none');
	const [glassTone, setGlassTone] = React.useState<'extra' | 'smoked' | 'bronze'>('extra');
	const [stepRailing, setStepRailing] = React.useState<boolean[]>([]);
	const [landingRailing, setLandingRailing] = React.useState<boolean[]>([]);
	const [stepRailingSide, setStepRailingSide] = React.useState<Array<'right' | 'left'>>([]);
	const [landingRailingSide, setLandingRailingSide] = React.useState<Array<'right' | 'left'>>([]);
	const [railingMetalId, setRailingMetalId] = React.useState<string | null>(null);
	const [railingMetalSolid, setRailingMetalSolid] = React.useState<string | null>(null); // hex לצבע אחיד (ללא טקסטורה)
	const [cableOptions, setCableOptions] = React.useState<Array<{ id: string; name: string; image: string; color?: string }>>([]);
	const [cableId, setCableId] = React.useState<string | null>(null);
	const [cableColor, setCableColor] = React.useState<string | null>(null);
	const [cableSpanMode, setCableSpanMode] = React.useState<'floor' | 'tread'>('tread');
	const [stepCableSpanMode, setStepCableSpanMode] = React.useState<Array<'floor' | 'tread'>>([]);
	const [landingCableSpanMode, setLandingCableSpanMode] = React.useState<Array<'floor' | 'tread'>>([]);
	// זיכרון בחירה אחרונה לכל קטגוריה כדי לשחזר בעת חזרה
	const lastWoodRef = React.useRef<{ modelId: string | null; color: string | null }>({ modelId: null, color: null });
	const lastTexRef = React.useRef<{ metal: string | null; stone: string | null }>({ metal: null, stone: null });
	// מאסטר: מצבים מחזוריים להפעלה/ביטול ולצד
	const [masterApply, setMasterApply] = React.useState<'none' | 'add' | 'remove'>('none');
	const [masterSide, setMasterSide] = React.useState<'none' | 'right' | 'left'>('none');
	// מובייל: אקורדיון קטגוריות בפאנל (לוחות חיפוי: חומר, טקסטורה, הגדרות לוח)
	const [mobileOpenCat, setMobileOpenCat] = React.useState<
		'material' | 'nonWoodTexture' | 'panel' | null
	>('material');
	// דסקטופ: אקורדיון קטגוריות – סגורות כברירת מחדל, נפתח בלחיצה
	const [desktopOpenCat, setDesktopOpenCat] = React.useState<
		'material' | 'nonWoodTexture' | 'panel' | null
	>(null);
	// עזרת מובייל: באנר פתיחה והסבר קצר
	const [mobileHelpDismissed, setMobileHelpDismissed] = React.useState(false);
	const [mobileHelpOpen, setMobileHelpOpen] = React.useState(true);
	React.useEffect(() => {
		try {
			const v = localStorage.getItem('ascenso:live:mobileHelpDismissed');
			if (v === '1') setMobileHelpDismissed(true);
		} catch {}
	}, []);
	const dismissMobileHelp = React.useCallback(() => {
		try { localStorage.setItem('ascenso:live:mobileHelpDismissed', '1'); } catch {}
		setMobileHelpDismissed(true);
	}, []);
	const getMobileHint = React.useCallback((
		cat: 'material' | 'nonWoodTexture' | 'panel'
	): string => {
		switch (cat) {
			case 'material': return 'בחרו חומר: אבן טבעית או מתכת.';
			case 'nonWoodTexture': return 'בחרו דגם/טקסטורה ללוח החיפוי.';
			case 'panel': return 'עובי לוח ומרווח ניתוק.';
			default: return '';
		}
	}, []);
	const getCatTitle = React.useCallback((
		cat: 'material' | 'nonWoodTexture' | 'panel'
	): string => {
		switch (cat) {
			case 'material': return 'חומר';
			case 'nonWoodTexture': return 'טקסטורה';
			case 'panel': return 'הגדרות לוח';
			default: return '';
		}
	}, []);
	type Cat = 'material' | 'nonWoodTexture' | 'panel';
	const stepOrderForSteps: Cat[] = ['material', 'nonWoodTexture', 'panel'];
	const getNextCatForSteps = (cat: Cat): Cat | null => {
		const i = stepOrderForSteps.indexOf(cat);
		return i >= 0 && i < stepOrderForSteps.length - 1 ? stepOrderForSteps[i + 1] : null;
	};

	// ערכים מהקוד – מציינים מעבר/שינוי עובי (מה שהופך לגובה אחר)
	const boxDisplayInfo: Record<string, { name: string; specs: string }> = {
		thick: { name: 'קלאסי', specs: 'עובי אחיד 11 ס״מ' },
		thin: { name: 'להב', specs: 'עובי אחיד 7 ס״מ' },
		rounded: { name: 'קפסולה', specs: 'עובי 8 ס״מ · פינות רדיוס 4 ס״מ' },
		taper: { name: 'דלתא', specs: 'קצה 5 ס״מ הופך ל־12 ס״מ' },
		wedge: { name: 'טריז', specs: 'חזית 11 ס״מ הופך לעובי 3.5 ס״מ' },
		ridge: { name: 'מרום', specs: 'בסיס 2 ס״מ · רכס עולה ל־11 ס״מ' },
	};

	// קונפיגורטור מדרגות
	const [shape, setShape] = React.useState<'straight' | 'L' | 'U'>(qShape);
	const [steps, setSteps] = React.useState<number>(Number.isFinite(qSteps) ? Math.min(25, Math.max(5, qSteps)) : 15);

	// (שחזור מצב מובייל יתווסף אחרי יצירת pathSegments)
	const [pathSegments, setPathSegments] = React.useState<PathSegment[]>(() => {
		const fromUrl = decodePath(qPath);
		if (fromUrl) return fromUrl;
		// ברירת מחדל: ישר עם מספר מדרגות מהשדה הישן
		return [{ kind: 'straight', steps }];
	});
	const [pathFlipped180, setPathFlipped180] = React.useState(false);
	// כשמהפכים מסלול ל־180° – מסובבים את המצלמה באותו כיוון (180° סביב Y)
	React.useEffect(() => {
		const id = requestAnimationFrame(() => {
			const ctrl = orbitRef.current;
			if (!ctrl) return;
			const a = typeof ctrl.getAzimuthalAngle === 'function' ? ctrl.getAzimuthalAngle() : (ctrl as any).azimuthalAngle ?? 0;
			const next = a + Math.PI;
			if (typeof (ctrl as any).setAzimuthalAngle === 'function') (ctrl as any).setAzimuthalAngle(next);
			else (ctrl as any).azimuthalAngle = next;
			if (typeof ctrl.update === 'function') ctrl.update();
		});
		return () => cancelAnimationFrame(id);
	}, [pathFlipped180]);
	// הוסר: מנגנון "שחזור מצב" למובייל כולל סטייט, שמירה, ושחזורים

	// עדכון ברירת מחדל של מצב מעקה לכל מדרגה לפי המסלול והבחירה הגלובלית
	const stepsTotalForPath = React.useMemo(() => {
		if (pathSegments && pathSegments.length) {
			return pathSegments.reduce((s, seg) => s + (seg.kind === 'straight' ? seg.steps : 0), 0);
		}
		return steps;
	}, [pathSegments, steps]);

	// חישוב צד "פנימי" כברירת מחדל לכל מדרגה ולכל פודסט ישר, בהתאם לכיוון הפניות במסלול
	const computeInnerDefaultSides = React.useCallback(() => {
		const stepSides: Array<'right' | 'left'> = [];
		const landingSides: Array<'right' | 'left'> = [];
		if (!pathSegments || !pathSegments.length) return { stepSides, landingSides };

		const flip = (s: 'right' | 'left'): 'right' | 'left' => (s === 'right' ? 'left' : 'right');

		// 'inner' מציין את הצד הפנימי הרציף לכל מקטעי הישר עד לפנייה הבאה
		let initialized = false;
		let inner: 'right' | 'left' = 'right';

		for (let i = 0; i < pathSegments.length; i++) {
			const seg = pathSegments[i];

			// אתחול חד-פעמי: קבע את הצד הפנימי ההתחלתי לפי הפנייה הקרובה הראשונה (אם קיימת)
			if (!initialized) {
				for (let j = i; j < pathSegments.length; j++) {
					const nxt = pathSegments[j];
					if (nxt.kind === 'landing' && typeof nxt.turn !== 'undefined') {
						inner = nxt.turn === 'right' ? 'right' : 'left';
						break;
					}
				}
				initialized = true;
			}

			if (seg.kind === 'straight') {
				for (let s = 0; s < seg.steps; s++) stepSides.push(inner);
			} else {
				// פודסט ללא פנייה: שמור את הצד הנוכחי; עם פנייה: הצד של הפודסט הוא הפנייה
				landingSides.push(typeof seg.turn === 'undefined' ? inner : (seg.turn === 'right' ? 'right' : 'left'));
				// לאחר פודסט עם פנייה – הפוך צד פנימי לגרם הבא
				if (typeof seg.turn !== 'undefined') {
					inner = flip(inner);
				}
			}
		}
		return { stepSides, landingSides };
	}, [pathSegments]);

	// צד מעקה מתוקן לגרמים 1 ו-3 בלבד – המודל 3D מפרש right/left בהפוך שם, אז מעבירים הפוך רק למעקה (לא לקירות)
	const stepRailingSideForRailing = React.useMemo(() => {
		const out = stepRailingSide.slice(0, stepsTotalForPath);
		if (!pathSegments?.length) return out;
		let stepIdx = 0;
		let flightIdx = 0;
		const flip = (s: 'right' | 'left'): 'right' | 'left' => (s === 'right' ? 'left' : 'right');
		for (let i = 0; i < pathSegments.length; i++) {
			const seg = pathSegments[i];
			if (seg.kind === 'straight') {
				const n = Math.max(0, (seg as any).steps ?? 0);
				for (let s = 0; s < n; s++) {
					if (stepIdx < out.length && (flightIdx === 0 || flightIdx === 2)) {
						out[stepIdx] = flip(out[stepIdx] ?? 'right');
					}
					stepIdx++;
				}
				flightIdx++;
			}
		}
		return out;
	}, [stepRailingSide, stepsTotalForPath, pathSegments]);

	// צד נוכחי גלובלי (רוב) למעקה – מציג מה הצד הדומיננטי כדי לאפשר החלפה מהירה במובייל
	const globalRailingSide = React.useMemo<'right' | 'left'>(() => {
		let right = 0, left = 0;
		for (let i = 0; i < stepRailingSide.length; i++) {
			const has = (stepRailing[i] ?? (railing !== 'none')) === true;
			if (!has) continue;
			if (stepRailingSide[i] === 'left') left++; else right++;
		}
		return right >= left ? 'right' : 'left';
	}, [stepRailingSide, stepRailing, railing]);

	// מטא עבור פודסטים (פנייה/ללא)
	const landingMeta = React.useMemo(() => {
		const turns: Array<'left' | 'right' | undefined> = [];
		if (pathSegments && pathSegments.length) {
			pathSegments.forEach(seg => {
				if (seg.kind === 'landing') turns.push(seg.turn);
			});
		}
		return turns;
	}, [pathSegments]);
	React.useEffect(() => {
		// התאמת מערכי המעקה לאורך המסלול החדש ושמירת מידע קיים.
		// מדרגות חדשות יקבלו צד ברירת מחדל "פנימי" לפי המסלול.
		const nextLen = stepsTotalForPath;
		const { stepSides } = computeInnerDefaultSides();

		setStepRailing(prev => {
			if (railing === 'none') {
				return new Array<boolean>(nextLen).fill(false);
			}
			const out = new Array<boolean>(nextLen);
			for (let i = 0; i < nextLen; i++) out[i] = prev[i] ?? true;
			return out;
		});

		// צד המעקה תמיד בצד הפנימי של המדרגות
		setStepRailingSide(() => {
			const out = new Array<'right' | 'left'>(nextLen);
			for (let i = 0; i < nextLen; i++) out[i] = stepSides[i] ?? 'right';
			return out;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stepsTotalForPath, railing, computeInnerDefaultSides]);
	React.useEffect(() => {
		// לכל פודסט: עם פנייה = בלי מעקה; בלי פנייה = לפי ברירת המחדל הגלובלית
		const out = landingMeta.map(turn => (turn ? false : railing !== 'none'));
		setLandingRailing(out);
		const { landingSides } = computeInnerDefaultSides();
		// צד המעקה בפודסטים: תמיד פנימי
		setLandingRailingSide(() => {
			const outSides = new Array<'right' | 'left'>(landingMeta.length);
			for (let i = 0; i < outSides.length; i++) outSides[i] = landingSides[i] ?? 'right';
			return outSides;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [landingMeta, railing, computeInnerDefaultSides]);

	// זכוכית/מתכת/כבלים: מעקה תמיד "עם" – אין אופציה "ללא", רק בכבלים יש בחירה תקרה‑רצפה / תקרה‑מדרגה
	React.useEffect(() => {
		if (railing === 'none') return;
		setStepRailing(prev => {
			const out = prev.slice(0, stepsTotalForPath);
			for (let i = 0; i < stepsTotalForPath; i++) out[i] = true;
			return out;
		});
		setLandingRailing(landingMeta.map(turn => (turn ? false : true)));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [railing, stepsTotalForPath, landingMeta]);
	// סנכרון מערכי מצב כבל פר‑מדרגה/פודסט לפי אורך המסלול
	React.useEffect(() => {
		setStepCableSpanMode(prev => {
			const out = new Array<'floor' | 'tread'>(stepsTotalForPath);
			for (let i = 0; i < out.length; i++) out[i] = prev[i] ?? cableSpanMode;
			return out;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stepsTotalForPath]);
	React.useEffect(() => {
		setLandingCableSpanMode(prev => {
			const out = new Array<'floor' | 'tread'>(landingMeta.length);
			for (let i = 0; i < out.length; i++) out[i] = prev[i] ?? cableSpanMode;
			return out;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [landingMeta.length]);
	// מאסטר כבל: שינוי גלובלי מחליף את כולם
	React.useEffect(() => {
		setStepCableSpanMode(new Array<'floor' | 'tread'>(stepsTotalForPath).fill(cableSpanMode));
		setLandingCableSpanMode(new Array<'floor' | 'tread'>(landingMeta.length).fill(cableSpanMode));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cableSpanMode]);
	// החלת מצבי מאסטר בעת שינוי
	React.useEffect(() => {
		if (masterApply === 'none') return;
		if (masterApply === 'add') {
			setStepRailing(new Array<boolean>(stepsTotalForPath).fill(true));
			setLandingRailing(landingMeta.map(turn => (turn ? false : true)));
		} else if (masterApply === 'remove') {
			setStepRailing(new Array<boolean>(stepsTotalForPath).fill(false));
			setLandingRailing(landingMeta.map(() => false));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [masterApply, stepsTotalForPath, landingMeta]);
	React.useEffect(() => {
		if (masterSide === 'none') return;
		setStepRailingSide(new Array<'right' | 'left'>(stepsTotalForPath).fill(masterSide));
		setLandingRailingSide(new Array<'right' | 'left'>(landingMeta.length).fill(masterSide));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [masterSide, stepsTotalForPath, landingMeta]);

	// -------------------- שמירת/טעינת הדמייה מקומית --------------------
	type SavedSimulation = {
		id: string;
		name: string;
		createdAt: number;
		state: any;
	};

	function buildSimulationState() {
		return {
			box,
			activeMaterial,
			activeModelId,
			activeTexId,
			activeColor,
			shape,
			steps,
			pathSegments,
			railing,
			glassTone,
			stepRailing,
			landingRailing,
			stepRailingSide,
			landingRailingSide,
			railingMetalId,
			railingMetalSolid,
			cableId,
			cableColor,
			cableSpanMode,
			stepCableSpanMode,
			landingCableSpanMode,
		};
	}

	// טעינת הדמייה לפי פרמטר sim
	React.useEffect(() => {
		const simId = search.get('sim');
		if (!simId) return;
		try {
			const key = 'ascenso:sims';
			const arr: SavedSimulation[] = JSON.parse(localStorage.getItem(key) || '[]');
			const found = arr.find(s => s.id === simId);
			if (!found) return;
			const s = found.state || {};
			if (s.box) setBox(s.box);
			if (s.activeMaterial) setActiveMaterial(s.activeMaterial);
			if (s.activeModelId) setActiveModelId(s.activeModelId);
			if (s.activeTexId) setActiveTexId(s.activeTexId);
			if (s.activeColor) setActiveColor(s.activeColor);
			if (s.shape) setShape(s.shape);
			if (Array.isArray(s.pathSegments)) {
				setPathSegments(s.pathSegments);
				setPathFlipped180(false);
			}
			if (typeof s.steps === 'number') setSteps(s.steps);
			if (s.railing) setRailing(s.railing);
			if (s.glassTone) setGlassTone(s.glassTone);
			if (Array.isArray(s.stepRailing)) setStepRailing(s.stepRailing);
			if (Array.isArray(s.landingRailing)) setLandingRailing(s.landingRailing);
			if (Array.isArray(s.stepRailingSide)) setStepRailingSide(s.stepRailingSide);
			if (Array.isArray(s.landingRailingSide)) setLandingRailingSide(s.landingRailingSide);
			if (s.railingMetalId) setRailingMetalId(s.railingMetalId);
			if (s.railingMetalSolid) setRailingMetalSolid(s.railingMetalSolid);
			if (s.cableId) setCableId(s.cableId);
			if (s.cableColor) setCableColor(s.cableColor);
			if (s.cableSpanMode) setCableSpanMode(s.cableSpanMode);
			if (Array.isArray(s.stepCableSpanMode)) setStepCableSpanMode(s.stepCableSpanMode);
			if (Array.isArray(s.landingCableSpanMode)) setLandingCableSpanMode(s.landingCableSpanMode);
		} catch {}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	React.useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const res = await fetch(`/data/materials.json?ts=${Date.now()}`, { cache: 'no-store' });
				const json: MaterialRecord[] = await res.json();
				if (!cancelled) setRecords(json);

				// טען גם אפשרויות כבלי נירוסטה (תמונות לסוויצ'ים)
				try {
					const cRes = await fetch(`/data/cables.json?ts=${Date.now()}`, { cache: 'no-store' });
					const cJson: Array<{ id: string; name: string; image: string; color?: string }> = await cRes.json();
					if (!cancelled) setCableOptions(Array.isArray(cJson) ? cJson : []);
				} catch {
					if (!cancelled) setCableOptions([]);
				}

				// טען מחירון – מקור יחיד למחירים (ללא עדכון קוד)
				try {
					const pRes = await fetch(`/data/price-list.json?ts=${Date.now()}`, { cache: 'no-store' });
					const pJson: PriceListData = await pRes.json();
					if (!cancelled) setPriceList(pJson);
				} catch {
					if (!cancelled) setPriceList(null);
				}
			} catch {
				if (!cancelled) setRecords([]);
				if (!cancelled) setCableOptions([]);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// הוסר: הוגדר למעלה לפני generateAndDownloadPdf כדי למנוע TDZ

	// (הוסר) יצירת PDF/תמונות – לפי בקשתך נשאר רק טקסט הודעה ל‑WhatsApp

	// בחר רשומת דגם פעילה לפי model או לפי קטגוריה (ברירת מחדל: הראשון)
	const woodModels = React.useMemo(
		() =>
			records.filter(r => {
				if (r.category !== 'wood') return false;
				const img = typeof r.images?.[0] === 'string' ? r.images[0] : '';
				// תמיכה גם בנתיבים החדשים תחת public וגם בנתיב הקודם
				return img.startsWith('/images/materials/wood') || img.startsWith('/assets/materials_src/wood');
			}),
		[records]
	);
	const nonWoodModels = React.useMemo(() => {
		return records.filter((r) => {
			// מאותה קטגוריה ולא עץ
			if (r.category !== activeMaterial || activeMaterial === 'wood') return false;
			// הסתר פריטים מסומנים כנסתרים
			if ((r as any).hidden) return false;
			// למתכת – דרוש שתהיה תמונה (כולל White/Black עם קבצים)
			if (activeMaterial === 'metal') {
				return Array.isArray((r as any).images) && (r as any).images.length > 0;
			}
			return true; // אבן
		});
	}, [records, activeMaterial]);
	const pricePerStepByTexId = React.useMemo(() => {
		const map = new Map<string, number>();
		priceList?.stairs?.textures?.forEach(t => {
			if (t.id != null && typeof t.pricePerStep === 'number' && t.pricePerStep > 0) {
				map.set(t.id, t.pricePerStep);
			}
		});
		return map;
	}, [priceList]);
	const modelMultiplierByBox = React.useMemo(() => {
		const map = new Map<string, number>();
		priceList?.stairs?.models?.forEach(m => {
			if (m.id != null && typeof m.priceMultiplier === 'number' && m.priceMultiplier > 0) {
				map.set(m.id, m.priceMultiplier);
			}
		});
		return map;
	}, [priceList]);
	// אם הטקסטורה הפעילה לא קיימת לאחר הסינון (למשל metal_solid_white/black), בחר את הראשונה הזמינה
	React.useEffect(() => {
		if (activeMaterial === 'wood') return;
		if (!nonWoodModels.length) return;
		if (!nonWoodModels.some(m => m.id === activeTexId)) {
			setActiveTexId(nonWoodModels[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeMaterial, nonWoodModels]);
	const metalRailingOptions = React.useMemo(() => {
		const isWB = (rec: any) => {
			const name = (rec?.name || rec?.id || '').toString().toLowerCase();
			const byIdOrName = /\b(white|black)\b/.test(name);
			const bySolid =
				typeof rec?.solid === 'string' &&
				['#ffffff', '#fff', '#f5f5f5', '#111111', '#000', '#000000'].includes(rec.solid.toLowerCase());
			return byIdOrName || bySolid;
		};
		return records.filter(
			(r) =>
				r.category === 'metal' &&
				!(r as any).hidden &&
				!isWB(r) &&
				Array.isArray((r as any).images) &&
				(r as any).images.length > 0
		);
	}, [records]);
	// Preload טקסטורות רלוונטיות להפחתת הבהובים בעת מעבר בחירה
	React.useEffect(() => {
		try {
			const urls = new Set<string>();
			// חומר עיקרי
			if (activeMaterial === 'wood') {
				const selWood = woodModels.find(m => m.id === activeModelId) || woodModels[0];
				const img = selWood?.variants?.[activeColor]?.[0] || selWood?.images?.[0];
				if (img) urls.add(img);
				const b = selWood?.pbrVariants?.[activeColor]?.bump?.[0];
				const r = selWood?.pbrVariants?.[activeColor]?.roughness?.[0];
				if (b) urls.add(b);
				if (r) urls.add(r);
			} else {
				const sel = nonWoodModels.find(m => m.id === activeTexId) || nonWoodModels[0];
				if (sel?.images?.[0]) urls.add(sel.images[0]);
				if (sel?.pbr?.bump?.[0]) urls.add(sel.pbr.bump[0]);
				if (sel?.pbr?.roughness?.[0]) urls.add(sel.pbr.roughness[0]);
			}
			// מעקה מתכת – נטען משאבים רק אם נבחרה טקסטורה (לא צבע אחיד)
			if (railing === 'metal' && railingMetalId) {
				const rec = metalRailingOptions.find(r => r.id === railingMetalId);
				if (rec?.images?.[0]) urls.add(rec.images[0]);
				if (rec?.pbr?.bump?.[0]) urls.add(rec.pbr.bump[0]);
				if (rec?.pbr?.roughness?.[0]) urls.add(rec.pbr.roughness[0]);
			}
			// הפעלה
			(urls.size ? Array.from(urls) : []).forEach(u => {
				try {
					// @ts-ignore - preload is static on useTexture
					useTexture.preload(u);
				} catch {}
			});
		} catch {}
	}, [activeMaterial, activeModelId, woodModels, activeColor, nonWoodModels, activeTexId, railing, metalRailingOptions, railingMetalId]);
	React.useEffect(() => {
		// ברירת מחדל: אם בחרו "מעקה מתכת" ואין בחירה, נקבע שחור אחיד
		if (railing === 'metal' && !railingMetalId && !railingMetalSolid) {
			setRailingMetalSolid('#111111');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [railing]);
	// הבטחת בחירה חד-חד-ערכית: אם נבחר צבע אחיד, נבטל טקסטורה ולהפך
	React.useEffect(() => {
		if (railing !== 'metal') return;
		if (railingMetalSolid && railingMetalId) {
			setRailingMetalId(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [railingMetalSolid]);
	React.useEffect(() => {
		if (railing !== 'metal') return;
		if (railingMetalId && railingMetalSolid) {
			setRailingMetalSolid(null);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [railingMetalId]);

	// שמירת הבחירה האחרונה עבור עץ/צבע
	React.useEffect(() => {
		if (activeMaterial === 'wood') {
			if (activeModelId) lastWoodRef.current.modelId = activeModelId;
			if (activeColor) lastWoodRef.current.color = activeColor;
		}
	}, [activeMaterial, activeModelId, activeColor]);
	// שמירת הבחירה האחרונה עבור מתכת/אבן
	React.useEffect(() => {
		if (activeMaterial === 'metal') lastTexRef.current.metal = activeTexId ?? lastTexRef.current.metal;
		if (activeMaterial === 'stone') lastTexRef.current.stone = activeTexId ?? lastTexRef.current.stone;
	}, [activeMaterial, activeTexId]);

	// שחזור בחירת עץ בעת מעבר חזרה לעץ (שומר את הבחירה הקודמת אם קיימת)
	React.useEffect(() => {
		if (activeMaterial !== 'wood') return;
		const desiredModel = (lastWoodRef.current.modelId && woodModels.find(m => m.id === lastWoodRef.current.modelId))
			? lastWoodRef.current.modelId
			: (activeModelId && woodModels.find(m => m.id === activeModelId) ? activeModelId : (woodModels[0]?.id ?? null));
		if (!desiredModel) return;
		if (activeModelId !== desiredModel) setActiveModelId(desiredModel);
		// ודא שהצבע תקף לדגם, אחרת בחר צבע ראשון זמין
		const modelObj = woodModels.find(m => m.id === desiredModel);
		if (modelObj) {
			const colorValid = !!modelObj.variants?.[activeColor];
			let nextColor = activeColor;
			if (!colorValid) {
				const saved = lastWoodRef.current.color;
				if (saved && modelObj.variants?.[saved]) nextColor = saved;
				else nextColor = Object.keys(modelObj.variants ?? {})[0] ?? activeColor;
			}
			if (nextColor && nextColor !== activeColor) setActiveColor(nextColor);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeMaterial, woodModels]);

	// ברירת מחדל ובחירה דביקה למתכת/אבן – מזהה לכל קטגוריה ושיקוף ל-activeTexId לתצוגה
	React.useEffect(() => {
		if (activeMaterial === 'metal') {
			// ודא שיש בחירה דביקה למתכת
			let next = activeMetalTexId;
			if (!next || !nonWoodModels.find(m => m.id === next)) {
				next = nonWoodModels[0]?.id ?? null;
				if (next !== activeMetalTexId) setActiveMetalTexId(next);
			}
			if (next !== activeTexId) setActiveTexId(next);
		} else if (activeMaterial === 'stone') {
			let next = activeStoneTexId;
			if (!next || !nonWoodModels.find(m => m.id === next)) {
				next = nonWoodModels[0]?.id ?? null;
				if (next !== activeStoneTexId) setActiveStoneTexId(next);
			}
			if (next !== activeTexId) setActiveTexId(next);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeMaterial, nonWoodModels]);

	// ברירת מחדל לבחירת כבל כשנכנסים למצב "כבלי נירוסטה"
	React.useEffect(() => {
		if (railing !== 'cable') return;
		if (cableId && cableOptions.find(c => c.id === cableId)) return;
		if (cableOptions.length) setCableId(cableOptions[0].id);
	}, [railing, cableOptions, cableId]);

	// חילוץ צבע דומיננטי מהתמונה שנבחרה (או שימוש בשדה color אם קיים בקובץ)
	React.useEffect(() => {
		if (railing !== 'cable') return;
		const selected = cableOptions.find(c => c.id === cableId);
		if (!selected) return;
		// אם בקובץ מוגדר color – נעדיף אותו
		if ((selected as any).color) {
			setCableColor((selected as any).color as string);
			return;
		}
		let cancelled = false;
		const url = selected.image ? encodeURI(selected.image) : '';
		if (!url) return;
		(async () => {
			try {
				const color = await (async function extractAverageColor(imgUrl: string): Promise<string> {
					return new Promise((resolve, reject) => {
						const img = new window.Image();
						img.onload = () => {
							try {
								const canvas = document.createElement('canvas');
								const ctx = canvas.getContext('2d');
								if (!ctx) return resolve('#c7ccd1');
								// קנבס קטן לחישוב ממוצע מהיר
								const w = 16, h = 16;
								canvas.width = w;
								canvas.height = h;
								ctx.drawImage(img, 0, 0, w, h);
								const data = ctx.getImageData(0, 0, w, h).data;
								let r = 0, g = 0, b = 0, count = 0;
								for (let i = 0; i < data.length; i += 4) {
									const alpha = data[i + 3];
									if (alpha < 200) continue; // התעלמות מפיקסלים שקופים/לבנים מדי
									r += data[i];
									g += data[i + 1];
									b += data[i + 2];
									count++;
								}
								if (count === 0) return resolve('#c7ccd1');
								r = Math.round(r / count);
								g = Math.round(g / count);
								b = Math.round(b / count);
								// המרה להקס
								const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
								resolve(hex);
							} catch {
								resolve('#c7ccd1');
							}
						};
						img.onerror = () => resolve('#c7ccd1');
						img.src = url;
					});
				})(url);
				if (!cancelled) setCableColor(color);
			} catch {
				if (!cancelled) setCableColor('#c7ccd1');
			}
		})();
		return () => { cancelled = true; };
	}, [railing, cableId, cableOptions]);

	const activeModel =
		activeMaterial === 'wood' ? woodModels.find(m => m.id === activeModelId) || woodModels[0] : undefined;

	// סנכרון URL לשיתוף
	React.useEffect(() => {
		let t: any;
		const run = () => {
			const params = new URLSearchParams();
			params.set('material', activeMaterial);
			if (activeMaterial === 'wood') {
				if (activeModel?.id) params.set('model', activeModel.id);
				if (activeColor) params.set('color', activeColor);
			} else {
				if (activeTexId) params.set('tex', activeTexId);
			}
			params.set('shape', shape);
			params.set('steps', String(steps));
			params.set('path', encodePath(pathSegments));
			params.set('box', box);
			// עדכון ה‑URL ללא ניווט/ריענון (מונע קפיצת מסך)
			if (typeof window !== 'undefined') {
				const newUrl = `/live?${params.toString()}`;
				window.history.replaceState(window.history.state, '', newUrl);
			} else {
				// Fallback בסביבה ללא window
				router.replace(`/live?${params.toString()}`);
			}
		};
		// debounce קצר כדי למנוע שרשור עדכונים מהיר
		t = setTimeout(run, 120);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeMaterial, activeColor, activeModel?.id, activeTexId, shape, steps, box, pathSegments]);

	// מחשבון מחיר – כל המחירים נטענים מ־/data/price-list.json (מקור יחיד)
	function calculatePrice(): {
		breakdown: Array<{
			label: string;
			value: number;
			qty?: number;
			unitPrice?: number;
			unitLabel?: string;
		}>;
		total: number;
	} {
		const baseSetup: number = Number(priceList?.stairs?.pricing?.baseSetup) || 1500;
		const landingMultiplier: number = Number(priceList?.stairs?.pricing?.landingMultiplier) || 2.5;
		const texId = activeMaterial === 'wood' ? (activeModel?.id ?? null) : activeTexId;
		const basePerStep: number = (texId ? pricePerStepByTexId.get(texId) : undefined) ?? 600;
		const boxMultiplier: number = modelMultiplierByBox.get(box) ?? 1;
		const perStep: number = Math.round(basePerStep * boxMultiplier);
		const landingPrice = perStep * landingMultiplier;
		// חישוב מתוך המסלול
		const stepsTotal = pathSegments.reduce((s, seg) => s + (seg.kind === 'straight' ? seg.steps : 0), 0);
		const landingCount = pathSegments.reduce((s, seg) => s + (seg.kind === 'landing' ? 1 : 0), 0);
		const shapeMultiplier = landingCount === 0 ? 1.0 : landingCount === 1 ? 1.1 : 1.15;

		const items: Array<{
			label: string;
			value: number;
			qty?: number;
			unitPrice?: number;
			unitLabel?: string;
		}> = [
			{ label: 'פתיחת פרויקט', value: baseSetup },
			{ label: 'מדרגות', value: stepsTotal * perStep, qty: stepsTotal, unitPrice: perStep, unitLabel: 'יח׳' },
			{ label: 'פודסטים', value: landingCount * landingPrice, qty: landingCount, unitPrice: landingPrice, unitLabel: 'יח׳' },
		];

		// תמחור מעקה
		// אומדני אורך/שטח: עומק מדרגה 0.30 מ׳; פודסט 0.90 מ׳; גובה זכוכית משוער ~1.1–1.2 מ׳
		const STEP_RUN_M = 0.30;
		const LANDING_RUN_M = 0.90;
		const GLASS_H_STEP_M = 1.18;
		const GLASS_H_LAND_M = 1.09;

		const stepsEnabledCount = (stepRailing?.length ? stepRailing.filter(Boolean).length : 0);
		const landingsEnabledCount = (landingRailing?.length ? landingRailing.filter(Boolean).length : 0);

		if (railing === 'glass') {
			const areaM2 =
				stepsEnabledCount * (STEP_RUN_M * GLASS_H_STEP_M) +
				landingsEnabledCount * (LANDING_RUN_M * GLASS_H_LAND_M);
			let glassRate: number = Number(priceList?.railings?.glass?.unitPrice) || 1530;
			const toneMult = priceList?.railings?.glass?.toneMultiplier;
			const toneIds = priceList?.railings?.glass?.toneMultiplierIds;
			if (toneMult != null && toneIds?.length && (glassTone === 'smoked' || glassTone === 'bronze')) {
				glassRate = Math.round(glassRate * toneMult);
			}
			const cost = Math.round(areaM2 * glassRate);
			if (cost > 0) items.push({ label: 'מעקה זכוכית', value: cost, qty: areaM2, unitPrice: glassRate, unitLabel: 'מ״ר' });
		} else if (railing === 'metal') {
			// תמחור לפי מטר רץ; מחיר למטר = מחיר המדרגה הנוכחי
			const totalMeters =
				stepsEnabledCount * STEP_RUN_M +
				landingsEnabledCount * LANDING_RUN_M;
			const ratePerMeter = perStep; // לפי דרישתך
			const cost = Math.round(totalMeters * ratePerMeter);
			if (cost > 0) items.push({ label: 'מעקה מתכת', value: cost, qty: totalMeters, unitPrice: ratePerMeter, unitLabel: 'מ׳' });
		} else if (railing === 'cable') {
			// כבלים: נירוסטה טבעי (cable_01) = unitPrice; ציפוי = unitPriceCoated
			const baseCable: number = Number(priceList?.railings?.cables?.unitPrice) || 825;
			const coatedCable: number = Number(priceList?.railings?.cables?.unitPriceCoated) || 1175;
			const naturalId: string = priceList?.railings?.cables?.naturalCableId ?? 'cable_01';
			const cableUnitPrice: number = (cableId && cableId !== naturalId) ? coatedCable : baseCable;
			const cablesCount = stepsEnabledCount * 3 + landingsEnabledCount * 9;
			const cost = cablesCount * cableUnitPrice;
			if (cost > 0) items.push({ label: 'מערכת כבלי נירוסטה', value: cost, qty: cablesCount, unitPrice: cableUnitPrice, unitLabel: 'כבל' });
		}

		const subtotal = items.reduce((s, i) => s + i.value, 0);
		// החלת מקדם צורה (פודסטים/מורכבות)
		const preVatTotal = Math.round(subtotal * shapeMultiplier);
		// מע״מ בישראל 18% (המחירים המוצגים הם לפני מע״מ)
		const VAT_RATE = 0.18;
		const vat = Math.round(preVatTotal * VAT_RATE);
		if (vat > 0) {
			items.push({ label: `מע״מ (18%)`, value: vat });
		}
		const total = preVatTotal + vat;
		return { breakdown: items, total };
	}

	// מפרט לוח חיפוי – שטח פנים, גודל קיר, חלוקה לפלטות (שורה/עמודה אחרונה חתוכה להתאמה לקיר)
	const gapM = shadowGapMm / 1000;
	const panelSurfaceM2 = Math.round(panelSizeW * panelSizeH * 100) / 100;
	const wallSurfaceM2 = Math.round(wallWidthM * wallHeightM * 100) / 100;
	const panelsAlongWidth = Math.max(1, Math.ceil(wallWidthM / panelSizeW));
	const panelsAlongHeight = Math.max(1, Math.ceil(wallHeightM / panelSizeH));
	const lastColWidth = Math.max(0.01, Math.min(panelSizeW, wallWidthM - (panelsAlongWidth - 1) * (panelSizeW + gapM)));
	const lastRowHeight = Math.max(0.01, Math.min(panelSizeH, wallHeightM - (panelsAlongHeight - 1) * (panelSizeH + gapM)));
	const panelsTotal = panelsAlongWidth * panelsAlongHeight;
	const panelSpecStoneName = (nonWoodModels.find(m => m.id === activeTexId) || nonWoodModels[0])?.name || '—';
	const panelSizeLabel = PANEL_SIZE_OPTIONS.find(o => o.w === panelSizeW && o.h === panelSizeH)?.label || `${panelSizeW * 1000}×${panelSizeH * 1000}`;
	const hasCutPanels = lastColWidth < panelSizeW - 0.001 || lastRowHeight < panelSizeH - 0.001;
	/** נסטינג אופטימלי: מידת לוח שנותנת מינימום מ"ר להזמנה (המחיר לפי מ"ר) – ממיזער פחת */
	const bestPanelForWall = React.useMemo(() => {
		let best: { opt: typeof PANEL_SIZE_OPTIONS[0]; total: number; nw: number; nh: number; orderM2: number } = { opt: PANEL_SIZE_OPTIONS[0], total: 1e9, nw: 0, nh: 0, orderM2: 1e9 };
		const g = shadowGapMm / 1000;
		for (const opt of PANEL_SIZE_OPTIONS) {
			const nw = Math.max(1, Math.ceil(wallWidthM / opt.w));
			const nh = Math.max(1, Math.ceil(wallHeightM / opt.h));
			const total = nw * nh;
			const orderM2 = total * (opt.w * opt.h);
			if (orderM2 < best.orderM2) best = { opt, total, nw, nh, orderM2 };
		}
		return best;
	}, [wallWidthM, wallHeightM, shadowGapMm]);
	const isOptimalSize = panelSizeW === bestPanelForWall.opt.w && panelSizeH === bestPanelForWall.opt.h;
	const panelsSaved = isOptimalSize ? 0 : panelsTotal - bestPanelForWall.total;
	/** שטח הזמנה (מ"ר) = מספר פלטות × שטח לוח – המחיר לפי מ"ר, אז חיסכון אמיתי = פחות מ"ר להזמנה */
	const currentOrderM2 = panelsTotal * (panelSizeW * panelSizeH);
	const optimalOrderM2 = bestPanelForWall.total * (bestPanelForWall.opt.w * bestPanelForWall.opt.h);
	const savingsM2 = isOptimalSize ? 0 : Math.max(0, Math.round((currentOrderM2 - optimalOrderM2) * 100) / 100);
	const panelSpecRows: Array<{ label: string; value: string }> = [
		{ label: 'טקסטורה', value: `${activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית'} · ${panelSpecStoneName}` },
		{ label: 'מידות (מ"מ)', value: panelSizeLabel },
		{ label: 'מחיר למ"ר חיפוי קיר חוץ (כולל אביזרי התקנה)', value: 'מחיר' },
		{ label: 'מחיר למ"ר חיפוי קיר פנים (הדבקה)', value: 'מחיר' },
		{ label: 'מחיר התקנה למ"ר חיפוי קיר חוץ', value: 'מחיר' },
		{ label: 'עובי פאנל חוץ', value: '29 מ"מ' },
		{ label: 'עובי פאנל פנים', value: '17 מ"מ' },
	];
	const { breakdown, total } = calculatePrice();
	const priceFormatted = React.useMemo(() => {
		try {
			return new Intl.NumberFormat('he-IL').format(total);
		} catch {
			return String(total);
		}
	}, [total]);

	// עזר: יצירת מזהה ליד קצר
	const generateLeadId = React.useCallback((): string => {
		// מזהה ספרתי בלבד כדי למנוע הפרעות כיווניות ב-RTL
		const ts = Date.now().toString().slice(-6);
		const rnd = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
		return `${ts}${rnd}`; // 10 ספרות
	}, []);

	// שמירת הדמייה ל-localStorage
	function saveCurrentSimulation() {
		try {
			const id = generateLeadId();
			const defaultName = `הדמייה ${new Date().toLocaleString('he-IL')}`;
			const name = (typeof window !== 'undefined' ? window.prompt('שם הדמייה:', defaultName) : null) || defaultName;
			const sim = {
				id,
				name,
				createdAt: Date.now(),
				state: buildSimulationState(),
			};
			const key = 'ascenso:sims';
			const arr = JSON.parse(localStorage.getItem(key) || '[]');
			arr.unshift(sim);
			localStorage.setItem(key, JSON.stringify(arr.slice(0, 50)));
			setSaveToast('הדמייה נשמרה למועדפים');
			setTimeout(() => setSaveToast(null), 1800);
			try { window.dispatchEvent(new StorageEvent('storage', { key } as any)); } catch {}
		} catch {}
	}

	// עזר: תיאור מסלול קריא
	const formatPathForShare = React.useCallback((segments: PathSegment[]): string => {
		const parts: string[] = [];
		segments.forEach(seg => {
			if (seg.kind === 'straight') {
				parts.push(`ישר ${seg.steps}`);
			} else {
				parts.push(seg.turn ? `פודסט + ${seg.turn === 'right' ? 'ימינה' : 'שמאלה'}` : 'פודסט');
			}
		});
		return parts.join(', ');
	}, []);

	// עזר: שם מעקה ותוספים לכבלים/מתכת/זכוכית
	const formatRailing = React.useCallback((): string => {
		if (railing === 'none') return 'ללא';
		if (railing === 'glass') {
			const tone = glassTone === 'smoked' ? 'מושחר' : glassTone === 'bronze' ? 'ברונזה' : 'שקוף אקסטרה קליר';
			return `זכוכית (${tone})`;
		}
		if (railing === 'metal') {
			const name =
				railingMetalSolid === '#111111' ? 'שחור' :
				railingMetalSolid === '#F5F5F5' ? 'לבן' :
				(metalRailingOptions.find(r => r.id === railingMetalId)?.name || 'מתכת');
			return `מתכת (${name})`;
		}
		if (railing === 'cable') {
			const cableName = (cableOptions.find(c => c.id === cableId)?.name) || 'כבל';
			const spanName = cableSpanMode === 'floor' ? 'תקרה‑רצפה' : 'תקרה‑מדרגה';
			return `מערכת כבלים 8 מ״מ (${cableName}, ${spanName})`;
		}
		return '';
	}, [railing, glassTone, railingMetalSolid, railingMetalId, metalRailingOptions, cableOptions, cableId, cableSpanMode]);

	// פורמט מזהה להודעות RTL: מפצל בקבוצות ומוסיף סימן כיווניות למניעת LTR/קישור טלפון
	const formatLeadIdRTL = React.useCallback((id: string): string => {
		// הוסף RLM בין קבוצות ומקפים קשיחים כדי לשבור אוטולינקינג של וואטסאפ
		const groups: string[] = [];
		for (let i = 0; i < id.length; i += 2) {
			groups.push(id.slice(i, i + 2));
		}
		return '\u200F' + groups.join('\u2011') + '\u200F'; // \u2011 = non-breaking hyphen
	}, []);

	// בניית טקסט שיתוף לוואטסאפ – פרויקט חיפוי קירות (מפרט טכני ומארז דוגמאות)
	const buildWhatsappText = React.useCallback((leadId: string, shareUrl: string, includeUrl: boolean = true): string => {
		const materialLabel = activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית';
		const textureName = nonWoodModels.find(r => r.id === activeTexId)?.name || 'טקסטורה';
		// הכרחת כיוון LTR עבור ה‑URL באמצעות LRI/PDI (איסולציה) למניעת שבירה RTL
		const ltrUrl = `\u2066${shareUrl}\u2069`;

		const surfaceM2 = Math.round(panelSizeW * panelSizeH * 100) / 100;
		const sizeLabel = PANEL_SIZE_OPTIONS.find(o => o.w === panelSizeW && o.h === panelSizeH)?.label || `${Math.round(panelSizeW * 1000)}×${Math.round(panelSizeH * 1000)}`;
		const lines = [
			`*ASCENSO – לוחות חיפוי*\u200F`,
			`היי, צפיתי בהדמייה של לוח חיפוי באתר ומעוניינ/ת בפרטים.`,
			`מס׳ פנייה: ${formatLeadIdRTL(leadId)}`,
			`פרטי הבחירה:`,
			`- חומר: ${materialLabel}`,
			`- דגם/טקסטורה: ${textureName}`,
			`- מידות לוח: ${sizeLabel} מ"מ`,
			`- שטח פנים: ${surfaceM2} מ"ר`,
			`- עובי לוח: ${panelThicknessMm} מ״מ`,
			`- מרווח ניתוק: ${shadowGapMm} מ״מ`,
			``,
			`מעוניינ/ת לקבל מפרט טכני ומארז דוגמאות לפרויקט חיפוי קירות.`,
		];
		if (includeUrl) {
			lines.push(`פתיחת ההדמייה:`);
			lines.push(`${ltrUrl}`);
		}
		const body = lines.join('\n');
		return `\u202B${body}\u202C`;
	}, [activeMaterial, nonWoodModels, activeTexId, panelThicknessMm, shadowGapMm, panelSizeW, panelSizeH]);

	// Handler: שיתוף לוואטסאפ
	const handleWhatsappShare = React.useCallback(async () => {
		try {
			const leadId = generateLeadId();
			// בנה URL שיתוף עם UTM
			const href = (typeof window !== 'undefined' ? window.location.href : '/live');
			const url = new URL(href, (typeof window !== 'undefined' ? window.location.origin : 'https://example.com'));
			// מניעת 'localhost' שלא מזוהה כלינק ב‑WhatsApp: המרה ל‑IP/דומיין תקף
			if (url.hostname === 'localhost') {
				try {
					url.hostname = '127.0.0.1.nip.io';
				} catch {
					url.hostname = '127.0.0.1';
				}
			}
			url.searchParams.set('utm_source', 'live');
			url.searchParams.set('utm_medium', 'whatsapp');
			url.searchParams.set('utm_campaign', 'share');
			const shareUrl = url.toString();
			// ללא קישור GLB – רק טקסט
			const text = buildWhatsappText(leadId, shareUrl, false);

			setShareToast('פותח WhatsApp...');
			window.setTimeout(() => setShareToast(null), 2200);

			// פתיחת WhatsApp
			const phone = (whatsappPhone || '').replace(/[^\d]/g, '');
			const waUrl = phone
				? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`
				: `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
			window.open(waUrl, '_blank');

		} catch {
			setShareToast('שיתוף נכשל. נסה שוב.');
			window.setTimeout(() => setShareToast(null), 2200);
		}
	}, [generateLeadId, buildWhatsappText]);

	// (הוסר) צילום תמונות – לפי בקשתך נשאר רק טקסט הודעה ל‑WhatsApp

	// שליחת טופס מודאל: הודעת וואטסאפ – בקשת מפרט טכני ומארז דוגמאות (לוח חיפוי)
	function handleBookingSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (bookingStep !== 'time' || !preferredTime) return;
		const materialLabel = activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית';
		const textureName = nonWoodModels.find(r => r.id === activeTexId)?.name || 'טקסטורה';
		const leadId = generateLeadId();
		const timeLabel = preferredTime || '-';

		const surfaceM2 = Math.round(panelSizeW * panelSizeH * 100) / 100;
		const sizeLabel = PANEL_SIZE_OPTIONS.find(o => o.w === panelSizeW && o.h === panelSizeH)?.label || `${Math.round(panelSizeW * 1000)}×${Math.round(panelSizeH * 1000)}`;
		const lines = [
			'\u202B*ASCENSO – לוחות חיפוי*\u200F',
			`מס׳ פנייה: ${formatLeadIdRTL(leadId)}`,
			`מפרט לוח:`,
			`- סוג אבן/חומר: ${textureName} (${materialLabel})`,
			`- מידות: ${sizeLabel} מ"מ · שטח: ${surfaceM2} מ"ר`,
			`- עובי מערכת: ${panelThicknessMm} מ"מ`,
			`- ליבה: Aluminum Honeycomb`,
			``,
			`פרטי התקשרות:`,
			`- שם מלא: ${fullName}`,
			`- כתובת הפרויקט: ${projectAddress}`,
			`- תאריך מועדף: ${preferredDate || '-'}`,
			`- חלון זמן מועדף: ${timeLabel}`,
			``,
			`מעוניינ/ת לקבל מפרט טכני ומארז דוגמאות לפרויקט חיפוי קירות.`,
			'\u202C',
		].join('\n');

		const phone = whatsappPhone.replace('+', '');
		window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(lines)}`, '_blank');
		setBookingSubmitted(true);
	}

	if (!mounted) {
		// שלב SSR – אל תחיל הידרציה על תוכן דינמי כדי למנוע אזהרות
		return null;
	}

	return (
		<>
			<div className="min-h-screen w-full bg-[#EFEFEF]">
			<main className="max-w-7xl mx-auto px-4 lg:px-6 pt-2 pb-6" dir="rtl">
			<div className="grid grid-cols-1 gap-0">
				<section>
					{/* בחירת חומר – לחצני כותרת עדינים מחוץ לטאב, בלי תיבת בלון */}
					<div id="live-top-tabs" ref={topTabsRef} className="mb-1 mt-0" dir="rtl">
						<div className="flex flex-wrap justify-center gap-1 py-2">
							<button
								type="button"
								onClick={() => startTransition(() => setActiveMaterial('metal'))}
								className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${activeMaterial === 'metal' ? 'text-[#1a1a2e] border-b-2 border-[#1a1a2e]' : 'text-gray-500 hover:text-gray-700'}`}
							>
								מתכת
							</button>
							<button
								type="button"
								onClick={() => startTransition(() => setActiveMaterial('stone'))}
								className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${activeMaterial === 'stone' ? 'text-[#1a1a2e] border-b-2 border-[#1a1a2e]' : 'text-gray-500 hover:text-gray-700'}`}
							>
								אבן טבעית
							</button>
						</div>
						<div className="pt-2">
								<NonWoodTexturePicker
									nonWoodModels={nonWoodModels as any}
									activeTexId={activeTexId}
									onPick={(id) =>
										startTransition(() => {
											setActiveTexId(id);
											if (activeMaterial === 'metal') setActiveMetalTexId(id);
											if (activeMaterial === 'stone') setActiveStoneTexId(id);
										})
									}
								/>
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
						<div className="lg:col-span-2">
					<div ref={canvasWrapRef} className="relative w-full aspect-[16/9] lg:aspect-auto lg:h-[60vh] bg-white border overflow-hidden rounded fixed inset-x-0 z-30 lg:relative" style={{ height: mobileCanvasH || undefined, top: (mobileHeaderH + mobileTabsH) || 0 }}>
						<Canvas
							shadows={false}
							camera={{ position: [0, wallHeightM / 2, 4.5], fov: 45 }}
							dpr={[1, isDesktopViewport ? 2 : 1.5]}
							gl={{
								toneMapping: ACESFilmicToneMapping,
								toneMappingExposure: 1.05,
								outputColorSpace: SRGBColorSpace as any,
								preserveDrawingBuffer: false,
								antialias: true,
								powerPreference: 'high-performance',
							}}
						>
							<React.Suspense fallback={null}>
								<ambientLight intensity={1.5} />
								<pointLight position={[10, 10, 10]} intensity={1} />
								<Environment preset="city" />
								{(() => {
									const g = shadowGapMm / 1000;
									const textureUrl = (() => {
										const sel = nonWoodModels.find(r => r.id === activeTexId) || nonWoodModels[0];
										return (sel as any)?.solid ? null : (sel?.images?.[0] || null);
									})();
									const materialSolidColor = (() => {
										const sel = nonWoodModels.find(r => r.id === activeTexId) || nonWoodModels[0];
										return (sel as any)?.solid || null;
									})();
									const materialKind = activeMaterial === 'metal' ? 'metal' : 'stone';
									const cells: React.ReactNode[] = [];
									for (let i = 0; i < panelsAlongHeight; i++) {
										for (let j = 0; j < panelsAlongWidth; j++) {
											const cellW = j === panelsAlongWidth - 1 ? lastColWidth : panelSizeW;
											const cellH = i === panelsAlongHeight - 1 ? lastRowHeight : panelSizeH;
											const px = -wallWidthM / 2 + (j < panelsAlongWidth - 1 ? j * (panelSizeW + g) + panelSizeW / 2 : (panelsAlongWidth - 1) * (panelSizeW + g) + lastColWidth / 2);
											const py = i < panelsAlongHeight - 1 ? i * (panelSizeH + g) + panelSizeH / 2 : (panelsAlongHeight - 1) * (panelSizeH + g) + lastRowHeight / 2;
											/* UV לפי גריד – תא (j,i) מקבל חתך מהטקסטורה; השלמה מקבלת יחס lastCol/lastRow מהתא */
											const uvScaleX = (j === panelsAlongWidth - 1 ? lastColWidth / panelSizeW : 1) / panelsAlongWidth;
											const uvScaleY = (i === panelsAlongHeight - 1 ? lastRowHeight / panelSizeH : 1) / panelsAlongHeight;
											const uvScale: [number, number] = [uvScaleX, uvScaleY];
											const uvOffset: [number, number] = [j / panelsAlongWidth, i / panelsAlongHeight];
											/* סטיית עומק זעירה לכל פלטה (אחידה) – מונעת z-fighting בלי מדרגה בין השלמות לשאר */
											const zBias = (i * panelsAlongWidth + j) * 0.00003;
											cells.push(
												<group key={`${i}-${j}`} position={[px, py, zBias]}>
													<Panel3D
														thicknessMm={panelThicknessMm}
														explodedView={false}
														widthM={cellW}
														heightM={cellH}
														textureUrl={textureUrl}
														materialSolidColor={materialSolidColor}
														materialKind={materialKind}
														uvScale={uvScale}
														uvOffset={uvOffset}
													/>
												</group>
											);
										}
									}
									return <>{cells}</>;
								})()}
								<OrbitControls
									ref={orbitRef}
									enableDamping
									makeDefault
									zoomToCursor
									target={[0, wallHeightM / 2, 0]}
								/>
							</React.Suspense>
						</Canvas>
						<CanvasLoadingOverlay />
						
						{/* אייקון מועדפים מעל הקנבס במקום בלון המחיר (דסקטופ בלבד) */}
						<div className="hidden lg:block pointer-events-none absolute top-3 left-3 z-20">
							<div className="flex gap-2">
								<button
									type="button"
									onClick={saveCurrentSimulation}
									aria-label="שמור הדמייה למועדפים"
									title="שמור הדמייה למועדפים"
									className="pointer-events-auto p-2 rounded-full border text-[#1a1a2e] bg-white/90 hover:bg-white cursor-pointer shadow"
								>
									<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
									</svg>
								</button>
								<button
									type="button"
									onClick={toggleFullscreen}
									aria-label={isFullscreen ? "צא ממסך מלא" : "פתח מסך מלא"}
									title={isFullscreen ? "צא ממסך מלא" : "מסך מלא"}
									className="pointer-events-auto p-2 rounded-full border text-[#1a1a2e] bg-white/90 hover:bg-white cursor-pointer shadow"
								>
									{isFullscreen ? (
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<polyline points="15 9 9 9 9 15"></polyline>
											<polyline points="9 9 15 15"></polyline>
										</svg>
									) : (
										<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M4 9V4h5"></path>
											<path d="M4 4l6 6"></path>
											<path d="M20 15v5h-5"></path>
											<path d="M20 20l-6-6"></path>
										</svg>
									)}
								</button>
							</div>
						</div>
						{/* לוגו קבוע במסך מלא */}
						{isFullscreen && (
							<div className="pointer-events-none absolute top-2 right-2 z-30">
								<div className="px-2 py-1 rounded-md bg-black/50 text-white text-xs font-bold tracking-wide">
									ASCENSO
								</div>
							</div>
						)}
						{/* אייקון מועדפים מעל הקנבס – מובייל */}
						<div className="lg:hidden pointer-events-none absolute top-2 left-2 z-20">
							<div className="flex gap-2">
								<button
									type="button"
									onClick={saveCurrentSimulation}
									aria-label="שמור הדמייה למועדפים"
									title="שמור הדמייה למועדפים"
									className="pointer-events-auto p-2 rounded-full border text-[#1a1a2e] bg-white/90 hover:bg-white cursor-pointer shadow"
								>
									<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
										<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
									</svg>
								</button>
								<button
									type="button"
									onClick={toggleFullscreen}
									aria-label={isFullscreen ? "צא ממסך מלא" : "פתח מסך מלא"}
									title={isFullscreen ? "צא ממסך מלא" : "מסך מלא"}
									className="pointer-events-auto p-2 rounded-full border text-[#1a1a2e] bg-white/90 hover:bg-white cursor-pointer shadow"
								>
									{isFullscreen ? (
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<polyline points="15 9 9 9 9 15"></polyline>
											<polyline points="9 9 15 15"></polyline>
										</svg>
									) : (
										<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
											<path d="M4 9V4h5"></path>
											<path d="M4 4l6 6"></path>
											<path d="M20 15v5h-5"></path>
											<path d="M20 20l-6-6"></path>
										</svg>
									)}
								</button>
							</div>
						</div>
						{/* טוסט שיתוף */}
						{shareToast && (
							<div className="pointer-events-none absolute top-3 right-3 z-20">
								<div className="pointer-events-auto bg-black/80 text-white text-sm px-3 py-1.5 rounded-md shadow">
									{shareToast}
								</div>
							</div>
						)}
					</div>
					{/* ספייסר למובייל משמר גובה הקנבס הקבוע + גובה ההדר, כדי שהתוכן יתחיל מתחתיו */}
					<div
						className="block lg:hidden w-full"
						style={{ height: ((mobileCanvasH || 0) + (mobileHeaderH || 0) + (mobileTabsH || 0)) || undefined }}
					/>
					{/* רווח זהה ל-gap בין קטגוריות */}
					<div className="block lg:hidden h-3" />
						</div>

						{/* פירוט צדדי בדסקטופ – לוח חיפוי */}
						<div className="hidden lg:block lg:col-span-1">
							<div className="bg-white rounded-md p-3 h-full space-y-3">
								<div className="space-y-2">
									{/* גודל הקיר – חלון נפרד מעל */}
									<div className="rounded-xl bg-gradient-to-b from-[#f8f6f4] to-[#f0ebe6] px-3 py-2 border border-[#e8e2dc] shadow-sm">
										<span className="text-xs font-semibold text-[#1a1a2e]/70 block mb-1.5">גודל הקיר (אומדן, מ')</span>
										<div className="flex flex-wrap items-center gap-2">
											<input type="number" min={0.1} max={50} step={0.1} value={wallWidthM} onChange={e => setWallWidthM(Math.max(0.1, Math.min(50, Number(e.target.value) || 0.1)))} className="w-16 px-2 py-1 text-sm border border-gray-300 rounded" aria-label="רוחב קיר במטרים" />
											<span className="text-gray-500">×</span>
											<input type="number" min={0.1} max={50} step={0.1} value={wallHeightM} onChange={e => setWallHeightM(Math.max(0.1, Math.min(50, Number(e.target.value) || 0.1)))} className="w-16 px-2 py-1 text-sm border border-gray-300 rounded" aria-label="גובה קיר במטרים" />
											<span className="text-sm text-[#1a1a2e]">= {wallSurfaceM2} מ"ר</span>
										</div>
										<p className="text-xs text-[#1a1a2e]/80 mt-1.5">חלוקה לפלטות: {panelsAlongWidth} × {panelsAlongHeight} = {panelsTotal} פלטות</p>
									</div>
									{/* תיבת מידות והמלצות להזמנה (נסטינג) */}
									<div className="rounded-xl bg-gradient-to-b from-[#f8f6f4] to-[#f0ebe6] px-3 py-3 border border-[#e8e2dc] shadow-sm">
										<h3 className="text-sm font-bold text-[#1a1a2e] mb-2.5">מפרט לוח</h3>
										<table className="w-full text-xs text-[#1a1a2e]" dir="rtl">
											<tbody>
												{panelSpecRows.map(row => (
													<tr key={row.label} className="border-b border-[#e8e2dc]/70 last:border-0">
														<td className="py-2 pr-2 text-[#1a1a2e]/75 align-top">{row.label}</td>
														<td className="py-2 pl-2 font-medium text-left text-[#1a1a2e] align-top whitespace-nowrap">{row.value}</td>
													</tr>
												))}
											</tbody>
										</table>
										<div className="mt-3 pt-3 border-t border-[#e8e2dc]">
											<p className="text-xs font-semibold text-[#1a1a2e] mb-1">המלצה להזמנה</p>
											{isOptimalSize ? (
												<p className="text-xs text-emerald-700">המידה הנבחרת אופטימלית לגודל הקיר – מינימום פחת.</p>
											) : (
												<>
													<p className="text-xs text-gray-700 mb-1.5">לחיסכון: מידה {bestPanelForWall.opt.label} – {bestPanelForWall.total} פלטות (חלוקה {bestPanelForWall.nw}×{bestPanelForWall.nh}).{panelsSaved > 0 && ` חיסכון של ${panelsSaved} פלטות.`}{savingsM2 > 0 ? ` חיסכון של ${savingsM2} מ"ר בהזמנה.` : ''}</p>
													<button type="button" onClick={() => setPanelSize(bestPanelForWall.opt.w, bestPanelForWall.opt.h)} className="text-xs font-medium text-[#1a1a2e] underline hover:no-underline">
														החל מידה מומלצת
													</button>
												</>
											)}
										</div>
										<div className="mt-3 pt-3 border-t border-[#e8e2dc]">
											<div className="flex flex-wrap gap-1 mb-1">
												{PANEL_SIZE_OPTIONS.map(opt => (
													<button key={opt.id} type="button" onClick={() => setPanelSize(opt.w, opt.h)} className={`px-2 py-1 rounded text-xs font-medium border ${panelSizeW === opt.w && panelSizeH === opt.h ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white border-gray-300 hover:border-gray-400'}`}>{opt.label}</button>
												))}
											</div>
										</div>
									</div>
								</div>
								<button
									onClick={() => setBookingOpen(true)}
									className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a1a2e] text-white px-5 py-3 text-base font-semibold shadow-sm hover:opacity-95 cursor-pointer"
									aria-label="פתח טופס בקשת מפרט טכני"
								>
									<span>בקשת מפרט טכני ומארז דוגמאות</span>
								</button>
							</div>
						</div>
					</div>

					{/* פירוט מתחת להדמייה – מובייל/טאבלט */}
					<div className="mt-3 space-y-3 lg:hidden">
						<div className="bg-white rounded-md p-3">
						<button
							onClick={() => setBookingOpen(true)}
							className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a1a2e] text-white px-5 py-3 text-base font-semibold shadow-sm hover:opacity-95 cursor-pointer"
							aria-label="פתח טופס בקשת מפרט טכני"
						>
							<span>בקשת מפרט טכני ומארז דוגמאות</span>
						</button>
						</div>
					</div>
				</section>

				<aside ref={assignAsideRef} className="lg:col-span-4">
					{/* מובייל: אקורדיון קטגוריות בחירה */}
					<div className="lg:hidden flex flex-col gap-3">

						{/* באנר עזרה למובייל – נפתח/נסגר, ניתן לסגירה קבועה */}
						{!mobileHelpDismissed && (
							<div className="order-last bg-[#1a1a2e]/5 border border-[#1a1a2e]/15 rounded-md">
								<div className="flex items-center justify-between px-3 py-2">
									<button
										type="button"
										className="text-sm font-semibold text-[#1a1a2e]"
										onClick={() => setMobileHelpOpen(prev => !prev)}
										aria-expanded={mobileHelpOpen}
									>
										איך זה עובד?
									</button>
									<div className="flex items-center gap-2">
										{mobileOpenCat && (
											<span className="text-[11px] text-gray-700 bg-white border border-gray-200 rounded px-2 py-0.5">
												שלב: {getCatTitle(mobileOpenCat)}
											</span>
										)}
										<button
											type="button"
											className="text-gray-500 hover:text-gray-700 text-lg leading-none px-2"
											aria-label="סגור עזרה"
											onClick={dismissMobileHelp}
										>
											×
										</button>
									</div>
								</div>
								{mobileHelpOpen && (
									<div className="px-3 pb-3 text-xs text-gray-700">
										<div className="mb-1">
											בחרו שלב‑שלב. כל בחירה פותחת את השלב הבא. ניתן לחזור לשלב קודם בכל רגע.
										</div>
										<div className="text-gray-800">
											{mobileOpenCat ? getMobileHint(mobileOpenCat) : 'התחילו בבחירת קטגוריה מהרשימה מטה.'}
										</div>
									</div>
								)}
							</div>
						)}

						{(() => {
							const nodes: Array<{ key: Cat; el: React.ReactElement }> = [];
							const tabOrder: Cat[] = stepOrderForSteps;
							const getNextCat = (cat: Cat): Cat | null => getNextCatForSteps(cat);

							nodes.push({
								key: 'material',
								el: (
									<div>
										{mobileOpenCat === 'material' && (
											<div className="pt-1">
												{getNextCat('material') && (
													<div className="px-2 pb-2">
														<button type="button" onClick={() => setMobileOpenCat(getNextCat('material')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
															המשך
														</button>
													</div>
												)}
											</div>
										)}
									</div>
								),
							});
							nodes.push({
								key: 'nonWoodTexture',
								el: (
									<div>
										{mobileOpenCat === 'nonWoodTexture' && (
											<div className="p-3 bg-white border border-t-0 rounded-b-md">
												<div className="flex flex-wrap gap-3">
													{nonWoodModels.map(m => (
														<button
															key={m.id}
															aria-label={m.name || m.id}
															title={m.name || m.id}
															onClick={() => startTransition(() => {
																setActiveTexId(m.id);
																if (activeMaterial === 'metal') setActiveMetalTexId(m.id);
																if (activeMaterial === 'stone') setActiveStoneTexId(m.id);
															})}
															className={`w-10 h-10 rounded-full border-2 bg-center bg-cover cursor-pointer transition-transform duration-200 hover:scale-110 ${activeTexId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
															style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, backgroundColor: (!m.images || m.images.length === 0) && (m as any).solid ? (m as any).solid : undefined, borderColor: '#ddd' }}
														/>
													))}
												</div>
												{getNextCat('nonWoodTexture') && (
													<div className="mt-3 px-3 pb-2">
														<button type="button" onClick={() => setMobileOpenCat(getNextCat('nonWoodTexture')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
															המשך
														</button>
													</div>
												)}
											</div>
										)}
									</div>
								),
							});
							nodes.push({
								key: 'panel',
								el: (
									<div>
										{mobileOpenCat === 'panel' && (
											<div className="p-3 bg-white border border-t-0 rounded-b-md">
												<div className="rounded-xl bg-gradient-to-b from-[#f8f6f4] to-[#f0ebe6] px-3 py-3 border border-[#e8e2dc] shadow-sm">
													<h3 className="text-sm font-bold text-[#1a1a2e] mb-2.5">מפרט לוח</h3>
													<table className="w-full text-xs text-[#1a1a2e]" dir="rtl">
														<tbody>
															{panelSpecRows.map(row => (
																<tr key={row.label} className="border-b border-[#e8e2dc]/70 last:border-0">
																	<td className="py-2 pr-2 text-[#1a1a2e]/75 align-top">{row.label}</td>
																	<td className="py-2 pl-2 font-medium text-left text-[#1a1a2e] align-top whitespace-nowrap">{row.value}</td>
																</tr>
															))}
														</tbody>
													</table>
													<div className="mt-3 pt-3 border-t border-[#e8e2dc]">
														<p className="text-xs font-semibold text-[#1a1a2e] mb-1">המלצה להזמנה</p>
														{isOptimalSize ? (
															<p className="text-xs text-emerald-700">המידה הנבחרת אופטימלית לגודל הקיר – מינימום פחת.</p>
														) : (
															<>
																<p className="text-xs text-gray-700 mb-1">מידה {bestPanelForWall.opt.label}: {bestPanelForWall.total} פלטות.{panelsSaved > 0 ? ` חיסכון ${panelsSaved} פלטות.` : ''}{savingsM2 > 0 ? ` חיסכון ${savingsM2} מ"ר בהזמנה.` : ''}</p>
																<button type="button" onClick={() => setPanelSize(bestPanelForWall.opt.w, bestPanelForWall.opt.h)} className="text-xs font-medium text-[#1a1a2e] underline">
																	החל מידה מומלצת
																</button>
															</>
														)}
													</div>
													<div className="mt-3 pt-3 border-t border-[#e8e2dc] space-y-2">
														<div>
															<p className="text-xs font-semibold text-[#1a1a2e] mb-1">מידות לוח</p>
															<div className="flex flex-wrap gap-1.5">
																{PANEL_SIZE_OPTIONS.map(opt => (
																	<button key={opt.id} type="button" onClick={() => setPanelSize(opt.w, opt.h)} className={`px-2.5 py-1.5 rounded-lg text-xs border-2 ${panelSizeW === opt.w && panelSizeH === opt.h ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white border-gray-300'}`}>{opt.label}</button>
																))}
															</div>
														</div>
														<div>
															<p className="text-xs font-semibold text-[#1a1a2e] mb-1">עובי · ניתוק</p>
															<div className="flex gap-2 flex-wrap">
																{([16, 25] as const).map((mm) => (
																	<button key={mm} type="button" onClick={() => setPanelThicknessMm(mm)} className={`px-3 py-1.5 rounded-lg text-sm border-2 ${panelThicknessMm === mm ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white border-gray-300'}`}>{mm} מ״מ</button>
																))}
																{([3, 5, 10] as const).map((mm) => (
																	<button key={`g${mm}`} type="button" onClick={() => setShadowGapMm(mm)} className={`px-3 py-1.5 rounded-lg text-sm border-2 ${shadowGapMm === mm ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white border-gray-300'}`}>ניתוק {mm}</button>
																))}
															</div>
														</div>
													</div>
												</div>
											</div>
										)}
									</div>
								),
							});

							const mapNodes = new Map(nodes.map(n => [n.key, n.el]));
							return (
								<>
									{/* בחירת חומר – מתכת/אבן + תצוגה מקדימה וסוויצ'ים בראש, סמוך לכותרת */}
									<div className="flex justify-center gap-1 py-1">
										{(['metal', 'stone'] as const).map(m => (
											<button
												key={m}
												type="button"
												className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${activeMaterial === m ? 'text-[#1a1a2e] border-b-2 border-[#1a1a2e]' : 'text-gray-500 hover:text-gray-700'}`}
												onClick={() => startTransition(() => setActiveMaterial(m))}
											>
												{m === 'metal' ? 'מתכת' : 'אבן טבעית'}
											</button>
										))}
									</div>
									<div className="pt-1 pb-2">
										<NonWoodTexturePicker
											nonWoodModels={nonWoodModels as any}
											activeTexId={activeTexId}
											onPick={(id) =>
												startTransition(() => {
													setActiveTexId(id);
													if (activeMaterial === 'metal') setActiveMetalTexId(id);
													if (activeMaterial === 'stone') setActiveStoneTexId(id);
												})
											}
										/>
									</div>
									{/* גודל הקיר – חלון נפרד מעל הטאבים */}
									<div className="mx-2 mb-2 rounded-xl bg-gradient-to-b from-[#f8f6f4] to-[#f0ebe6] px-3 py-2 border border-[#e8e2dc] shadow-sm">
										<span className="text-xs font-semibold text-[#1a1a2e]/70 block mb-1.5">גודל הקיר (אומדן, מ')</span>
										<div className="flex flex-wrap items-center gap-2">
											<input type="number" min={0.1} max={50} step={0.1} value={wallWidthM} onChange={e => setWallWidthM(Math.max(0.1, Math.min(50, Number(e.target.value) || 0.1)))} className="w-14 px-2 py-1.5 text-sm border-2 border-gray-300 rounded-lg" aria-label="רוחב קיר במטרים" />
											<span className="text-gray-500">×</span>
											<input type="number" min={0.1} max={50} step={0.1} value={wallHeightM} onChange={e => setWallHeightM(Math.max(0.1, Math.min(50, Number(e.target.value) || 0.1)))} className="w-14 px-2 py-1.5 text-sm border-2 border-gray-300 rounded-lg" aria-label="גובה קיר במטרים" />
											<span className="text-xs text-[#1a1a2e]">= {wallSurfaceM2} מ"ר</span>
										</div>
										<p className="text-xs text-[#1a1a2e]/80 mt-1.5">חלוקה לפלטות: {panelsAlongWidth} × {panelsAlongHeight} = {panelsTotal} פלטות</p>
									</div>
									<div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b">
										<div className="flex items-center overflow-x-auto px-2 py-3 w-full lg:justify-center gap-0" dir="rtl">
											{tabOrder.map((tab, i) => (
												<React.Fragment key={tab}>
													<button
														type="button"
														onClick={() => setMobileOpenCat(tab)}
														className={`inline-flex items-center gap-2 shrink-0 cursor-default py-1.5 px-2 rounded-md ${mobileOpenCat === tab ? 'bg-[#1a1a2e]/5' : ''}`}
														aria-selected={mobileOpenCat === tab}
														role="tab"
													>
														<span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${mobileOpenCat === tab ? 'bg-[#1a1a2e] text-white' : 'border-2 border-gray-300 text-gray-500'}`}>
															{i + 1}
														</span>
														<span className={`text-sm md:text-base whitespace-nowrap ${mobileOpenCat === tab ? 'font-semibold text-[#1a1a2e]' : 'text-gray-600'}`}>
															{getCatTitle(tab)}
														</span>
													</button>
													{i < tabOrder.length - 1 && (
														<span className="mx-1 w-6 min-w-[8px] shrink-0 border-t border-gray-300" aria-hidden />
													)}
												</React.Fragment>
											))}
										</div>
									</div>
									<div className="mt-1 flex justify-center">
										<div className="w-full max-w-5xl text-center">
											{mapNodes.get((mobileOpenCat || tabOrder[0]) as Cat) as React.ReactElement}
										</div>
									</div>
								</>
							);
						})()}
					</div>


						{/* ספייסר תחתון בפאנל כדי שלא ייכנס מתחת לסרגל הקבוע בדסקטופ */}
						<div className="hidden lg:block h-2" />
				</aside>
			</div>
			{/* מרווח תחתון במובייל עבור סרגל קבוע – מוקטן כמעט לאפס */}
			<div className="h-2 lg:hidden" />
			{/* מרווח תחתון בדסקטופ – לא נדרש כעת */}
			<div className="hidden lg:block h-0" />
		</main>

		{/* מובייל: סיכום קבוע בתחתית — מוסתר בזמן תיאום/מקלדת כדי למנוע חפיפות */}
		{!bookingOpen && !isKeyboardOpen && (
			<div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg">
				<div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
					<button
						onClick={openBooking}
						aria-label="פתח טופס בקשת מפרט טכני"
						className="inline-flex items-center gap-2 rounded-md bg-[#1a1a2e] text-white px-4 py-2 text-base font-semibold shadow-md hover:opacity-95 cursor-pointer"
					>
						<span>בקשת מפרט טכני ומארז דוגמאות</span>
					</button>
					<div className="text-right text-[#1a1a2e]">
						<div className="text-sm font-semibold">לוח {panelSurfaceM2} מ״ר</div>
						<div className="text-[11px] text-gray-500 leading-snug">{panelSizeLabel} מ"מ · Aluminum Honeycomb</div>
					</div>
				</div>
			</div>
		)}

		{/* Toasts */}
		{saveToast && (
			<div className="fixed bottom-5 right-5 z-[80] bg-[#1a1a2e] text-white px-4 py-2 rounded shadow-lg">
				{saveToast}
			</div>
		)}

		<BookingModal
			open={bookingOpen}
			isKeyboardOpen={isKeyboardOpen}
			bookingSubmitted={bookingSubmitted}
			bookingStep={bookingStep}
			stepIndex={stepIndex}
			stepTotal={stepTotal}
			stepPercent={stepPercent}
			answerWidthPx={answerWidthPx}
			twoWeeksDates={twoWeeksDates}
			preferredDate={preferredDate}
			preferredTime={preferredTime}
			fullName={fullName}
			city={city}
			cityOptions={cityOptions}
			setBookingOpen={setBookingOpen}
			setBookingSubmitted={setBookingSubmitted}
			setBookingStep={setBookingStep}
			setFullName={setFullName}
			setCity={setCity}
			setPreferredDate={setPreferredDate}
			setPreferredTime={setPreferredTime}
			handleBookingSubmit={handleBookingSubmit}
			refs={{ dialogRef, firstInputRef, cityInputRef, questionRef }}
		/>
			</div>
			<Footer />
		</>
	);
}

export default LivePageInner;

