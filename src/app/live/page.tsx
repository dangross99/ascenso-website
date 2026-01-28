'use client';

import Image from 'next/image';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useTexture, useProgress, Text } from '@react-three/drei';
import Footer from '@/components/Footer';
// Overlay טעינה לקנבס – מוצג בזמן טעינת טקסטורות/נכסים
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
import { TextureLoader, RepeatWrapping, ClampToEdgeWrapping, SRGBColorSpace, LinearFilter, BufferGeometry, Float32BufferAttribute, Cache, NoToneMapping, Vector3, Shape, ExtrudeGeometry } from 'three';

// הפעלת קאש של three עבור טעינות חלקות
Cache.enabled = true;

// לוגוטייפ טקסטואלי תואם להדר ("ASCEN" עם S ו‑O דקים יותר)
function BrandWordmark({ size = 'md' as 'sm' | 'md' | 'lg', color = '#1a1a2e' }) {
	const sizeClass =
		size === 'lg'
			? 'text-[34px] md:text-[44px]'
			: size === 'sm'
			? 'text-[18px] md:text-[22px]'
			: 'text-[24px] md:text-[32px]';
	return (
		<span className={`${sizeClass} font-serif font-prosto font-semibold tracking-widest uppercase select-none`} style={{ color }}>
			ASCEN
			<span style={{ fontWeight: 170 }}>S</span>
			<span style={{ fontWeight: 170 }}>O</span>
		</span>
	);
}

// (הוסר אווטאר מזכירה וירטואלית לפי בקשת המשתמש)

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
	// עבור פריטי מתכת/אבן בגוון אחיד ללא טקסטורה
	solid?: string; // hex כמו '#111111' או '#F5F5F5'
};

// צבעי עץ מוצגים בלבד: טבעי, אגוז, שחור, לבן
const WOOD_SWATCHES: { id: string; label: string }[] = [
	{ id: 'oak', label: 'טבעי' },
	{ id: 'walnut', label: 'אגוז' },
	{ id: 'black', label: 'שחור' },
	{ id: 'white', label: 'לבן' },
];

const COLOR_HEX: Record<string, string> = {
	black: '#111111',
	graphite: '#3E3E3E',
	white: '#F5F5F5',
	natural: '#D5C4A1',
	walnut: '#7B5A39',
	oak: '#C8A165',
};

// קונפיגורציה פרטנית לכל דגם (טיילינג ועומק bump רצוי)
const MODEL_CONFIG: Record<string, { tile?: number; bump?: number; inset?: number }> = {
	'wave-carved': { tile: 0.9, bump: 0.35 },
	// חיתוך לשוליים כהים בטקסטורות מתכת ספציפיות
	'antique_gold': { inset: 0.30 },
	'antique_silver': { inset: 0.30 },
	'gold_silver': { inset: 0.15 },
};
const DEFAULT_MODEL_CONFIG = { tile: 1.5, bump: 0.18, inset: 0 };



// מסלול מהלך: מקטעים של ישר/פודסט עם פניות
type PathSegment =
	| { kind: 'straight'; steps: number }
	| { kind: 'landing'; turn?: 'left' | 'right' };

function encodePath(segments: PathSegment[]): string {
	return segments
		.map(s => (s.kind === 'straight' ? `s${s.steps}` : `l${s.turn ? (s.turn === 'right' ? 'r' : 'l') : ''}`))
		.join(',');
}

function decodePath(text: string | null | undefined): PathSegment[] | null {
	if (!text) return null;
	const parts = text.split(',').map(p => p.trim()).filter(Boolean);
	const out: PathSegment[] = [];
	for (const p of parts) {
		if (p.startsWith('s')) {
			const n = parseInt(p.slice(1), 10);
			if (Number.isFinite(n) && n > 0) out.push({ kind: 'straight', steps: Math.min(25, Math.max(1, n)) });
		} else if (p === 'lr') {
			out.push({ kind: 'landing', turn: 'right' });
		} else if (p === 'll') {
			out.push({ kind: 'landing', turn: 'left' });
		} else if (p === 'l') {
			out.push({ kind: 'landing' });
		}
	}
	return out.length ? out : null;
}

