'use client';

import Image from 'next/image';
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, useTexture, useProgress } from '@react-three/drei';
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
import { TextureLoader, RepeatWrapping, ClampToEdgeWrapping, SRGBColorSpace, LinearFilter, BufferGeometry, Float32BufferAttribute, Cache, NoToneMapping } from 'three';

// הפעלת קאש של three עבור טעינות חלקות
Cache.enabled = true;

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
};

const WOOD_SWATCHES: { id: string; label: string }[] = [
	{ id: 'black', label: 'שחור' },
	{ id: 'graphite', label: 'גרפיט' },
	{ id: 'white', label: 'לבן' },
	{ id: 'natural', label: 'טבעי בהיר' },
	{ id: 'walnut', label: 'וולנט' },
	{ id: 'oak', label: 'אלון' },
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
const MODEL_CONFIG: Record<string, { tile?: number; bump?: number }> = {
	'wave-carved': { tile: 0.9, bump: 0.35 },
};
const DEFAULT_MODEL_CONFIG = { tile: 1.5, bump: 0.18 };



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
	textureUrl,
	bumpUrl,
	roughnessUrl,
	tileScale = 1.5,
	bumpScaleOverride,
	treadThicknessOverride,
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
	textureUrl?: string | null;
	bumpUrl?: string | null;
	roughnessUrl?: string | null;
	tileScale?: number;
	bumpScaleOverride?: number;
	treadThicknessOverride?: number;
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
		const treads: Array<{ position: [number, number, number]; rotation: [number, number, number]; run: number; isLanding: boolean; turn?: 'left' | 'right' }> = [];
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
			for (const seg of pathSegments) {
				if (seg.kind === 'straight') {
					const [dx, dz] = dirs[dirIndex];
					for (let i = 0; i < seg.steps; i++) {
						const run = treadDepth;
						const cx = sx + dx * (run / 2);
						const cz = sz + dz * (run / 2);
						treads.push({
							position: [cx, stepIndex * riser, cz],
							rotation: [0, yaws[dirIndex], 0],
							run,
							isLanding: false,
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
				});
			}
		} else if (shape === 'L') {
			const half = Math.floor(steps / 2);
			for (let i = 0; i < half; i++) {
				treads.push({ position: [i * treadDepth + treadDepth / 2, i * riser, 0], rotation: [0, 0, 0], run: treadDepth, isLanding: false });
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
			});
			// המשך בכיוון חדש
			for (let i = 0; i < steps - half - 1; i++) {
				treads.push({
					position: [lxStart + runL, (half + 1 + i) * riser, -(i * treadDepth + treadDepth / 2)],
					rotation: [0, Math.PI / 2, 0],
					run: treadDepth,
					isLanding: false,
				});
			}
		} else {
			// U
			const third = Math.floor(steps / 3);
			for (let i = 0; i < third; i++) {
				treads.push({ position: [i * treadDepth + treadDepth / 2, i * riser, 0], rotation: [0, 0, 0], run: treadDepth, isLanding: false });
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
			});
			for (let i = 0; i < third; i++) {
				treads.push({
					position: [l1xStart + runL1, (third + 1 + i) * riser, -(i * treadDepth + treadDepth / 2)],
					rotation: [0, Math.PI / 2, 0],
					run: treadDepth,
					isLanding: false,
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
			});
			for (let i = 0; i < steps - third * 2 - 1; i++) {
				treads.push({
					position: [rStartX + runL2 + i * treadDepth + treadDepth / 2, (third * 2 + 2 + i) * riser, rStartZ],
					rotation: [0, 0, 0],
					run: treadDepth,
					isLanding: false,
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
		// הגנה קטנה מתפרים
		repU = Math.max(0.92, Math.min(1, repU));
		repV = Math.max(0.92, Math.min(1, repV));
		const offU = (1 - repU) / 2;
		const offV = (1 - repV) / 2;

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
			{(() => { let sIdx = 0; let lIdx = 0; return treads.map((t, idx) => (
				<group key={idx} position={t.position} rotation={t.rotation}>
					{/* גוף המדרך */}
					<mesh castShadow receiveShadow>
						<boxGeometry args={[t.run, treadThickness, treadWidth]} />
						<meshBasicMaterial color={materialKind === 'metal' ? '#8f8f8f' : '#b3a59a'} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
					</mesh>
					{/* שכבת פני השטח עם תבליט אמיתי לעץ; למתכת/אבן – כיסוי מרקם */}
					<mesh
						rotation={[-Math.PI / 2, 0, 0]}
						position={[0, treadThickness / 2 + 0.002, 0]}
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
								const ft = buildFaceTextures(t.run, treadWidth);
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
							})()
						) : (
							(() => {
								const ft = buildFaceTextures(t.run, treadWidth);
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
							})()
						)}
					</mesh>

					{/* BOTTOM face */}
					<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -treadThickness / 2 - 0.0005, 0]} receiveShadow>
						<planeGeometry args={[t.run, treadWidth, 8, 8]} />
						{(() => {
							const ft = buildFaceTextures(t.run, treadWidth);
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} />);
						})()}
					</mesh>

					{/* FRONT (+X) */}
					<mesh rotation={[0, Math.PI / 2, 0]} position={[t.run / 2 + 0.0005, 0, 0]} receiveShadow>
						<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
						{(() => {
							const ft = buildFaceTextures(treadWidth, treadThickness);
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} />);
						})()}
					</mesh>

					{/* BACK (-X) */}
					<mesh rotation={[0, -Math.PI / 2, 0]} position={[-t.run / 2 - 0.0005, 0, 0]} receiveShadow>
						<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
						{(() => {
							const ft = buildFaceTextures(treadWidth, treadThickness);
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} />);
						})()}
					</mesh>

					{/* RIGHT (+Z) */}
					<mesh rotation={[0, 0, 0]} position={[0, 0, treadWidth / 2 + 0.0005]} receiveShadow>
						<planeGeometry args={[t.run, treadThickness, 8, 8]} />
						{(() => {
							const ft = buildFaceTextures(t.run, treadThickness);
							return (<meshBasicMaterial map={ft.color} />);
						})()}
					</mesh>

					{/* LEFT (-Z) */}
					<mesh rotation={[0, Math.PI, 0]} position={[0, 0, -treadWidth / 2 - 0.0005]} receiveShadow>
						<planeGeometry args={[t.run, treadThickness, 8, 8]} />
						{(() => {
							const ft = buildFaceTextures(t.run, treadThickness);
							return (<meshBasicMaterial map={ft.color} />);
						})()}
					</mesh>

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
				const distance = 0.01; // מרחק המעקה מהמדרך (1 ס"מ)
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
							current = {
								axis: 'x',
								start: x0,
								end: x1,
								baseCoord: t.position[0],
								baseBottomY: bottomY,
								stepRun: treadDepth,
								overlap: overlapStep,
								zSign,
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
								};
							} else {
								current.end = x1;
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

				return segs.map((sg, i) => {
					// y(x) = k*x + b, כאשר k = riser / run, ו-b נקבע כך שהקו עובר דרך מרכז המדרך הראשון
					const k = riser / sg.stepRun;
					const b = sg.baseBottomY - k * sg.baseCoord - (sg.overlap ?? 0);
					// קביעת גובה כולל: treadThickness + (גובה מעל הפנים + חפיפה תחתונה)
					const isLandingSeg = sg.stepRun === Number.POSITIVE_INFINITY;
					const tH = treadThickness + (isLandingSeg
						? (heightAboveFaceLanding + overlapLanding)
						: (heightAboveFaceStep + overlapStep));

					if (sg.axis === 'x') {
						const zPos = (sg.zSign ?? 1) * (treadWidth / 2 + distance);
						const geom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							sg.start, k * sg.start + b, zPos,
							sg.end, k * sg.end + b, zPos,
							sg.start, k * sg.start + b + tH, zPos,
							sg.end, k * sg.end + b + tH, zPos,
						], 3);
						geom.setAttribute('position', positions);
						geom.setIndex([0, 1, 2, 2, 1, 3]);
						geom.computeVertexNormals();
						return (
							<group key={`gseg-x-${i}`}>
								<mesh castShadow={false} receiveShadow={false}>
									<primitive object={geom} attach="geometry" />
									<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false}
										polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
								</mesh>
							</group>
						);
					} else {
						const xGlass = sg.xConst ?? 0;
						const signX = sg.signX ?? 1;
						const xSide = xGlass - signX * distance;
						const zGeom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							xGlass, k * sg.start + b, sg.start,
							xGlass, k * sg.end + b, sg.end,
							xGlass, k * sg.start + b + tH, sg.start,
							xGlass, k * sg.end + b + tH, sg.end,
						], 3);
						zGeom.setAttribute('position', positions);
						zGeom.setIndex([0,1,2,2,1,3]);
						zGeom.computeVertexNormals();
						return (
							<group key={`gseg-z-${i}`}>
								<mesh castShadow={false} receiveShadow={false}>
									<primitive object={zGeom} attach="geometry" />
									<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false}
										polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
								</mesh>
							</group>
						);
					}
				});
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
				const distance = 0.01; // מרחק המעקה מהמדרך (1 ס"מ)
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
							segs.push({
								axis: 'x',
								start: x0,
								end: x1,
								baseCoord: t.position[0],
								baseBottomY: bottomY,
								stepRun: Number.POSITIVE_INFINITY,
								overlap: overlapLanding,
								zSign,
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
								};
							} else {
								current.end = x1;
								current.zSign = zSignDesired;
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

				return segs.map((sg, i) => {
					const k = riser / sg.stepRun;
					const b = sg.baseBottomY - k * sg.baseCoord - (sg.overlap ?? 0);
					const isLandingSeg = sg.stepRun === Number.POSITIVE_INFINITY;
					const tH = treadThickness + (isLandingSeg
						? (heightAboveFaceLanding + overlapLanding)
						: (heightAboveFaceStep + overlapStep));

					if (sg.axis === 'x') {
						const zPos = (sg.zSign ?? 1) * (treadWidth / 2 + distance);
						const geom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							sg.start, k * sg.start + b, zPos,
							sg.end, k * sg.end + b, zPos,
							sg.start, k * sg.start + b + tH, zPos,
							sg.end, k * sg.end + b + tH, zPos,
						], 3);
						const uvs = new Float32BufferAttribute([
							0, 0,
							1, 0,
							0, 1,
							1, 1,
						], 2);
						geom.setAttribute('position', positions);
						geom.setAttribute('uv', uvs);
						geom.setIndex([0, 1, 2, 2, 1, 3]);
						geom.computeVertexNormals();
						// מיפוי "cover" ללא חזרות: משמר אחידות ללא ריבועים חוזרים
						const len = Math.abs(sg.end - sg.start);
						const h = tH;
						const texW = (railingMap.image && (railingMap.image as any).width) || 1024;
						const texH = (railingMap.image && (railingMap.image as any).height) || 1024;
						const texAspect = texW / texH;
						const geoAspect = len / h;
						let repU = 1, repV = 1;
						if (geoAspect > texAspect) {
							// הפאנל "רחב" יחסית → נצמצם בציר U ונמרכז
							repU = texAspect / geoAspect;
							repV = 1;
						} else {
							repU = 1;
							repV = geoAspect / texAspect;
						}
						repU = Math.max(0.92, Math.min(1, repU));
						repV = Math.max(0.92, Math.min(1, repV));
						const offU = (1 - repU) / 2;
						const offV = (1 - repV) / 2;
						const mapTex = railingMap.clone();
						// @ts-ignore
						mapTex.colorSpace = SRGBColorSpace;
						mapTex.wrapS = mapTex.wrapT = ClampToEdgeWrapping;
						mapTex.generateMipmaps = false;
						mapTex.minFilter = LinearFilter;
						mapTex.repeat.set(repU, repV);
						mapTex.offset.set(offU, offV);
						mapTex.needsUpdate = true;
						const bumpTex = railingBumpUrl ? railingBumpMap.clone() : undefined;
						if (bumpTex) {
							bumpTex.wrapS = bumpTex.wrapT = ClampToEdgeWrapping;
							bumpTex.generateMipmaps = false;
							bumpTex.minFilter = LinearFilter;
							bumpTex.repeat.set(repU, repV);
							bumpTex.offset.set(offU, offV);
							bumpTex.needsUpdate = true;
						}
						const roughTex = railingRoughnessUrl ? railingRoughMap.clone() : undefined;
						if (roughTex) {
							roughTex.wrapS = roughTex.wrapT = ClampToEdgeWrapping;
							roughTex.generateMipmaps = false;
							roughTex.minFilter = LinearFilter;
							roughTex.repeat.set(repU, repV);
							roughTex.offset.set(offU, offV);
							roughTex.needsUpdate = true;
						}
						return (
							<group key={`mseg-x-${i}`}>
								<mesh castShadow receiveShadow>
									<primitive object={geom} attach="geometry" />
									{railingSolidColor ? (
										<meshBasicMaterial key={`msolid-${railingSolidColor}`} color={railingSolidColor} side={2} />
									) : (
										<meshBasicMaterial key={`mtex-${(mapTex as any)?.image?.src || 'na'}`} map={mapTex} side={2} />
									)}
								</mesh>
							</group>
						);
					} else {
						const xMetal = sg.xConst ?? 0;
						const signX = sg.signX ?? 1;
						const zGeom = new BufferGeometry();
						const positions = new Float32BufferAttribute([
							xMetal, k * sg.start + b, sg.start,
							xMetal, k * sg.end + b, sg.end,
							xMetal, k * sg.start + b + tH, sg.start,
							xMetal, k * sg.end + b + tH, sg.end,
						], 3);
						const uvs = new Float32BufferAttribute([
							0, 0,
							1, 0,
							0, 1,
							1, 1,
						], 2);
						zGeom.setAttribute('position', positions);
						zGeom.setAttribute('uv', uvs);
						zGeom.setIndex([0,1,2,2,1,3]);
						zGeom.computeVertexNormals();
						// מיפוי "cover" ללא חזרות
						const len = Math.abs(sg.end - sg.start);
						const h = tH;
						const texW = (railingMap.image && (railingMap.image as any).width) || 1024;
						const texH = (railingMap.image && (railingMap.image as any).height) || 1024;
						const texAspect = texW / texH;
						const geoAspect = len / h;
						let repU = 1, repV = 1;
						if (geoAspect > texAspect) {
							repU = texAspect / geoAspect;
							repV = 1;
						} else {
							repU = 1;
							repV = geoAspect / texAspect;
						}
						repU = Math.max(0.92, Math.min(1, repU));
						repV = Math.max(0.92, Math.min(1, repV));
						const offU = (1 - repU) / 2;
						const offV = (1 - repV) / 2;
						const mapTex = railingMap.clone();
						// @ts-ignore
						mapTex.colorSpace = SRGBColorSpace;
						mapTex.wrapS = mapTex.wrapT = ClampToEdgeWrapping;
						mapTex.generateMipmaps = false;
						mapTex.minFilter = LinearFilter;
						mapTex.repeat.set(repU, repV);
						mapTex.offset.set(offU, offV);
						mapTex.needsUpdate = true;
						const bumpTex = railingBumpUrl ? railingBumpMap.clone() : undefined;
						if (bumpTex) {
							bumpTex.wrapS = bumpTex.wrapT = ClampToEdgeWrapping;
							bumpTex.generateMipmaps = false;
							bumpTex.minFilter = LinearFilter;
							bumpTex.repeat.set(repU, repV);
							bumpTex.offset.set(offU, offV);
							bumpTex.needsUpdate = true;
						}
						const roughTex = railingRoughnessUrl ? railingRoughMap.clone() : undefined;
						if (roughTex) {
							roughTex.wrapS = roughTex.wrapT = ClampToEdgeWrapping;
							roughTex.generateMipmaps = false;
							roughTex.minFilter = LinearFilter;
							roughTex.repeat.set(repU, repV);
							roughTex.offset.set(offU, offV);
							roughTex.needsUpdate = true;
						}
						return (
							<group key={`mseg-z-${i}`}>
								<mesh castShadow receiveShadow>
									<primitive object={zGeom} attach="geometry" />
									{railingSolidColor ? (
										<meshBasicMaterial key={`msolid-${railingSolidColor}`} color={railingSolidColor} side={2} />
									) : (
										<meshBasicMaterial key={`mtex-${(mapTex as any)?.image?.src || 'na'}`} map={mapTex} side={2} />
									)}
								</mesh>
							</group>
						);
					}
				});
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
	const [bookingStep, setBookingStep] = React.useState<'name' | 'city' | 'street' | 'house' | 'date' | 'time'>('name');
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
	// ברירת מחדל: חלון הזמן הראשון (08:00–11:00) אם לא נבחר
	React.useEffect(() => {
		if (!preferredTime) {
			const to2 = (n: number) => n.toString().padStart(2, '0');
			setPreferredTime(`${to2(8)}:00–${to2(11)}:00`);
		}
	}, [preferredTime]);
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

	const qMaterial = (search.get('material') as 'wood' | 'metal' | 'stone') || 'wood';
	const qColor = search.get('color') || 'oak';
	const qModel = search.get('model') || '';
	const qShape = (search.get('shape') as 'straight' | 'L' | 'U') || 'straight';
	const qSteps = parseInt(search.get('steps') || '', 10);
	const qTex = search.get('tex') || '';
	const qBox = (search.get('box') as 'thick' | 'thin') || 'thick';
	const qPath = search.get('path') || '';

	const [records, setRecords] = React.useState<MaterialRecord[]>([]);
	const [activeMaterial, setActiveMaterial] = React.useState<'wood' | 'metal' | 'stone'>(qMaterial);
	const [activeColor, setActiveColor] = React.useState<string>(qColor);
	const [activeModelId, setActiveModelId] = React.useState<string | null>(qModel || null);
	const [activeTexId, setActiveTexId] = React.useState<string | null>(qTex || null); // למתכת/אבן (סנכרון תצוגה)
	// מזהים ייעודיים לכל קטגוריה כדי לשמר בחירה בין מעברים
	const [activeMetalTexId, setActiveMetalTexId] = React.useState<string | null>(activeMaterial === 'metal' ? (qTex || null) : null);
	const [activeStoneTexId, setActiveStoneTexId] = React.useState<string | null>(activeMaterial === 'stone' ? (qTex || null) : null);
	const [box, setBox] = React.useState<'thick' | 'thin'>(qBox);
	const [railing, setRailing] = React.useState<'none' | 'glass' | 'metal' | 'cable'>('none');
	const [glassTone, setGlassTone] = React.useState<'extra' | 'smoked' | 'bronze'>('extra');
	const [stepRailing, setStepRailing] = React.useState<boolean[]>([]);
	const [landingRailing, setLandingRailing] = React.useState<boolean[]>([]);
	const [stepRailingSide, setStepRailingSide] = React.useState<Array<'right' | 'left'>>([]);
	const [landingRailingSide, setLandingRailingSide] = React.useState<Array<'right' | 'left'>>([]);
	const [railingMetalId, setRailingMetalId] = React.useState<string | null>(null);
	const [railingMetalSolid, setRailingMetalSolid] = React.useState<string | null>(null); // hex לצבע אחיד (ללא טקסטורה)
	const [cableOptions, setCableOptions] = React.useState<Array<{ id: string; name: string; image: string }>>([]);
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
	// מובייל: אקורדיון קטגוריות בפאנל
	const [mobileOpenCat, setMobileOpenCat] = React.useState<
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
			case 'box': return 'דגם תיבה';
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

	// מובייל: באנר שחזור מצב בריענון (לאחר שיש pathSegments)
	const [mobileRestorePrompt, setMobileRestorePrompt] = React.useState(false);
	const lastStateRef = React.useRef<any>(null);
	const hasCheckedRestoreRef = React.useRef(false);
	React.useEffect(() => {
		// שמירת מצב אחרון כל שינוי משמעותי
		try {
			// הימנע משמירה לפני שבדקנו אם לשחזר (כדי לא למחוק מצב קודם ברענון)
			if (!hasCheckedRestoreRef.current) return;
			const state = buildSimulationState();
			localStorage.setItem('ascenso:live:last', JSON.stringify({ t: Date.now(), state }));
		} catch {}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		box, activeMaterial, activeModelId, activeTexId, activeColor, shape, steps, pathSegments, railing, glassTone,
		stepRailing, landingRailing, stepRailingSide, landingRailingSide, railingMetalId, railingMetalSolid,
		cableId, cableColor, cableSpanMode, stepCableSpanMode, landingCableSpanMode
	]);
	React.useEffect(() => {
		// במובייל בלבד וכשאין קישור sim: הצע לשחזר מצב קודם אם קיים
		try {
			if (typeof window === 'undefined') return;
			if (window.innerWidth >= 1024) return;
			// זיהוי רענון
			let isReload = false;
			try {
				const nav = (performance.getEntriesByType && (performance.getEntriesByType('navigation') as any)[0]) as any;
				isReload = !!nav && nav.type === 'reload';
			} catch {}
			// fallback ישן
			try {
				// @ts-ignore
				if (performance && performance.navigation && performance.navigation.type === 1) isReload = true;
			} catch {}
			const simId = search.get('sim');
			if (simId) return;
			const raw = localStorage.getItem('ascenso:live:last');
			if (!raw) { hasCheckedRestoreRef.current = true; return; }
			const parsed = JSON.parse(raw || 'null');
			if (!parsed?.state) { hasCheckedRestoreRef.current = true; return; }
			lastStateRef.current = parsed.state;
			// אם מדובר ברענון ויש מצב קודם – הצג באנר שחזור
			if (isReload) {
				setMobileRestorePrompt(true);
			}
		} catch {}
		hasCheckedRestoreRef.current = true;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
	const applyLastState = React.useCallback(() => {
		const s = lastStateRef.current;
		if (!s) { setMobileRestorePrompt(false); return; }
		try {
			if (s.box) setBox(s.box);
			if (s.activeMaterial) setActiveMaterial(s.activeMaterial);
			if (s.activeModelId) setActiveModelId(s.activeModelId);
			if (s.activeTexId) setActiveTexId(s.activeTexId);
			if (s.activeColor) setActiveColor(s.activeColor);
			if (s.shape) setShape(s.shape);
			if (Array.isArray(s.pathSegments)) setPathSegments(s.pathSegments);
			if (typeof s.steps === 'number') setSteps(Math.min(25, Math.max(5, s.steps)));
			if (s.railing) setRailing(s.railing);
			if (s.glassTone) setGlassTone(s.glassTone);
			if (Array.isArray(s.stepRailing)) setStepRailing(s.stepRailing);
			if (Array.isArray(s.landingRailing)) setLandingRailing(s.landingRailing);
			if (Array.isArray(s.stepRailingSide)) setStepRailingSide(s.stepRailingSide);
			if (Array.isArray(s.landingRailingSide)) setLandingRailingSide(s.landingRailingSide);
			setRailingMetalId(s.railingMetalId ?? null);
			setRailingMetalSolid(s.railingMetalSolid ?? null);
			setCableId(s.cableId ?? null);
			setCableColor(s.cableColor ?? null);
			setCableSpanMode(s.cableSpanMode ?? 'tread');
			if (Array.isArray(s.stepCableSpanMode)) setStepCableSpanMode(s.stepCableSpanMode);
			if (Array.isArray(s.landingCableSpanMode)) setLandingCableSpanMode(s.landingCableSpanMode);
		} catch {}
		setMobileRestorePrompt(false);
	}, [
		setBox, setActiveMaterial, setActiveModelId, setActiveTexId, setActiveColor, setShape, setPathSegments, setSteps, setRailing,
		setGlassTone, setStepRailing, setLandingRailing, setStepRailingSide, setLandingRailingSide, setRailingMetalId, setRailingMetalSolid,
		setCableId, setCableColor, setCableSpanMode, setStepCableSpanMode, setLandingCableSpanMode
	]);
	const resetToFresh = React.useCallback(() => {
		try {
			// איפוס לבסיס
			setBox('thick');
			setActiveMaterial('wood');
			setActiveModelId(null);
			setActiveTexId(null);
			setActiveColor('oak');
			setShape('straight');
			setSteps(15);
			setPathSegments([{ kind: 'straight', steps: 15 }]);
			setRailing('none');
			setGlassTone('extra');
			setStepRailing([]);
			setLandingRailing([]);
			setStepRailingSide([]);
			setLandingRailingSide([]);
			setRailingMetalId(null);
			setRailingMetalSolid(null);
			setCableId(null);
			setCableColor(null);
			setCableSpanMode('tread');
			setStepCableSpanMode([]);
			setLandingCableSpanMode([]);
			setMobileOpenCat('box');
		} catch {}
		setMobileRestorePrompt(false);
	}, []);

	// עדכון ברירת מחדל של מצב מעקה לכל מדרגה לפי המסלול והבחירה הגלובלית
	const stepsTotalForPath = React.useMemo(() => {
		if (pathSegments && pathSegments.length) {
			return pathSegments.reduce((s, seg) => s + (seg.kind === 'straight' ? seg.steps : 0), 0);
		}
		return steps;
	}, [pathSegments, steps]);

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
		// מדרגות חדשות יקבלו צד ברירת מחדל לפי רוב הצדדים הפעילים כיום.
		const nextLen = stepsTotalForPath;

		setStepRailing(prev => {
			// אם נבחר "ללא" – אפס את כל המעקות
			if (railing === 'none') {
				return new Array<boolean>(nextLen).fill(false);
			}
			// אחרת שמור ערכים קיימים והוסף ברירת מחדל פעילה לחדשים
			const out = new Array<boolean>(nextLen);
			for (let i = 0; i < nextLen; i++) out[i] = prev[i] ?? true;
			return out;
		});

		setStepRailingSide(prev => {
			// חשב רוב צדדי המעקה הקיימים (רק היכן שמעקה פעיל)
			let rightCount = 0;
			let leftCount = 0;
			for (let i = 0; i < prev.length; i++) {
				const has = (stepRailing[i] ?? (railing !== 'none')) === true;
				if (!has) continue;
				if (prev[i] === 'left') leftCount++; else rightCount++;
			}
			const defaultSide: 'right' | 'left' = rightCount >= leftCount ? 'right' : 'left';

			const out = new Array<'right' | 'left'>(nextLen);
			for (let i = 0; i < nextLen; i++) out[i] = prev[i] ?? defaultSide;
			return out;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stepsTotalForPath, railing]);
	React.useEffect(() => {
		// לכל פודסט: עם פנייה = בלי מעקה; בלי פנייה = לפי ברירת המחדל הגלובלית
		const out = landingMeta.map(turn => (turn ? false : railing !== 'none'));
		setLandingRailing(out);
		setLandingRailingSide(new Array<'right' | 'left'>(landingMeta.length).fill('right'));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [landingMeta, railing]);
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
					const cJson: Array<{ id: string; name: string; image: string }> = await cRes.json();
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
		() => records.filter(r => r.category === 'wood' && r.variants && Object.keys(r.variants).length),
		[records]
	);
	const nonWoodModels = React.useMemo(
		() => records.filter(r => r.category === activeMaterial && activeMaterial !== 'wood'),
		[records, activeMaterial]
	);
	const metalRailingOptions = React.useMemo(
		() => records.filter(r => r.category === 'metal'),
		[records]
	);
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
			// מעקה מתכת
			if (railing === 'metal') {
				const rec = metalRailingOptions.find(r => r.id === railingMetalId) || metalRailingOptions[0];
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
		// ברירת מחדל לבחירת גוון מתכת למעקה
		if (railing === 'metal' && !railingMetalId && metalRailingOptions.length) {
			setRailingMetalId(metalRailingOptions[0].id);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [railing, metalRailingOptions]);
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

	// מחשבון מחיר בסיסי (מותאם למסלול)
	function calculatePrice(): { breakdown: Array<{ label: string; value: number }>; total: number } {
		const baseSetup = 1500; // פתיחת תיק/מדידות/שינוע בסיסי
		const perStep = 800; // לכל שלב
		const landingPrice = perStep * 3; // לכל פודסט – פי 3 ממחיר מדרגה
		// חישוב מתוך המסלול
		const stepsTotal = pathSegments.reduce((s, seg) => s + (seg.kind === 'straight' ? seg.steps : 0), 0);
		const landingCount = pathSegments.reduce((s, seg) => s + (seg.kind === 'landing' ? 1 : 0), 0);
		const shapeMultiplier = landingCount === 0 ? 1.0 : landingCount === 1 ? 1.1 : 1.15;

		const items = [
			{ label: 'פתיחת פרויקט', value: baseSetup },
			{ label: `מדרגות (${stepsTotal} יח׳)`, value: stepsTotal * perStep },
			{ label: `פודסטים (${landingCount})`, value: landingCount * landingPrice },
		];
		const subtotal = items.reduce((s, i) => s + i.value, 0);
		const total = Math.round(subtotal * shapeMultiplier);
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
		const boxText = box === 'thick' ? 'תיבה עבה‑דופן' : 'תיבה דקה‑דופן';
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
		const materialLabel = activeMaterial === 'wood' ? 'עץ' : activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית';
		const textureName = activeMaterial === 'wood'
			? (activeModel?.name || activeModel?.id || 'דגם עץ')
			: (nonWoodModels.find(r => r.id === activeTexId)?.name || 'טקסטורה');
		const colorName = activeMaterial === 'wood'
			? (WOOD_SWATCHES.find(w => w.id === activeColor)?.label || activeColor)
			: undefined;
		const pathText = formatPathForShare(pathSegments);
		const railingText = formatRailing();
		const boxText = box === 'thick' ? 'תיבה עבה‑דופן' : 'תיבה דקה‑דופן';
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
			<main className="max-w-7xl mx-auto px-4 py-6" dir="rtl">
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
				<section className="lg:col-span-8">
					<div ref={canvasWrapRef} className="relative w-full aspect-[16/9] bg-white border overflow-hidden rounded">
						<Canvas
							shadows={false}
							flat
							camera={{ position: [4, 3, 6], fov: 45 }}
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
									treadThicknessOverride={box === 'thick' ? 0.11 : 0.07}
									pathSegments={pathSegments}
									glassTone={glassTone}
									stepRailingStates={stepRailing}
									landingRailingStates={landingRailing}
									stepRailingSides={stepRailingSide}
									landingRailingSides={landingRailingSide}
									railingTextureUrl={(() => {
										if (railing === 'metal') {
											const rec = metalRailingOptions.find(r => r.id === railingMetalId) || metalRailingOptions[0];
											return rec?.images?.[0] || null;
										}
										return null;
									})()}
									railingBumpUrl={(() => {
										if (railing === 'metal') {
											const rec = metalRailingOptions.find(r => r.id === railingMetalId) || metalRailingOptions[0];
											return rec?.pbr?.bump?.[0] || null;
										}
										return null;
									})()}
									railingRoughnessUrl={(() => {
										if (railing === 'metal') {
											const rec = metalRailingOptions.find(r => r.id === railingMetalId) || metalRailingOptions[0];
											return rec?.pbr?.roughness?.[0] || null;
										}
										return null;
									})()}
									textureUrl={(() => {
										if (activeMaterial === 'wood') {
											return activeModel?.variants?.[activeColor]?.[0] || activeModel?.images?.[0] || null;
										}
										return (
											nonWoodModels.find(r => r.id === activeTexId)?.images?.[0] ||
											nonWoodModels[0]?.images?.[0] ||
											null
										);
									})()}
									bumpUrl={
										activeMaterial === 'wood'
											? activeModel?.pbrVariants?.[activeColor]?.bump?.[0] || null
											: nonWoodModels.find(r => r.id === activeTexId)?.pbr?.bump?.[0] ||
											  nonWoodModels[0]?.pbr?.bump?.[0] ||
											  null
									}
									roughnessUrl={
										activeMaterial === 'wood'
											? activeModel?.pbrVariants?.[activeColor]?.roughness?.[0] || null
											: nonWoodModels.find(r => r.id === activeTexId)?.pbr?.roughness?.[0] ||
											  nonWoodModels[0]?.pbr?.roughness?.[0] ||
											  null
									}
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
								/>
								<OrbitControls ref={orbitRef} enableDamping makeDefault zoomToCursor />
							</React.Suspense>
						</Canvas>
						<CanvasLoadingOverlay />
						
						{/* בלון מחיר בתוך הקונפיגטור – מוסתר במובייל, מוצג מדסקטופ */}
						<div className="hidden lg:block pointer-events-none absolute top-3 left-3 z-20">
							<button
								type="button"
								onClick={() => {
									// גלילה עדינה כך שסוף הפירוט/כפתור הווטסאפ יהיו קרובים לתחתית המסך
									const el = shareRef.current || priceRef.current;
									if (el && typeof window !== 'undefined') {
										try {
											const rect = el.getBoundingClientRect();
											const target = window.scrollY + rect.bottom - window.innerHeight + 24; // מרווח קטן מלמטה
											window.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
										} catch {
											el.scrollIntoView({ behavior: 'smooth', block: 'end' });
										}
									}
									setPricePing(true);
									window.setTimeout(() => setPricePing(false), 1200);
								}}
								className="pointer-events-auto bg-[#1a1a2e] text-white rounded-full px-4 py-2 shadow-lg border border-black/10 flex items-center gap-2 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a1a2e]"
							>
								<span className="text-xs text-gray-200">סה״כ</span>
								<span className="font-semibold">₪{priceFormatted}</span>
							</button>
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
					{/* פירוט צבעים ומסלול – מוצג רק אם נבחר מעקה */}
					{railing !== 'none' && (
						<div className="mt-3 border rounded bg-white">
							{railing === 'glass' ? (
								<div className="px-4 py-3 border-b">
									<div className="text-sm font-semibold text-center">זכוכית 8+8</div>
								</div>
							) : railing === 'metal' ? (
								<div className="px-4 py-3 border-b">
									<div className="text-sm font-semibold text-center">מעקה מתכת</div>
								</div>
							) : railing === 'cable' ? (
								<div className="px-4 py-3 border-b">
									<div className="text-sm font-semibold text-center">מערכת כבלי נירוסטה 8 מ״מ</div>
								</div>
							) : (
								<div className="px-4 py-3 border-b flex items-center justify-between">
									<div className="text-sm text-gray-500">פירוט</div>
									<div className="text-sm text-gray-600">מעקה</div>
								</div>
							)}
							<div className="px-4 py-3 text-sm text-gray-700 space-y-4">
								{/* צבעים זמינים */}
								<div>
									<div className="font-medium mb-1">צבעים זמינים</div>
									{railing === 'glass' ? (
										<div className="flex items-center gap-3">
											{([
												{ id: 'extra' as const, label: 'שקוף אקסטרה קליר', color: '#aee7ff', border: '#81b1cc' },
												{ id: 'smoked' as const, label: 'מושחר', color: '#4a5568', border: '#2d3748' },
												{ id: 'bronze' as const, label: 'ברונזה', color: '#b08d57', border: '#8a6a3a' },
											]).map(sw => (
												<button
													key={sw.id}
													title={sw.label}
													aria-label={sw.label}
													onClick={() => setGlassTone(sw.id)}
													className={`w-6 h-6 rounded-full border-2 ${glassTone === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
													style={{ backgroundColor: sw.color, borderColor: sw.border }}
												/>
											))}
											<span className="text-xs text-gray-600">{glassTone === 'extra' ? 'שקוף אקסטרה קליר' : glassTone === 'smoked' ? 'מושחר' : 'ברונזה'}</span>
										</div>
									) : railing === 'cable' ? (
										<div className="flex items-center gap-3 flex-wrap">
											{cableOptions.map(opt => (
												<button
													key={opt.id}
													title={opt.name}
													aria-label={opt.name}
													onClick={() => setCableId(opt.id)}
													className={`w-8 h-8 rounded-full border-2 bg-center bg-cover ${cableId === opt.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
													style={{ backgroundImage: opt.image ? `url("${encodeURI(opt.image)}")` : undefined, borderColor: '#ddd' }}
												/>
											))}
											<span className="text-xs text-gray-600">
												{cableOptions.find(c => c.id === cableId)?.name || (cableOptions[0]?.name ?? 'בחר דגם כבל')}
											</span>
										</div>
									) : railing === 'metal' ? (
										<div className="flex items-center gap-3 flex-wrap">
											{/* צבעים אחידים */}
											<button
												title="שחור"
												aria-label="שחור"
												onClick={() => { setRailingMetalSolid('#111111'); setRailingMetalId(null); }}
												className={`w-8 h-8 rounded-full border-2 ${railingMetalSolid === '#111111' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
												style={{ backgroundColor: '#111111', borderColor: '#2b2b2b' }}
											/>
											<button
												title="לבן"
												aria-label="לבן"
												onClick={() => { setRailingMetalSolid('#F5F5F5'); setRailingMetalId(null); }}
												className={`w-8 h-8 rounded-full border-2 ${railingMetalSolid === '#F5F5F5' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
												style={{ backgroundColor: '#F5F5F5', borderColor: '#e5e5e5' }}
											/>
											{/* טקסטורות מתכת */}
											{metalRailingOptions.map(opt => (
												<button
													key={opt.id}
													title={opt.name}
													aria-label={opt.name}
													onClick={() => { setRailingMetalId(opt.id); setRailingMetalSolid(null); }}
													className={`w-8 h-8 rounded-full border-2 bg-center bg-cover ${(railingMetalId === opt.id && !railingMetalSolid) ? 'ring-2 ring-[#1a1a2e]' : ''}`}
													style={{ backgroundImage: opt.images?.[0] ? `url("${encodeURI(opt.images[0])}")` : undefined, borderColor: '#ddd' }}
												/>
											))}
											<span className="text-xs text-gray-600">
												{railingMetalSolid === '#111111' ? 'שחור' :
												 railingMetalSolid === '#F5F5F5' ? 'לבן' :
												 metalRailingOptions.find(m => m.id === railingMetalId)?.name || 'בחר גוון'}
											</span>
										</div>
									) : (
										<div className="flex flex-wrap gap-2">
											{activeMaterial === 'wood' && activeModel?.variants
												? Object.keys(activeModel.variants).map((c) => (
														<span
															key={c}
															className={`px-2 py-1 rounded-full border text-xs ${activeColor === c ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
														>
															{WOOD_SWATCHES.find(w => w.id === c)?.label || c}
														</span>
												  ))
												: (
													<span className="text-gray-500">צבע יחיד/טקסטורה נבחרת</span>
												)}
										</div>
									)}
								</div>

								{/* פירוט המסלול */}
								<div>
									<div className="font-medium mb-1 flex items-center justify-end">
										{/* מאסטר פשוט: שני כפתורים מחזוריים – ללא כותרת */}
										<div className="flex items-center gap-2">
											<button
												className={`text-xs px-3 py-1 rounded-full border-2 shadow-sm transition-colors ${
													masterApply === 'remove'
														? 'bg-white text-red-700 border-red-300 hover:bg-red-50'
														: 'bg-[#1a1a2e] text-white border-[#1a1a2e] hover:opacity-95'
												}`}
												onClick={() => setMasterApply(prev => (prev === 'remove' ? 'add' : 'remove'))}
												title="מחזור: הוסף ↔ הסר (לכולם)"
											>
												{masterApply === 'remove' ? 'הסר (לכולם)' : 'הוסף (לכולם)'}
											</button>
											<button
												className={`text-xs px-3 py-1 rounded-full border-2 shadow-sm transition-colors ${
													masterSide === 'left'
														? 'bg-[#1a1a2e] text-white border-[#1a1a2e] hover:opacity-95'
														: 'bg-white text-[#1a1a2e] border-[#1a1a2e] hover:bg-gray-100'
												}`}
												onClick={() => setMasterSide(prev => (prev === 'left' ? 'right' : 'left'))}
												title="מחזור: ימין ↔ שמאל (לכולם)"
											>
												{masterSide === 'left' ? 'צד: ימין (לכולם)' : 'צד: שמאל (לכולם)'}
											</button>
											{/* כבל: תקרה‑רצפה / תקרה‑מדרגה – ליד כפתורי המאסטר */}
											{railing === 'cable' && (
												<button
													className={`text-xs px-3 py-1 rounded-full border-2 shadow-sm transition-colors ${
														cableSpanMode === 'floor'
															? 'bg-[#1a1a2e] text-white border-[#1a1a2e] hover:opacity-95'
															: 'bg-white text-[#1a1a2e] border-[#1a1a2e] hover:bg-gray-100'
													}`}
													onClick={() => setCableSpanMode(prev => (prev === 'floor' ? 'tread' : 'floor'))}
													title="מחזור: תקרה‑רצפה ↔ תקרה‑מדרגה"
												>
													{cableSpanMode === 'floor' ? 'תקרה‑רצפה' : 'תקרה‑מדרגה'}
												</button>
											)}
										</div>
									</div>
									<ul className="divide-y">
										{(() => {
											const items: Array<{ label: string; type: 'step' | 'landing'; stepIdx?: number; landingIdx?: number; hasTurn?: boolean }> = [];
											let stepCounter = 0;
											let landingCounter = 0;
											if (pathSegments && pathSegments.length) {
												pathSegments.forEach((seg, sidx) => {
													if (seg.kind === 'straight') {
														for (let i = 0; i < seg.steps; i++) {
															items.push({ label: `מדרגה ${stepCounter + 1}`, type: 'step', stepIdx: stepCounter });
															stepCounter++;
														}
													} else if (seg.kind === 'landing') {
														items.push({ label: 'פודסט', type: 'landing', landingIdx: landingCounter, hasTurn: !!seg.turn });
														landingCounter++;
													} else {
														// extend – לא מוסיף רשומה חדשה, רק מאריך את המדרך הקודם
													}
												});
											} else {
												for (let i = 0; i < steps; i++) {
													items.push({ label: `מדרגה ${i + 1}`, type: 'step', stepIdx: i });
												}
											}
											return items.map((it, i) => (
												<li key={i} className="py-1 flex items-center justify-between gap-3">
													<span className={it.type === 'landing' ? 'text-gray-800' : ''}>{it.label}</span>
													{it.type === 'step' ? (
														<div className="flex items-center gap-2">
															<span className={`text-xs ${(stepRailing[it.stepIdx!] ?? true) ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
																{(stepRailing[it.stepIdx!] ?? true) ? 'עם מעקה' : 'ללא מעקה'}
															</span>
															<button
																className="text-xs px-2 py-0.5 rounded border hover:bg-gray-100"
																onClick={() =>
																	setStepRailing(prev => {
																		const out = prev.slice();
																		const current = (prev[it.stepIdx!] ?? true);
																		out[it.stepIdx!] = !current;
																		return out;
																	})
																}
															>
																{(stepRailing[it.stepIdx!] ?? true) ? 'הסר' : 'הוסף'}
															</button>
															<button
																className="text-xs px-2 py-0.5 rounded border hover:bg-gray-100"
																onClick={() =>
																	setStepRailingSide(prev => {
																		const out = prev.slice();
																		out[it.stepIdx!] = (prev[it.stepIdx!] === 'left' ? 'right' : 'left') as 'right' | 'left';
																		return out;
																	})
																}
															>
																{stepRailingSide[it.stepIdx!] === 'left' ? 'צד: ימין' : 'צד: שמאל'}
															</button>
															{railing === 'cable' && (
																<button
																	className="text-xs px-2 py-0.5 rounded border hover:bg-gray-100"
																	onClick={() =>
																		setStepCableSpanMode(prev => {
																			const out = prev.slice();
																			const cur = (prev[it.stepIdx!] ?? cableSpanMode);
																			out[it.stepIdx!] = (cur === 'floor' ? 'tread' : 'floor');
																			return out;
																		})
																	}
																>
																	{((stepCableSpanMode[it.stepIdx!] ?? cableSpanMode) === 'floor') ? 'תקרה‑רצפה' : 'תקרה‑מדרגה'}
																</button>
															)}
														</div>
													) : (
														<div className="flex items-center gap-2">
															{it.hasTurn ? (
																<span className="text-xs text-gray-500">פודסט עם פנייה – מעקה לא אפשרי</span>
															) : (
																<>
																	<span className={`text-xs ${(landingRailing[it.landingIdx!] ?? true) ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
																		{(landingRailing[it.landingIdx!] ?? true) ? 'עם מעקה' : 'ללא מעקה'}
																	</span>
																	<button
																		className="text-xs px-2 py-0.5 rounded border hover:bg-gray-100"
																		onClick={() =>
																			setLandingRailing(prev => {
																				const out = prev.slice();
																				const current = (prev[it.landingIdx!] ?? true);
																				out[it.landingIdx!] = !current;
																				return out;
																			})
																		}
																	>
																		{(landingRailing[it.landingIdx!] ?? true) ? 'הסר' : 'הוסף'}
																	</button>
																	<button
																		className="text-xs px-2 py-0.5 rounded border hover:bg-gray-100"
																		onClick={() =>
																			setLandingRailingSide(prev => {
																				const out = prev.slice();
																				out[it.landingIdx!] = (prev[it.landingIdx!] === 'left' ? 'right' : 'left') as 'right' | 'left';
																				return out;
																			})
																		}
																	>
																		{landingRailingSide[it.landingIdx!] === 'left' ? 'צד: ימין' : 'צד: שמאל'}
																	</button>
																	{railing === 'cable' && (
																		<button
																			className="text-xs px-2 py-0.5 rounded border hover:bg-gray-100"
																			onClick={() =>
																				setLandingCableSpanMode(prev => {
																					const out = prev.slice();
																					const cur = (prev[it.landingIdx!] ?? cableSpanMode);
																					out[it.landingIdx!] = (cur === 'floor' ? 'tread' : 'floor');
																					return out;
																				})
																			}
																		>
																			{((landingCableSpanMode[it.landingIdx!] ?? cableSpanMode) === 'floor') ? 'תקרה‑רצפה' : 'תקרה‑מדרגה'}
																		</button>
																	)}
																</>
															)}
														</div>
													)}
												</li>
											));
										})()}
									</ul>
								</div>
							</div>
						</div>
					)}
				</section>

				<aside className="lg:col-span-4">
					{/* מובייל: אקורדיון קטגוריות בחירה */}
					<div className="lg:hidden flex flex-col gap-3">
						{/* באנר שחזור מצב (מובייל, בריענון) */}
						{mobileRestorePrompt && (
							<div className="bg-[#FFF8E1] border border-[#FDE68A] rounded-md px-3 py-2 flex items-center justify-between">
								<div className="text-xs text-[#1a1a2e]">
									לשחזר את הבחירות הקודמות או להתחיל מחדש?
								</div>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={applyLastState}
										className="text-xs px-3 py-1 rounded-md bg-[#1a1a2e] text-white"
									>
										שחזר
									</button>
									<button
										type="button"
										onClick={resetToFresh}
										className="text-xs px-3 py-1 rounded-md bg-white text-[#1a1a2e] border border-[#1a1a2e]/50"
									>
										התחל מחדש
									</button>
								</div>
							</div>
						)}

						{/* באנר עזרה למובייל – נפתח/נסגר, ניתן לסגירה קבועה */}
						{!mobileHelpDismissed && (
							<div className="bg-[#1a1a2e]/5 border border-[#1a1a2e]/15 rounded-md">
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
										<button
											className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md"
											onClick={() => setMobileOpenCat(prev => (prev === 'box' ? null : 'box'))}
											aria-expanded={mobileOpenCat === 'box'}
										>
											<span className="font-medium">דגם תיבה</span>
											<span className="text-sm text-gray-600">{box === 'thick' ? 'תיבה עבה‑דופן' : 'תיבה דקה‑דופן'}</span>
										</button>
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
										<button
											className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md"
											onClick={() => setMobileOpenCat(prev => (prev === 'material' ? null : 'material'))}
											aria-expanded={mobileOpenCat === 'material'}
										>
											<span className="font-medium">חומר</span>
											<span className="text-sm text-gray-600">{activeMaterial === 'wood' ? 'עץ' : activeMaterial === 'metal' ? 'מתכת' : 'אבן טבעית'}</span>
										</button>
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
											<button
												className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md"
												onClick={() => setMobileOpenCat(prev => (prev === 'woodTexture' ? null : 'woodTexture'))}
												aria-expanded={mobileOpenCat === 'woodTexture'}
											>
												<span className="font-medium">טקסטורה</span>
												<span className="text-sm text-gray-600">{activeModel?.name || activeModel?.id || ''}</span>
											</button>
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
											<button
												className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md"
												onClick={() => setMobileOpenCat(prev => (prev === 'woodColor' ? null : 'woodColor'))}
												aria-expanded={mobileOpenCat === 'woodColor'}
											>
												<span className="font-medium">צבע</span>
												<span className="text-sm text-gray-600">
													{WOOD_SWATCHES.find(sw => sw.id === activeColor)?.label || activeColor}
												</span>
											</button>
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
									),
								});
							} else {
								// Non-wood texture
								nodes.push({
									key: 'nonWoodTexture',
									el: (
										<div>
											<button
												className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md"
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
																style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
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
										<button
											className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md"
											onClick={() => setMobileOpenCat(prev => (prev === 'path' ? null : 'path'))}
											aria-expanded={mobileOpenCat === 'path'}
										>
											<span className="font-medium">מסלול</span>
											<span className="text-sm text-gray-600">{encodePath(pathSegments)}</span>
										</button>
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

							// Railing
							nodes.push({
								key: 'railing',
								el: (
									<div>
										<button
											className="w-full flex items-center justify-between px-4 py-3 bg-white border rounded-md"
											onClick={() => setMobileOpenCat(prev => (prev === 'railing' ? null : 'railing'))}
											aria-expanded={mobileOpenCat === 'railing'}
										>
											<span className="font-medium">מעקה</span>
											<span className="text-sm text-gray-600">{formatRailing()}</span>
										</button>
										{mobileOpenCat === 'railing' && (
											<div className="p-3 bg-white border border-t-0 rounded-b-md">
												<div className="flex flex-wrap gap-2">
													{([
														{ id: 'none', label: 'ללא' },
														{ id: 'glass', label: 'זכוכית' },
														{ id: 'metal', label: 'מתכת' },
														{ id: 'cable', label: 'כבלי נירוסטה' },
													] as const).map(opt => (
														<button
															key={opt.id}
															className={`px-3 py-1 text-sm rounded-full border ${railing === opt.id ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
															onClick={() => {
																setRailing(opt.id);
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

							// סדר קבוע: Box -> Material -> (WoodTexture, WoodColor | NonWoodTexture) -> Path -> Railing
							const fixedOrder: Cat[] = activeMaterial === 'wood'
								? ['box','material','woodTexture','woodColor','path','railing']
								: ['box','material','nonWoodTexture','path','railing'];
							const mapNodes = new Map(nodes.map(n => [n.key, n.el]));
							return fixedOrder
								.filter(k => mapNodes.has(k))
								.map(k => <div key={k}>{mapNodes.get(k) as React.ReactElement}</div>);
						})()}
					</div>

					{/* דסקטופ: הפאנל המקורי */}
					<div className="hidden lg:block relative border p-4 bg-white rounded-xl shadow-sm space-y-5 flex flex-col min-h-[70vh]">
						<button
							className="absolute top-3 left-3 p-2 rounded-full border text-[#1a1a2e] hover:bg-gray-50 cursor-pointer"
							onClick={saveCurrentSimulation}
							aria-label="שמור הדמייה למועדפים"
							title="שמור הדמייה למועדפים"
						>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
							</svg>
						</button>
						<div>
							<div className="text-sm font-medium mb-2">דגם תיבה</div>
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
						<div>
							<div className="text-sm font-medium mb-2">חומר</div>
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
						</div>

						{activeMaterial === 'wood' && (
							<>
								<div>
									<div className="text-sm font-medium mb-2 flex items-center justify-between">
										<span>טקסטורה</span>
										<span className="text-xs font-normal text-gray-600">
											{activeModel?.name || activeModel?.id || ''}
										</span>
									</div>
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
								<div>
									<div className="text-sm font-medium mb-2">צבע</div>
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
												<span className="text-xs text-gray-600">
													{items.find(x => x.id === activeColor)?.label || ''}
												</span>
											</div>
										);
									})()}
								</div>
							</>
						)}

						{activeMaterial !== 'wood' && (
							<div className="mt-3">
								<div className="text-sm font-medium mb-2 flex items-center justify-between">
									<span>טקסטורה</span>
									<span className="text-xs font-normal text-gray-600">
										{(() => {
											const sel = nonWoodModels.find(x => x.id === activeTexId);
											return sel?.name || sel?.id || '';
										})()}
									</span>
								</div>
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
											style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
										/>
									))}
								</div>
							</div>
						)}

						{/* עורך מסלול המהלך */}
						<div className="pt-2 border-t space-y-3">
							<div className="flex flex-wrap gap-2">
								<button
									className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
									onClick={() => setPathSegments(prev => [...prev, { kind: 'straight', steps: 5 }])}
								>
									הוסף ישר (5 מדר׳)
								</button>
								<button
									className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
									onClick={() =>
										setPathSegments(prev => [
											...prev,
											{ kind: 'landing', turn: 'right' },
											{ kind: 'straight', steps: 1 },
										])
									}
								>
									פודסט + ימינה
								</button>
								<button
									className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
									onClick={() =>
										setPathSegments(prev => [
											...prev,
											{ kind: 'landing', turn: 'left' },
											{ kind: 'straight', steps: 1 },
										])
									}
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
								<div className="text-sm font-medium">מסלול</div>
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
															onClick={() =>
																setPathSegments(prev =>
																	prev.map((seg2, i) =>
																		i === idx && seg2.kind === 'straight'
																			? { kind: 'straight', steps: Math.max(1, (seg2 as any).steps - 1) }
																			: seg2
																	)
																)
															}
														>
															-
														</button>
														<span className="text-sm">מדרגות: {(seg as any).steps}</span>
														<button
															className="px-2 py-1 rounded border"
															aria-label="יותר מדרגות"
															onClick={() =>
																setPathSegments(prev =>
																	prev.map((seg2, i) =>
																		i === idx && seg2.kind === 'straight'
																			? { kind: 'straight', steps: Math.min(25, (seg2 as any).steps + 1) }
																			: seg2
																	)
																)
															}
														>
															+
														</button>
													</div>
												)}
											</div>
											<div>
												<button
													className="text-xs text-red-600 hover:underline"
													onClick={() =>
														setPathSegments(prev => {
															const out = prev.filter((_: any, i: number) => i !== idx);
															return out.length ? out : [{ kind: 'straight', steps: 5 }];
														})
													}
												>
													הסר
												</button>
											</div>
										</li>
									))}
								</ul>
							</div>
							{/* מפריד וקטגוריית מעקה */}
							<div className="my-3 border-t border-gray-200" />
							<div>
								<div className="text-sm font-medium mb-2">מעקה</div>
								<div className="flex flex-wrap gap-2">
									{([
										{ id: 'none', label: 'ללא' },
										{ id: 'glass', label: 'זכוכית' },
									{ id: 'metal', label: 'מתכת' },
										{ id: 'cable', label: 'כבלי נירוסטה' },
									] as const).map(opt => (
										<button
											key={opt.id}
											className={`px-3 py-1 text-sm rounded-full border ${railing === opt.id ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
											onClick={() => setRailing(opt.id)}
										>
											{opt.label}
										</button>
									))}
								</div>
							</div>
							<div className="my-3 border-t border-gray-200" />
							<div ref={priceRef} className={`bg-gray-50 rounded-md p-3 ${pricePing ? 'ring-2 ring-[#1a1a2e]' : ''}`}>
								<div className="font-semibold mb-1">מחיר משוער (לפני מע״מ)</div>
								<ul className="text-sm text-gray-700 space-y-1">
									{breakdown.map(b => (
										<li key={b.label} className="flex justify-between">
											<span>{b.label}</span>
											<span>₪{b.value.toLocaleString('he-IL')}</span>
										</li>
									))}
								</ul>
								<div className="mt-2 pt-2 border-t flex justify-between font-bold">
									<span>סה״כ</span>
									<span>₪{total.toLocaleString('he-IL')}</span>
								</div>
								<div className="text-[11px] text-gray-500 mt-1">הערכה משוערת להמחשה בלבד.</div>
							</div>
						</div>

						<div ref={shareRef} className="pt-2 border-t mt-auto">
							<div className="relative">
								<div className="relative px-4 py-4 md:px-6 md:py-5 flex items-center justify-center">
									<div className="flex items-center gap-2">
										<button
											onClick={openBooking}
											aria-label="פתח טופס תיאום פגישה"
											className="inline-flex items-center gap-2 rounded-md bg-[#1a1a2e] text-white px-4 py-2 font-semibold shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a1a2e] cursor-pointer transition-transform duration-200 ease-out hover:scale-105 active:scale-95 will-change-transform"
										>
											<span>תיאום פגישה</span>
											<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
												<path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0C5.4 0 .02 5.37.02 12c0 2.11.55 4.17 1.6 6L0 24l6.14-1.6a11.98 11.98 0 0 0 5.88 1.52h.01c6.62 0 12-5.37 12-12 0-3.2-1.25-6.21-3.51-8.39zM12.02 22a9.96 9.96 0 0 1-5.08-1.39l-.36-.21-3.64.95.97-3.55-.24-.37A9.95 9.95 0 0 1 2.02 12C2.02 6.51 6.53 2 12.02 2c2.66 0 5.16 1.04 7.04 2.92A9.9 9.9 0 0 1 22.02 12c0 5.49-4.51 10-10 10z"/>
												<path d="M17.48 14.11c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.19.3-.76.98-.93 1.17-.17.2-.35.22-.65.08-.3-.14-1.27-.47-2.41-1.5-.89-.79-1.49-1.77-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.37.45-.56.15-.18.2-.31.3-.51.1-.2.05-.37-.02-.52-.07-.14-.67-1.63-.92-2.23-.24-.6-.49-.52-.66-.53l-.57-.01c-.19 0-.5.07-.77.36s-1.01 1.02-1.01 2.49 1.04 2.88 1.19 3.08c.14.2 2.04 3.18 4.96 4.47.7.3 1.24.49 1.66.62.7.22 1.33.2 1.84.13.56-.08 1.75-.71 2-1.41.24-.7.24-1.29.17-1.41-.07-.12-.27-.2-.56-.34z"/>
											</svg>
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</aside>
			</div>
			{/* מרווח תחתון למובייל שלא יוסתר ע"י סרגל המחיר הקבוע */}
			<div className="h-40 lg:hidden" />
		</main>

		{/* מובייל: מחיר קבוע בתחתית עם פירוט מלא */}
		<div className="lg:hidden fixed inset-x-0 bottom-0 z-40 border-t bg-white">
			<div className="max-w-7xl mx-auto px-4 py-3">
				<div className="text-xs text-gray-700 mb-2">מחיר משוער (לפני מע״מ)</div>
				<ul className="text-sm text-gray-800 space-y-1 max-h-40 overflow-y-auto">
					{breakdown.map(b => (
						<li key={b.label} className="flex justify-between">
							<span>{b.label}</span>
							<span>₪{b.value.toLocaleString('he-IL')}</span>
						</li>
					))}
				</ul>
				<div className="mt-2 pt-2 border-t flex justify-between font-bold">
					<span>סה״כ</span>
					<span>₪{total.toLocaleString('he-IL')}</span>
				</div>
			</div>
		</div>

		{/* Toasts */}
		{saveToast && (
			<div className="fixed bottom-5 right-5 z-[80] bg-[#1a1a2e] text-white px-4 py-2 rounded shadow-lg">
				{saveToast}
			</div>
		)}

		{/* מודאל תיאום מדידה – מראה יוקרתי ותמציתי */}
		{bookingOpen && (
			<div
				className="fixed inset-0 z-[70] bg-[#0b1020]/70 backdrop-blur-sm flex items-center justify-center p-4"
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
					className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-[#C5A059]/30"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="px-5 py-4 bg-[#1a1a2e] text-white relative border-b border-[#C5A059]/30">
						<div className="text-xl md:text-2xl font-extrabold tracking-wide text-center" aria-label="ASCENSO logo" style={{ fontFamily: 'Prosto One, system-ui, sans-serif' }}>
							ASCENSO
						</div>
						<button
							className="text-white/70 hover:text-white text-2xl leading-none absolute left-4 top-1/2 -translate-y-1/2"
							aria-label="סגור"
							onClick={() => setBookingOpen(false)}
						>
							×
						</button>
					</div>

					{!bookingSubmitted ? (
						<form onSubmit={handleBookingSubmit} className="bg-[#f6f7fb] text-[#0f1424] p-6">
							<div className="leading-relaxed mb-1">
								<span className="font-semibold">תיאום פגישה בשטח</span>
							</div>
							<div className="text-[#0f1424]/80 leading-relaxed mb-2">
								מלאו את הפרטים וניצור קשר
							</div>
							<div className="grid grid-cols-1 gap-4">
								<div className="flex items-start gap-2 mt-1">
									<div className="w-7 h-7 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-[10px]">VA</div>
									<div className="bg-[#1a1a2e] text-white rounded-2xl px-3 py-1.5 text-xs">
										{bookingStep === 'name' ? 'איך לקרוא לך?' :
										 bookingStep === 'city' ? 'באיזה עיר?' :
										 bookingStep === 'street' ? 'שם הרחוב?' :
										 bookingStep === 'house' ? 'מס׳ בית?' :
										 bookingStep === 'date' ? 'מתי נוח לך שנגיע?' :
										 'איזה חלון זמן עדיף?'}
									</div>
								</div>

								{bookingStep === 'name' && (
									<label className="block" htmlFor="fullName">
										<input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} ref={firstInputRef}
											className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
											placeholder="שם ושם משפחה" />
									</label>
								)}

								{bookingStep === 'city' && (
									<label className="block" htmlFor="city">
										<input id="city" type="text" value={city} onChange={(e) => setCity(e.target.value)} ref={cityInputRef} list="city-list"
											className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
											placeholder="לדוגמה: תל אביב" />
										<datalist id="city-list">
											{cityOptions.map((opt) => (<option value={opt} key={opt} />))}
										</datalist>
									</label>
								)}

								{bookingStep === 'street' && (
									<label className="block" htmlFor="street">
										<input id="street" type="text" value={street} onChange={(e) => setStreet(e.target.value)} ref={streetInputRef} list="street-list"
											className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
											placeholder="לדוגמה: דרך מנחם בגין" />
										<datalist id="street-list">
											{streetOptions.map((opt) => (<option value={opt} key={opt} />))}
										</datalist>
									</label>
								)}

								{bookingStep === 'house' && (
									<label className="block" htmlFor="houseNumber">
										<input id="houseNumber" type="text" inputMode="numeric" pattern="[0-9]{1,4}" value={houseNumber} onChange={(e) => setHouseNumber(e.target.value)}
											className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
											placeholder="לדוגמה: 12" />
									</label>
								)}

								{bookingStep === 'date' && (
									<div className="mt-1 rounded-2xl border border-[#C5A059]/40 bg-white text-[#0f1424]">
										<div className="max-h-48 overflow-y-auto divide-y rounded-2xl">
											{twoWeeksDates.map(d => (
												<label key={d.value} className={`flex items-center justify-between px-3 py-2 rounded-2xl ${d.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}>
													<span className="text-sm">{d.weekday} — {d.label}</span>
													<input type="radio" name="preferredDate" value={d.value} checked={preferredDate === d.value} onChange={() => !d.disabled && setPreferredDate(d.value)} disabled={d.disabled} />
												</label>
											))}
										</div>
									</div>
								)}

								{bookingStep === 'time' && (
									<div className="mt-1 rounded-2xl border border-[#C5A059]/40 bg-white text-[#0f1424]">
										<div className="max-h-48 overflow-y-auto divide-y rounded-2xl">
											{[8, 11, 14].map((start) => {
												const end = start + 3;
												const to2 = (n: number) => n.toString().padStart(2, '0');
												const label = `${to2(start)}:00–${to2(end)}:00`;
												return (
													<label key={label} className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-2xl">
														<span className="text-sm">{label}</span>
														<input type="radio" name="preferredTime" value={label} checked={preferredTime === label} onChange={() => setPreferredTime(label)} />
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
										onClick={() => { const steps = ['name','city','street','house','date','time']; const i = steps.indexOf(bookingStep as any); if (i > 0) setBookingStep(steps[i-1] as any); }}
										disabled={bookingStep === 'name'}
										className="flex-1 px-5 py-3 rounded-md font-semibold border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
									>
										חזרה
									</button>

									{bookingStep !== 'time' ? (
										<button
											type="button"
											onClick={() => { const steps = ['name','city','street','house','date','time']; const i = steps.indexOf(bookingStep as any); if (i < steps.length - 1) setBookingStep(steps[i+1] as any); }}
											disabled={
												(bookingStep === 'name' && !(fullName && fullName.trim().length > 1)) ||
												(bookingStep === 'city' && !city) ||
												(bookingStep === 'street' && !street) ||
												(bookingStep === 'house' && !houseNumber) ||
												(bookingStep === 'date' && !preferredDate)
											}
											className="flex-1 px-5 py-3 rounded-md font-semibold text-white bg-[#1a1a2e] hover:opacity-95 disabled:opacity-50"
										>
											המשך
										</button>
									) : (
										<button
											type="submit"
											disabled={!preferredTime || !preferredDate || !(fullName && fullName.trim().length > 1) || !city || !street || !houseNumber}
											className="flex-1 px-5 py-3 rounded-md font-semibold text-white bg-[#25D366] hover:bg-[#20c15b] disabled:opacity-50"
										>
											שליחה
										</button>
									)}
								</div>
							</div>
						</form>
					) : (
						<div className="bg-[#0f1424] text-white p-8 text-center">
							<div className="mx-auto mb-4 w-12 h-12 rounded-full border-2 border-[#25D366] flex items-center justify-center">
								<span className="text-[#25D366] text-2xl">✓</span>
							</div>
							<p className="text-lg font-semibold mb-2">פנייתך התקבלה</p>
							<p className="text-white/80">
								נציג מטעמנו יצור קשר לתיאום סופי.
							</p>
							<div className="mt-6">
								<button
									onClick={() => setBookingOpen(false)}
									className="inline-flex justify-center items-center px-6 py-3 rounded-md font-semibold text-[#1a1a2e] bg-white hover:bg-gray-100"
								>
									סגור
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		)}
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


