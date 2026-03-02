'use client';

import Image from 'next/image';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useProgress, Environment } from '@react-three/drei';
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three';
import Footer from '@/components/Footer';
import Panel3D, { getPanelCenter } from './Panel3D';

/** מרכז הקיר (גריד פלטות + מרווחים) למטרת OrbitControls */
function getWallCenter(
	panelsAlongHeight: number,
	panelSizeH: number,
	gapM: number
): [number, number, number] {
	const totalHeight = panelsAlongHeight * panelSizeH + (panelsAlongHeight - 1) * gapM;
	return [0, totalHeight / 2, 0];
}

import { BrandWordmark } from './components/BrandWordmark';
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
	category: 'metal' | 'stone';
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

	const qMaterial = (search.get('material') as 'metal' | 'stone') || 'stone';
	const qMaterialSafe = qMaterial;
	const qColor = search.get('color') || 'oak';
	const qModel = search.get('model') || '';
	const qTex = search.get('tex') || '';

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
	// זיכרון בחירה אחרונה לכל קטגוריה כדי לשחזר בעת חזרה
	const lastTexRef = React.useRef<{ metal: string | null; stone: string | null }>({ metal: null, stone: null });
	// מאסטר: מצבים מחזוריים להפעלה/ביטול ולצד
	// מובייל: אקורדיון קטגוריות בפאנל (לוחות חיפוי: חומר, טקסטורה, הגדרות לוח)
	const [mobileOpenCat, setMobileOpenCat] = React.useState<
		'material' | 'nonWoodTexture' | 'panel' | null
	>('material');
	// דסקטופ: אקורדיון קטגוריות – סגורות כברירת מחדל, נפתח בלחיצה
	const [desktopOpenCat, setDesktopOpenCat] = React.useState<
		'material' | 'nonWoodTexture' | 'panel' | null
	>(null);
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

	// -------------------- שמירת/טעינת הדמייה מקומית --------------------
	type SavedSimulation = {
		id: string;
		name: string;
		createdAt: number;
		state: any;
	};

	function buildSimulationState() {
		return {
			activeMaterial,
			activeModelId,
			activeTexId,
			activeColor,
			panelThicknessMm,
			shadowGapMm,
			panelSizeW,
			panelSizeH,
			wallWidthM,
			wallHeightM,
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
			if (s.activeMaterial) setActiveMaterial(s.activeMaterial);
			if (s.activeModelId) setActiveModelId(s.activeModelId);
			if (s.activeTexId) setActiveTexId(s.activeTexId);
			if (s.activeColor) setActiveColor(s.activeColor);
			if (typeof s.panelThicknessMm === 'number') setPanelThicknessMm(s.panelThicknessMm);
			if (typeof s.shadowGapMm === 'number') setShadowGapMm(s.shadowGapMm);
			if (typeof s.panelSizeW === 'number') setPanelSizeW(s.panelSizeW);
			if (typeof s.panelSizeH === 'number') setPanelSizeH(s.panelSizeH);
			if (typeof s.wallWidthM === 'number') setWallWidthM(s.wallWidthM);
			if (typeof s.wallHeightM === 'number') setWallHeightM(s.wallHeightM);
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
			}
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// הוסר: הוגדר למעלה לפני generateAndDownloadPdf כדי למנוע TDZ

	// (הוסר) יצירת PDF/תמונות – לפי בקשתך נשאר רק טקסט הודעה ל‑WhatsApp

	// חומרים לפי קטגוריה פעילה – מתכת ואבן בלבד
	const nonWoodModels = React.useMemo(() => {
		return records.filter((r) => {
			if (r.category !== activeMaterial) return false;
			if ((r as any).hidden) return false;
			if (activeMaterial === 'metal') {
				return Array.isArray((r as any).images) && (r as any).images.length > 0;
			}
			return true; // אבן
		});
	}, [records, activeMaterial]);
	// אם הטקסטורה הפעילה לא קיימת לאחר הסינון, בחר את הראשונה הזמינה
	React.useEffect(() => {
		if (!nonWoodModels.length) return;
		if (!nonWoodModels.some(m => m.id === activeTexId)) {
			setActiveTexId(nonWoodModels[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeMaterial, nonWoodModels]);
	// Preload טקסטורות רלוונטיות להפחתת הבהובים בעת מעבר בחירה
	React.useEffect(() => {
		try {
			const urls = new Set<string>();
			const sel = nonWoodModels.find(m => m.id === activeTexId) || nonWoodModels[0];
			if (sel?.images?.[0]) urls.add(sel.images[0]);
			if (sel?.pbr?.bump?.[0]) urls.add(sel.pbr.bump[0]);
			if (sel?.pbr?.roughness?.[0]) urls.add(sel.pbr.roughness[0]);
			(urls.size ? Array.from(urls) : []).forEach(u => {
				try {
					// @ts-ignore - preload is static on useTexture
					useTexture.preload(u);
				} catch {}
			});
		} catch {}
	}, [nonWoodModels, activeTexId]);

	// שמירת הבחירה האחרונה עבור מתכת/אבן
	React.useEffect(() => {
		if (activeMaterial === 'metal') lastTexRef.current.metal = activeTexId ?? lastTexRef.current.metal;
		if (activeMaterial === 'stone') lastTexRef.current.stone = activeTexId ?? lastTexRef.current.stone;
	}, [activeMaterial, activeTexId]);

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

	// סנכרון URL לשיתוף
	React.useEffect(() => {
		let t: any;
		const run = () => {
			const params = new URLSearchParams();
			params.set('material', activeMaterial);
			if (activeTexId) params.set('tex', activeTexId);
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
	}, [activeMaterial, activeTexId]);

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

	// פורמט מזהה להודעות RTL: מפצל בקבוצות ומוסיף סימן כיווניות למניעת LTR/קישור טלפון
	const formatLeadIdRTL = React.useCallback((id: string): string => {
		// הוסף RLM בין קבוצות ומקפים קשיחים כדי לשבור אוטולינקינג של וואטסאפ
		const groups: string[] = [];
		for (let i = 0; i < id.length; i += 2) {
			groups.push(id.slice(i, i + 2));
		}
		return '\u200F' + groups.join('\u2011') + '\u200F'; // \u2011 = non-breaking hyphen
	}, []);

	// בניית טקסט שיתוף לוואטסאפ – פרויקט חיפוי קירות (ללא מפרט מפורט)
	const buildWhatsappText = React.useCallback((leadId: string, shareUrl: string, includeUrl: boolean = true): string => {
		const materialLabel = activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית';
		const textureName = nonWoodModels.find(r => r.id === activeTexId)?.name || 'טקסטורה';
		const ltrUrl = `\u2066${shareUrl}\u2069`;

		const lines = [
			`*ASCENSO – לוחות חיפוי*\u200F`,
			`היי, צפיתי בהדמייה של לוח חיפוי באתר ומעוניינ/ת בפרטים.`,
			`מס׳ פנייה: ${formatLeadIdRTL(leadId)}`,
			`פרטי הבחירה:`,
			`- חומר: ${materialLabel}`,
			`- דגם/טקסטורה: ${textureName}`,
		];
		if (includeUrl) {
			lines.push(`פתיחת ההדמייה:`);
			lines.push(`${ltrUrl}`);
		}
		const body = lines.join('\n');
		return `\u202B${body}\u202C`;
	}, [activeMaterial, nonWoodModels, activeTexId]);

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
									onClick={handleWhatsappShare}
									className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a1a2e] text-white px-5 py-3 text-base font-semibold shadow-sm hover:opacity-95 cursor-pointer"
									aria-label="ייעוץ ותיאום פגישה בוואטסאפ"
								>
									<span>ייעוץ ותיאום פגישה</span>
								</button>
							</div>
						</div>
					</div>

					{/* פירוט מתחת להדמייה – מובייל/טאבלט */}
					<div className="mt-3 space-y-3 lg:hidden">
						<div className="bg-white rounded-md p-3">
						<button
							onClick={handleWhatsappShare}
							className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a1a2e] text-white px-5 py-3 text-base font-semibold shadow-sm hover:opacity-95 cursor-pointer"
							aria-label="ייעוץ ותיאום פגישה בוואטסאפ"
						>
							<span>ייעוץ ותיאום פגישה</span>
						</button>
						</div>
					</div>
				</section>

				<aside ref={assignAsideRef} className="lg:col-span-4">
					{/* מובייל: אקורדיון קטגוריות בחירה */}
					<div className="lg:hidden flex flex-col gap-3">

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

		{/* מובייל: סיכום קבוע בתחתית — מוסתר בזמן מקלדת */}
		{!isKeyboardOpen && (
			<div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg">
				<div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
					<button
						onClick={handleWhatsappShare}
						aria-label="ייעוץ ותיאום פגישה בוואטסאפ"
						className="inline-flex items-center gap-2 rounded-md bg-[#1a1a2e] text-white px-4 py-2 text-base font-semibold shadow-md hover:opacity-95 cursor-pointer"
					>
						<span>ייעוץ ותיאום פגישה</span>
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

			</div>
			<Footer />
		</>
	);
}

export default LivePageInner;