function Staircase3D({
	shape,
	steps,
	color,
	materialKind,
	materialSolidColor,
	textureUrl,
	bumpUrl,
	roughnessUrl,
	tileScale = 1.5,
	bumpScaleOverride,
	uvInset = 0,
	railingUvInset = 0,
	treadThicknessOverride,
	boxModel = 'rect',
	wedgeFrontFraction,
	wedgeFrontThicknessM,
	ridgeFrontCenterThicknessM,
	ridgeFrontEdgeThicknessM,
	pathSegments,
	glassTone,
	stepRailingStates,
	landingRailingStates,
	stepRailingSides,
	landingRailingSides,
	railingKind,
	railingTextureUrl,
	railingBumpUrl,
	railingRoughnessUrl,
								railingSolidColor,
	cablePreviewHeight,
	cableColor,
	cableSpanMode,
	stepCableSpanModes,
	landingCableSpanModes,
}: {
	shape: 'straight' | 'L' | 'U';
	steps: number;
	color: string;
	materialKind: 'wood' | 'metal' | 'stone';
	materialSolidColor?: string | null;
	textureUrl?: string | null;
	bumpUrl?: string | null;
	roughnessUrl?: string | null;
	tileScale?: number;
	bumpScaleOverride?: number;
	uvInset?: number;
	railingUvInset?: number;
	treadThicknessOverride?: number;
	boxModel?: 'rect' | 'wedge' | 'ridge';
	wedgeFrontFraction?: number;
	wedgeFrontThicknessM?: number;
	ridgeFrontCenterThicknessM?: number;
	ridgeFrontEdgeThicknessM?: number;
	pathSegments?: PathSegment[] | null;
	glassTone?: 'extra' | 'smoked' | 'bronze';
	stepRailingStates?: boolean[];
	landingRailingStates?: boolean[];
	stepRailingSides?: Array<'right' | 'left'>;
	landingRailingSides?: Array<'right' | 'left'>;
	railingKind?: 'none' | 'glass' | 'metal' | 'cable';
	railingTextureUrl?: string | null;
	railingBumpUrl?: string | null;
	railingRoughnessUrl?: string | null;
	railingSolidColor?: string | null;
	cablePreviewHeight?: number;
	cableColor?: string | null;
	cableSpanMode?: 'floor' | 'tread';
	stepCableSpanModes?: Array<'floor' | 'tread'>;
	landingCableSpanModes?: Array<'floor' | 'tread'>;
}) {
	// יחידות סצנה: מטרים בקירוב
	const treadThickness = typeof treadThicknessOverride === 'number' ? treadThicknessOverride : 0.04;
	const treadDepth = 0.30;
	const treadWidth = 0.90;
	const riser = 0.18;

	function getTreads() {
		const treads: Array<{ position: [number, number, number]; rotation: [number, number, number]; run: number; isLanding: boolean; turn?: 'left' | 'right'; flight: number }> = [];
		if (pathSegments && pathSegments.length) {
			// כיוון התחלתי: +X
			let dirIndex = 0; // 0:+X, 1:+Z, 2:-X, 3:-Z
			const dirs: Array<[number, number]> = [
				[1, 0],
				[0, 1],
				[-1, 0],
				[0, -1],
			];
			const yaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
			// נקודת התחלה על הציר, נזיז קדימה לפי אורך כל שלב
			let sx = 0, sz = 0;
			let stepIndex = 0;
			let flightIdx = 0;
			for (const seg of pathSegments) {
				if (seg.kind === 'straight') {
					const [dx, dz] = dirs[dirIndex];
					for (let i = 0; i < seg.steps; i++) {
						const run = treadDepth;
						const cx = sx + dx * (run / 2);
						const cz = sz + dz * (run / 2);
						treads.push({
							position: [cx, stepIndex * riser, cz],
							rotation: [0, yaws[dirIndex] + (flightIdx === 2 ? Math.PI : 0), 0],
							run,
							isLanding: false,
							flight: flightIdx,
						});
						// התקדמות לנקודת התחלה הבאה
						sx += dx * run;
						sz += dz * run;
						stepIndex += 1;
					}
				} else {
					// פודסט: שלב שה"שלח" שלו שווה לאורך המדרגה (רוחב), כלומר ריבוע 1x1מ׳
					const [dx, dz] = dirs[dirIndex];
					const run = treadWidth;
					const cx = sx + dx * (run / 2);
					const cz = sz + dz * (run / 2);
					treads.push({
						position: [cx, stepIndex * riser, cz],
						rotation: [0, yaws[dirIndex], 0],
						run,
						isLanding: true,
						turn: seg.turn,
						flight: flightIdx,
					});
					// עדכון נקודת עיגון למסלול הבא:
					// אם אין פנייה – התקדמות לקצה הפודסט בכיוון הנוכחי
					// אם יש פנייה – נעמוד על הקו ההתחלתי של הפודסט ביחס לכיוון החדש (בלי התקדמות קדימה)
					const prevDir = dirIndex;
					if (!seg.turn) {
						sx += dx * run;
						sz += dz * run;
					}
					stepIndex += 1;
					// לאחר פודסט ניתן לשנות כיוון להמשך
					// מיפוי מתוקן: 'right' = +90°, 'left' = -90°
					if (seg.turn === 'right') dirIndex = (dirIndex + 1) & 3;
					if (seg.turn === 'left') dirIndex = (dirIndex + 3) & 3;
					// סיום טיסה – לאחר פנייה מתחיל גרם חדש
					if (seg.turn === 'left' || seg.turn === 'right') {
						flightIdx += 1;
					}
					// אם יש פנייה, קבע נקודת עיגון חדשה כך שהמקטע הבא
					// יתחיל בדיוק מהקודקוד ועל אותו קו התחלה של הפודסט:
					// העוגן מוגדר כך שמרכז המדרגה הבאה יהיה בעומק half‑treadDepth קדימה,
					// והקצה הפנימי שלה יתיישר עם הקודקוד.
					if (seg.turn === 'left' || seg.turn === 'right') {
						// קודקוד פנימי של הפודסט ביחס לכיוון הקודם
						const sidePrevIdx = (prevDir + (seg.turn === 'right' ? 1 : 3)) & 3;
						const [spx, spz] = dirs[sidePrevIdx];
						// נקודת הקצה הרחוקה של הפודסט בכיוון הישן (סוף הפודסט) + היסט לצד הפנימי -> הקודקוד הנכון
						const [pdx, pdz] = dirs[prevDir];
						const cornerX = sx + pdx * run + spx * (treadWidth / 2);
						const cornerZ = sz + pdz * run + spz * (treadWidth / 2);
						// צד פנימי ביחס לכיוון החדש
						const sideNewIdx = (dirIndex + (seg.turn === 'right' ? 1 : 3)) & 3;
						const [snx, snz] = dirs[sideNewIdx];
						// וקטור כיוון חדש
						const [ndx, ndz] = dirs[dirIndex];
						// העוגן החדש S הוא תחילת הקו בכיוון החדש כך שהקודקוד הפנימי של המדרגה הבאה
						// יישב בדיוק על הקודקוד של הפודסט:
						// עבור בניית שלב: center = S + nd*(treadDepth/2)
						// והקודקוד הפנימי = S - sn*(treadWidth/2) → לכן S = corner + sn*(treadWidth/2)
						sx = cornerX + snx * (treadWidth / 2);
						sz = cornerZ + snz * (treadWidth / 2);
					}
					// לא מוסיפים מדרגה אוטומטית; המקטע הבא יתחיל מן הקו שבחרנו
				}
			}
		} else if (shape === 'straight') {
			for (let i = 0; i < steps; i++) {
				treads.push({
					position: [i * treadDepth + treadDepth / 2, i * riser, 0],
					rotation: [0, 0, 0],
					run: treadDepth,
					isLanding: false,
					flight: 0,
				});
			}
		} else if (shape === 'L') {
			const half = Math.floor(steps / 2);
			for (let i = 0; i < half; i++) {
				treads.push({ position: [i * treadDepth + treadDepth / 2, i * riser, 0], rotation: [0, 0, 0], run: treadDepth, isLanding: false, flight: 0 });
			}
			// פודסט עם "שלח" באורך המדרגה (ריבוע 1x1מ׳) + פנייה ימינה
			const runL = treadWidth;
			const lxStart = half * treadDepth;
			treads.push({
				position: [lxStart + runL / 2, half * riser, 0],
				rotation: [0, 0, 0],
				run: runL,
				isLanding: true,
				turn: 'right',
				flight: 0,
			});
			// המשך בכיוון חדש
			for (let i = 0; i < steps - half - 1; i++) {
				treads.push({
					position: [lxStart + runL, (half + 1 + i) * riser, -(i * treadDepth + treadDepth / 2)],
					rotation: [0, -Math.PI / 2, 0],
					run: treadDepth,
					isLanding: false,
					flight: 1,
				});
			}
		} else {
			// U
			const third = Math.floor(steps / 3);
			for (let i = 0; i < third; i++) {
				treads.push({ position: [i * treadDepth + treadDepth / 2, i * riser, 0], rotation: [0, 0, 0], run: treadDepth, isLanding: false, flight: 0 });
			}
			// פודסט 1x1מ׳ + פנייה ראשונה
			const runL1 = treadWidth;
			const l1xStart = third * treadDepth;
			treads.push({
				position: [l1xStart + runL1 / 2, third * riser, 0],
				rotation: [0, 0, 0],
				run: runL1,
				isLanding: true,
				turn: 'right',
				flight: 0,
			});
			for (let i = 0; i < third; i++) {
				treads.push({
					position: [l1xStart + runL1, (third + 1 + i) * riser, -(i * treadDepth + treadDepth / 2)],
					rotation: [0, -Math.PI / 2, 0],
					run: treadDepth,
					isLanding: false,
					flight: 1,
				});
			}
			// פודסט שני 1x1מ׳ + פנייה שנייה
			const runL2 = treadWidth;
			const rStartX = l1xStart + runL1;
			const rStartZ = -third * treadDepth;
			treads.push({
				position: [rStartX + runL2 / 2, (third * 2 + 1) * riser, rStartZ],
				rotation: [0, 0, 0],
				run: runL2,
				isLanding: true,
				turn: 'right',
				flight: 1,
			});
			for (let i = 0; i < steps - third * 2 - 1; i++) {
				treads.push({
					position: [rStartX + runL2 + i * treadDepth + treadDepth / 2, (third * 2 + 2 + i) * riser, rStartZ],
					rotation: [0, Math.PI, 0],
					run: treadDepth,
					isLanding: false,
					flight: 2,
				});
			}
		}
		return treads;
	}

	const treads = React.useMemo(getTreads, [shape, steps, JSON.stringify(pathSegments)]);

	// חישוב גבולות XY וגובה הרצפה לפי המסלול
	const floorBounds = React.useMemo(() => {
		if (!treads.length) {
			return { cx: 0, cz: 0, w: 10, h: 6, y: -0.02 };
		}
		let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, minY = Infinity;
		for (const t of treads) {
			const x = t.position[0];
			const z = t.position[2];
			const y = t.position[1];
			const yaw = t.rotation[1]; // 0, π/2, π, -π/2
			const cosY = Math.cos(yaw);
			const sinY = Math.sin(yaw);
			const halfRunX = (Math.abs(cosY) > 0.5 ? t.run / 2 : 0);
			const halfRunZ = (Math.abs(sinY) > 0.5 ? t.run / 2 : 0);
			const halfWidthX = (Math.abs(sinY) > 0.5 ? treadWidth / 2 : 0);
			const halfWidthZ = (Math.abs(cosY) > 0.5 ? treadWidth / 2 : 0);
			const minTx = x - halfRunX - halfWidthX;
			const maxTx = x + halfRunX + halfWidthX;
			const minTz = z - halfRunZ - halfWidthZ;
			const maxTz = z + halfRunZ + halfWidthZ;
			if (minTx < minX) minX = minTx;
			if (maxTx > maxX) maxX = maxTx;
			if (minTz < minZ) minZ = minTz;
			if (maxTz > maxZ) maxZ = maxTz;
			const treadBottom = y - treadThickness / 2;
			if (treadBottom < minY) minY = treadBottom;
		}
		const margin = 1.0; // שוליים נעימים מסביב
		const w = (maxX - minX) + margin * 2;
		const h = (maxZ - minZ) + margin * 2;
		const cx = (minX + maxX) / 2;
		const cz = (minZ + maxZ) / 2;
		// נציב את הרצפה כך שההפרש בין הקרקע לראש המדרגה התחתונה יהיה שווה לרייסר
		// minY הוא תחתית המדרגה התחתונה → top = minY + treadThickness
		// floorY = top - riser - epsilon
		const epsilon = 0.001;
		const y = (Number.isFinite(minY) ? (minY + treadThickness - riser - epsilon) : -0.02);
		return { cx, cz, w, h, y };
	}, [treads, treadWidth, treadThickness]);

	// טקסטורות לחומרים (אבן/מתכת) אם זמינות
	const tex = React.useMemo(() => textureUrl || null, [textureUrl]);
	// טקסטורת ברירת‑מחדל בטוחה (קובץ קיים) כדי למנוע קריסה בעת חוסר קובץ
	const map = useLoader(TextureLoader, tex || '/images/products/white-onyx.jpg');
	const bumpMap = useLoader(TextureLoader, (bumpUrl || '/images/products/white-onyx.jpg'));
	const roughMap = useLoader(TextureLoader, (roughnessUrl || '/images/products/white-onyx.jpg'));
	const useSolidMat = !!materialSolidColor;
	// עבור גוון לבן מאוד – נשתמש בצבע מעט כהה יותר לפאות הצד/תחתית כדי לייצר קונטרסט ויזואלי
	const solidColorMain = (materialSolidColor || '').toString();
	const isNearWhite = typeof solidColorMain === 'string' && /^#(?:fff|ffffff|f5f5f5|f6f6f6|f7f7f7)$/i.test(solidColorMain);
	const solidTopColor = isNearWhite ? '#F7F7F7' : (solidColorMain || '#EEEEEE');
	const solidSideColor = isNearWhite ? '#D9D9D9' : (solidColorMain || '#CCCCCC');

	// טקסטורות למעקה (למתכת) – נטענות תמיד לשמירת סדר hooks, גם אם לא בשימוש
	const railingTex = React.useMemo(() => railingTextureUrl || null, [railingTextureUrl]);
	const railingMap = useLoader(TextureLoader, railingTex || '/images/products/white-onyx.jpg');
	const railingBumpMap = useLoader(TextureLoader, (railingBumpUrl || '/images/products/white-onyx.jpg'));
	const railingRoughMap = useLoader(TextureLoader, (railingRoughnessUrl || '/images/products/white-onyx.jpg'));
	React.useEffect(() => {
		if (railingMap) {
			// @ts-ignore
			railingMap.colorSpace = SRGBColorSpace;
			railingMap.wrapS = railingMap.wrapT = ClampToEdgeWrapping;
			railingMap.generateMipmaps = false;
			railingMap.minFilter = LinearFilter;
			railingMap.needsUpdate = true;
		}
		if (railingBumpMap) {
			railingBumpMap.wrapS = railingBumpMap.wrapT = ClampToEdgeWrapping;
			railingBumpMap.generateMipmaps = false;
			railingBumpMap.minFilter = LinearFilter;
			railingBumpMap.needsUpdate = true;
		}
		if (railingRoughMap) {
			railingRoughMap.wrapS = railingRoughMap.wrapT = ClampToEdgeWrapping;
			railingRoughMap.generateMipmaps = false;
			railingRoughMap.minFilter = LinearFilter;
			railingRoughMap.needsUpdate = true;
		}
	}, [railingMap, railingBumpMap, railingRoughMap]);

	// Cache פנימי להפחתת clone() חוזרים על אותם פרמטרים במהלך רינדור
	const faceTexCacheRef = React.useRef<Map<string, { color: any; bump?: any; rough?: any }>>(new Map());
	React.useEffect(() => {
		// נקה קאש כאשר מקור המפה/סקייל משתנים
		faceTexCacheRef.current.clear();
	}, [map?.image, bumpMap?.image, roughMap?.image, tileScale, bumpScaleOverride]);

	// מחשב חזרת UV בשיטת "cover" לפי יחס ממדים של הפאה לעומת יחס תמונה, עם קאשינג
	function buildFaceTextures(dimU: number, dimV: number) {
		const key = `${dimU.toFixed(4)}|${dimV.toFixed(4)}|${textureUrl || 'na'}|${bumpUrl || 'na'}|${roughnessUrl || 'na'}|${tileScale}|${bumpScaleOverride ?? 'na'}`;
		const cached = faceTexCacheRef.current.get(key);
		if (cached) return cached;

		const imgW = (map.image && (map.image as any).width) || 1024;
		const imgH = (map.image && (map.image as any).height) || 1024;
		const texAspect = imgW / imgH;
		const geoAspect = dimU / dimV;
		let repU = 1, repV = 1;
		if (geoAspect > texAspect) {
			// הפאה רחבה יחסית -> נרחיב בציר U פחות מ-1 (נמרכז)
			repV = 1;
			repU = texAspect / geoAspect;
		} else {
			repU = 1;
			repV = geoAspect / texAspect;
		}
		// הגנה קטנה מתפרים (כמעט ללא חיתוך)
		repU = Math.max(0.995, Math.min(1, repU));
		repV = Math.max(0.995, Math.min(1, repV));
		let offU = (1 - repU) / 2;
		let offV = (1 - repV) / 2;
		// חיתוך יעד לפי קונפיגורציה (למשל שוליים כהים)
		const inset = Math.max(0, Math.min(0.30, uvInset || 0));
		if (inset > 0) {
			const cutU = Math.min(repU - 0.01, inset * 2);
			const cutV = Math.min(repV - 0.01, inset * 2);
			if (cutU > 0) { repU -= cutU; offU += cutU / 2; }
			if (cutV > 0) { repV -= cutV; offV += cutV / 2; }
		}

		const mk = (base: any) => {
			const t = base.clone();
			t.wrapS = t.wrapT = ClampToEdgeWrapping;
			t.repeat.set(repU, repV);
			t.offset.set(offU, offV);
			// @ts-ignore
			t.colorSpace = SRGBColorSpace;
			t.generateMipmaps = false;
			t.minFilter = LinearFilter;
			t.needsUpdate = true;
			return t;
		};

		const out = {
			color: mk(map),
			bump: bumpUrl ? mk(bumpMap) : undefined,
			rough: roughnessUrl ? mk(roughMap) : undefined,
		};
		faceTexCacheRef.current.set(key, out);
		return out;
	}
	React.useEffect(() => {
		if (map) {
			const useClamp = tileScale < 1;
			map.wrapS = map.wrapT = useClamp ? ClampToEdgeWrapping : RepeatWrapping;
			map.repeat.set(useClamp ? 1 : tileScale, useClamp ? 1 : tileScale);
			if (useClamp) {
				const off = (1 - tileScale) / 2;
				map.offset.set(off, off);
				map.generateMipmaps = false;
				map.minFilter = LinearFilter;
			} else {
				map.offset.set(0, 0);
				map.generateMipmaps = true;
			}
			// תיקון מרחב צבע לעץ/טקסטורות כדי למנוע הברקה "מתכתית"
			// ולהציג צבעים נאמנים
			// @ts-ignore colorSpace exists on Texture in three >= 0.152
			map.colorSpace = SRGBColorSpace;
			map.anisotropy = 8;
			map.needsUpdate = true;
		}
		if (bumpMap) {
			const useClamp = tileScale < 1;
			bumpMap.wrapS = bumpMap.wrapT = useClamp ? ClampToEdgeWrapping : RepeatWrapping;
			bumpMap.repeat.set(useClamp ? 1 : tileScale, useClamp ? 1 : tileScale);
			if (useClamp) {
				const off = (1 - tileScale) / 2;
				bumpMap.offset.set(off, off);
				bumpMap.generateMipmaps = false;
				bumpMap.minFilter = LinearFilter;
			} else {
				bumpMap.offset.set(0, 0);
				bumpMap.generateMipmaps = true;
			}
			bumpMap.anisotropy = 4;
			bumpMap.needsUpdate = true;
		}
		if (roughMap) {
			const useClamp = tileScale < 1;
			roughMap.wrapS = roughMap.wrapT = useClamp ? ClampToEdgeWrapping : RepeatWrapping;
			roughMap.repeat.set(useClamp ? 1 : tileScale, useClamp ? 1 : tileScale);
			if (useClamp) {
				const off = (1 - tileScale) / 2;
				roughMap.offset.set(off, off);
				roughMap.generateMipmaps = false;
				roughMap.minFilter = LinearFilter;
			} else {
				roughMap.offset.set(0, 0);
				roughMap.generateMipmaps = true;
			}
			roughMap.anisotropy = 4;
			roughMap.needsUpdate = true;
		}
	}, [map, bumpMap, roughMap, tileScale]);

	return (
		<group position={[-1.5, 0, 0]}>
			{(() => { 
				// עזר אחיד לכל הדגמים: ציר לפי yaw, וכיוון "ימין" מקומי עקבי (כולל תיקון לפודסט בציר Z)
				const axisFromYaw = (yaw: number): 'x' | 'z' => (Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z');
				const rightLocalSignFor = (yaw: number, axis: 'x' | 'z', isLanding: boolean): 1 | -1 => {
					const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
					let sign: 1 | -1 = (axis === 'x' ? (cosY >= 0 ? -1 : 1) : (sinY >= 0 ? 1 : -1)) as 1 | -1;
					// פודסטים לאורך Z – היפוך כדי לשמור "פנימה" עקבי בין גרמים
					if (isLanding && axis === 'z') sign = (sign === 1 ? -1 : 1) as 1 | -1;
					return sign;
				};
				let sIdx = 0; let lIdx = 0; 
				return treads.map((t, idx) => (
				<group key={idx} position={t.position} rotation={t.rotation}>
					{/* גוף המדרך */}
					{boxModel === 'wedge' ? (
						(() => {
							const curStepIdx = !t.isLanding ? (sIdx++) : -1;
							const topY = treadThickness / 2;
							const frontFrac = Math.max(0.1, Math.min(0.9, typeof wedgeFrontFraction === 'number' ? wedgeFrontFraction : 0.35));
							const desiredFront = typeof wedgeFrontThicknessM === 'number' ? wedgeFrontThicknessM : (treadThickness * frontFrac);
							const frontTh = Math.max(0.01, Math.min(treadThickness - 0.005, desiredFront));
							const seam = 0.001; // הרחבה זעירה לסגירת חיבורים
							// כיוון החזית לפי yaw של המקטע: +X המקומי תמיד חזית
							const yaw = t.rotation[1] as number;
							const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
							const axisX = Math.abs(cosY) > 0.5;
							const forwardSignBase = axisX ? (cosY >= 0 ? 1 : -1) : (sinY >= 0 ? 1 : -1);
							// בגרם הראשון נהפוך את החזית/גב כדי שהמספר 1 ייראה בתחילת המסע
							const forwardSign = (t.flight === 0 ? -forwardSignBase : forwardSignBase);
							const xFront = forwardSign * (t.run / 2);
							const xBack = -forwardSign * (t.run / 2);
							// צד פנימי: למדרגות לפי stepRailingSides; לפודסטים לפי landingRailingSides
							const innerIsRight = t.isLanding
								? (((landingRailingSides?.[lIdx++] ?? 'right') === 'right'))
								: ((typeof stepRailingSides !== 'undefined' ? (stepRailingSides[curStepIdx] ?? 'right') : 'right') === 'right');
							const axis = axisFromYaw(yaw);
							const rightLocalZSign = rightLocalSignFor(yaw, axis, t.isLanding);
							const innerSignLocal = innerIsRight ? rightLocalZSign : -rightLocalZSign;
							const zRight = innerSignLocal * (treadWidth / 2 + seam);
							const zLeft = -zRight;
							const yTop = topY;
							const yBottomBack = yTop - treadThickness - seam;
							const yBottomFront = yTop - frontTh - seam;
							const faceMat = (dimU: number, dimV: number) => {
								if (useSolidMat) return <meshBasicMaterial color={solidSideColor} side={2} />;
								const ft = buildFaceTextures(dimU, dimV);
								return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
							};
							const yCenterFront = (yTop + yBottomFront) / 2;
							const yCenterBack = (yTop + yBottomBack) / 2;
							// FRONT at xFront
							const front = (
								<mesh key="front" rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} position={[xFront + forwardSign * 0.0005, yCenterFront, 0]} receiveShadow>
									<planeGeometry args={[treadWidth + seam * 2, frontTh + seam * 2, 8, 2]} />
									{faceMat(treadWidth, frontTh)}
								</mesh>
							);
							// סימון חזית – ספרה 1
							const frontMark = (
								<Text position={[xFront + forwardSign * 0.004, yCenterFront, 0]} rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">1</Text>
							);
							// סימון גב – ספרה 4
							const backMark = (
								<Text position={[xBack - forwardSign * 0.004, yCenterBack, 0]} rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">4</Text>
							);
							// סימון צדדים – 2 לימין (Z+), 3 לשמאל (Z-)
							const sideCenterY = (yTop + Math.min(yBottomBack, yBottomFront)) / 2;
							const rightMark = (
								<Text position={[0, sideCenterY, zRight + 0.004]} rotation={[0, 0, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">2</Text>
							);
							const leftMark = (
								<Text position={[0, sideCenterY, zLeft - 0.004]} rotation={[0, Math.PI, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">3</Text>
							);
							// BACK at xBack
							const back = (
								<mesh key="back" rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} position={[xBack - forwardSign * 0.0005, yCenterBack, 0]} receiveShadow>
									<planeGeometry args={[treadWidth + seam * 2, treadThickness + seam * 2, 8, 2]} />
									{faceMat(treadWidth, treadThickness)}
								</mesh>
							);
							// RIGHT side (trapezoid)
							const rightGeom = new BufferGeometry();
							rightGeom.setAttribute('position', new Float32BufferAttribute([
								xFront, yBottomFront, zRight,
								xBack,  yBottomBack,  zRight,
								xFront, yTop + seam,  zRight,
								xBack,  yTop + seam,  zRight,
							], 3));
							rightGeom.setIndex([0,1,2,2,1,3]);
							// simple rectangular UVs
							rightGeom.setAttribute('uv', new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2));
							rightGeom.computeVertexNormals();
							const right = (
								<mesh key="right" geometry={rightGeom} receiveShadow>
									{faceMat(t.run, (treadThickness + frontTh) / 2)}
								</mesh>
							);
							// LEFT side (trapezoid)
							const leftGeom = new BufferGeometry();
							leftGeom.setAttribute('position', new Float32BufferAttribute([
								xBack,  yBottomBack,  zLeft,
								xFront, yBottomFront, zLeft,
								xBack,  yTop + seam,  zLeft,
								xFront, yTop + seam,  zLeft,
							], 3));
							leftGeom.setIndex([0,1,2,2,1,3]);
							leftGeom.setAttribute('uv', new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2));
							leftGeom.computeVertexNormals();
							const left = (
								<mesh key="left" geometry={leftGeom} receiveShadow>
									{faceMat(t.run, (treadThickness + frontTh) / 2)}
								</mesh>
							);
							// BOTTOM slanted
							const bottomGeom = new BufferGeometry();
							bottomGeom.setAttribute('position', new Float32BufferAttribute([
								xFront, yBottomFront - seam, zLeft,
								xBack,  yBottomBack - seam,  zLeft,
								xFront, yBottomFront - seam, zRight,
								xBack,  yBottomBack - seam,  zRight,
							], 3));
							bottomGeom.setIndex([0,1,2,2,1,3]);
							bottomGeom.setAttribute('uv', new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2));
							bottomGeom.computeVertexNormals();
							const bottom = (
								<mesh key="bottom" geometry={bottomGeom} rotation={[0,0,0]} receiveShadow>
									{faceMat(t.run, treadWidth)}
								</mesh>
							);
							const geomGroup = (
								<group rotation={[0, Math.PI, 0]}>
									{front}{back}{right}{left}{bottom}
								</group>
							);
							return <group>{geomGroup}{frontMark}{backMark}{rightMark}{leftMark}</group>;
						})()
					) : boxModel === 'ridge' ? (
						(() => {
							const curStepIdx = !t.isLanding ? (sIdx++) : -1;
							// אלכסוני עם רכס מרכזי: שני קווי שבירה לאורך מהמרכז בגב לשתי פינות החזית.
							const topY = treadThickness / 2;
							const backTh = treadThickness;
							const frontEdgeTh = backTh; // חזית אחידה (אין C)
							const seam = 0.001;
							// כיוון החזית לפי yaw של המקטע: +X המקומי תמיד חזית
							const yaw = t.rotation[1] as number;
							const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
							const axisX = Math.abs(cosY) > 0.5;
							const forwardSignBase = axisX ? (cosY >= 0 ? 1 : -1) : (sinY >= 0 ? 1 : -1);
							const forwardSign = (t.flight === 0 ? -forwardSignBase : forwardSignBase);
							const xFront = forwardSign * (t.run / 2);
							const xBack = -forwardSign * (t.run / 2);
							// צד פנימי: למדרגות לפי stepRailingSides; לפודסטים לפי landingRailingSides
							const innerIsRight = t.isLanding
								? (((landingRailingSides?.[lIdx++] ?? 'right') === 'right'))
								: ((typeof stepRailingSides !== 'undefined' ? (stepRailingSides[curStepIdx] ?? 'right') : 'right') === 'right');
							const axis = axisFromYaw(yaw);
							const rightLocalZSign = rightLocalSignFor(yaw, axis, t.isLanding);
							const innerSignLocal = innerIsRight ? rightLocalZSign : -rightLocalZSign;
							const zRight = innerSignLocal * (treadWidth / 2 + seam);
							const zLeft = -zRight;
							const yTop = topY;
							const yBottomBack = yTop - backTh - seam;
							const yBottomFrontEdge = yTop - frontEdgeTh - seam;

							const faceMat = (dimU: number, dimV: number) => {
								if (useSolidMat) return <meshBasicMaterial color={solidSideColor} side={2} />;
								const ft = buildFaceTextures(dimU, dimV);
								return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
							};

							// FRONT אחיד
							const front = (
								<mesh rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} position={[xFront + forwardSign * 0.0005, (yTop + yBottomFrontEdge)/2, 0]} receiveShadow>
									<planeGeometry args={[treadWidth + seam * 2, frontEdgeTh + seam * 2, 8, 2]} />
									{faceMat(treadWidth, frontEdgeTh)}
								</mesh>
							);
							// סימון חזית – ספרה 1
							const frontMark = (
								<Text position={[xFront + forwardSign * 0.004, (yTop + yBottomFrontEdge)/2, 0]} rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">1</Text>
							);
							// סימון גב – ספרה 4
							const backMark = (
								<Text position={[xBack - forwardSign * 0.004, (yTop + yBottomBack)/2, 0]} rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">4</Text>
							);
							// סימון צדדים – 2 לימין (Z+), 3 לשמאל (Z-)
							const sideCenterY = (yTop + yBottomBack) / 2;
							const rightMark = (
								<Text position={[0, sideCenterY, zRight + 0.004]} rotation={[0, 0, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">2</Text>
							);
							const leftMark = (
								<Text position={[0, sideCenterY, zLeft - 0.004]} rotation={[0, Math.PI, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">3</Text>
							);

							// BOTTOM – שלושה משולשים לאורך: קווי שבירה ממרכז החזית אל שתי פינות הגב
							const bottom = (() => {
								// נקודות: A,B בחזית; D,E בגב; נקודה 1 = אמצע AD אך בעומק 90 מ״מ מהטופ
								const A = [xFront, yBottomFrontEdge, zLeft] as const;
								const B = [xFront, yBottomFrontEdge, zRight] as const;
								const D = [xBack,  yBottomBack,       zLeft] as const;
								const E = [xBack,  yBottomBack,       zRight] as const;
								// 1: אמצע AD במישור XZ, אך עם עומק 90 מ״מ מהטופ
								const oneX = (A[0] + D[0]) / 2;
								const oneZ = (A[2] + D[2]) / 2;
								const oneY = yTop - 0.11 - seam;
								const one = [oneX, oneY, oneZ] as const;

								// שלושה משולשים: A‑D‑1, 1‑D‑E, 1‑E‑B
								const pos = new Float32Array([
									// A-D-1
									...A, ...D, ...one,
									// A-1-B (מוסיף כדי לקבל 4 משולשים כולל חזית מרכזית)
									...A, ...one, ...B,
									// 1-D-E
									...one, ...D, ...E,
									// 1-E-B
									...one, ...E, ...B,
								]);
								const g2 = new BufferGeometry();
								g2.setAttribute('position', new Float32BufferAttribute(pos, 3));
								// UV בקירוב
								const uA = 0, vA = 0;
								const uB = 0, vB = 1;
								const uD = 1, vD = 0;
								const uE = 1, vE = 1;
								const u1 = 0.5, v1 = 0.5;
								const uv = new Float32Array([
									// A-D-1
									uA,vA, uD,vD, u1,v1,
									// A-1-B
									uA,vA, u1,v1, uB,vB,
									// 1-D-E
									u1,v1, uD,vD, uE,vE,
									// 1-E-B
									u1,v1, uE,vE, uB,vB,
								]);
								g2.setAttribute('uv', new Float32BufferAttribute(uv, 2));
								g2.computeVertexNormals();
								return <mesh geometry={g2} receiveShadow>{faceMat(t.run, treadWidth)}</mesh>;
							})();
							// אין צורך ברצועת "רכס" נוספת – שני חצאי התחתית כבר נפגשים במרכז

							// DEBUG: כבוי – ללא סימוני עזר
							const showDebug = false;
							const debugBottom = showDebug ? (() => {
								const A: [number, number, number] = [xFront, yBottomFrontEdge, zLeft];
								const B: [number, number, number] = [xFront, yBottomFrontEdge, zRight];
								const D: [number, number, number] = [xBack,  yBottomBack,       zLeft];
								const E: [number, number, number] = [xBack,  yBottomBack,       zRight];
								const midADflat: [number, number, number] = [(A[0]+D[0])/2, (A[1]+D[1])/2, (A[2]+D[2])/2];
								const midBE: [number, number, number] = [(B[0]+E[0])/2, (B[1]+E[1])/2, (B[2]+E[2])/2];
								// נקודה 1 (עמוקה): אותה מיקום XZ כמו midAD, אך בעומק 110 מ״מ מהטופ
								const one: [number, number, number] = [midADflat[0], (yTop - 0.11 - 0.001), midADflat[2]];
								// קווים מבוקשים: E→(1=midAD) וגם B→(1=midAD)
								const edgesToOne = new Float32Array([
									...E, ...one,
									...B, ...one,
								]);
								return (
									<group>
										<lineSegments>
											<bufferGeometry attach="geometry">
												<bufferAttribute attach="attributes-position" args={[edgesToOne, 3]} />
											</bufferGeometry>
											<lineBasicMaterial attach="material" color="#ff3366" />
										</lineSegments>
										<Text position={[A[0], A[1]-0.005, A[2]]} fontSize={0.03} color="#ff3366" anchorX="center" anchorY="top">A</Text>
										<Text position={[B[0], B[1]-0.005, B[2]]} fontSize={0.03} color="#ff3366" anchorX="center" anchorY="top">B</Text>
										<Text position={[D[0], D[1]-0.005, D[2]]} fontSize={0.03} color="#ff3366" anchorX="center" anchorY="top">D</Text>
										<Text position={[E[0], E[1]-0.005, E[2]]} fontSize={0.03} color="#ff3366" anchorX="center" anchorY="top">E</Text>
										<Text position={[one[0], one[1]-0.005, one[2]]} fontSize={0.035} color="#111111" anchorX="center" anchorY="top">1</Text>
										<Text position={[midBE[0], midBE[1]-0.005, midBE[2]]} fontSize={0.035} color="#111111" anchorX="center" anchorY="top">2</Text>
									</group>
								);
							})() : null;

							// BACK + SIDES (קבועים)
							const back = (
								<mesh rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} position={[xBack - forwardSign * 0.0005, (yTop + yBottomBack)/2, 0]} receiveShadow>
									<planeGeometry args={[treadWidth + seam * 2, backTh + seam * 2, 8, 2]} />
									{faceMat(treadWidth, backTh)}
								</mesh>
							);
							const sideRight = (
								<mesh rotation={[0, 0, 0]} position={[0, 0, zRight]} receiveShadow>
									<planeGeometry args={[t.run, backTh, 8, 2]} />
									{faceMat(t.run, backTh)}
								</mesh>
							);
							const sideLeft = (
								<mesh rotation={[0, Math.PI, 0]} position={[0, 0, zLeft]} receiveShadow>
									<planeGeometry args={[t.run, backTh, 8, 2]} />
									{faceMat(t.run, backTh)}
								</mesh>
							);

							const geomGroup = (
								<group rotation={[0, (t.flight === 0 ? Math.PI : 0), 0]}>
									{front}{bottom}{debugBottom}{back}{sideRight}{sideLeft}
								</group>
							);
							return <group>{geomGroup}{frontMark}{backMark}{rightMark}{leftMark}</group>;
						})()
					) : (
						<group rotation={[0, 0, 0]}>
							<mesh castShadow receiveShadow>
								<boxGeometry args={[t.run, treadThickness, treadWidth]} />
								<meshBasicMaterial
									color={(materialKind !== 'wood' && useSolidMat) ? (solidSideColor) : (materialKind === 'metal' ? '#8f8f8f' : '#b3a59a')}
									polygonOffset
									polygonOffsetFactor={1}
									polygonOffsetUnits={1}
								/>
							</mesh>
						</group>
					)}
					{/* שכבת פני השטח עם תבליט אמיתי לעץ; למתכת/אבן – כיסוי מרקם */}
					<mesh
						rotation={[-Math.PI / 2, 0, 0]}
						position={[0, (boxModel !== 'rect' ? (treadThickness / 2 + 0.0005) : (treadThickness / 2 + 0.002)), 0]}
						castShadow={materialKind !== 'metal'}
						receiveShadow={materialKind !== 'metal'}
					>
						<planeGeometry args={[t.run, treadWidth, materialKind === 'wood' ? 48 : 32, materialKind === 'wood' ? 48 : 32]} />
						{materialKind === 'wood' ? (
							(() => {
								const ft = buildFaceTextures(t.run, treadWidth);
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
							})()
						) : materialKind === 'metal' ? (
							(() => {
								if (useSolidMat) {
									return (<meshBasicMaterial color={solidTopColor} side={2} />);
								}
								const ft = buildFaceTextures(t.run, treadWidth);
								return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
							})()
						) : (
							(() => {
								if (useSolidMat) {
									return (<meshBasicMaterial color={solidTopColor} side={2} />);
								}
								const ft = buildFaceTextures(t.run, treadWidth);
								return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
							})()
						)}
					</mesh>

					{/* דגמי קו צל/חזית נופלת הוסרו */}

					{/* BOTTOM face */}
					{boxModel === 'rect' && (
						<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -treadThickness / 2 - 0.0005, 0]} receiveShadow>
							<planeGeometry args={[t.run, treadWidth, 8, 8]} />
							{(() => {
								if (useSolidMat) {
									return (<meshBasicMaterial color={solidSideColor} />);
								}
								const ft = buildFaceTextures(t.run, treadWidth);
								return (<meshBasicMaterial color={'#ffffff'} map={ft.color} />);
							})()}
						</mesh>
					)}

					{/* FRONT/BACK and SIDES – יישור לפי כיוון הריצה (axis) וה‑yaw של המדרגה */}
					{boxModel === 'rect' && (() => {
						const curStepIdx = !t.isLanding ? (sIdx++) : -1;
						const yaw = t.rotation[1] as number;
						const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
						const axis: 'x' | 'z' = Math.abs(cosY) > 0.5 ? 'x' : 'z';
						const forwardSign = axis === 'x' ? (cosY >= 0 ? 1 : -1) : (sinY >= 0 ? 1 : -1);
						// צד פנימי: למדרגות לפי stepRailingSides; לפודסטים לפי landingRailingSides
						const innerIsRight = t.isLanding
							? (((landingRailingSides?.[lIdx++] ?? 'right') === 'right'))
							: ((typeof stepRailingSides !== 'undefined' ? (stepRailingSides[curStepIdx] ?? 'right') : 'right') === 'right');
						// מיפוי "ימין" למרחב באופן אחיד לכל הדגמים
						let rightLocalSign = rightLocalSignFor(yaw, axis, t.isLanding);
						const innerSignLocal = innerIsRight ? rightLocalSign : -rightLocalSign;
						const matFrontBack = (() => {
							if (useSolidMat) return (<meshBasicMaterial color={solidSideColor} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
							const ft = buildFaceTextures(treadWidth, treadThickness);
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
						})();
						const matSides = (() => {
							if (useSolidMat) return (<meshBasicMaterial color={solidSideColor} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
							const ft = buildFaceTextures(t.run, treadThickness);
							return (<meshBasicMaterial map={ft.color} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
						})();
						if (axis === 'x') {
							const frontRotY = forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2;
							const backRotY = -frontRotY;
							const frontX = forwardSign * (t.run / 2) + forwardSign * 0.0015;
							const backX = -forwardSign * (t.run / 2) - forwardSign * 0.0015;
							return (
								<>
									<mesh rotation={[0, frontRotY, 0]} position={[frontX, 0, 0]} receiveShadow>
										<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
										{matFrontBack}
									</mesh>
									<Text position={[frontX + forwardSign * 0.004, 0, 0]} rotation={[0, frontRotY, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">1</Text>
									<mesh rotation={[0, backRotY, 0]} position={[backX, 0, 0]} receiveShadow>
										<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
										{matFrontBack}
									</mesh>
									<Text position={[backX - forwardSign * 0.004, 0, 0]} rotation={[0, backRotY, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">4</Text>
									{/* צדדים לאורך Z */}
									<mesh rotation={[0, 0, 0]} position={[0, 0, treadWidth / 2 + 0.0015]} receiveShadow>
										<planeGeometry args={[t.run, treadThickness, 8, 8]} />
										{matSides}
									</mesh>
									<mesh rotation={[0, Math.PI, 0]} position={[0, 0, -treadWidth / 2 - 0.0015]} receiveShadow>
										<planeGeometry args={[t.run, treadThickness, 8, 8]} />
										{matSides}
									</mesh>
									{/* תיוג 2=פנימי, 3=חיצוני */}
									<Text position={[0, 0, innerSignLocal * (treadWidth / 2 + 0.004)]} rotation={[0, innerSignLocal > 0 ? 0 : Math.PI, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">2</Text>
									<Text position={[0, 0, -innerSignLocal * (treadWidth / 2 + 0.004)]} rotation={[0, innerSignLocal > 0 ? Math.PI : 0, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">3</Text>
								</>
							);
						} else {
							const frontRotY = forwardSign > 0 ? 0 : Math.PI;
							const backRotY = forwardSign > 0 ? Math.PI : 0;
							const frontZ = forwardSign * (t.run / 2) + forwardSign * 0.0015;
							const backZ = -forwardSign * (t.run / 2) - forwardSign * 0.0015;
							return (
								<>
									<mesh rotation={[0, frontRotY, 0]} position={[0, 0, frontZ]} receiveShadow>
										<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
										{matFrontBack}
									</mesh>
									<Text position={[0, 0, frontZ + forwardSign * 0.004]} rotation={[0, frontRotY, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">1</Text>
									<mesh rotation={[0, backRotY, 0]} position={[0, 0, backZ]} receiveShadow>
										<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
										{matFrontBack}
									</mesh>
									<Text position={[0, 0, backZ - forwardSign * 0.004]} rotation={[0, backRotY, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">4</Text>
									{/* צדדים לאורך X */}
									<mesh rotation={[0, Math.PI / 2, 0]} position={[treadWidth / 2 + 0.0015, 0, 0]} receiveShadow>
										<planeGeometry args={[t.run, treadThickness, 8, 8]} />
										{matSides}
									</mesh>
									<mesh rotation={[0, -Math.PI / 2, 0]} position={[-treadWidth / 2 - 0.0015, 0, 0]} receiveShadow>
										<planeGeometry args={[t.run, treadThickness, 8, 8]} />
										{matSides}
									</mesh>
									{/* תיוג 2=פנימי, 3=חיצוני */}
									<Text position={[innerSignLocal * (treadWidth / 2 + 0.004), 0, 0]} rotation={[0, innerSignLocal > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">2</Text>
									<Text position={[-innerSignLocal * (treadWidth / 2 + 0.004), 0, 0]} rotation={[0, innerSignLocal > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">3</Text>
								</>
							);
						}
					})()}

					{/* דגם 'פלטות אלכסוניות' בוטל */}

					{/* מעקה זכוכית פר-מדרגה מבוטל למען פאנל רציף */}
					{null}
				</group>
			)); })()}

			{/* מעקה זכוכית – קטעים רציפים בקו אלכסוני */}
			{(() => {
				if (railingKind !== 'glass') return null;
				if (!glassTone || !stepRailingStates) return null;
				const glassSelected = glassTone;
				const opacity = glassSelected === 'smoked' ? 0.5 : glassSelected === 'bronze' ? 0.42 : 0.48;
				const color = glassSelected === 'smoked' ? '#4a5568' : glassSelected === 'bronze' ? '#b08d57' : '#aee7ff';
				const totalH = treadThickness + 1.0;
				const distance = 0.03; // מרחק המעקה מהמדרך (3 ס"מ למניעת חפיפה/זי-פייטינג)
				const overlapStep = 0.11; // חפיפה למטה במדרגות (11 ס"מ)
				const overlapLanding = 0.20; // חפיפה למטה בפודסטים (20 ס"מ)
				const heightAboveFaceStep = 1.18; // גובה מעל פני מדרגה
				const heightAboveFaceLanding = 1.09; // גובה מעל פני פודסט
				type Seg = {
					axis: 'x' | 'z';
					start: number; end: number;
					// יחוס קו האלכסון: עובר דרך מרכז המדרך הראשון
					baseCoord: number; // x או z של מרכז המדרך הראשון
					baseBottomY: number; // תחתית המדרך הראשון בנקודת המרכז
					stepRun: number; // עומק מדרגה בקו המקטע
					overlap: number; // חפיפה למטה
					xConst?: number; // למקטע לאורך Z – מיקום X של המשטח
					signX?: 1 | -1;
					zSign?: 1 | -1; // למקטע לאורך X – באיזה צד בציר Z לשים את הזכוכית
					zConst?: number; // למקטע לאורך X – מיקום Z של המשטח (עוגן מוחלט)
				};
				const segs: Seg[] = [];
				let sIdx2 = 0;
				let lIdx2 = 0;
				let current: Seg | null = null;
				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					const yaw = t.rotation[1];
					const axis: 'x' | 'z' = Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z';
					const bottomY = t.position[1] - treadThickness / 2;

					// פודסטים
					if (t.isLanding) {
						// בכל מקרה של פודסט – סיים מקטע משופע קודם לפני טיפול בפודסט
						if (current) { segs.push(current); current = null; }
						const enabledL = (landingRailingStates?.[lIdx2++] ?? false);
						// פודסט עם פנייה – אין מעקה רציף עבורו
						if (t.turn) { continue; }
						if (!enabledL) continue;
						if (axis === 'x') {
							const x0 = t.position[0] - t.run / 2;
							const x1 = t.position[0] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx2 - 1] ?? 'right');
							const rZ = -Math.cos(yaw);
							const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							const zGlass = t.position[2] + zSign * (treadWidth / 2 + distance);
							// פודסט ישר – פאנל שטוח (k=0) ע"י stepRun=Infinity
							segs.push({
								axis: 'x',
								start: x0,
								end: x1,
								baseCoord: t.position[0],
								baseBottomY: bottomY,
								stepRun: Number.POSITIVE_INFINITY,
								overlap: overlapLanding,
								zSign,
								zConst: zGlass,
							});
						} else {
							const z0 = t.position[2] - t.run / 2;
							const z1 = t.position[2] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx2 - 1] ?? 'right');
							const rX = Math.sin(yaw);
							const signX = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
							const xGlass = t.position[0] + signX * (treadWidth / 2 + distance);
							segs.push({
								axis: 'z',
								start: z0,
								end: z1,
								baseCoord: t.position[2],
								baseBottomY: bottomY,
								stepRun: Number.POSITIVE_INFINITY,
								overlap: overlapLanding,
								xConst: xGlass,
								signX,
							});
						}
						continue;
					}

					// מדרגות
					const idxForStep = sIdx2;
					const enabled = stepRailingStates[sIdx2++] ?? false;
					if (!enabled) { if (current) { segs.push(current); current = null; } continue; }
					const sidePref = (typeof stepRailingSides !== 'undefined' ? (stepRailingSides[idxForStep] ?? 'right') : 'right');
					if (axis === 'x') {
						const x0 = t.position[0] - t.run / 2;
						const x1 = t.position[0] + t.run / 2;
						if (!current || current.axis !== 'x') {
							const rZ = -Math.cos(yaw);
							const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							const zGlass = t.position[2] + zSign * (treadWidth / 2 + distance);
							current = {
								axis: 'x',
								start: x0,
								end: x1,
								baseCoord: t.position[0],
								baseBottomY: bottomY,
								stepRun: treadDepth,
								overlap: overlapStep,
								zSign,
								zConst: zGlass,
							};
						} else {
							const rZ = -Math.cos(yaw);
							const zSignNow = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							if (current.zSign !== zSignNow) {
								segs.push(current);
								current = {
									axis: 'x',
									start: x0,
									end: x1,
									baseCoord: t.position[0],
									baseBottomY: bottomY,
									stepRun: treadDepth,
									overlap: overlapStep,
									zSign: zSignNow,
									zConst: t.position[2] + zSignNow * (treadWidth / 2 + distance),
								};
							} else {
								current.end = x1;
								current.zConst = t.position[2] + zSignNow * (treadWidth / 2 + distance);
							}
						}
					} else {
						const z0 = t.position[2] - t.run / 2;
						const z1 = t.position[2] + t.run / 2;
						const rX = Math.sin(yaw);
						const signXDesired = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
						const xGlass = t.position[0] + signXDesired * (treadWidth / 2 + distance);
						if (!current || current.axis !== 'z') {
							current = {
								axis: 'z',
								start: z0,
								end: z1,
								baseCoord: t.position[2],
								baseBottomY: bottomY,
								stepRun: treadDepth,
								overlap: overlapStep,
								xConst: xGlass,
								signX: signXDesired,
							};
						} else {
							if (current.signX !== signXDesired) {
								segs.push(current);
								current = {
									axis: 'z',
									start: z0,
									end: z1,
									baseCoord: t.position[2],
									baseBottomY: bottomY,
									stepRun: treadDepth,
									overlap: overlapStep,
									xConst: xGlass,
									signX: signXDesired,
								};
							} else {
								current.end = z1;
								current.xConst = xGlass;
								current.signX = signXDesired;
							}
						}
					}
				}
				if (current) segs.push(current);

				// פאנל לכל מדרגה/פודסט – מונע החסרות של המדרגה הראשונה/האחרונה אחרי פניות
				const panels: React.ReactElement[] = [];
				let sIdx3 = 0;
				let lIdx3 = 0;
				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					const yaw = t.rotation[1];
					const axis: 'x' | 'z' = Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z';
					const bottomY = t.position[1] - treadThickness / 2;

					// פודסט ישר עם מעקה (ללא פנייה)
					if (t.isLanding) {
						const enabledL = (landingRailingStates?.[lIdx3++] ?? false);
						if (!enabledL || t.turn) continue;
						const k = 0;
						const b = bottomY - overlapLanding;
						const tH = treadThickness + (heightAboveFaceLanding + overlapLanding);
						if (axis === 'x') {
							const x0 = t.position[0] - t.run / 2;
							const x1 = t.position[0] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx3 - 1] ?? 'right');
							const rZ = -Math.cos(yaw);
							const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							const zPos = t.position[2] + zSign * (treadWidth / 2 + distance);
							const geom = new BufferGeometry();
							const positions = new Float32BufferAttribute([
								x0, k * x0 + b, zPos,
								x1, k * x1 + b, zPos,
								x0, k * x0 + b + tH, zPos,
								x1, k * x1 + b + tH, zPos,
							], 3);
							geom.setAttribute('position', positions);
							geom.setIndex([0, 1, 2, 2, 1, 3]);
							geom.computeVertexNormals();
							panels.push(
								<mesh key={`gstep-Lx-${i}`} castShadow={false} receiveShadow={false}>
									<primitive object={geom} attach="geometry" />
									<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
								</mesh>
							);
						} else {
							const z0 = t.position[2] - t.run / 2;
							const z1 = t.position[2] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx3 - 1] ?? 'right');
							const rX = Math.sin(yaw);
							const signX = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
							const xGlass = t.position[0] + signX * (treadWidth / 2 + distance);
							const geom = new BufferGeometry();
							const positions = new Float32BufferAttribute([
								xGlass, k * z0 + b, z0,
								xGlass, k * z1 + b, z1,
								xGlass, k * z0 + b + tH, z0,
								xGlass, k * z1 + b + tH, z1,
							], 3);
							geom.setAttribute('position', positions);
							geom.setIndex([0, 1, 2, 2, 1, 3]);
							geom.computeVertexNormals();
							panels.push(
								<mesh key={`gstep-Lz-${i}`} castShadow={false} receiveShadow={false}>
									<primitive object={geom} attach="geometry" />
									<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
								</mesh>
							);
						}
						continue;
					}

					// מדרגה בודדת
					const idxForStep = sIdx3;
					const enabled = stepRailingStates[sIdx3++] ?? false;
					if (!enabled) continue;
					const sidePref = (typeof stepRailingSides !== 'undefined' ? (stepRailingSides[idxForStep] ?? 'right') : 'right');

					if (axis === 'x') {
						const x0 = t.position[0] - t.run / 2;
						const x1 = t.position[0] + t.run / 2;
						const dirAxis = (Math.cos(yaw) >= 0 ? 1 : -1); // +X או -X
						const k = (riser / treadDepth) * dirAxis;
						const b = bottomY - k * t.position[0] - overlapStep;
						const tH = treadThickness + (heightAboveFaceStep + overlapStep);
						const rZ = -Math.cos(yaw);
						const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
						const zPos = t.position[2] + zSign * (treadWidth / 2 + distance);
						const geom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							x0, k * x0 + b, zPos,
							x1, k * x1 + b, zPos,
							x0, k * x0 + b + tH, zPos,
							x1, k * x1 + b + tH, zPos,
						], 3);
						geom.setAttribute('position', positions);
						geom.setIndex([0, 1, 2, 2, 1, 3]);
						geom.computeVertexNormals();
						panels.push(
							<mesh key={`gstep-x-${i}`} castShadow={false} receiveShadow={false}>
								<primitive object={geom} attach="geometry" />
								<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
							</mesh>
						);
					} else {
						const z0 = t.position[2] - t.run / 2;
						const z1 = t.position[2] + t.run / 2;
						const dirAxis = (Math.sin(yaw) >= 0 ? 1 : -1); // +Z או -Z
						const k = (riser / treadDepth) * dirAxis;
						const b = bottomY - k * t.position[2] - overlapStep;
						const tH = treadThickness + (heightAboveFaceStep + overlapStep);
						const rX = Math.sin(yaw);
						const signXDesired = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
						const xGlass = t.position[0] + signXDesired * (treadWidth / 2 + distance);
						const geom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							xGlass, k * z0 + b, z0,
							xGlass, k * z1 + b, z1,
							xGlass, k * z0 + b + tH, z0,
							xGlass, k * z1 + b + tH, z1,
						], 3);
						geom.setAttribute('position', positions);
						geom.setIndex([0, 1, 2, 2, 1, 3]);
						geom.computeVertexNormals();
						panels.push(
							<mesh key={`gstep-z-${i}`} castShadow={false} receiveShadow={false}>
								<primitive object={geom} attach="geometry" />
								<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
							</mesh>
						);
					}
				}
				return <group>{panels}</group>;
			})()}

			{/* מערכת כבלי נירוסטה – 3 כבלים אנכיים לכל מדרגה בצד הנבחר ופודסט ישר עם 9 כבלים */}
			{(() => {
				if (railingKind !== 'cable') return null;
				if (!stepRailingStates) return null;
				const distance = 0.01; // מרחק מהקצה (1 ס"מ)
				const topY = floorBounds.y + (typeof cablePreviewHeight === 'number' ? cablePreviewHeight : 5.0);
				const items: React.ReactElement[] = [];
				let sIdx = 0;
				let lIdx = 0;
				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					const yaw = t.rotation[1];
					const axisX = Math.abs(Math.cos(yaw)) > 0.5; // true => ציר X, אחרת Z

					if (!t.isLanding) {
						const curIdx = sIdx;
						const enabled = stepRailingStates[curIdx] ?? false;
						const sidePref = (typeof stepRailingSides !== 'undefined' ? (stepRailingSides[curIdx] ?? 'right') : 'right');
						const mode = (stepCableSpanModes?.[curIdx] ?? cableSpanMode) ?? 'tread';
						sIdx = sIdx + 1;
						if (!enabled) continue;
						if (axisX) {
						// המדרגה "נעה" על ציר X, לכן הצד נקבע על ציר Z
						const rZ = -Math.cos(yaw);
							const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							const z = t.position[2] + zSign * (treadWidth / 2 + distance);
							// שלושה כבלים במרווח קבוע של 10 ס״מ בין שכנים
							const d = 0.10;
							const offsets = [-d, 0, d];
							offsets.forEach((off, k) => {
								const x = t.position[0] + off;
								const bottomY = (mode === 'tread') ? (t.position[1] + treadThickness / 2) : floorBounds.y;
								const spanH = Math.max(0.05, topY - bottomY);
								const yCenter = bottomY + spanH / 2;
								items.push(
									<mesh key={`cable-x-${i}-${k}`} position={[x, yCenter, z]} castShadow receiveShadow>
										<cylinderGeometry args={[0.005, 0.005, spanH, 12]} />
										<meshBasicMaterial color={cableColor || '#c7ccd1'} />
									</mesh>
								);
							});
						} else {
						// המדרגה "נעה" על ציר Z, לכן הצד נקבע על ציר X
						const rX = Math.sin(yaw);
							const signX = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
							const x = t.position[0] + signX * (treadWidth / 2 + distance);
							const d = 0.10;
							const offsets = [-d, 0, d];
							offsets.forEach((off, k) => {
								const z = t.position[2] + off;
								const bottomY = (mode === 'tread') ? (t.position[1] + treadThickness / 2) : floorBounds.y;
								const spanH = Math.max(0.05, topY - bottomY);
								const yCenter = bottomY + spanH / 2;
								items.push(
									<mesh key={`cable-z-${i}-${k}`} position={[x, yCenter, z]} castShadow receiveShadow>
										<cylinderGeometry args={[0.005, 0.005, spanH, 12]} />
										<meshBasicMaterial color={cableColor || '#c7ccd1'} />
									</mesh>
								);
							});
						}
					} else {
						// פודסט – אם ישר (ללא פנייה) ונבחר מעקה לפודסט, נציב 9 כבלים לאורך ה-run
						const curL = lIdx;
						const enabledL = (landingRailingStates?.[curL] ?? false);
						const sidePrefL = (landingRailingSides?.[curL] ?? 'right');
						const modeL = (landingCableSpanModes?.[curL] ?? cableSpanMode) ?? 'tread';
						lIdx = lIdx + 1;
						if (!enabledL || t.turn) continue;
						if (axisX) {
							const rZ = -Math.cos(yaw);
							const zSign = (sidePrefL === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							const z = t.position[2] + zSign * (treadWidth / 2 + distance);
							const count = 9;
							const margin = 0.05; // התחלה 5 ס"מ מהקצה
							const eff = Math.max(0, t.run - 2 * margin);
							for (let k = 0; k < count; k++) {
								const s = margin + (eff * (k / (count - 1))); // מרחק מהקצה השמאלי של הפודסט
								const x = t.position[0] - (t.run / 2) + s;
								const bottomY = (modeL === 'tread') ? (t.position[1] + treadThickness / 2) : floorBounds.y;
								const spanH = Math.max(0.05, topY - bottomY);
								const yCenter = bottomY + spanH / 2;
								items.push(
									<mesh key={`lcable-x-${i}-${k}`} position={[x, yCenter, z]} castShadow receiveShadow>
										<cylinderGeometry args={[0.005, 0.005, spanH, 12]} />
										<meshBasicMaterial color={cableColor || '#c7ccd1'} />
									</mesh>
								);
							}
						} else {
							const rX = Math.sin(yaw);
							const signX = (sidePrefL === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
							const x = t.position[0] + signX * (treadWidth / 2 + distance);
							const count = 9;
							const margin = 0.05;
							const eff = Math.max(0, t.run - 2 * margin);
							for (let k = 0; k < count; k++) {
								const s = margin + (eff * (k / (count - 1)));
								const z = t.position[2] - (t.run / 2) + s;
								const bottomY = (modeL === 'tread') ? (t.position[1] + treadThickness / 2) : floorBounds.y;
								const spanH = Math.max(0.05, topY - bottomY);
								const yCenter = bottomY + spanH / 2;
								items.push(
									<mesh key={`lcable-z-${i}-${k}`} position={[x, yCenter, z]} castShadow receiveShadow>
										<cylinderGeometry args={[0.005, 0.005, spanH, 12]} />
										<meshBasicMaterial color={cableColor || '#c7ccd1'} />
									</mesh>
								);
							}
						}
					}
				}
				return <group>{items}</group>;
			})()}

			{/* מעקה מתכת – שימוש באותם קטעים, חומר מתכתי עם טקסטורה נבחרת או צבע אחיד */}
			{(() => {
				if (railingKind !== 'metal') return null;
				if (!stepRailingStates) return null;
				const distance = 0.03; // מרחק המעקה מהמדרך (3 ס"מ למניעת חפיפה/זי-פייטינג)
				const overlapStep = 0.11;
				const overlapLanding = 0.20;
				const heightAboveFaceStep = 1.18;
				const heightAboveFaceLanding = 1.09;
				type Seg = {
					axis: 'x' | 'z';
					start: number; end: number;
					baseCoord: number;
					baseBottomY: number;
					stepRun: number;
					overlap: number;
					xConst?: number;
					signX?: 1 | -1;
					zSign?: 1 | -1;
					zConst?: number;
				};
				const segs: Seg[] = [];
				let sIdx2 = 0;
				let lIdx2 = 0;
				let current: Seg | null = null;
				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					const yaw = t.rotation[1];
					const axis: 'x' | 'z' = Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z';
					const bottomY = t.position[1] - treadThickness / 2;

					// פודסטים
					if (t.isLanding) {
						if (current) { segs.push(current); current = null; }
						const enabledL = (landingRailingStates?.[lIdx2++] ?? false);
						if (t.turn) { continue; }
						if (!enabledL) continue;
						if (axis === 'x') {
							const x0 = t.position[0] - t.run / 2;
							const x1 = t.position[0] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx2 - 1] ?? 'right');
							const rZ = -Math.cos(yaw);
							const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							const zMetal = t.position[2] + zSign * (treadWidth / 2 + distance);
							segs.push({
								axis: 'x',
								start: x0,
								end: x1,
								baseCoord: t.position[0],
								baseBottomY: bottomY,
								stepRun: Number.POSITIVE_INFINITY,
								overlap: overlapLanding,
								zSign,
								zConst: zMetal,
							});
						} else {
							const z0 = t.position[2] - t.run / 2;
							const z1 = t.position[2] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx2 - 1] ?? 'right');
							const rX = Math.sin(yaw);
							const signX = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
							const xMetal = t.position[0] + signX * (treadWidth / 2 + distance);
							segs.push({
								axis: 'z',
								start: z0,
								end: z1,
								baseCoord: t.position[2],
								baseBottomY: bottomY,
								stepRun: Number.POSITIVE_INFINITY,
								overlap: overlapLanding,
								xConst: xMetal,
								signX,
							});
						}
						continue;
					}

					// מדרגות
					const idxForStep = sIdx2;
					const enabled = stepRailingStates[sIdx2++] ?? false;
					if (!enabled) { if (current) { segs.push(current); current = null; } continue; }
					const sidePref = (typeof stepRailingSides !== 'undefined' ? (stepRailingSides[idxForStep] ?? 'right') : 'right');
					if (axis === 'x') {
						const x0 = t.position[0] - t.run / 2;
						const x1 = t.position[0] + t.run / 2;
						const rZ = -Math.cos(yaw);
						const zSignDesired = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
						const zMetal = t.position[2] + zSignDesired * (treadWidth / 2 + distance);
						if (!current) {
							current = {
								axis: 'x',
								start: x0,
								end: x1,
								baseCoord: t.position[0],
								baseBottomY: bottomY,
								stepRun: treadDepth,
								overlap: overlapStep,
								zSign: zSignDesired,
								zConst: zMetal,
							};
						} else {
							if (current.zSign !== zSignDesired) {
								segs.push(current);
								current = {
									axis: 'x',
									start: x0,
									end: x1,
									baseCoord: t.position[0],
									baseBottomY: bottomY,
									stepRun: treadDepth,
									overlap: overlapStep,
									zSign: zSignDesired,
									zConst: zMetal,
								};
							} else {
								current.end = x1;
								current.zSign = zSignDesired;
								current.zConst = zMetal;
							}
						}
					} else {
						const z0 = t.position[2] - t.run / 2;
						const z1 = t.position[2] + t.run / 2;
						const rX = Math.sin(yaw);
						const signXDesired = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
						const xMetal = t.position[0] + signXDesired * (treadWidth / 2 + distance);
						if (!current) {
							current = {
								axis: 'z',
								start: z0,
								end: z1,
								baseCoord: t.position[2],
								baseBottomY: bottomY,
								stepRun: treadDepth,
								overlap: overlapStep,
								xConst: xMetal,
								signX: signXDesired,
							};
						} else {
							if (current.signX !== signXDesired) {
								segs.push(current);
								current = {
									axis: 'z',
									start: z0,
									end: z1,
									baseCoord: t.position[2],
									baseBottomY: bottomY,
									stepRun: treadDepth,
									overlap: overlapStep,
									xConst: xMetal,
									signX: signXDesired,
								};
							} else {
								current.end = z1;
								current.xConst = xMetal;
								current.signX = signXDesired;
							}
						}
					}
				}
				if (current) segs.push(current);

				// פאנל לכל מדרגה/פודסט – מונע החסרות בגבולות אחרי פניות
				const itemsEls: React.ReactElement[] = [];
				let sIdx3 = 0;
				let lIdx3 = 0;
				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					const yaw = t.rotation[1];
					const axis: 'x' | 'z' = Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z';
					const bottomY = t.position[1] - treadThickness / 2;

					// פודסט ישר
					if (t.isLanding) {
						const enabledL = (landingRailingStates?.[lIdx3++] ?? false);
						if (!enabledL || t.turn) continue;
						const k = 0;
						const b = bottomY - overlapLanding;
						const tH = treadThickness + (heightAboveFaceLanding + overlapLanding);
						if (axis === 'x') {
							const x0 = t.position[0] - t.run / 2;
							const x1 = t.position[0] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx3 - 1] ?? 'right');
							const rZ = -Math.cos(yaw);
							const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
							const zPos = t.position[2] + zSign * (treadWidth / 2 + distance);
							const geom = new BufferGeometry();
							const positions = new Float32BufferAttribute([
								x0, k * x0 + b, zPos,
								x1, k * x1 + b, zPos,
								x0, k * x0 + b + tH, zPos,
								x1, k * x1 + b + tH, zPos,
							], 3);
							const uvs = new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2);
							geom.setAttribute('position', positions);
							geom.setAttribute('uv', uvs);
							geom.setIndex([0,1,2,2,1,3]);
							geom.computeVertexNormals();
							// cover
							const len = Math.abs(x1 - x0);
							const h = tH;
							const texW = (railingMap.image && (railingMap.image as any).width) || 1024;
							const texH = (railingMap.image && (railingMap.image as any).height) || 1024;
							const texAspect = texW / texH;
							const geoAspect = len / h;
							let repU = 1, repV = 1;
							if (geoAspect > texAspect) { repU = texAspect / geoAspect; repV = 1; } else { repU = 1; repV = geoAspect / texAspect; }
							repU = Math.max(0.995, Math.min(1, repU));
							repV = Math.max(0.995, Math.min(1, repV));
							let offU = (1 - repU) / 2;
							let offV = (1 - repV) / 2;
							const rinset = Math.max(0, Math.min(0.30, railingUvInset || 0));
							if (rinset > 0) {
								const cutU = Math.min(repU - 0.01, rinset * 2);
								const cutV = Math.min(repV - 0.01, rinset * 2);
								if (cutU > 0) { repU -= cutU; offU += cutU / 2; }
								if (cutV > 0) { repV -= cutV; offV += cutV / 2; }
							}
							const mapTex = railingMap.clone();
							// @ts-ignore
							mapTex.colorSpace = SRGBColorSpace;
							mapTex.wrapS = mapTex.wrapT = ClampToEdgeWrapping;
							mapTex.generateMipmaps = false;
							mapTex.minFilter = LinearFilter;
							mapTex.repeat.set(repU, repV);
							mapTex.offset.set(offU, offV);
							mapTex.needsUpdate = true;
							itemsEls.push(
								<mesh key={`mstep-Lx-${i}`} castShadow receiveShadow>
									<primitive object={geom} attach="geometry" />
									{railingSolidColor ? <meshBasicMaterial color={railingSolidColor} side={2} /> : <meshBasicMaterial map={mapTex} side={2} />}
								</mesh>
							);
						} else {
							const z0 = t.position[2] - t.run / 2;
							const z1 = t.position[2] + t.run / 2;
							const sidePref = (landingRailingSides?.[lIdx3 - 1] ?? 'right');
							const rX = Math.sin(yaw);
							const signX = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
							const xPos = t.position[0] + signX * (treadWidth / 2 + distance);
							const geom = new BufferGeometry();
							const positions = new Float32BufferAttribute([
								xPos, k * z0 + b, z0,
								xPos, k * z1 + b, z1,
								xPos, k * z0 + b + tH, z0,
								xPos, k * z1 + b + tH, z1,
							], 3);
							const uvs = new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2);
							geom.setAttribute('position', positions);
							geom.setAttribute('uv', uvs);
							geom.setIndex([0,1,2,2,1,3]);
							geom.computeVertexNormals();
							const len = Math.abs(z1 - z0);
							const h = tH;
							const texW = (railingMap.image && (railingMap.image as any).width) || 1024;
							const texH = (railingMap.image && (railingMap.image as any).height) || 1024;
							const texAspect = texW / texH;
							const geoAspect = len / h;
							let repU = 1, repV = 1;
							if (geoAspect > texAspect) { repU = texAspect / geoAspect; repV = 1; } else { repU = 1; repV = geoAspect / texAspect; }
							repU = Math.max(0.995, Math.min(1, repU));
							repV = Math.max(0.995, Math.min(1, repV));
							let offU = (1 - repU) / 2;
							let offV = (1 - repV) / 2;
							const rinset2 = Math.max(0, Math.min(0.30, railingUvInset || 0));
							if (rinset2 > 0) {
								const cutU = Math.min(repU - 0.01, rinset2 * 2);
								const cutV = Math.min(repV - 0.01, rinset2 * 2);
								if (cutU > 0) { repU -= cutU; offU += cutU / 2; }
								if (cutV > 0) { repV -= cutV; offV += cutV / 2; }
							}
							const mapTex = railingMap.clone();
							// @ts-ignore
							mapTex.colorSpace = SRGBColorSpace;
							mapTex.wrapS = mapTex.wrapT = ClampToEdgeWrapping;
							mapTex.generateMipmaps = false;
							mapTex.minFilter = LinearFilter;
							mapTex.repeat.set(repU, repV);
							mapTex.offset.set(offU, offV);
							mapTex.needsUpdate = true;
							itemsEls.push(
								<mesh key={`mstep-Lz-${i}`} castShadow receiveShadow>
									<primitive object={geom} attach="geometry" />
									{railingSolidColor ? <meshBasicMaterial color={railingSolidColor} side={2} /> : <meshBasicMaterial map={mapTex} side={2} />}
								</mesh>
							);
						}
						continue;
					}

					// מדרגה
					const idxForStep = sIdx3;
					const enabled = stepRailingStates[sIdx3++] ?? false;
					if (!enabled) continue;
					const sidePref = (typeof stepRailingSides !== 'undefined' ? (stepRailingSides[idxForStep] ?? 'right') : 'right');

					if (axis === 'x') {
						const x0 = t.position[0] - t.run / 2;
						const x1 = t.position[0] + t.run / 2;
						const dirAxis = (Math.cos(yaw) >= 0 ? 1 : -1); // +X או -X
						const k = (riser / treadDepth) * dirAxis;
						const b = bottomY - k * t.position[0] - overlapStep;
						const tH = treadThickness + (heightAboveFaceStep + overlapStep);
						const rZ = -Math.cos(yaw);
						const zSign = (sidePref === 'right' ? (rZ >= 0 ? 1 : -1) : (rZ >= 0 ? -1 : 1)) as 1 | -1;
						const zPos = t.position[2] + zSign * (treadWidth / 2 + distance);
						const geom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							x0, k * x0 + b, zPos,
							x1, k * x1 + b, zPos,
							x0, k * x0 + b + tH, zPos,
							x1, k * x1 + b + tH, zPos,
						], 3);
						const uvs = new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2);
						geom.setAttribute('position', positions);
						geom.setAttribute('uv', uvs);
						geom.setIndex([0,1,2,2,1,3]);
						geom.computeVertexNormals();
						const len = Math.abs(x1 - x0);
						const h = tH;
						const texW = (railingMap.image && (railingMap.image as any).width) || 1024;
						const texH = (railingMap.image && (railingMap.image as any).height) || 1024;
						const texAspect = texW / texH;
						const geoAspect = len / h;
						let repU = 1, repV = 1;
						if (geoAspect > texAspect) { repU = texAspect / geoAspect; repV = 1; } else { repU = 1; repV = geoAspect / texAspect; }
						repU = Math.max(0.995, Math.min(1, repU));
						repV = Math.max(0.995, Math.min(1, repV));
						let offU = (1 - repU) / 2;
						let offV = (1 - repV) / 2;
						const rinset3 = Math.max(0, Math.min(0.30, railingUvInset || 0));
						if (rinset3 > 0) {
							const cutU = Math.min(repU - 0.01, rinset3 * 2);
							const cutV = Math.min(repV - 0.01, rinset3 * 2);
							if (cutU > 0) { repU -= cutU; offU += cutU / 2; }
							if (cutV > 0) { repV -= cutV; offV += cutV / 2; }
						}
						const mapTex = railingMap.clone();
						// @ts-ignore
						mapTex.colorSpace = SRGBColorSpace;
						mapTex.wrapS = mapTex.wrapT = ClampToEdgeWrapping;
						mapTex.generateMipmaps = false;
						mapTex.minFilter = LinearFilter;
						mapTex.repeat.set(repU, repV);
						mapTex.offset.set(offU, offV);
						mapTex.needsUpdate = true;
						itemsEls.push(
							<mesh key={`mstep-x-${i}`} castShadow receiveShadow>
								<primitive object={geom} attach="geometry" />
								{railingSolidColor ? <meshBasicMaterial color={railingSolidColor} side={2} /> : <meshBasicMaterial map={mapTex} side={2} />}
							</mesh>
						);
					} else {
						const z0 = t.position[2] - t.run / 2;
						const z1 = t.position[2] + t.run / 2;
						const dirAxis = (Math.sin(yaw) >= 0 ? 1 : -1); // +Z או -Z
						const k = (riser / treadDepth) * dirAxis;
						const b = bottomY - k * t.position[2] - overlapStep;
						const tH = treadThickness + (heightAboveFaceStep + overlapStep);
						const rX = Math.sin(yaw);
						const signXDesired = (sidePref === 'right' ? (rX >= 0 ? 1 : -1) : (rX >= 0 ? -1 : 1)) as 1 | -1;
						const xPos = t.position[0] + signXDesired * (treadWidth / 2 + distance);
						const geom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							xPos, k * z0 + b, z0,
							xPos, k * z1 + b, z1,
							xPos, k * z0 + b + tH, z0,
							xPos, k * z1 + b + tH, z1,
						], 3);
						const uvs = new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2);
						geom.setAttribute('position', positions);
						geom.setAttribute('uv', uvs);
						geom.setIndex([0,1,2,2,1,3]);
						geom.computeVertexNormals();
						const len = Math.abs(z1 - z0);
						const h = tH;
						const texW = (railingMap.image && (railingMap.image as any).width) || 1024;
						const texH = (railingMap.image && (railingMap.image as any).height) || 1024;
						const texAspect = texW / texH;
						const geoAspect = len / h;
						let repU = 1, repV = 1;
						if (geoAspect > texAspect) { repU = texAspect / geoAspect; repV = 1; } else { repU = 1; repV = geoAspect / texAspect; }
						repU = Math.max(0.995, Math.min(1, repU));
						repV = Math.max(0.995, Math.min(1, repV));
						let offU = (1 - repU) / 2;
						let offV = (1 - repV) / 2;
						const rinset4 = Math.max(0, Math.min(0.30, railingUvInset || 0));
						if (rinset4 > 0) {
							const cutU = Math.min(repU - 0.01, rinset4 * 2);
							const cutV = Math.min(repV - 0.01, rinset4 * 2);
							if (cutU > 0) { repU -= cutU; offU += cutU / 2; }
							if (cutV > 0) { repV -= cutV; offV += cutV / 2; }
						}
						const mapTex = railingMap.clone();
						// @ts-ignore
						mapTex.colorSpace = SRGBColorSpace;
						mapTex.wrapS = mapTex.wrapT = ClampToEdgeWrapping;
						mapTex.generateMipmaps = false;
						mapTex.minFilter = LinearFilter;
						mapTex.repeat.set(repU, repV);
						mapTex.offset.set(offU, offV);
						mapTex.needsUpdate = true;
						itemsEls.push(
							<mesh key={`mstep-z-${i}`} castShadow receiveShadow>
								<primitive object={geom} attach="geometry" />
								{railingSolidColor ? <meshBasicMaterial color={railingSolidColor} side={2} /> : <meshBasicMaterial map={mapTex} side={2} />}
							</mesh>
						);
					}
				}
				return itemsEls;
			})()}
			{/* רצפה – מותאמת אוטומטית לגבולות המהלך */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[floorBounds.cx, floorBounds.y, floorBounds.cz]} receiveShadow>
				<planeGeometry args={[floorBounds.w, floorBounds.h]} />
				<meshBasicMaterial color="#e5e7eb" />
			</mesh>
		</group>
	);
}

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
	const topTabsRef = React.useRef<HTMLDivElement | null>(null);
	// זיהוי מקלדת מובייל (visualViewport) כדי להתאים יישור מודאל/סרגל תחתון
	const [isKeyboardOpen, setIsKeyboardOpen] = React.useState(false);
	React.useLayoutEffect(() => {
		const update = () => {
			if (typeof window === 'undefined') return;
			const isMobile = window.innerWidth < 1024;
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
	let qBox = (search.get('box') as 'thick' | 'thin' | 'wedge' | 'ridge' | 'plates') || 'thick';
	if (qBox === 'plates') { qBox = 'thick'; }
	const qPath = search.get('path') || '';

	const [records, setRecords] = React.useState<MaterialRecord[]>([]);
	const [activeMaterial, setActiveMaterial] = React.useState<'wood' | 'metal' | 'stone'>(qMaterial);
	const [activeColor, setActiveColor] = React.useState<string>(qColor);
	const [activeModelId, setActiveModelId] = React.useState<string | null>(qModel || null);
	const [activeTexId, setActiveTexId] = React.useState<string | null>(qTex || null); // למתכת/אבן (סנכרון תצוגה)
	// מזהים ייעודיים לכל קטגוריה כדי לשמר בחירה בין מעברים
	const [activeMetalTexId, setActiveMetalTexId] = React.useState<string | null>(activeMaterial === 'metal' ? (qTex || null) : null);
	const [activeStoneTexId, setActiveStoneTexId] = React.useState<string | null>(activeMaterial === 'stone' ? (qTex || null) : null);
	const [box, setBox] = React.useState<'thick' | 'thin' | 'wedge' | 'ridge'>(qBox as any);
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
			? 'תיבה עבה‑דופן'
			: box === 'thin'
			? 'תיבה דקה‑דופן'
			: box === 'wedge'
			? 'דגם אלכסוני'
			: box === 'ridge'
			? 'דגם רכס מרכזי'
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
			? 'תיבה עבה‑דופן'
			: box === 'thin'
			? 'תיבה דקה‑דופן'
			: box === 'wedge'
			? 'דגם אלכסוני'
			: box === 'ridge'
			? 'דגם רכס מרכזי'
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

	function Schematic({ shape, steps }: { shape: 'straight' | 'L' | 'U'; steps: number }) {
		// ציור סכמטי פשוט לפי צורה ומספר מדרגות
		const w = 360;
		const h = 220;
		const stairColor = '#1f2937';
		const stepW = Math.min(28, Math.max(10, Math.floor((w - 80) / Math.min(steps, 10))));
		const stepH = 10;
		const blocks: Array<{ x: number; y: number; w: number; h: number }> = [];

		if (shape === 'straight') {
			for (let i = 0; i < steps; i++) {
				blocks.push({ x: 40 + i * stepW, y: 160 - i * (stepH / 2), w: stepW - 2, h: stepH });
			}
		} else if (shape === 'L') {
			const half = Math.floor(steps / 2);
			for (let i = 0; i < half; i++) {
				blocks.push({ x: 40 + i * stepW, y: 160 - i * (stepH / 2), w: stepW - 2, h: stepH });
			}
			// פודסט
			blocks.push({ x: 40 + half * stepW, y: 160 - half * (stepH / 2) - 2, w: stepW + 6, h: stepH + 10 });
			// מקטע שני למעלה
			for (let i = 0; i < steps - half; i++) {
				blocks.push({
					x: 40 + half * stepW + 6,
					y: 160 - half * (stepH / 2) - (i + 1) * (stepH / 2) - 14 - i * stepH,
					w: stepH,
					h: stepW - 2,
				});
			}
		} else {
			// U
			const third = Math.floor(steps / 3);
			for (let i = 0; i < third; i++) {
				blocks.push({ x: 40 + i * stepW, y: 160 - i * (stepH / 2), w: stepW - 2, h: stepH });
			}
			blocks.push({ x: 40 + third * stepW, y: 160 - third * (stepH / 2) - 2, w: stepW + 6, h: stepH + 10 });
			for (let i = 0; i < third; i++) {
				blocks.push({
					x: 40 + third * stepW + 6,
					y: 160 - third * (stepH / 2) - (i + 1) * (stepH / 2) - 14 - i * stepH,
					w: stepH,
					h: stepW - 2,
				});
			}
			blocks.push({
				x: 40 + third * stepW + 6 + stepH + 6,
				y: 160 - third * (stepH / 2) - (third + 1) * (stepH / 2) - 14 - (third - 1) * stepH,
				w: stepW + 6,
				h: stepH + 10,
			});
			for (let i = 0; i < steps - 2 * third; i++) {
				blocks.push({
					x: 40 + third * stepW + 6 + stepH + 6 + (i + 1) * stepW,
					y: 160 - third * (stepH / 2) - (third + 1) * (stepH / 2) - 14 - (third - 1) * stepH,
					w: stepW - 2,
					h: stepH,
				});
			}
		}

		return (
			<svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto bg-white border rounded">
				{blocks.map((b, idx) => (
					<rect key={idx} x={b.x} y={b.y} width={b.w} height={b.h} fill={stairColor} />
				))}
			</svg>
		);
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
									<div className="p-2 pt-1">
										<div className="flex flex-wrap justify-center gap-6">
											{([
												{ id: 'thick', label: 'תיבה עבה‑דופן' as const },
												{ id: 'thin', label: 'תיבה דקה‑דופן' as const },
												{ id: 'wedge', label: 'דגם אלכסוני' as const },
												{ id: 'ridge', label: 'דגם רכס מרכזי' as const },
											] as const).map(opt => (
												<div key={opt.id} className="flex flex-col items-center">
													<button
														aria-label={opt.id === 'thick' ? 'דגם עבה' : opt.id === 'thin' ? 'דגם דק' : opt.id === 'wedge' ? 'דגם אלכסוני' : 'דגם רכס מרכזי'}
														title={opt.id === 'thick' ? 'דגם עבה' : opt.id === 'thin' ? 'דגם דק' : opt.id === 'wedge' ? 'דגם אלכסוני' : 'דגם רכס מרכזי'}
														className={`w-[52px] h-[52px] inline-flex items-center justify-center bg-transparent border-0 ${box === opt.id ? 'text-[#1a1a2e]' : 'text-gray-500 hover:text-gray-700'}`}
														onClick={() => setBox(opt.id)}
													>
														{opt.id === 'thick' ? (
															<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
																<rect x="1" y="16" width="50" height="20" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
																<rect x="1" y="16" width="50" height="20" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
															</svg>
														) : opt.id === 'thin' ? (
															<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
																<rect x="1" y="20" width="50" height="12" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
																<rect x="1" y="20" width="50" height="12" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
															</svg>
														) : opt.id === 'wedge' ? (
															<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
																<polygon
																	points="6,36 46,30 46,22 6,16"
																	fill={box === opt.id ? '#F2E9E3' : 'none'}
																/>
																<polygon
																	points="6,36 46,30 46,22 6,16"
																	fill="none"
																	stroke="currentColor"
																	strokeWidth="2"
																/>
															</svg>
														) : opt.id === 'ridge' ? (
															<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
												{/* מלבן עם "רכס" אלכסוני באמצע */}
																<rect x="1" y="16" width="50" height="20" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
																<rect x="1" y="16" width="50" height="20" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
																<path d="M2 26 L26 18 L50 26" stroke="currentColor" strokeWidth="2" fill="none" />
															</svg>
														) : (
															<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
												{/* פלטות אלכסוניות – שני פסים אלכסוניים */}
												<rect x="1" y="16" width="50" height="20" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
												<path d="M6 16 L24 36" stroke="currentColor" strokeWidth="4" />
												<path d="M28 16 L46 36" stroke="currentColor" strokeWidth="4" />
															</svg>
														)}
														<span className="sr-only">{opt.label}</span>
													</button>
													<span className="mt-1 text-xs text-gray-600">
										{opt.id === 'thick' ? 'עבה' : opt.id === 'thin' ? 'דק' : opt.id === 'wedge' ? 'אלכסוני' : 'רכס'}
													</span>
												</div>
											))}
										</div>

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
									<div className="p-3">
										<div className="flex flex-wrap justify-center gap-2 text-center">
											{(['wood', 'metal', 'stone'] as const).map(m => (
												<button
													key={m}
													className={`px-4 py-2 text-base rounded-full border ${activeMaterial === m ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
													onClick={() => {
														startTransition(() => {
															setActiveMaterial(m);
														});
													}}
												>
													{m === 'wood' ? 'עץ' : m === 'metal' ? 'מתכת' : 'אבן טבעית'}
												</button>
											))}
										</div>
									</div>
								),
							});
							if (activeMaterial === 'wood') {
								nodes.push({
									key: 'woodTexture',
									el: (
										<div className="p-2 pt-1">
											<div className="flex flex-wrap justify-center gap-4 text-center">
												{woodModels.map(m => (
													<div key={m.id} className="flex flex-col items-center w-16">
														<button
															aria-label={m.name || m.id}
															title={m.name || m.id}
															onClick={() => startTransition(() => setActiveModelId(m.id))}
															className={`w-[52px] h-[52px] rounded-full border-2 bg-center bg-cover ${activeModelId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
															style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
														/>
														<span className="mt-1 text-[11px] text-gray-600 truncate w-16">{m.name || m.id}</span>
													</div>
												))}
											</div>
										</div>
									),
								});
								nodes.push({
									key: 'woodColor',
									el: (
										<div className="p-2 pt-1">
											<div className="flex items-center justify-center gap-4 flex-wrap text-center">
												{WOOD_SWATCHES.filter(sw => !!activeModel?.variants?.[sw.id]).map(sw => {
													const img = activeModel?.variants?.[sw.id]?.[0];
													const solid = COLOR_HEX[sw.id];
													return (
														<div key={sw.id} className="flex flex-col items-center w-16">
															<button
																aria-label={sw.label}
																title={sw.label}
																onClick={() => startTransition(() => setActiveColor(sw.id))}
																className={`w-[52px] h-[52px] rounded-full border-2 cursor-pointer ${activeColor === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
																style={{ backgroundImage: img ? `url("${encodeURI(img)}")` : undefined, backgroundColor: img ? undefined : solid, backgroundSize: 'cover', backgroundPosition: 'center', borderColor: '#ddd' }}
															/>
															<span className="mt-1 text-[11px] text-gray-600 truncate w-16">{sw.label}</span>
														</div>
													);
												})}
											</div>
										</div>
									),
								});
							} else {
								nodes.push({
									key: 'nonWoodTexture',
									el: (
										<div className="p-2 pt-1">
											<div className="flex flex-wrap justify-center gap-4 text-center">
												{nonWoodModels.map(m => (
													<div key={m.id} className="flex flex-col items-center w-20">
														<button
															aria-label={m.name || m.id}
															title={m.name || m.id}
															onClick={() => startTransition(() => { setActiveTexId(m.id); if (activeMaterial === 'metal') setActiveMetalTexId(m.id); if (activeMaterial === 'stone') setActiveStoneTexId(m.id); })}
															className={`w-[52px] h-[52px] rounded-full border-2 bg-center bg-cover ${activeTexId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
															style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, backgroundColor: (!m.images || m.images.length === 0) && (m as any).solid ? (m as any).solid : undefined, borderColor: '#ddd' }}
														/>
														<span className="mt-1 text-[11px] text-gray-600 truncate w-20">{m.name || m.id}</span>
													</div>
												))}
											</div>
										</div>
									),
								});
							}
							nodes.push({
								key: 'path',
								el: (
									<div className="p-3">
										{(() => {
											// בחירה מהירה: ישר / L / U → בונה תבנית מסלול בסיסית ופותח עמודות לכל גרם
											const buildTemplate = (s: 'straight' | 'L' | 'U'): PathSegment[] => {
												const total = stepsTotalForPath || steps;
												if (s === 'straight') {
													return [{ kind: 'straight' as const, steps: total }];
												}
												if (s === 'L') {
													const a = Math.max(1, Math.round(total / 2));
													const b = Math.max(1, total - a);
													return [{ kind: 'straight' as const, steps: a }, { kind: 'landing' as const, turn: 'right' as const }, { kind: 'straight' as const, steps: b }];
												}
												// U
												const a = Math.max(1, Math.floor(total / 3));
												const b = Math.max(1, Math.floor(total / 3));
												const c = Math.max(1, total - a - b);
												return [
													{ kind: 'straight' as const, steps: a },
													{ kind: 'landing' as const, turn: 'right' as const },
													{ kind: 'straight' as const, steps: b },
													{ kind: 'landing' as const, turn: 'right' as const },
													{ kind: 'straight' as const, steps: c },
												];
											};
											return (
												<div className="flex items-center justify-center gap-2 mb-3 text-center">
													{(['straight', 'L', 'U'] as const).map(s => (
														<button
															key={s}
															className={`px-4 py-2 text-base rounded-full border ${shape === s ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
															onClick={() => {
																setShape(s);
																setPathSegments(buildTemplate(s));
															}}
														>
															{s === 'straight' ? 'ישר' : s === 'L' ? 'צורת L' : 'צורת U'}
														</button>
													))}
												</div>
											);
										})()}

										{(() => {
											// הצגת עמודות לכל גרם (ריצה ישרה), עם כפתורי +/- למדרגות, ומתג פנייה בין הגרמים
											const straightIdxs: number[] = [];
											const landingIdxs: number[] = [];
											pathSegments.forEach((seg, i) => {
												if (seg.kind === 'straight') straightIdxs.push(i);
												else landingIdxs.push(i);
											});
											const flights = straightIdxs.map((i) => ({ segIndex: i, steps: (pathSegments[i] as any).steps as number }));
											const cols = Math.max(1, flights.length);
											return (
												<>
													{/* כפתור מראה גלובלי – הופך את כל הפניות במסלול */}
													<div className="flex items-center justify-center mb-2">
														<button
															className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
															onClick={() => {
																setPathSegments(prev => prev.map(seg => {
																	if (seg.kind !== 'landing') return seg;
																	if (!seg.turn) return seg;
																	return { kind: 'landing', turn: (seg.turn === 'left' ? 'right' : 'left') };
																}));
															}}
															title="מראה"
															aria-label="מראה"
														>
															מראה
														</button>
													</div>

													<div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
														{flights.map((f, fi) => (
															<div key={fi} className="border rounded-md p-2 text-center">
																<div className="text-sm text-gray-600 mb-1">גרם {fi + 1}</div>
																<div className="flex items-center justify-center gap-2">
																	<button
																		className="px-2 py-1 rounded border"
																		aria-label="פחות מדרגות"
																		onClick={() => {
																			setPathSegments(prev => prev.map((seg, idx) => (
																				idx === f.segIndex && seg.kind === 'straight'
																					? { kind: 'straight', steps: Math.max(1, (seg as any).steps - 1) }
																					: seg
																			)));
																		}}
																	>
																		-
																	</button>
																	<span className="text-base font-medium min-w-[3ch]">{f.steps}</span>
																	<button
																		className="px-2 py-1 rounded border"
																		aria-label="יותר מדרגות"
																		onClick={() => {
																			setPathSegments(prev => prev.map((seg, idx) => (
																				idx === f.segIndex && seg.kind === 'straight'
																					? { kind: 'straight', steps: Math.min(25, (seg as any).steps + 1) }
																					: seg
																			)));
																		}}
																	>
																		+
																	</button>
																</div>
															</div>
														))}
													</div>
												</>
											);
										})()}
									</div>
								),
							});
							nodes.push({
								key: 'railing',
								el: (
									<div className="p-3">
										<div className="flex items-center justify-center gap-2 mb-2 text-center">
											{([
												{ id: 'none', label: 'ללא' },
												{ id: 'glass', label: 'זכוכית' },
												{ id: 'metal', label: 'מתכת' },
												{ id: 'cable', label: 'כבלי נירוסטה' },
											] as const).map(opt => (
												<button key={opt.id} className={`px-4 py-2 text-base rounded-full border ${railing === opt.id ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`} onClick={() => setRailing(opt.id)}>
													{opt.label}
												</button>
											))}
										</div>

										{/* צבעים/גוונים לפי סוג המעקה הנבחר – מוצג בטאב העליון */}
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
											{railing === 'cable' && (
												<div className="flex items-center justify-center gap-3 flex-wrap">
													{cableOptions.map(opt => (
														<button
															key={opt.id}
															title={opt.name}
															aria-label={opt.name}
															onClick={() => { setCableId(opt.id); setCableColor(opt.color || '#c7ccd1'); }}
															className={`w-[22px] h-[22px] rounded-full border-2 bg-center bg-cover cursor-pointer ${cableId === opt.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
															style={{ backgroundImage: opt.image ? `url("${encodeURI(opt.image)}")` : undefined, borderColor: '#ddd' }}
														/>
													))}
												</div>
											)}
										</div>

										{(() => {
											// עורך מתקדם כמו ב"מסלול": עמודות לכל גרם (בלי בחירת צד – תמיד פנימי)
											// מפה את ריצות הישר לאינדקסי מדרגות במערכי המעקה
											const flights: Array<{ segIndex: number; start: number; count: number }> = [];
											let cursor = 0;
											for (let i = 0; i < pathSegments.length; i++) {
												const seg = pathSegments[i];
												if (seg.kind === 'straight') {
													const count = Math.max(0, (seg as any).steps || 0);
													flights.push({ segIndex: i, start: cursor, count });
													cursor += count;
												} else {
													// פודסט אינו מוסיף מדרגות
												}
											}
											const cols = Math.max(1, flights.length);

											const toggleFlight = (f: { start: number; count: number }, value: boolean) => {
												setStepRailing(prev => {
													const out = prev.slice(0, Math.max(prev.length, f.start + f.count));
													for (let i = f.start; i < f.start + f.count; i++) out[i] = value;
													return out;
												});
											};
											// ללא בחירת צד – הצד תמיד פנימי לפי computeInnerDefaultSides

											return (
												<>
													{/* ללא "מראה" – הצד נקבע אוטומטית */}

													<div className="grid gap-3 mb-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
														{flights.map((f, idx) => {
															const enabledCount = stepRailing.slice(f.start, f.start + f.count).filter(Boolean).length;
															const allOn = enabledCount === f.count && f.count > 0;
															const anyOn = enabledCount > 0;
															return (
																<div key={idx} className="border rounded-md p-2 text-center">
																	<div className="text-sm text-gray-600 mb-1">גרם {idx + 1}</div>
																	<div className="flex items-center justify-center gap-2 mb-2">
																		<button
																			className={`px-3 py-1 text-sm rounded-full border ${allOn ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
																			onClick={() => toggleFlight(f, true)}
																		>
																			עם מעקה
																		</button>
																		<button
																			className={`px-3 py-1 text-sm rounded-full border ${!anyOn ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
																			onClick={() => toggleFlight(f, false)}
																		>
																			ללא
																		</button>
																	</div>
																	{/* ללא בחירת צד */}
																</div>
															);
														})}
													</div>

													{/* פודסטים ללא פנייה – הפעלה בלבד (צד אוטומטי פנימי) */}
													{landingMeta.some(t => !t) && (
														<div className="flex items-center justify-center gap-2 flex-wrap">
															{landingMeta.map((turn, i) => {
																if (turn) return null;
																const on = landingRailing[i] ?? (railing !== 'none');
																return (
																	<div key={i} className="border rounded-md p-2 text-center">
																		<div className="text-sm text-gray-600 mb-1">פודסט {i + 1}</div>
																		<div className="flex items-center justify-center gap-2 mb-2">
																			<button
																				className={`px-3 py-1 text-sm rounded-full border ${on ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
																				onClick={() => setLandingRailing(prev => prev.map((v, idx) => idx === i ? true : v))}
																			>
																				עם מעקה
																			</button>
																			<button
																				className={`px-3 py-1 text-sm rounded-full border ${!on ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
																				onClick={() => setLandingRailing(prev => prev.map((v, idx) => idx === i ? false : v))}
																			>
																				ללא
																			</button>
																		</div>
																		{/* ללא בחירת צד */}
																	</div>
																);
															})}
														</div>
													)}
												</>
											);
										})()}
									</div>
								),
							});

							const mapNodes = new Map(nodes.map(n => [n.key, n.el]));
							const order: Cat[] = activeMaterial === 'wood' ? ['box','material','woodTexture','woodColor','path','railing'] : ['box','material','nonWoodTexture','path','railing'];
							return (
								<>
									<div className="flex gap-3 overflow-x-auto px-3 pt-2 w-full lg:justify-center">
										{order.map(tab => (
											<button key={tab} className={`inline-flex items-center justify-center px-4 py-2 text-sm md:text-base whitespace-nowrap text-center border-b-2 min-h-[44px] ${mobileOpenCat === tab ? 'border-[#1a1a2e] text-[#1a1a2e] font-semibold' : 'border-transparent text-gray-600 hover:text-gray-800'}`} onClick={() => setMobileOpenCat(tab)}>
												{getCatTitle(tab)}
											</button>
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
							shadows={false}
							flat
							camera={{ position: [-2.494, 1.897, 3.259], fov: 45 }}
							dpr={[1, 1.5]}
							gl={{ toneMapping: NoToneMapping, toneMappingExposure: 1.0, preserveDrawingBuffer: false, antialias: true, powerPreference: 'high-performance' }}
						>
							<React.Suspense fallback={null}>
								{/* ללא תאורה – חומרים Unlit מציגים טקסטורות AS-IS */}
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
									treadThicknessOverride={box === 'thick' ? 0.11 : (box === 'wedge' ? 0.11 : (box === 'ridge' ? 0.02 : 0.07))}
									boxModel={box === 'wedge' ? 'wedge' : (box === 'ridge' ? 'ridge' : 'rect')}
									wedgeFrontThicknessM={0.035}
									ridgeFrontCenterThicknessM={0.09}
									ridgeFrontEdgeThicknessM={0.03}
									pathSegments={pathSegments}
									glassTone={glassTone}
									stepRailingStates={stepRailing}
									landingRailingStates={landingRailing}
									stepRailingSides={stepRailingSide}
									landingRailingSides={landingRailingSide}
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
								<OrbitControls ref={orbitRef} enableDamping makeDefault zoomToCursor target={[0.304, 0.930, -0.053]} />
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
											<span className="text-sm text-gray-600">{box === 'thick' ? 'תיבה עבה‑דופן' : box === 'thin' ? 'תיבה דקה‑דופן' : box === 'wedge' ? 'דגם אלכסוני' : 'דגם רכס מרכזי'}</span>
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
															onClick={() => {
																setBox(opt.id);
															}}
														>
															{opt.label}
														</button>
													))}
												</div>
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
															onClick={() => {
																startTransition(() => {
																	setActiveMaterial(m);
																	setMobileOpenCat(m === 'wood' ? 'woodTexture' : 'nonWoodTexture');
																});
															}}
														>
															{m === 'wood' ? 'עץ' : m === 'metal' ? 'מתכת' : 'אבן טבעית'}
														</button>
													))}
												</div>
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
																onClick={() => startTransition(() => {
																	setActiveModelId(m.id);
																})}
																className={`w-10 h-10 rounded-full border-2 bg-center bg-cover ${activeModelId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
																style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
															/>
														))}
													</div>
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
																			onClick={() => startTransition(() => {
																				setActiveColor(sw.id);
																			})}
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
														onClick={() => {
															setPathSegments(prev => [...prev, { kind: 'straight', steps: 5 }]);
														}}
													>
														הוסף ישר (5 מדר׳)
													</button>
													<button
														className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
														onClick={() => {
															setPathSegments(prev => [
																...prev,
																{ kind: 'landing', turn: 'right' },
																{ kind: 'straight', steps: 1 },
															]);
														}}
													>
														פודסט + ימינה
													</button>
													<button
														className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
														onClick={() => {
															setPathSegments(prev => [
																...prev,
																{ kind: 'landing', turn: 'left' },
																{ kind: 'straight', steps: 1 },
															]);
														}}
													>
														פודסט + שמאלה
													</button>
													<button
														className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
														onClick={() => {
															setPathSegments(prev => [...prev, { kind: 'landing' }]);
														}}
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
										<div className="flex gap-3 overflow-x-auto px-2 py-2 w-full lg:justify-center" dir="rtl">
											{tabOrder.map(tab => (
												<button
													key={tab}
													className={`inline-flex items-center justify-center px-4 py-2 text-sm md:text-base whitespace-nowrap text-center border-b-2 min-h-[44px] ${mobileOpenCat === tab ? 'border-[#1a1a2e] text-[#1a1a2e] font-semibold' : 'border-transparent text-gray-600 hover:text-gray-800'}`}
													onClick={() => setMobileOpenCat(tab)}
													aria-selected={mobileOpenCat === tab}
													role="tab"
												>
													{getCatTitle(tab)}
												</button>
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
											<span className="text-sm text-gray-600">{box === 'thick' ? 'תיבה עבה‑דופן' : box === 'thin' ? 'תיבה דקה‑דופן' : box === 'wedge' ? 'דגם אלכסוני' : 'דגם רכס מרכזי'}</span>
							</button>
							{desktopOpenCat === 'box' && (
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
												onClick={() => {
													startTransition(() => {
														setActiveMaterial(m);
														setDesktopOpenCat(m === 'wood' ? 'woodTexture' : 'nonWoodTexture');
													});
												}}
											>
												{m === 'wood' ? 'עץ' : m === 'metal' ? 'מתכת' : 'אבן טבעית'}
											</button>
										))}
									</div>
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
														setActiveMetalTexId(m.id);
													})}
													className={`w-10 h-10 rounded-full border-2 bg-center bg-cover ${activeTexId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
													style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, backgroundColor: (!m.images || m.images.length === 0) && (m as any).solid ? (m as any).solid : undefined, borderColor: '#ddd', backgroundSize: (m as any).category === 'metal' ? '140%' as any : undefined }}
												/>
											))}
										</div>
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

		{/* מודאל תיאום מדידה – מראה יוקרתי ותמציתי */}
		{bookingOpen && (
			<div
				className={`fixed inset-0 z-[70] bg-[#0b1020]/70 backdrop-blur-sm flex ${isKeyboardOpen ? 'items-start pt-6' : 'items-center'} justify-center p-4 overscroll-contain`}
				dir="rtl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="bookingTitle"
				onKeyDown={(e) => {
					if (e.key === 'Escape') setBookingOpen(false);
				}}
				onClick={() => setBookingOpen(false)}
			>
				<div
					ref={dialogRef}
					className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-[#C5A059]/30 max-h-[90dvh]"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="px-5 py-4 bg-[#1a1a2e] text-white relative border-b border-[#C5A059]/30">
						<div className="text-center" aria-label="ASCENSO logo">
							<BrandWordmark size="md" color="#ffffff" />
						</div>
					</div>

					{!bookingSubmitted ? (
						<form onSubmit={handleBookingSubmit} className="bg-[#f6f7fb] text-[#0f1424] p-6">
							{/* התקדמות: שאלה X מתוך Y + פס התקדמות */}
							<div className="mb-4">
								<div className="flex items-center justify-between text-xs md:text-sm text-[#0f1424]/70" dir="rtl">
									<span>שאלה {stepIndex + 1} מתוך {stepTotal}</span>
									<span>{stepPercent}%</span>
								</div>
								<div className="h-1.5 bg-black/10 rounded-full overflow-hidden mt-1">
									<div className="h-full bg-[#1a1a2e]" style={{ width: `${stepPercent}%` }} />
								</div>
							</div>
							<div className="mb-2 relative flex justify-center">
								{/* אייקון לוח שנה – מובייל נשאר בצד שמאל אך רחוק יותר מהטקסט; בדסקטופ מורחק מעט מהטקסט */}
								<div className="absolute left-2 md:left-4 lg:left-20 top-1/2 -translate-y-1/2 pointer-events-none text-[#0f1424]">
									<svg
										className="w-[2.72rem] h-[2.72rem] md:w-[3.2rem] md:h-[3.2rem]"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
										aria-hidden="true"
									>
										<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
										<line x1="16" y1="2" x2="16" y2="6"></line>
										<line x1="8" y1="2" x2="8" y2="6"></line>
										<line x1="3" y1="10" x2="21" y2="10"></line>
									</svg>
								</div>
								<div className="flex flex-col items-center w-full">
									<div className="leading-relaxed text-[1.35rem] md:text-[1.6875rem] font-semibold text-center">
										תיאום פגישה בשטח
									</div>
									<div className="text-[#0f1424]/80 leading-relaxed text-base md:text-lg text-center">
										מלאו את הפרטים וניצור קשר
									</div>
								</div>
							</div>
							<div className="grid grid-cols-1 gap-4">
								<div className="flex items-start mt-1 md:mt-2">
									<div ref={questionRef} className="bg-[#1a1a2e] text-white rounded-2xl px-4 py-2 text-base md:text-lg leading-snug inline-block">
										{bookingStep === 'name' ? 'שם מלא?' :
										 bookingStep === 'city' ? 'עיר הפרויקט?' :
										 bookingStep === 'date' ? 'מתי נוח לך שניפגש?' :
										 'איזה חלון זמן עדיף?'}
									</div>
								</div>

								{bookingStep === 'name' && (
									<div className="block" style={answerWidthPx ? { width: answerWidthPx } : undefined}>
										<label className="block" htmlFor="fullName">
											<input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} ref={firstInputRef}
												className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
												placeholder="שם ושם משפחה" />
										</label>
									</div>
								)}

								{bookingStep === 'city' && (
									<div className="block" style={answerWidthPx ? { width: answerWidthPx } : undefined}>
										<label className="block" htmlFor="city">
											<input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} ref={cityInputRef} list="city-list"
												className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] appearance-none"
												style={{ backgroundImage: 'none' }}
												placeholder="לדוגמה: תל אביב" />
											<datalist id="city-list">
												{cityOptions.map((opt) => (<option value={opt} key={opt} />))}
											</datalist>
										</label>
									</div>
								)}

								{/* הוסרו שלבי רחוב ומספר בית לפי בקשה */}

								{bookingStep === 'date' && (
									<div className="mt-1 rounded-2xl border border-[#C5A059]/40 bg-white text-[#0f1424] w-full">
										{(() => {
											const rows = Math.max(1, Math.ceil(twoWeeksDates.length / 2));
											return (
												<div
													className="grid grid-cols-2 grid-flow-col gap-1 p-2 rounded-2xl"
													style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, height: '12rem' }}
												>
													{twoWeeksDates.map(d => (
														<label
															key={d.value}
															className={`flex items-center justify-between px-2 py-1 rounded-lg border ${d.disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : 'cursor-pointer hover:bg-gray-50 border-gray-200'}`}
														>
															<span className="text-xs md:text-sm">{d.weekday} — {d.label}</span>
															<input
																type="radio"
																name="preferredDate"
																value={d.value}
																checked={preferredDate === d.value}
																onChange={() => !d.disabled && setPreferredDate(d.value)}
																disabled={d.disabled}
															/>
														</label>
													))}
												</div>
											);
										})()}
									</div>
								)}

								{bookingStep === 'time' && (
									<div className="mt-1 rounded-2xl border border-[#C5A059]/40 bg-white text-[#0f1424] w-full">
										<div className="grid grid-cols-3 gap-2 p-2 rounded-2xl">
											{[8, 11, 14].map((start) => {
												const end = start + 3;
												const to2 = (n: number) => n.toString().padStart(2, '0');
												const label = `${to2(start)}:00–${to2(end)}:00`;
												return (
													<label key={label} className="flex items-center justify-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-2xl border border-gray-200">
														<input type="radio" name="preferredTime" value={label} checked={preferredTime === label} onChange={() => setPreferredTime(label)} />
														<span className="text-sm">{label}</span>
													</label>
												);
											})}
										</div>
									</div>
								)}
							</div>

							<div className="mt-6 flex flex-col sm:flex-row gap-2">
								<div className="flex w-full gap-2">
									<button
										type="button"
										onClick={() => { const steps = ['name','city','date','time']; const i = steps.indexOf(bookingStep as any); if (i > 0) setBookingStep(steps[i-1] as any); }}
										disabled={bookingStep === 'name'}
										className="flex-1 px-5 py-3 rounded-md font-semibold border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
									>
										חזרה
									</button>

									{bookingStep !== 'time' ? (
										<button
											type="button"
											onClick={(e) => { 
												e.preventDefault(); 
												e.stopPropagation(); 
												const steps = ['name','city','date','time'] as const; 
												const i = steps.indexOf(bookingStep as any); 
												if (i < steps.length - 1) {
													// דחייה לטיק הבא כדי למנוע "המרת" הכפתור ל-submit באותו אירוע
													setTimeout(() => setBookingStep(steps[i+1] as any), 0);
												}
											}}
											disabled={
												(bookingStep === 'name' && !(fullName && fullName.trim().length > 1)) ||
												(bookingStep === 'city' && !city) ||
												(bookingStep === 'date' && !preferredDate)
											}
											className="flex-1 px-5 py-3 rounded-md font-semibold text-white bg-[#1a1a2e] hover:opacity-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
										>
											המשך
										</button>
									) : (
										<button
											type="submit"
											disabled={!preferredTime || !preferredDate || !(fullName && fullName.trim().length > 1) || !city}
											className="flex-1 px-5 py-3 rounded-md font-semibold text-white bg-[#25D366] hover:bg-[#20c15b] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
										>
											<span className="inline-flex items-center justify-center gap-2">
												<span>שליחה</span>
												<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
													<path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0C5.4 0 .02 5.37.02 12c0 2.11.55 4.17 1.6 6L0 24l6.14-1.6a11.98 11.98 0 0 0 5.88 1.52h.01c6.62 0 12-5.37 12-12 0-3.2-1.25-6.21-3.51-8.39zM12.02 22a9.96 9.96 0 0 1-5.08-1.39l-.36-.21-3.64.95.97-3.55-.24-.37A9.95 9.95 0 0 1 2.02 12C2.02 6.51 6.53 2 12.02 2c2.66 0 5.16 1.04 7.04 2.92A9.9 9.9 0 0 1 22.02 12c0 5.49-4.51 10-10 10z"/>
													<path d="M17.48 14.11c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.19.3-.76.98-.93 1.17-.17.2-.35.22-.65.08-.3-.14-1.27-.47-2.41-1.5-.89-.79-1.49-1.77-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.37.45-.56.15-.18.2-.31.3-.51.1-.2.05-.37-.02-.52-.07-.14-.67-1.63-.92-2.23-.24-.6-.49-.52-.66-.53l-.57-.01c-.19 0-.5.07-.77.36s-1.01 1.02-1.01 2.49 1.04 2.88 1.19 3.08c.14.2 2.04 3.18 4.96 4.47.7.3 1.24.49 1.66.62.7.22 1.33.2 1.84.13.56-.08 1.75-.71 2-1.41.24-.7.24-1.29.17-1.41-.07-.12-.27-.2-.56-.34z"/>
												</svg>
											</span>
										</button>
									)}
								</div>
							</div>
						</form>
					) : (
						<div className="bg-white text-[#0f1424] p-8 text-center">
							<div className="mx-auto mb-4 w-14 h-14 rounded-full border-2 border-[#22c55e] bg-[#22c55e]/10 flex items-center justify-center">
								<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
									<path d="M20 6L9 17l-5-5" />
								</svg>
							</div>
							<p className="text-xl font-semibold mb-1">פנייתך התקבלה</p>
							<p className="text-gray-600">
								נציג מטעמנו ייצור קשר לתיאום סופי.
							</p>
							<div className="mt-6">
								<button
									onClick={() => setBookingOpen(false)}
									className="inline-flex justify-center items-center px-6 py-3 rounded-md font-semibold text-white bg-[#1a1a2e] hover:opacity-95 cursor-pointer"
								>
									סגור
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		)}
			</div>
			<Footer />
		</>
	);
}

export default function LivePage() {
	return (
		<LiveErrorBoundary>
			<React.Suspense fallback={null}>
				<LivePageInner />
			</React.Suspense>
		</LiveErrorBoundary>
	);
}

class LiveErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, message: undefined };
	}
	static getDerivedStateFromError(error: any) {
		return { hasError: true, message: String(error?.message || error) };
	}
	componentDidCatch(error: any, info: any) {
		// לוג שימושי לבדיקת חריגות בפרודקשן
		try {
			// eslint-disable-next-line no-console
			console.error('LIVE error boundary:', error, info);
		} catch {}
	}
	render() {
		if (this.state.hasError) {
			return (
				<main dir="rtl" className="max-w-3xl mx-auto px-4 py-10">
					<h1 className="text-xl font-bold mb-2">אירעה שגיאה בהטענת ההדמייה</h1>
					<p className="text-gray-600 mb-4">נסה לרענן את הדף. אם הבעיה נמשכת, שלח לנו צילום מסך של הקונסול.</p>
					{this.state.message ? <pre className="text-sm bg-gray-50 border p-3 overflow-auto">{this.state.message}</pre> : null}
					<div className="mt-4">
						<button onClick={() => location.reload()} className="px-4 py-2 bg-black text-white">רענון</button>
					</div>
				</main>
			);
		}
		return this.props.children as any;
	}
}
