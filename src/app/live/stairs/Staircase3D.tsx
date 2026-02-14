'use client';

import React, { useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { Environment, Text } from '@react-three/drei';
import { TextureLoader, RepeatWrapping, ClampToEdgeWrapping, SRGBColorSpace, LinearFilter, LinearMipmapLinearFilter, BufferGeometry, Float32BufferAttribute, Cache, Vector3, type PointLight } from 'three';
import type { PathSegment } from '../shared/path';
import { buildRectTreads } from './models/rect';
import { buildWedgeTreads } from './models/wedge';
import { buildRidgeTreads } from './models/ridge';
import { buildRoundedTreads } from './models/rounded';
import { buildTaperBoxTreads } from './models/taper';
import { HitechPlates } from './models/hitech';

// ׳”׳₪׳¢׳׳× ׳§׳׳© ׳©׳ three ׳¢׳‘׳•׳¨ ׳˜׳¢׳™׳ ׳•׳× ׳—׳׳§׳•׳×
Cache.enabled = true;
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
	stepRailingSidesForRailing,
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
	hitech,
	hitechPlateThickness,
	hitechPlateHeight,
	hitechPlateTopOffsetM,
	hitechPlateInsetFromEdge,
	hitechOffsets,
	highQuality = false,
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
	boxModel?: 'rect' | 'rounded' | 'taper' | 'wedge' | 'ridge';
	wedgeFrontFraction?: number;
	wedgeFrontThicknessM?: number;
	ridgeFrontCenterThicknessM?: number;
	ridgeFrontEdgeThicknessM?: number;
	pathSegments?: PathSegment[] | null;
	glassTone?: 'extra' | 'smoked' | 'bronze';
	stepRailingStates?: boolean[];
	landingRailingStates?: boolean[];
	stepRailingSides?: Array<'right' | 'left'>;
	/** צד מעקה בלבד – אם מועבר, משמש רק ל-build (מעקה); קירות נשארים עם stepRailingSides */
	stepRailingSidesForRailing?: Array<'right' | 'left'>;
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
	// דגם "הייטק" מוסתר כרגע
	hitech?: boolean;
	hitechPlateThickness?: number;
	hitechPlateHeight?: number;
	hitechPlateTopOffsetM?: number;
	hitechPlateInsetFromEdge?: number;
	hitechOffsets?: number[];
	highQuality?: boolean;
}) {
	// שיתוף נקודת ההתחלה של פלטת B (גרם 2) עבור המחבר – כדי למנוע סדקים/פערים בין B למחבר
	const hitechBStartRef = React.useRef<{ top: [number, number, number]; bot: [number, number, number] } | null>(null);
	// שיתוף נקודת ההתחלה של פלטת C1 (גרם 3, צד נגדי) לפי סוף הפודסט של B1 – לחיבור Flush רציף על הקו החיצוני
	const hitechCStartRef = React.useRef<{ top: [number, number, number]; bot: [number, number, number] } | null>(null);
	// סנכרון רינדור: ה-Ref מתעדכן בזמן render (ב-B1), אבל Ref לא גורם לרינדור מחדש.
	// לכן אנחנו מאזינים לשינוי בערך ה-Ref אחרי commit ומכריחים רינדור אחד נוסף כדי ש-C1 תקבל עוגן נכון,
	// במקום "לקפוץ" לתחילת הפודסט.
	const [, bumpHitechCAnchorTick] = React.useState(0);
	const lastCAnchorKeyRef = React.useRef<string>('');
	React.useLayoutEffect(() => {
		const a = hitechCStartRef.current;
		const k = (n: number) => Math.round(n * 1e6); // יציבות key בלי להשפיע על הגאומטריה
		const key = a
			? `${k(a.top[0])},${k(a.top[1])},${k(a.top[2])}|${k(a.bot[0])},${k(a.bot[1])},${k(a.bot[2])}`
			: '';
		if (key !== lastCAnchorKeyRef.current) {
			lastCAnchorKeyRef.current = key;
			bumpHitechCAnchorTick(v => v + 1);
		}
	});
	// יחידות סצנה: מטרים בקירוב
	const treadThickness = typeof treadThicknessOverride === 'number' ? treadThicknessOverride : 0.04;
	const treadDepth = 0.30;
	const treadWidth = 0.90;
	const riser = 0.18;

	function getTreads() {
		const treads: Array<{
			position: [number, number, number];
			rotation: [number, number, number];
			run: number;
			isLanding: boolean;
			turn?: 'left' | 'right';
			flight: number;
			axis: 'x' | 'z';
		}> = [];
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
							rotation: [0, yaws[dirIndex], 0],
							run,
							isLanding: false,
							flight: flightIdx,
							axis: (dirIndex & 1) === 0 ? 'x' : 'z',
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
						axis: (dirIndex & 1) === 0 ? 'x' : 'z',
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
					axis: 'x',
				});
			}
		} else if (shape === 'L') {
			const half = Math.floor(steps / 2);
			for (let i = 0; i < half; i++) {
				treads.push({ position: [i * treadDepth + treadDepth / 2, i * riser, 0], rotation: [0, 0, 0], run: treadDepth, isLanding: false, flight: 0, axis: 'x' });
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
				axis: 'x',
			});
			// המשך בכיוון חדש
			for (let i = 0; i < steps - half - 1; i++) {
				treads.push({
					position: [lxStart + runL, (half + 1 + i) * riser, -(i * treadDepth + treadDepth / 2)],
					rotation: [0, -Math.PI / 2, 0],
					run: treadDepth,
					isLanding: false,
					flight: 1,
					axis: 'z',
				});
			}
		} else {
			// U
			const third = Math.floor(steps / 3);
			for (let i = 0; i < third; i++) {
				treads.push({ position: [i * treadDepth + treadDepth / 2, i * riser, 0], rotation: [0, 0, 0], run: treadDepth, isLanding: false, flight: 0, axis: 'x' });
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
				axis: 'x',
			});
			for (let i = 0; i < third; i++) {
				treads.push({
					position: [l1xStart + runL1, (third + 1 + i) * riser, -(i * treadDepth + treadDepth / 2)],
					rotation: [0, -Math.PI / 2, 0],
					run: treadDepth,
					isLanding: false,
					flight: 1,
					axis: 'z',
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
				axis: 'z',
			});
			for (let i = 0; i < steps - third * 2 - 1; i++) {
				treads.push({
					position: [rStartX + runL2 + i * treadDepth + treadDepth / 2, (third * 2 + 2 + i) * riser, rStartZ],
					rotation: [0, Math.PI, 0],
					run: treadDepth,
					isLanding: false,
					flight: 2,
					axis: 'x',
				});
			}
		}
		return treads;
	}

	const treads = React.useMemo(getTreads, [shape, steps, JSON.stringify(pathSegments)]);

	// זיהוי הגרם והמדרגה האחרונה עבור פאנל הסגירה בדגם "הייטק"
	const staircaseEndsWithLanding = (treads.length > 0 ? treads[treads.length - 1].isLanding : false);
	let lastNonLandingFlight: number | null = null;
	for (let i = treads.length - 1; i >= 0; i--) {
		const tt = treads[i];
		if (!tt.isLanding) { lastNonLandingFlight = tt.flight; break; }
	}
	const shouldRenderClosingCapForFlight = (flightIdx: number) =>
		(lastNonLandingFlight !== null && flightIdx === lastNonLandingFlight);

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
	// rotate90: כאשר true – סיבוב 90°
	// flipU/flipV: היפוך כיוון הטקסטורה בתוך תחום הגזירה (לשימור רציפות כיוון בין פאות)
	function buildFaceTextures(dimU: number, dimV: number, rotate90: boolean = false, flipU: boolean = false, flipV: boolean = false) {
		const key = `${dimU.toFixed(4)}|${dimV.toFixed(4)}|${textureUrl || 'na'}|${bumpUrl || 'na'}|${roughnessUrl || 'na'}|${tileScale}|${bumpScaleOverride ?? 'na'}|rot:${rotate90 ? 1 : 0}|fu:${flipU ? 1 : 0}|fv:${flipV ? 1 : 0}`;
		const cached = faceTexCacheRef.current.get(key);
		if (cached) return cached;

		const imgW = (map.image && (map.image as any).width) || 1024;
		const imgH = (map.image && (map.image as any).height) || 1024;
		// אם מסובבים 90° – יחס המפה מתהפך
		const texAspect = rotate90 ? (imgH / imgW) : (imgW / imgH);
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

		const mk = (base: any, isColor: boolean) => {
			const t = base.clone();
			// RepeatWrapping כאשר יש היפוך או חיתוך (rep<1) כדי למנוע מריחה מפיקסלי שוליים
			const requiresRepeat = flipU || flipV || (repU < 0.999) || (repV < 0.999);
			t.wrapS = t.wrapT = requiresRepeat ? RepeatWrapping : ClampToEdgeWrapping;
			t.repeat.set(repU, repV);
			t.offset.set(offU, offV);
			// סיבוב אופציונלי של הטקסטורה סביב המרכז כדי ליישר כיוון
			if (rotate90) {
				t.center.set(0.5, 0.5);
				t.rotation = Math.PI / 2;
			}
			// היפוך כיוון בתוך התחום
			if (flipU) {
				t.repeat.x = -t.repeat.x;
				// שמור על תחום החיתוך ע"י הזזה לקצה השני
				t.offset.x = offU + repU;
			}
			if (flipV) {
				t.repeat.y = -t.repeat.y;
				t.offset.y = offV + repV;
			}
			// מרחב צבע רק למפת צבע; מפות bump/rough נשארות לינאריות
			// @ts-ignore
			t.colorSpace = isColor ? SRGBColorSpace : undefined;
			// שימוש ב‑mipmaps כדי למנוע "פסים" וריצוד בטקסטורות קטנות/חוזרות
			const useMipmaps = true;
			t.generateMipmaps = useMipmaps;
			// כאשר יש downscale – mipmap לינארי נותן תוצאה חלקה יותר
			// @ts-ignore
			t.minFilter = useMipmaps ? LinearMipmapLinearFilter : LinearFilter;
			t.magFilter = LinearFilter;
			// אנאיזוטרופי לשימור חדות בזווית
			t.anisotropy = Math.max(8, (t.anisotropy || 0));
			t.needsUpdate = true;
			return t;
		};

		const out = {
			color: mk(map, true),
			bump: bumpUrl ? mk(bumpMap, false) : undefined,
			rough: roughnessUrl ? mk(roughMap, false) : undefined,
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

	const headlightRef = useRef<PointLight>(null!);
	useFrame((state) => {
		if (headlightRef.current) headlightRef.current.position.copy(state.camera.position);
	});

	const railingSides = stepRailingSidesForRailing ?? stepRailingSides;
	return (
		<group position={[-1.5, 0, 0]}>
			{/* תאורת פנים רכה: ambient גבוה, headlight רך */}
			<ambientLight intensity={1.2} />
			<hemisphereLight args={['#ffffff', '#e8ecf0', 1.0]} />
			{/* Headlight רך (אור עוקב מצלמה) – 0.65 להתחלה, לאזן עם ambient */}
			<pointLight ref={headlightRef} intensity={0.65} distance={20} color="#ffffff" />

			{/* Environment פנים – עוצמה 1.2: יותר אור "מהקירות", מראה טבעי */}
			<Environment preset="apartment" blur={0.3} environmentIntensity={1.2} />
			{(() => { 
				if (boxModel === 'rounded') {
					return buildRoundedTreads({
						treads: treads as any,
						materialKind,
						useSolidMat,
						solidTopColor,
						solidSideColor,
						buildFaceTextures,
						treadThickness,
						treadWidth,
					});
				}
				if (boxModel === 'taper') {
					return buildTaperBoxTreads({
						treads: treads as any,
						materialKind,
						useSolidMat,
						solidTopColor,
						solidSideColor,
						buildFaceTextures,
						treadThickness,
						treadWidth,
						thickEnd: 0.05, // 5cm בקצה
						stepRailingSides: railingSides,
						landingRailingSides,
					});
				}
				if (boxModel === 'wedge') {
					return buildWedgeTreads({
						treads: treads as any,
						materialKind,
						useSolidMat,
						solidTopColor,
						solidSideColor,
						buildFaceTextures,
						treadThickness,
						treadWidth,
						wedgeFrontFraction,
						wedgeFrontThicknessM,
						stepRailingSides: railingSides,
						landingRailingSides,
						debugLabels: false,
						hitech: false,
					});
				}
				if (boxModel === 'ridge') {
					return buildRidgeTreads({
						treads: treads as any,
						useSolidMat,
						solidTopColor,
						solidSideColor,
						buildFaceTextures,
						treadThickness,
						treadWidth,
						stepRailingSides: railingSides,
						landingRailingSides,
						debugLabels: false,
						hitech: false,
					});
				}
				return buildRectTreads({
					treads: treads as any,
					materialKind,
					useSolidMat,
					solidTopColor,
					solidSideColor,
					buildFaceTextures,
					treadThickness,
					treadWidth,
					stepRailingSides: railingSides,
					landingRailingSides,
					hitech: false,
				});
					})()}

			{/* קירות "חוץ" לצורך קונטקסט ויזואלי (לא משנה את מודלי המדרגות עצמם) */}
								{(() => {
				// NOTE: קירות "חוץ" הם שקופים (transparent) – עלולים לגרום להחשכה קלה בתנועה (transparency sorting).
				const showOuterWalls = true;
				if (!showOuterWalls) return null;
				const wallH = 6.0; // מטר – קבוע מהרצפה
				const wallTh = 0.06; // עובי קיר 6 ס"מ
				const gap = 0.001; // מרווח מינימלי (1מ"מ) – קירות נפגשים בלי חריץ, עם מניעת זי-פייטינג
				// BasicMaterial + toneMapped=false – לבן שמנת עדין (בז־לבן), אחיד בכל הגרמים
				const wallColor = '#FFFBF5';

				let sIdx = 0;
				let lIdx = 0;

							return (
								<group>
						{treads.map((t, i) => {
								const yaw = t.rotation[1] as number;
							const axis = (Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z') as 'x' | 'z';

							const isLanding = !!t.isLanding;
							// @ts-ignore
							const hasTurn = !!(isLanding && t.turn);

							// צד המעקה – אותו מערך שהמעקה משתמש בו (railingSides למדרגות), כדי שהקיר יהיה בפאה הנגדית
							const railingSide: 'right' | 'left' = isLanding
								? (landingRailingSides?.[lIdx] ?? 'right')
								: (railingSides?.[sIdx] ?? 'right');
							if (isLanding) lIdx++; else sIdx++;

							// אותו חישוב צד מקומי כמו במעקה (rightLocal + חריג פודסט Z)
							const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
							let rightLocal: 1 | -1 =
								(axis === 'x' ? (cosY >= 0 ? -1 : 1) : (sinY >= 0 ? 1 : -1)) as 1 | -1;
							if (t.isLanding && axis === 'z') rightLocal = (rightLocal === 1 ? -1 : 1) as 1 | -1;
							const railingSideSignLocal = (railingSide === 'right' ? rightLocal : (-rightLocal as 1 | -1)) as 1 | -1;
							// הקיר בפאה הנגדית למעקה
							const zWall = -railingSideSignLocal * (treadWidth / 2 + gap + wallTh / 2);

							// כיוון התקדמות (לקיר חזית בפודסט עם פנייה)
							const forwardSignBase = (axis === 'x' ? (cosY >= 0 ? 1 : -1) : (sinY >= 0 ? 1 : -1)) as 1 | -1;
							const forwardSign = (t.flight === 0 ? -forwardSignBase : forwardSignBase) as 1 | -1;
							// נציב את הקיר בגובה מוחלט ביחס לרצפה (0..6m), אבל בתוך ה-group של המדרך כדי שיסתובב יחד איתו
							const worldCenterY = floorBounds.y + wallH / 2;
							const yLocal = worldCenterY - t.position[1];

							return (
								<group key={`outer-wall-${i}`} position={t.position} rotation={t.rotation}>
									{/* קיר חיצוני – toneMapped={false} כדי שהלבן לא יידחס ע"י ACES ויישאר בוהק */}
									<mesh position={[0, yLocal, zWall]} castShadow={false} receiveShadow={false}>
										<boxGeometry args={[t.run, wallH, wallTh]} />
										<meshBasicMaterial color={wallColor} side={2} toneMapped={false} />
									</mesh>
									{/* בפודסט עם פנייה: קיר חזית – מיקום לפי forwardSign (כיוון התקדמות ממשי) */}
									{hasTurn ? (
										<mesh
											position={[
												forwardSign * (t.run / 2 + gap + wallTh / 2),
												yLocal,
												0,
											]}
											castShadow={false}
											receiveShadow={false}
										>
											{/* קיר L – רוחב מלא; toneMapped={false} ללבן בוהק */}
											<boxGeometry args={[wallTh, wallH, treadWidth]} />
											<meshBasicMaterial color={wallColor} side={2} toneMapped={false} />
						</mesh>
						) : null}
					</group>
				);
						})}
								</group>
							);
						})()}

			{/* Hitech plates (מוסתר) */}
			<HitechPlates
				hitech={false}
				treads={treads as any}
				treadWidth={treadWidth}
				treadDepth={treadDepth}
				treadThickness={treadThickness}
				riser={riser}
				floorBounds={floorBounds}
				landingWidth={treadWidth}
				hitechPlateThickness={hitechPlateThickness}
				hitechPlateTopOffsetM={hitechPlateTopOffsetM}
				hitechPlateInsetFromEdge={hitechPlateInsetFromEdge}
				shouldRenderClosingCapForFlight={shouldRenderClosingCapForFlight}
				hitechBStartRef={hitechBStartRef}
				hitechCStartRef={hitechCStartRef}
			/>

			{/* מעקה זכוכית – קטעים רציפים בקו אלכסוני */}
			{(() => {
				if (railingKind !== 'glass') return null;
				if (!glassTone || !stepRailingStates) return null;
				const glassSelected = glassTone;
				// חשוב: זכוכית עם opacity גבוה (alpha blending) "מכהה" את מה שמאחור ומשנה מראה בזמן תנועה
				// בגלל sorting של שקיפות. לכן שומרים על זכוכית בהירה יותר ועם opacity נמוך.
				const opacity = glassSelected === 'smoked' ? 0.22 : glassSelected === 'bronze' ? 0.20 : 0.18;
				const color = glassSelected === 'smoked' ? '#64748b' : glassSelected === 'bronze' ? '#c8a76b' : '#bfefff';
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
					const axis = (Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z') as 'x' | 'z';
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
					const sidePref = (typeof railingSides !== 'undefined' ? (railingSides[idxForStep] ?? 'right') : 'right');
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
								<mesh key={`gstep-Lx-${i}`} castShadow={false} receiveShadow={false} renderOrder={10}>
									<primitive object={geom} attach="geometry" />
									<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
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
								<mesh key={`gstep-Lz-${i}`} castShadow={false} receiveShadow={false} renderOrder={10}>
									<primitive object={geom} attach="geometry" />
									<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
								</mesh>
							);
						}
						continue;
					}

					// מדרגה בודדת
					const idxForStep = sIdx3;
					const enabled = stepRailingStates[sIdx3++] ?? false;
					if (!enabled) continue;
					const sidePref = (typeof railingSides !== 'undefined' ? (railingSides[idxForStep] ?? 'right') : 'right');

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
							<mesh key={`gstep-x-${i}`} castShadow={false} receiveShadow={false} renderOrder={10}>
								<primitive object={geom} attach="geometry" />
								<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
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
							<mesh key={`gstep-z-${i}`} castShadow={false} receiveShadow={false} renderOrder={10}>
								<primitive object={geom} attach="geometry" />
								<meshBasicMaterial color={color} transparent opacity={opacity} side={2} depthWrite={false} toneMapped={false} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />
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
						const sidePref = (typeof railingSides !== 'undefined' ? (railingSides[curIdx] ?? 'right') : 'right');
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
					const sidePref = (typeof railingSides !== 'undefined' ? (railingSides[idxForStep] ?? 'right') : 'right');
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
					const sidePref = (typeof railingSides !== 'undefined' ? (railingSides[idxForStep] ?? 'right') : 'right');

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

export default Staircase3D;

