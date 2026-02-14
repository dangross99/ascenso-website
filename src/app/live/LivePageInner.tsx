'use client';

import Image from 'next/image';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useProgress } from '@react-three/drei';
import { ACESFilmicToneMapping, PCFSoftShadowMap, SRGBColorSpace } from 'three';
import Footer from '@/components/Footer';
import Staircase3D from './stairs/Staircase3D';
import type { PathSegment } from './shared/path';
import { encodePath, decodePath } from './shared/path';
import { BookingModal } from './components/BookingModal';
import { BrandWordmark } from './components/BrandWordmark';
import { Schematic } from './components/Schematic';
import { BoxPicker } from './components/BoxPicker';
import { MaterialKindPicker } from './components/MaterialKindPicker';
import { WoodTexturePicker } from './components/WoodTexturePicker';
import { WoodColorPicker } from './components/WoodColorPicker';
import { NonWoodTexturePicker } from './components/NonWoodTexturePicker';
import { PathPicker } from './components/PathPicker';
import { RailingPicker } from './components/RailingPicker';

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

	const qMaterial = (search.get('material') as 'wood' | 'metal' | 'stone') || 'wood';
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
	const [activeMaterial, setActiveMaterial] = React.useState<'wood' | 'metal' | 'stone'>(qMaterial);
	const [activeColor, setActiveColor] = React.useState<string>(qColor);
	const [activeModelId, setActiveModelId] = React.useState<string | null>(qModel || null);
	const [activeTexId, setActiveTexId] = React.useState<string | null>(qTex || null); // למתכת/אבן (סנכרון תצוגה)
	// מזהים ייעודיים לכל קטגוריה כדי לשמר בחירה בין מעברים
	const [activeMetalTexId, setActiveMetalTexId] = React.useState<string | null>(activeMaterial === 'metal' ? (qTex || null) : null);
	const [activeStoneTexId, setActiveStoneTexId] = React.useState<string | null>(activeMaterial === 'stone' ? (qTex || null) : null);
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
	// מובייל: אקורדיון קטגוריות בפאנל (ברירת מחדל: סגור כדי שלא ייווצר מרווח נוסף מתחת לקנבס)
	const [mobileOpenCat, setMobileOpenCat] = React.useState<
		'box' | 'material' | 'woodTexture' | 'woodColor' | 'nonWoodTexture' | 'path' | 'railing' | null
	>('box');
	// דסקטופ: אקורדיון קטגוריות – סגורות כברירת מחדל, נפתח בלחיצה
	const [desktopOpenCat, setDesktopOpenCat] = React.useState<
		'box' | 'material' | 'woodTexture' | 'woodColor' | 'nonWoodTexture' | 'path' | 'railing' | null
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
		cat: 'box' | 'material' | 'woodTexture' | 'woodColor' | 'nonWoodTexture' | 'path' | 'railing'
	): string => {
		switch (cat) {
			case 'box': return 'בחרו את עובי הדופן של המדרך – עבה או דקה. אפשר לשנות בכל שלב.';
			case 'material': return 'בחרו חומר בסיסי לעיבוד המדרך: עץ, מתכת או אבן טבעית.';
			case 'woodTexture': return 'בחרו דגם עץ (טקסטורה) שמתאים לקו העיצובי שלכם.';
			case 'woodColor': return 'בחרו גוון לעץ (טבעי/ווריאציות כהות/בהירות) לפי התמונות.';
			case 'nonWoodTexture': return 'בחרו טקסטורה למתכת/אבן. מומלץ לבחון את ההשתקפויות במודל.';
			case 'path': return 'בנו את מסלול המדרגות: הוסיפו ישרים/פודסטים והתאימו מספר מדרגות לפי הצורך.';
			case 'railing': return 'בחרו סוג מעקה: זכוכית/מתכת/כבלי נירוסטה והתאימו גוון/צד לפי ההעדפה.';
			default: return '';
		}
	}, []);
	const getCatTitle = React.useCallback((
		cat: 'box' | 'material' | 'woodTexture' | 'woodColor' | 'nonWoodTexture' | 'path' | 'railing'
	): string => {
		switch (cat) {
			case 'box': return 'דגם';
			case 'material': return 'חומר';
			case 'woodTexture': return 'טקסטורה (עץ)';
			case 'woodColor': return 'צבע (עץ)';
			case 'nonWoodTexture': return 'טקסטורה';
			case 'path': return 'מסלול';
			case 'railing': return 'מעקה';
			default: return '';
		}
	}, []);
	// ללא זרימה כפויה – אין מעבר אוטומטי או אינדקס שלב
	type Cat = 'box' | 'material' | 'woodTexture' | 'woodColor' | 'nonWoodTexture' | 'path' | 'railing';
	const stepOrderForSteps: Cat[] = activeMaterial === 'wood'
		? ['box', 'material', 'woodTexture', 'woodColor', 'path', 'railing']
		: ['box', 'material', 'nonWoodTexture', 'path', 'railing'];
	const getNextCatForSteps = (cat: Cat): Cat | null => {
		const i = stepOrderForSteps.indexOf(cat);
		return i >= 0 && i < stepOrderForSteps.length - 1 ? stepOrderForSteps[i + 1] : null;
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
			if (Array.isArray(s.pathSegments)) setPathSegments(s.pathSegments);
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

	// מחשבון מחיר בסיסי (מותאם למסלול) + תמחור מעקה לפי סוג
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
		const baseSetup = 1500; // פתיחת תיק/מדידות/שינוע בסיסי
		// מחיר למדרגה לפי החומר/טקסטורה הנבחרים (ברירת מחדל 800)
		let perStep = 800;
		// בחירת רשומת חומר פעילה
		let selectedRecord: MaterialRecord | undefined;
		if (activeMaterial === 'wood') {
			// לדגמי עץ – קח את הדגם הפעיל (יש בו price בסיסי)
			selectedRecord = activeModel as any;
		} else {
			// למתכת/אבן – קח את הרשומה ע"פ activeTexId
			selectedRecord = nonWoodModels.find(r => r.id === activeTexId) || undefined;
		}
		if (selectedRecord && typeof selectedRecord.price === 'number' && selectedRecord.price > 0) {
			perStep = selectedRecord.price;
		}
		const landingPrice = perStep * 2.5; // פודסט = פי 2.5 ממדרגה
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
			const glassRate = 1700; // ₪ למ״ר
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
			// כבלי נירוסטה – 1100 ₪ לכל כבל שמופיע בהדמייה
			// במודל: 3 כבלים לכל מדרגה עם מעקה, ו‑9 כבלים לכל פודסט ישר עם מעקה
			const cablesCount = stepsEnabledCount * 3 + landingsEnabledCount * 9;
			const cost = cablesCount * 1100;
			if (cost > 0) items.push({ label: 'מערכת כבלי נירוסטה', value: cost, qty: cablesCount, unitPrice: 1100, unitLabel: 'כבל' });
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
			return `מערכת כבלי נירוסטה 8 מ״מ (${cableName}, ${spanName})`;
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

	// בניית טקסט שיתוף לוואטסאפ (עם/בלי קישור)
	const buildWhatsappText = React.useCallback((leadId: string, shareUrl: string, includeUrl: boolean = true): string => {
		const materialLabel = activeMaterial === 'wood' ? 'עץ' : activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית';
		const textureName = activeMaterial === 'wood'
			? (activeModel?.name || activeModel?.id || 'דגם עץ')
			: (nonWoodModels.find(r => r.id === activeTexId)?.name || 'טקסטורה');
		const colorName = activeMaterial === 'wood'
			? (WOOD_SWATCHES.find(w => w.id === activeColor)?.label || activeColor)
			: undefined;
		const pathText = formatPathForShare(pathSegments);
		const railingText = formatRailing();
		const boxText = box === 'thick'
			? 'קלאסי'
			: box === 'thin'
			? 'להב'
			: box === 'rounded'
			? 'קפסולה'
			: box === 'taper'
			? 'דלתא'
			: box === 'wedge'
			? 'טריז'
			: box === 'ridge'
			? 'מרום'
			: '';
		const totalText = `₪${total.toLocaleString('he-IL')}`;
		// הכרחת כיוון LTR עבור ה‑URL באמצעות LRI/PDI (איסולציה) למניעת שבירה RTL
		const ltrUrl = `\u2066${shareUrl}\u2069`;

		const lines = [
			`*ASCENSO*\u200F`,
			`היי, צפיתי בהדמייה באתר ומעוניינ/ת להתקדם.`,
			`מס׳ הדמייה: ${formatLeadIdRTL(leadId)}`,
			`פרטי הבחירה שלי:`,
			`- דגם תיבה: ${boxText}`,
			`- חומר: ${materialLabel}${colorName ? `, צבע: ${colorName}` : ''}`,
			`- טקסטורה: ${textureName}`,
			`- מסלול: ${pathText}`,
			`- מעקה: ${railingText}`,
			`- מחיר משוער: ${totalText}`,
			``,
			`מעוניינ/ת לתאם מדידה ולקבל הצעת מחיר מסודרת בהתאם לשטח.`,
		];
		if (includeUrl) {
			lines.push(`פתיחת ההדמייה:`);
			lines.push(`${ltrUrl}`);
		}
		const body = lines.join('\n');
		// עטיפה כוללת ב‑RLE/PDF כדי לאלץ יישור RTL בווטסאפ
		return `\u202B${body}\u202C`;
	}, [activeMaterial, activeModel?.name, activeModel?.id, nonWoodModels, activeTexId, activeColor, pathSegments, formatPathForShare, formatRailing, box, total]);

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

	// שליחת טופס מודאל: הודעת וואטסאפ מאוחדת (פרטי הדמייה + פרטי לקוח)
	function handleBookingSubmit(e: React.FormEvent) {
		e.preventDefault();
		// הגנה: לא שולחים לפני שלב הזמן
		if (bookingStep !== 'time' || !preferredTime) {
			return;
		}
		const materialLabel = activeMaterial === 'wood' ? 'עץ' : activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית';
		const textureName = activeMaterial === 'wood'
			? (activeModel?.name || activeModel?.id || 'דגם עץ')
			: (nonWoodModels.find(r => r.id === activeTexId)?.name || 'טקסטורה');
		const colorName = activeMaterial === 'wood'
			? (WOOD_SWATCHES.find(w => w.id === activeColor)?.label || activeColor)
			: undefined;
		const pathText = formatPathForShare(pathSegments);
		const railingText = formatRailing();
		const boxText = box === 'thick'
			? 'קלאסי'
			: box === 'thin'
			? 'להב'
			: box === 'rounded'
			? 'קפסולה'
			: box === 'taper'
			? 'דלתא'
			: box === 'wedge'
			? 'טריז'
			: box === 'ridge'
			? 'מרום'
			: '';
		const totalText = `₪${total.toLocaleString('he-IL')}`;
		const leadId = generateLeadId();
		const timeLabel = preferredTime || '-';

		const lines = [
			'\u202B*ASCENSO*\u200F',
			`מס׳ הדמייה: ${formatLeadIdRTL(leadId)}`,
			`פרטי ההדמייה:`,
			`- דגם תיבה: ${boxText}`,
			`- חומר: ${materialLabel}${colorName ? `, צבע: ${colorName}` : ''}`,
			`- טקסטורה: ${textureName}`,
			`- מסלול: ${pathText}`,
			`- מעקה: ${railingText}`,
			`- מחיר משוער: ${totalText}`,
			``,
			`פרטי התקשרות:`,
			`- שם מלא: ${fullName}`,
			`- כתובת הפרויקט: ${projectAddress}`,
			
			`- תאריך מועדף: ${preferredDate || '-'}`,
			`- חלון זמן מועדף: ${timeLabel}`,
			``,
			`מעוניינ/ת לתאם מדידה ולקבל הצעת מחיר מסודרת בהתאם לשטח.`,
			'\u202C',
		].join('\n');

		const phone = whatsappPhone.replace('+', '');
		const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(lines)}`;
		window.open(url, '_blank');
		setBookingSubmitted(true);
	}

	if (!mounted) {
		// שלב SSR – אל תחיל הידרציה על תוכן דינמי כדי למנוע אזהרות
		return null;
	}

	return (
		<>
			<div className="min-h-screen w-full bg-[#EFEFEF]">
			<main className="max-w-7xl mx-auto px-4 lg:px-6 py-6" dir="rtl">
			<div className="grid grid-cols-1 gap-0">
				<section>
					{/* טאבים עליונים – מוצגים לפני ההדמייה בכל הגדלים */}
					<div id="live-top-tabs" ref={topTabsRef} className="bg-white/95 backdrop-blur border rounded-md mb-2" dir="rtl">
						{(() => {
							type Cat = 'box' | 'material' | 'woodTexture' | 'woodColor' | 'nonWoodTexture' | 'path' | 'railing';
							const nodes: Array<{ key: Cat; el: React.ReactElement }> = [];
							// נשתמש באותן מחלקות/תכנים מהפאנל הקיים
							nodes.push({
								key: 'box',
								el: (
									<div>
										<BoxPicker box={box as any} setBox={setBox as any} />
										{getNextCatForSteps('box') && (
											<div className="mt-2 flex justify-center">
												<button type="button" onClick={() => setMobileOpenCat(getNextCatForSteps('box')!)} className="px-6 py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
													המשך
												</button>
											</div>
										)}
										{/* צבעי מעקה לפי סוג שנבחר */}
										<div className="mb-3">
											{railing === 'glass' && (
												<div className="flex items-center justify-center gap-3">
													{([
														{ id: 'extra' as const, label: 'אקסטרה', color: '#aee7ff', border: '#81b1cc' },
														{ id: 'smoked' as const, label: 'מושחר', color: '#4a5568', border: '#2d3748' },
														{ id: 'bronze' as const, label: 'ברונזה', color: '#b08d57', border: '#8a6a3a' },
													]).map(sw => (
														<button
															key={sw.id}
															title={sw.label}
															aria-label={sw.label}
															onClick={() => setGlassTone(sw.id)}
															className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer ${glassTone === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
															style={{ backgroundColor: sw.color, borderColor: sw.border }}
														/>
													))}
												</div>
											)}
											{railing === 'metal' && (
												<div className="flex items-center justify-center gap-3">
													<button
														title="שחור"
														aria-label="שחור"
														onClick={() => { setRailingMetalSolid('#111111'); setRailingMetalId(null); }}
														className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer ${railingMetalSolid === '#111111' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
														style={{ backgroundColor: '#111111', borderColor: '#333' }}
													/>
													<button
														title="לבן"
														aria-label="לבן"
														onClick={() => { setRailingMetalSolid('#F5F5F5'); setRailingMetalId(null); }}
														className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer ${railingMetalSolid === '#F5F5F5' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
														style={{ backgroundColor: '#F5F5F5', borderColor: '#ddd' }}
													/>
												</div>
											)}
										</div>
									</div>
								),
							});
							nodes.push({
								key: 'material',
								el: (
									<div>
										<MaterialKindPicker
											activeMaterial={activeMaterial}
											onChange={(m) => startTransition(() => setActiveMaterial(m))}
										/>
										{getNextCatForSteps('material') && (
											<div className="mt-2 flex justify-center">
												<button type="button" onClick={() => setMobileOpenCat(getNextCatForSteps('material')!)} className="px-6 py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
													המשך
												</button>
											</div>
										)}
									</div>
								),
							});
							if (activeMaterial === 'wood') {
								nodes.push({
									key: 'woodTexture',
									el: (
										<div>
											<WoodTexturePicker
												woodModels={woodModels as any}
												activeModelId={activeModelId}
												onPick={(id) => startTransition(() => setActiveModelId(id))}
											/>
											{getNextCatForSteps('woodTexture') && (
												<div className="mt-2 flex justify-center">
													<button type="button" onClick={() => setMobileOpenCat(getNextCatForSteps('woodTexture')!)} className="px-6 py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
														המשך
													</button>
												</div>
											)}
										</div>
									),
								});
								nodes.push({
									key: 'woodColor',
									el: (
										<div>
											<WoodColorPicker
												swatches={WOOD_SWATCHES}
												activeModel={activeModel as any}
												activeColor={activeColor}
												colorHex={COLOR_HEX}
												onPick={(id) => startTransition(() => setActiveColor(id))}
											/>
											{getNextCatForSteps('woodColor') && (
												<div className="mt-2 flex justify-center">
													<button type="button" onClick={() => setMobileOpenCat(getNextCatForSteps('woodColor')!)} className="px-6 py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
														המשך
													</button>
												</div>
											)}
										</div>
									),
								});
							} else {
								nodes.push({
									key: 'nonWoodTexture',
									el: (
										<div>
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
											{getNextCatForSteps('nonWoodTexture') && (
												<div className="mt-2 flex justify-center">
													<button type="button" onClick={() => setMobileOpenCat(getNextCatForSteps('nonWoodTexture')!)} className="px-6 py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
														המשך
													</button>
												</div>
											)}
										</div>
									),
								});
							}
							nodes.push({
								key: 'path',
								el: (
									<div>
										<PathPicker
											shape={shape}
											steps={steps}
											stepsTotalForPath={stepsTotalForPath}
											pathSegments={pathSegments}
											setShape={setShape}
											setPathSegments={setPathSegments}
										/>
										{getNextCatForSteps('path') && (
											<div className="mt-2 flex justify-center">
												<button type="button" onClick={() => setMobileOpenCat(getNextCatForSteps('path')!)} className="px-6 py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
													המשך
												</button>
											</div>
										)}
									</div>
								),
							});
							nodes.push({
								key: 'railing',
								el: (
									<RailingPicker
										railing={railing}
										setRailing={setRailing}
										glassTone={glassTone}
										setGlassTone={setGlassTone}
										railingMetalSolid={railingMetalSolid}
										setRailingMetalSolid={setRailingMetalSolid}
										setRailingMetalId={setRailingMetalId}
										cableOptions={cableOptions}
										cableId={cableId}
										setCableId={setCableId}
										setCableColor={setCableColor}
										pathSegments={pathSegments}
										landingMeta={landingMeta}
										stepRailing={stepRailing}
										setStepRailing={setStepRailing}
										landingRailing={landingRailing}
										setLandingRailing={setLandingRailing}
									/>
								),
							});

							const mapNodes = new Map(nodes.map(n => [n.key, n.el]));
							const order: Cat[] = activeMaterial === 'wood' ? ['box','material','woodTexture','woodColor','path','railing'] : ['box','material','nonWoodTexture','path','railing'];
							return (
								<>
									{/* ציר שלבים – מספור וחיבור בין קטגוריות */}
									<div className="flex items-center overflow-x-auto px-3 py-3 w-full lg:justify-center gap-0 border-b border-gray-200" dir="rtl">
										{order.map((tab, i) => (
											<React.Fragment key={tab}>
												<button
													type="button"
													onClick={() => setMobileOpenCat(tab)}
													className={`inline-flex items-center gap-2 shrink-0 cursor-pointer py-1.5 px-2 rounded-md transition-colors hover:bg-gray-100 ${mobileOpenCat === tab ? 'bg-[#1a1a2e]/5' : ''}`}
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
												{i < order.length - 1 && (
													<span className="mx-1 w-6 min-w-[8px] shrink-0 border-t border-gray-300" aria-hidden />
												)}
											</React.Fragment>
										))}
									</div>
									<div className="pt-1 flex justify-center">
										<div className="w-full max-w-5xl text-center">
											{mapNodes.get((mobileOpenCat || order[0]) as Cat) as React.ReactElement}
										</div>
									</div>
								</>
							);
						})()}
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
						<div className="lg:col-span-2">
					<div ref={canvasWrapRef} className="w-full aspect-[16/9] lg:aspect-auto lg:h-[60vh] bg-white border overflow-hidden rounded fixed inset-x-0 z-30 lg:relative" style={{ height: mobileCanvasH || undefined, top: (mobileHeaderH + mobileTabsH) || 0 }}>
						<Canvas
							// תאורה קבועה ויציבה: בלי shadows ובלי post-processing
							shadows={false}
							camera={{ position: [-2.494, 1.897, 3.259], fov: 45 }}
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
								{/* רינדור PBR (תאורה/סביבה בתוך Staircase3D) */}
								<Staircase3D
									shape={shape}
									steps={steps}
									color={COLOR_HEX[activeColor] || '#C8A165'}
									materialKind={activeMaterial}
									railingKind={railing}
									railingSolidColor={railingMetalSolid}
									cablePreviewHeight={5}
									cableColor={cableColor}
									cableSpanMode={cableSpanMode}
									stepCableSpanModes={stepCableSpanMode}
									landingCableSpanModes={landingCableSpanMode}
									// בדגם מעוגל: גובה/עובי מדרגה קבוע 8 ס"מ
									treadThicknessOverride={box === 'thick' ? 0.11 : (box === 'wedge' ? 0.11 : (box === 'ridge' ? 0.02 : ((box === 'rounded') ? 0.08 : (box === 'taper' ? 0.12 : 0.07))))}
									boxModel={box === 'rounded' ? 'rounded' : (box === 'taper' ? 'taper' : (box === 'wedge' ? 'wedge' : (box === 'ridge' ? 'ridge' : 'rect')))}
									wedgeFrontThicknessM={0.035}
									ridgeFrontCenterThicknessM={0.09}
									ridgeFrontEdgeThicknessM={0.03}
									pathSegments={pathSegments}
									// דגם "הייטק" מוסתר כרגע
									hitech={false}
									hitechPlateThickness={0.012}
									hitechPlateHeight={0.27}
									hitechPlateTopOffsetM={0.03}
									hitechPlateInsetFromEdge={0.03}
									glassTone={glassTone}
									stepRailingStates={stepRailing}
									landingRailingStates={landingRailing}
									stepRailingSides={stepRailingSide}
									landingRailingSides={landingRailingSide}
									highQuality={isDesktopViewport}
									railingTextureUrl={(() => {
										if (railing === 'metal' && railingMetalId) {
											const rec = metalRailingOptions.find(r => r.id === railingMetalId);
											return rec?.images?.[0] || null;
										}
										return null;
									})()}
									railingBumpUrl={(() => {
										if (railing === 'metal' && railingMetalId) {
											const rec = metalRailingOptions.find(r => r.id === railingMetalId);
											return rec?.pbr?.bump?.[0] || null;
										}
										return null;
									})()}
									railingRoughnessUrl={(() => {
										if (railing === 'metal' && railingMetalId) {
											const rec = metalRailingOptions.find(r => r.id === railingMetalId);
											return rec?.pbr?.roughness?.[0] || null;
										}
										return null;
									})()}
									railingUvInset={(() => {
										if (railing === 'metal' && railingMetalId) {
											const rec = metalRailingOptions.find(r => r.id === railingMetalId);
											const cfg = MODEL_CONFIG[rec?.id || ''] || DEFAULT_MODEL_CONFIG;
											return cfg.inset || 0;
										}
										return 0;
									})()}
									textureUrl={(() => {
										if (activeMaterial === 'wood') {
											return activeModel?.variants?.[activeColor]?.[0] || activeModel?.images?.[0] || null;
										}
										const sel = nonWoodModels.find(r => r.id === activeTexId) || nonWoodModels[0];
										if (sel?.solid) return null;
										return sel?.images?.[0] || null;
									})()}
									bumpUrl={
										activeMaterial === 'wood'
											? activeModel?.pbrVariants?.[activeColor]?.bump?.[0] || null
											: (() => { const sel = nonWoodModels.find(r => r.id === activeTexId) || nonWoodModels[0]; return sel?.solid ? null : (sel?.pbr?.bump?.[0] || null); })()
									}
									roughnessUrl={
										activeMaterial === 'wood'
											? activeModel?.pbrVariants?.[activeColor]?.roughness?.[0] || null
											: (() => { const sel = nonWoodModels.find(r => r.id === activeTexId) || nonWoodModels[0]; return sel?.solid ? null : (sel?.pbr?.roughness?.[0] || null); })()
									}
									materialSolidColor={(() => { if (activeMaterial === 'wood') return null; const sel = nonWoodModels.find(r => r.id === activeTexId) || nonWoodModels[0]; return (sel as any)?.solid || null; })()}
									tileScale={(() => {
										if (activeMaterial === 'wood') {
											const cfg = MODEL_CONFIG[activeModel?.id || ''] || DEFAULT_MODEL_CONFIG;
											return cfg.tile ?? DEFAULT_MODEL_CONFIG.tile!;
										}
										const cfg = MODEL_CONFIG[activeTexId || ''] || DEFAULT_MODEL_CONFIG;
										return cfg.tile ?? DEFAULT_MODEL_CONFIG.tile!;
									})()}
									bumpScaleOverride={(() => {
										if (activeMaterial === 'wood') {
											const cfg = MODEL_CONFIG[activeModel?.id || ''] || DEFAULT_MODEL_CONFIG;
											return cfg.bump;
										}
										const cfg = MODEL_CONFIG[activeTexId || ''] || DEFAULT_MODEL_CONFIG;
										return cfg.bump;
									})()}
									uvInset={(() => {
										if (activeMaterial === 'wood') {
											const cfg = MODEL_CONFIG[activeModel?.id || ''] || DEFAULT_MODEL_CONFIG;
											return cfg.inset || 0;
										}
										const cfg = MODEL_CONFIG[activeTexId || ''] || DEFAULT_MODEL_CONFIG;
										return cfg.inset || 0;
									})()}
								/>
								<OrbitControls
									ref={orbitRef}
									enableDamping
									makeDefault
									zoomToCursor
									target={[0.304, 0.930, -0.053]}
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

						{/* פירוט חשבון צדדי בדסקטופ */}
						<div className="hidden lg:block lg:col-span-1">
							<div className="bg-white rounded-md p-3 h-full">
								<div className="font-semibold mb-1">פירוט חשבון (כולל מע״מ)</div>
								<ul className="text-sm text-gray-700 space-y-1">
									{breakdown.map(b => (
										<li key={b.label} className="flex justify-between">
											<span>
												{b.label}
												{typeof b.qty !== 'undefined' && typeof b.unitPrice !== 'undefined' && (
													<span className="text-gray-500">
														{' '}
														(
														{(() => {
															const isDecimalQty = b.unitLabel === 'מ׳' || b.unitLabel === 'מ״ר';
															const qtyStr = isDecimalQty
																? `${(b.qty as number).toFixed(2)}${b.unitLabel ? ` ${b.unitLabel}` : ''}`
																: `${Number(b.qty).toLocaleString('he-IL')}${b.unitLabel ? ` ${b.unitLabel}` : ''}`;
															return `${qtyStr} × ₪${Number(b.unitPrice).toLocaleString('he-IL')}`;
														})()}
														)
													</span>
												)}
											</span>
											<span>₪{b.value.toLocaleString('he-IL')}</span>
										</li>
									))}
								</ul>
								<div className="mt-2 pt-2 border-t flex justify-between font-bold">
									<span>סה״כ כולל מע״מ</span>
									<span>₪{total.toLocaleString('he-IL')}</span>
								</div>
								<button
									onClick={() => setBookingOpen(true)}
									className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a1a2e] text-white px-5 py-3 text-base font-semibold shadow-sm hover:opacity-95 cursor-pointer"
									aria-label="פתח טופס תיאום פגישה"
								>
									<span>תיאום פגישה</span>
								</button>
								<div className="text-[11px] text-gray-500 mt-1">
									הערכה משוערת להמחשה בלבד.<br/>המחיר כולל קונסטרוקציה והתקנה.
								</div>
							</div>
						</div>
					</div>

					{/* פירוט חשבון מתחת להדמייה – מובייל/טאבלט בלבד */}
					<div className="mt-3 bg-white rounded-md p-3 lg:hidden">
						<div className="font-semibold mb-1">פירוט חשבון (כולל מע״מ)</div>
						<ul className="text-sm text-gray-700 space-y-1">
							{breakdown.map(b => (
								<li key={b.label} className="flex justify-between">
									<span>
										{b.label}
										{typeof b.qty !== 'undefined' && typeof b.unitPrice !== 'undefined' && (
											<span className="text-gray-500">
												{' '}
												(
												{(() => {
													const isDecimalQty = b.unitLabel === 'מ׳' || b.unitLabel === 'מ״ר';
													const qtyStr = isDecimalQty
														? `${(b.qty as number).toFixed(2)}${b.unitLabel ? ` ${b.unitLabel}` : ''}`
														: `${Number(b.qty).toLocaleString('he-IL')}${b.unitLabel ? ` ${b.unitLabel}` : ''}`;
													return `${qtyStr} × ₪${Number(b.unitPrice).toLocaleString('he-IL')}`;
												})()}
												)
											</span>
										)}
									</span>
									<span>₪{b.value.toLocaleString('he-IL')}</span>
								</li>
							))}
						</ul>
						<div className="mt-2 pt-2 border-t flex justify-between font-bold">
							<span>סה״כ כולל מע״מ</span>
							<span>₪{total.toLocaleString('he-IL')}</span>
						</div>
						<button
							onClick={() => setBookingOpen(true)}
							className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1a1a2e] text-white px-5 py-3 text-base font-semibold shadow-sm hover:opacity-95 cursor-pointer"
							aria-label="פתח טופס תיאום פגישה"
						>
							<span>תיאום פגישה</span>
						</button>
						<div className="text-[11px] text-gray-500 mt-1">
							הערכה משוערת להמחשה בלבד.<br/>המחיר כולל קונסטרוקציה והתקנה.
						</div>
					</div>

					{/* בחירת דגם מדרגה – אינליין בסגנון טאבים אופקיים (מובייל) */}
					<div className="lg:hidden bg-white border rounded-md px-3 py-2">
						<div className="text-xs font-medium mb-2" dir="rtl">דגם מדרגה</div>
						<div role="tablist" aria-label="בחירת דגם מדרגה" className="flex items-center gap-2 overflow-x-auto">
							<button
								role="tab"
								aria-selected={box === 'thick'}
								className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm whitespace-nowrap ${box === 'thick' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white hover:bg-gray-100'}`}
								onClick={() => setBox('thick')}
							>
								{/* Icon: thick profile */}
								<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
									<rect x="3" y="9" width="18" height="6" rx="2" fill="currentColor" opacity="0.2" />
									<rect x="4" y="10" width="16" height="4" rx="1" stroke="currentColor" fill="none" />
								</svg>
								דופן עבה
							</button>
							<button
								role="tab"
								aria-selected={box === 'thin'}
								className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm whitespace-nowrap ${box === 'thin' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white hover:bg-gray-100'}`}
								onClick={() => setBox('thin')}
							>
								{/* Icon: thin profile */}
								<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
									<rect x="4" y="11" width="16" height="2" rx="1" stroke="currentColor" fill="none" />
								</svg>
								קצר
							</button>
						</div>
					</div>
					{/* פירוט צבעים/מעקה – הוסר. מוצג רק בטאב העליון. */}
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
							type Cat = 'box' | 'material' | 'woodTexture' | 'woodColor' | 'nonWoodTexture' | 'path' | 'railing';
							const nodes: Array<{ key: Cat; el: React.ReactElement }> = [];
							const stepOrder: Cat[] = activeMaterial === 'wood'
								? ['box','material','woodTexture','woodColor','path','railing']
								: ['box','material','nonWoodTexture','path','railing'];
							const getNextCat = (cat: Cat): Cat | null => {
								const i = stepOrder.indexOf(cat);
								return i >= 0 && i < stepOrder.length - 1 ? stepOrder[i + 1] : null;
							};

							// Box
							nodes.push({
								key: 'box',
								el: (
									<div>
										{false && (
										<button
											className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] cursor-pointer ${mobileOpenCat === 'box' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
											onClick={() => setMobileOpenCat(prev => (prev === 'box' ? null : 'box'))}
											aria-expanded={mobileOpenCat === 'box'}
										>
											<span className="font-medium">דגם תיבה</span>
											<span className="text-sm text-gray-600">
												{box === 'thick'
													? 'קלאסי'
													: box === 'thin'
													? 'להב'
													: box === 'rounded'
													? 'קפסולה'
													: box === 'taper'
													? 'דלתא'
													: box === 'wedge'
													? 'טריז'
													: 'מרום'}
											</span>
										</button>
										)}
										{mobileOpenCat === 'box' && (
											<div className="p-3 bg-white border border-t-0 rounded-b-md">
												<div className="flex flex-wrap gap-2">
													{([
														{ id: 'thick', label: 'תיבה עבה‑דופן' },
														{ id: 'thin', label: 'תיבה דקה‑דופן' },
													] as const).map(opt => (
														<button
															key={opt.id}
															className={`px-3 py-1 text-sm rounded-full border ${box === opt.id ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
															onClick={() => setBox(opt.id)}
														>
															{opt.label}
														</button>
													))}
												</div>
												{getNextCat('box') && (
													<div className="mt-3 px-3 pb-2">
														<button type="button" onClick={() => setMobileOpenCat(getNextCat('box')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
															המשך
														</button>
													</div>
												)}
											</div>
										)}
									</div>
								),
							});

							// Material
							nodes.push({
								key: 'material',
								el: (
									<div>
										{false && (
										<button
											className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] cursor-pointer ${mobileOpenCat === 'material' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
											onClick={() => setMobileOpenCat(prev => (prev === 'material' ? null : 'material'))}
											aria-expanded={mobileOpenCat === 'material'}
										>
											<span className="font-medium">חומר</span>
											<span className="text-sm text-gray-600">{activeMaterial === 'wood' ? 'עץ' : activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית'}</span>
										</button>
										)}
										{mobileOpenCat === 'material' && (
											<div className="p-3 bg-white border border-t-0 rounded-b-md">
												<div className="flex flex-wrap gap-2">
													{(['wood', 'metal', 'stone'] as const).map(m => (
														<button
															key={m}
															className={`px-3 py-1 text-sm rounded-full border ${activeMaterial === m ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
															onClick={() => startTransition(() => setActiveMaterial(m))}
														>
															{m === 'wood' ? 'עץ' : m === 'metal' ? 'מתכת' : 'אבן טבעית'}
														</button>
													))}
												</div>
												{getNextCat('material') && (
													<div className="mt-3 px-3 pb-2">
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

							// Wood sections
							if (activeMaterial === 'wood') {
								nodes.push({
									key: 'woodTexture',
									el: (
										<div>
											{false && (
											<button
												className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] cursor-pointer ${mobileOpenCat === 'woodTexture' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
												onClick={() => setMobileOpenCat(prev => (prev === 'woodTexture' ? null : 'woodTexture'))}
												aria-expanded={mobileOpenCat === 'woodTexture'}
											>
												<span className="font-medium">טקסטורה</span>
												<span className="text-sm text-gray-600">{activeModel?.name || activeModel?.id || ''}</span>
											</button>
											)}
											{mobileOpenCat === 'woodTexture' && (
												<div className="p-3 bg-white border border-t-0 rounded-b-md">
													<div className="flex flex-wrap gap-3">
														{woodModels.map(m => (
															<button
																key={m.id}
																aria-label={m.name || m.id}
																title={m.name || m.id}
																onClick={() => startTransition(() => setActiveModelId(m.id))}
																className={`w-10 h-10 rounded-full border-2 bg-center bg-cover ${activeModelId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
																style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
															/>
														))}
													</div>
													{getNextCat('woodTexture') && (
														<div className="mt-3 px-3 pb-2">
															<button type="button" onClick={() => setMobileOpenCat(getNextCat('woodTexture')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
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
									key: 'woodColor',
									el: (
										<div>
											{false && (
											<button
												className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] cursor-pointer ${mobileOpenCat === 'woodColor' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
												onClick={() => setMobileOpenCat(prev => (prev === 'woodColor' ? null : 'woodColor'))}
												aria-expanded={mobileOpenCat === 'woodColor'}
											>
												<span className="font-medium">צבע</span>
												<span className="text-sm text-gray-600">
													{WOOD_SWATCHES.find(sw => sw.id === activeColor)?.label || activeColor}
												</span>
											</button>
											)}
											{mobileOpenCat === 'woodColor' && (
												<>
													<div className="p-3 bg-white border border-t-0 rounded-b-md">
														{(() => {
															const items = WOOD_SWATCHES.filter(sw => !!activeModel?.variants?.[sw.id]);
															return (
																<div className="flex items-center gap-3 flex-wrap">
																	{items.map(sw => {
																		const img = activeModel?.variants?.[sw.id]?.[0];
																		const solid = COLOR_HEX[sw.id];
																		return (
																			<button
																				key={sw.id}
																				aria-label={sw.label}
																				title={sw.label}
																				onClick={() => startTransition(() => setActiveColor(sw.id))}
																				className={`w-8 h-8 rounded-full border-2 cursor-pointer ${activeColor === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
																				style={{
																					backgroundImage: img ? `url("${encodeURI(img)}")` : undefined,
																					backgroundColor: img ? undefined : solid,
																					backgroundSize: 'cover',
																					backgroundPosition: 'center',
																					borderColor: '#ddd',
																				}}
																			/>
																		);
																	})}
																</div>
															);
														})()}
													</div>
													{getNextCat('woodColor') && (
														<div className="mt-3 px-3 pb-2">
															<button type="button" onClick={() => setMobileOpenCat(getNextCat('woodColor')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
																המשך
															</button>
														</div>
													)}
												</>
											)}
										</div>
									),
								});
							} else {
								// Non-wood texture
								nodes.push({
									key: 'nonWoodTexture',
									el: (
										<div>
											{false && (
											<button
											className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] cursor-pointer ${mobileOpenCat === 'nonWoodTexture' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
												onClick={() => setMobileOpenCat(prev => (prev === 'nonWoodTexture' ? null : 'nonWoodTexture'))}
												aria-expanded={mobileOpenCat === 'nonWoodTexture'}
											>
												<span className="font-medium">טקסטורה</span>
												<span className="text-sm text-gray-600">
													{(() => {
														const sel = nonWoodModels.find(x => x.id === activeTexId);
														return sel?.name || sel?.id || '';
													})()}
												</span>
											</button>
											)}
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
																className={`w-10 h-10 rounded-full border-2 bg-center bg-cover ${activeTexId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
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
							}

							// Path
							nodes.push({
								key: 'path',
								el: (
									<div>
										{false && (
										<button
											className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md transition-all duration-150 hover:bg-gray-50 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] cursor-pointer ${mobileOpenCat === 'path' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
											onClick={() => setMobileOpenCat(prev => (prev === 'path' ? null : 'path'))}
											aria-expanded={mobileOpenCat === 'path'}
										>
											<span className="font-medium">מסלול</span>
											<span className="text-sm text-gray-600">{encodePath(pathSegments)}</span>
										</button>
										)}
										{mobileOpenCat === 'path' && (
											<div className="p-3 bg-white border border-t-0 rounded-b-md space-y-3">
												<div className="flex flex-wrap gap-2">
													<button
														className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
														onClick={() => setPathSegments(prev => [...prev, { kind: 'straight', steps: 5 }])}
													>
														הוסף ישר (5 מדר׳)
													</button>
													<button
														className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
														onClick={() => setPathSegments(prev => [
																...prev,
																{ kind: 'landing', turn: 'right' },
																{ kind: 'straight', steps: 1 },
															])}
													>
														פודסט + ימינה
													</button>
													<button
														className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
														onClick={() => setPathSegments(prev => [
																...prev,
																{ kind: 'landing', turn: 'left' },
																{ kind: 'straight', steps: 1 },
															])}
													>
														פודסט + שמאלה
													</button>
													<button
														className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
														onClick={() => setPathSegments(prev => [...prev, { kind: 'landing' }])}
													>
														פודסט
													</button>
												</div>
												<div className="space-y-2">
													<ul className="space-y-2">
														{pathSegments.map((seg, idx) => (
															<li key={idx} className="flex items-center gap-3 justify-between border rounded-md px-2 py-1 bg-white">
																<div className="flex items-center gap-3">
																	<span className="text-sm text-gray-700">
																		{seg.kind === 'straight' ? 'ישר' : seg.turn ? `פודסט + ${seg.turn === 'right' ? 'ימינה' : 'שמאלה'}` : 'פודסט'}
																	</span>
																	{seg.kind === 'straight' && (
																		<div className="flex items-center gap-2">
																			<button
																				className="px-2 py-1 rounded border"
																				aria-label="פחות מדרגות"
																				onClick={() => {
																					setPathSegments(prev =>
																						prev.map((seg2, i) =>
																							i === idx && seg2.kind === 'straight'
																								? { kind: 'straight', steps: Math.max(1, (seg2 as any).steps - 1) }
																								: seg2
																						)
																					);
																				}}
																			>
																				-
																			</button>
																			<span className="text-sm">מדרגות: {(seg as any).steps}</span>
																			<button
																				className="px-2 py-1 rounded border"
																				aria-label="יותר מדרגות"
																				onClick={() => {
																					setPathSegments(prev =>
																						prev.map((seg2, i) =>
																							i === idx && seg2.kind === 'straight'
																								? { kind: 'straight', steps: Math.min(25, (seg2 as any).steps + 1) }
																								: seg2
																						)
																					);
																				}}
																			>
																				+
																			</button>
																		</div>
																	)}
																</div>
																<div>
																	<button
																		className="text-xs text-red-600 hover:underline"
																		onClick={() => {
																			setPathSegments(prev => {
																				const out = prev.filter((_: any, i: number) => i !== idx);
																				return out.length ? out : [{ kind: 'straight', steps: 5 }];
																			});
																		}}
																	>
																		הסר
																	</button>
																</div>
															</li>
														))}
													</ul>
												</div>
												{getNextCat('path') && (
													<div className="mt-3">
														<button type="button" onClick={() => setMobileOpenCat(getNextCat('path')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
															המשך
														</button>
													</div>
												)}
											</div>
										)}
									</div>
								),
							});

							// Railing – האזור הישן הוסר; נשאר רק בטאב העליון.

							// סדר קבוע: Box -> Material -> (WoodTexture, WoodColor | NonWoodTexture) -> Path -> Railing
							const fixedOrder: Cat[] = activeMaterial === 'wood'
								? ['path','box','material','woodTexture','woodColor','railing']
								: ['path','box','material','nonWoodTexture','railing'];
							// Tabs bar
							const tabOrder: Cat[] = activeMaterial === 'wood'
								? ['box','material','woodTexture','woodColor','path','railing']
								: ['box','material','nonWoodTexture','path','railing'];
							const mapNodes = new Map(nodes.map(n => [n.key, n.el]));
							return (
								<>
									<div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b">
										{/* ציר שלבים – מספור וקו חיבור */}
										<div className="flex items-center overflow-x-auto px-2 py-3 w-full lg:justify-center gap-0" dir="rtl">
											{tabOrder.map((tab, i) => (
												<React.Fragment key={tab}>
													<button
														type="button"
														onClick={() => setMobileOpenCat(tab)}
														className={`inline-flex items-center gap-2 shrink-0 cursor-pointer py-1.5 px-2 rounded-md transition-colors hover:bg-gray-100 ${mobileOpenCat === tab ? 'bg-[#1a1a2e]/5' : ''}`}
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

						{/* פירוט חשבון – מוצג בסוף המובייל מתחת לקטגוריות */}
						<div className="mt-3 bg-white rounded-md p-3">
							<div className="font-semibold mb-1">פירוט חשבון (כולל מע״מ)</div>
							<ul className="text-sm text-gray-700 space-y-1">
								{breakdown.map(b => (
									<li key={b.label} className="flex justify-between">
										<span>
											{b.label}
											{typeof b.qty !== 'undefined' && typeof b.unitPrice !== 'undefined' && (
												<span className="text-gray-500">
													{' '}
													(
													{(() => {
														const isDecimalQty = b.unitLabel === 'מ׳' || b.unitLabel === 'מ״ר';
														const qtyStr = isDecimalQty
															? `${(b.qty as number).toFixed(2)}${b.unitLabel ? ` ${b.unitLabel}` : ''}`
															: `${Number(b.qty).toLocaleString('he-IL')}${b.unitLabel ? ` ${b.unitLabel}` : ''}`;
														return `${qtyStr} × ₪${Number(b.unitPrice).toLocaleString('he-IL')}`;
													})()}
													)
												</span>
											)}
										</span>
										<span>₪{b.value.toLocaleString('he-IL')}</span>
									</li>
								))}
							</ul>
							<div className="mt-2 pt-2 border-t flex justify-between font-bold">
								<span>סה״כ כולל מע״מ</span>
								<span>₪{total.toLocaleString('he-IL')}</span>
							</div>
							<div className="text-[11px] text-gray-500 mt-1">
								הערכה משוערת להמחשה בלבד.<br/>המחיר כולל קונסטרוקציה והתקנה.
							</div>
						</div>
					</div>

					{/* דסקטופ: הפאנל המקורי – מוסתר בשלב זה */}
					<div className="hidden lg:hidden relative border p-4 bg-white rounded-xl shadow-sm space-y-5 flex-col min-h-[70vh]">
						{/* בחירת דגם מדרגה – אינליין (דסקטופ) */}
						<div>
							<div className="text-xs font-medium mb-2" dir="rtl">דגם מדרגה</div>
							<div role="tablist" aria-label="בחירת דגם מדרגה" className="flex items-center gap-2">
								<button
									role="tab"
									aria-selected={box === 'thick'}
									className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm whitespace-nowrap ${box === 'thick' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white hover:bg-gray-100'}`}
									onClick={() => setBox('thick')}
								>
									<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
										<rect x="3" y="9" width="18" height="6" rx="2" fill="currentColor" opacity="0.2" />
										<rect x="4" y="10" width="16" height="4" rx="1" stroke="currentColor" fill="none" />
									</svg>
									דופן עבה
								</button>
								<button
									role="tab"
									aria-selected={box === 'thin'}
									className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm whitespace-nowrap ${box === 'thin' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white hover:bg-gray-100'}`}
									onClick={() => setBox('thin')}
								>
									<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
										<rect x="4" y="11" width="16" height="2" rx="1" stroke="currentColor" fill="none" />
									</svg>
									קצר
								</button>
							</div>
						</div>
						<div>
							<button
								className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md cursor-pointer hover:bg-gray-50 transition-all duration-150 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] ${desktopOpenCat === 'box' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
								onClick={() => setDesktopOpenCat(prev => (prev === 'box' ? null : 'box'))}
								aria-expanded={desktopOpenCat === 'box'}
							>
								<span className="text-sm font-medium">דגם תיבה</span>
								<span className="text-sm text-gray-600">
									{box === 'thick'
										? 'קלאסי'
										: box === 'thin'
										? 'להב'
										: box === 'rounded'
										? 'קפסולה'
										: box === 'taper'
										? 'דלתא'
										: box === 'wedge'
										? 'טריז'
										: 'מרום'}
								</span>
							</button>
							{desktopOpenCat === 'box' && (
								<div className="p-3 bg-white border border-t-0 rounded-b-md">
									<div className="flex flex-wrap gap-2">
										{([
											{ id: 'thick', label: 'תיבה עבה‑דופן' },
											{ id: 'thin', label: 'תיבה דקה‑דופן' },
											{ id: 'wedge', label: 'דגם אלכסוני' },
											{ id: 'ridge', label: 'דגם רכס מרכזי' },
										] as const).map(opt => (
											<button
												key={opt.id}
												className={`px-3 py-1 text-sm rounded-full border ${box === opt.id ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
												onClick={() => setBox(opt.id)}
											>
												{opt.label}
											</button>
										))}
									</div>
									{getNextCatForSteps('box') && (
										<div className="mt-3">
											<button type="button" onClick={() => setDesktopOpenCat(getNextCatForSteps('box')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
												המשך
											</button>
										</div>
									)}
								</div>
							)}
						</div>
						<div>
							<button
								className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md cursor-pointer hover:bg-gray-50 transition-all duration-150 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] ${desktopOpenCat === 'material' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
								onClick={() => setDesktopOpenCat(prev => (prev === 'material' ? null : 'material'))}
								aria-expanded={desktopOpenCat === 'material'}
							>
								<span className="text-sm font-medium">חומר</span>
								<span className="text-sm text-gray-600">{activeMaterial === 'wood' ? 'עץ' : activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית'}</span>
							</button>
							{desktopOpenCat === 'material' && (
								<div className="p-3 bg-white border border-t-0 rounded-b-md">
									<div className="flex flex-wrap gap-2">
										{(['wood', 'metal', 'stone'] as const).map(m => (
											<button
												key={m}
												className={`px-3 py-1 text-sm rounded-full border ${activeMaterial === m ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
												onClick={() => startTransition(() => setActiveMaterial(m))}
											>
												{m === 'wood' ? 'עץ' : m === 'metal' ? 'מתכת' : 'אבן טבעית'}
											</button>
										))}
									</div>
									{getNextCatForSteps('material') && (
										<div className="mt-3">
											<button type="button" onClick={() => setDesktopOpenCat(getNextCatForSteps('material')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
												המשך
											</button>
										</div>
									)}
								</div>
							)}
						</div>

						{activeMaterial === 'wood' && (
							<>
								<div>
									<button
										className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md cursor-pointer hover:bg-gray-50 transition-all duration-150 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] ${desktopOpenCat === 'woodTexture' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
										onClick={() => setDesktopOpenCat(prev => (prev === 'woodTexture' ? null : 'woodTexture'))}
										aria-expanded={desktopOpenCat === 'woodTexture'}
									>
										<span className="text-sm font-medium">טקסטורה</span>
										<span className="text-xs font-normal text-gray-600">
											{activeModel?.name || activeModel?.id || ''}
										</span>
									</button>
									{desktopOpenCat === 'woodTexture' && (
										<div className="p-3 bg-white border border-t-0 rounded-b-md">
											<div className="flex flex-wrap gap-3">
												{woodModels.map(m => (
													<button
														key={m.id}
														aria-label={m.name || m.id}
														title={m.name || m.id}
														onClick={() => startTransition(() => setActiveModelId(m.id))}
														className={`w-10 h-10 rounded-full border-2 bg-center bg-cover ${activeModelId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
														style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
													/>
												))}
											</div>
											{getNextCatForSteps('woodTexture') && (
												<div className="mt-3">
													<button type="button" onClick={() => setDesktopOpenCat(getNextCatForSteps('woodTexture')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
														המשך
													</button>
												</div>
											)}
										</div>
									)}
								</div>
								<div>
									<button
										className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md cursor-pointer hover:bg-gray-50 transition-all duration-150 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] ${desktopOpenCat === 'woodColor' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
										onClick={() => setDesktopOpenCat(prev => (prev === 'woodColor' ? null : 'woodColor'))}
										aria-expanded={desktopOpenCat === 'woodColor'}
									>
										<span className="text-sm font-medium">צבע</span>
										<span className="text-xs font-normal text-gray-600">
											{WOOD_SWATCHES.find(sw => sw.id === activeColor)?.label || activeColor}
										</span>
									</button>
									{desktopOpenCat === 'woodColor' && (
										<>
											<div className="p-3 bg-white border border-t-0 rounded-b-md">
												{(() => {
													const items = WOOD_SWATCHES.filter(sw => !!activeModel?.variants?.[sw.id]);
													return (
														<div className="flex items-center gap-3 flex-wrap">
															{items.map(sw => {
																const img = activeModel?.variants?.[sw.id]?.[0];
																const solid = COLOR_HEX[sw.id];
																return (
																	<button
																		key={sw.id}
																		aria-label={sw.label}
																		title={sw.label}
																		onClick={() => startTransition(() => setActiveColor(sw.id))}
																		className={`w-8 h-8 rounded-full border-2 ${activeColor === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
																		style={{
																			backgroundImage: img ? `url("${encodeURI(img)}")` : undefined,
																			backgroundColor: img ? undefined : solid,
																			backgroundSize: 'cover',
																			backgroundPosition: 'center',
																			borderColor: '#ddd',
																		}}
																	/>
																);
															})}
														</div>
													);
												})()}
											</div>
											{getNextCatForSteps('woodColor') && (
												<div className="mt-3">
													<button type="button" onClick={() => setDesktopOpenCat(getNextCatForSteps('woodColor')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
														המשך
													</button>
												</div>
											)}
										</>
									)}
								</div>
							</>
						)}

						{activeMaterial !== 'wood' && (
							<div className="mt-3">
								<button
									className={`w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md cursor-pointer hover:bg-gray-50 transition-all duration-150 hover:shadow-sm active:scale-[.99] focus-visible:ring-2 focus-visible:ring-[#1a1a2e] ${desktopOpenCat === 'nonWoodTexture' ? 'border-[#1a1a2e] !bg-[#E5E7EB] !text-[#1a1a2e]' : ''}`}
									onClick={() => setDesktopOpenCat(prev => (prev === 'nonWoodTexture' ? null : 'nonWoodTexture'))}
									aria-expanded={desktopOpenCat === 'nonWoodTexture'}
								>
									<span className="text-sm font-medium">טקסטורה</span>
									<span className="text-xs font-normal text-gray-600">
										{(() => {
											const sel = nonWoodModels.find(x => x.id === activeTexId);
											return sel?.name || sel?.id || '';
										})()}
									</span>
								</button>
								{desktopOpenCat === 'nonWoodTexture' && (
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
													className={`w-10 h-10 rounded-full border-2 bg-center bg-cover ${activeTexId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
													style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, backgroundColor: (!m.images || m.images.length === 0) && (m as any).solid ? (m as any).solid : undefined, borderColor: '#ddd', backgroundSize: (m as any).category === 'metal' ? '140%' as any : undefined }}
												/>
											))}
										</div>
										{getNextCatForSteps('nonWoodTexture') && (
											<div className="mt-3">
												<button type="button" onClick={() => setDesktopOpenCat(getNextCatForSteps('nonWoodTexture')!)} className="w-full py-2.5 rounded-md bg-[#1a1a2e] text-white font-medium text-sm hover:opacity-90">
													המשך
												</button>
											</div>
										)}
									</div>
								)}
							</div>
						)}

						{/* אקורדיון מסלול/מעקה הוסר – ניהול דרך הטאבים העליונים בלבד */}
							<div ref={priceRef} className={`bg-gray-50 rounded-md p-3 ${pricePing ? 'ring-2 ring-[#1a1a2e]' : ''}`}>
								<div className="font-semibold mb-1">פירוט חשבון (כולל מע״מ)</div>
								<ul className="text-sm text-gray-700 space-y-1">
									{breakdown.map(b => (
										<li key={b.label} className="flex justify-between">
											<span>
												{b.label}
												{typeof b.qty !== 'undefined' && typeof b.unitPrice !== 'undefined' && (
													<span className="text-gray-500">
														{' '}
														(
														{(() => {
															const isDecimalQty = b.unitLabel === 'מ׳' || b.unitLabel === 'מ״ר';
															const qtyStr = isDecimalQty
																? `${(b.qty as number).toFixed(2)}${b.unitLabel ? ` ${b.unitLabel}` : ''}`
																: `${Number(b.qty).toLocaleString('he-IL')}${b.unitLabel ? ` ${b.unitLabel}` : ''}`;
															return `${qtyStr} × ₪${Number(b.unitPrice).toLocaleString('he-IL')}`;
														})()}
														)
													</span>
												)}
											</span>
											<span>₪{b.value.toLocaleString('he-IL')}</span>
										</li>
									))}
								</ul>
								<div className="mt-2 pt-2 border-t flex justify-between font-bold">
									<span>סה״כ כולל מע״מ</span>
									<span>₪{total.toLocaleString('he-IL')}</span>
								</div>
								<div className="text-[11px] text-gray-500 mt-1">
									הערכה משוערת להמחשה בלבד.<br/>המחיר כולל קונסטרוקציה והתקנה.
								</div>
							</div>

						{/* ספייסר תחתון בפאנל כדי שלא ייכנס מתחת לסרגל הקבוע בדסקטופ */}
						<div className="hidden lg:block h-2" />
					</div>
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
						aria-label="פתח טופס תיאום פגישה"
						className="inline-flex items-center gap-2 rounded-md bg-[#1a1a2e] text-white px-4 py-2 text-base font-semibold shadow-md hover:opacity-95 cursor-pointer"
					>
						<span>תיאום פגישה</span>
					</button>
					<div className="text-right text-[#1a1a2e]">
						<div className="text-lg font-bold">
							<span>{`סה\"כ `}₪{total.toLocaleString('he-IL')}</span>
						</div>
						<div className="text-[11px] text-gray-500 leading-snug">כולל מע״מ 18%</div>
					</div>
				</div>
			</div>
		)}

		{/* דסקטופ: סיכום קבוע מיושר בדיוק לפאנל הקטגוריות – מוסתר בשלב זה */}
		{false && desktopBarPos && (
			<div
				className="hidden lg:block fixed bottom-0 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border shadow-lg rounded-t-lg"
				style={{ left: (desktopBarPos?.left ?? 0) - 16, width: (desktopBarPos?.width ?? 0) + 32 }}
			>
				<div className="px-5 py-3 flex items-center justify-between gap-4">
					<button
						onClick={openBooking}
						aria-label="פתח טופס תיאום פגישה"
						className="inline-flex items-center gap-3 rounded-md bg-[#1a1a2e] text-white px-5 py-2.5 text-lg font-semibold shadow-sm hover:opacity-95 cursor-pointer"
					>
						<span>תיאום פגישה</span>
					</button>
					<div className="text-right text-[#1a1a2e]">
						<div className="text-xl font-bold">
							<span>{`סה\"כ `}₪{total.toLocaleString('he-IL')}</span>
						</div>
						<div className="text-[11px] text-gray-500 leading-snug">כולל מע״מ 18%</div>
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

