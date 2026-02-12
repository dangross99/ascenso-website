import React from 'react';
import { ExtrudeGeometry, Matrix4, Shape, Vector3 } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { buildRectTreads } from './rect';

function buildSawtoothPlateShape(params: {
	flightTreads: Tread[];
	treadThickness: number;
	treadDepth: number;
	stringerHeight: number; // vertical height of the plate (meters)
}) {
	const { flightTreads, treadThickness, treadDepth, stringerHeight } = params;
	type P2 = { x: number; y: number };
	const EPS = 1e-6;
	const dedupe = (pts: P2[]) => {
		const out: P2[] = [];
		for (const p of pts) {
			const last = out[out.length - 1];
			if (last && Math.abs(last.x - p.x) < EPS && Math.abs(last.y - p.y) < EPS) continue;
			out.push(p);
		}
		return out;
	};

	const outer: P2[] = [];
	let s = 0;
	// חפיפה אופקית קבועה בין אופקי לאנכי (כדי שהקטע האנכי לא ייראה "דק")
	const OVERLAP_X = 0.12; // 12cm

	// ב‑Sawtooth: הקו העליון של הזיגזג צריך להיות Flush עם פני המדרך העליונים
	// כך שהמדרך "נכנס" לתוך עובי הסטרינגר (Boolean-like)
	const ySupport0 = flightTreads[0].position[1] + treadThickness / 2;
	const y0 = ySupport0;
	outer.push({ x: 0, y: 0 }); // y יחסית ל‑y0

	for (let i = 0; i < flightTreads.length; i++) {
		const cur = flightTreads[i];
		// ללא מרווחים: הצמדה מדויקת לפנים המדרך העליונים
		const ySupport = (cur.position[1] + treadThickness / 2) - y0;
		outer[outer.length - 1].y = ySupport;

		const run = cur.run || treadDepth;
		s += run;

		const next = flightTreads[i + 1];
		if (next) {
			const ySupportN = (next.position[1] + treadThickness / 2) - y0;
			const hasRise = Math.abs(ySupportN - ySupport) > 1e-6;
			// קצה מדרך נוכחי
			outer.push({ x: s, y: ySupport });
			if (hasRise) {
				// "פלטה אנכית" אמיתית: יוצרים מלבן (כיס) בעומק 12 ס"מ כחלק מאותה צורה:
				// (s, y0) -> (s+ov, y0) -> (s+ov, y1) -> (s, y1)
				const overlap = Math.min(OVERLAP_X, run * 0.9);
				outer.push({ x: s + overlap, y: ySupport });
				outer.push({ x: s + overlap, y: ySupportN });
				outer.push({ x: s, y: ySupportN });
			}
			continue;
		}

		// אין עליה – המשך אופקי רגיל
		outer.push({ x: s, y: ySupport });
	}

	const outerClean = dedupe(outer);
	if (outerClean.length < 2) return null;

	// Offset פשוט (לפי דרישה): שכפול מלא של הזיגזג העליון בהיסט אנכי קבוע.
	// זה מבטיח שהקו התחתון מקביל בדיוק לקו העליון (ללא פינות "חכמות" שעלולות להתעוות).
	const bottom = outerClean.map(p => ({ x: p.x, y: p.y - stringerHeight }));

	const shape = new Shape();
	shape.moveTo(outerClean[0].x, outerClean[0].y);
	for (let i = 1; i < outerClean.length; i++) shape.lineTo(outerClean[i].x, outerClean[i].y);
	for (let i = bottom.length - 1; i >= 0; i--) shape.lineTo(bottom[i].x, bottom[i].y);
	shape.closePath();

	return { shape, y0 };
}

function computeFlightBasis(flightTreads: Tread[], treadDepth: number) {
	// forward (XZ) יציב לגרם
	let fx = 1, fz = 0;
	if (flightTreads.length >= 2) {
		const dx = flightTreads[1].position[0] - flightTreads[0].position[0];
		const dz = flightTreads[1].position[2] - flightTreads[0].position[2];
		const hm = Math.hypot(dx, dz);
		if (hm > 1e-6) {
			fx = dx / hm;
			fz = dz / hm;
		} else {
			const yaw0 = (flightTreads[0].rotation[1] as number) || 0;
			fx = Math.cos(yaw0);
			fz = Math.sin(yaw0);
		}
	} else {
		const yaw0 = (flightTreads[0].rotation[1] as number) || 0;
		fx = Math.cos(yaw0);
		fz = Math.sin(yaw0);
	}
	const rx = -fz, rz = fx;
	const run0 = flightTreads[0].run || treadDepth;
	const backX = flightTreads[0].position[0] - fx * (run0 / 2);
	const backZ = flightTreads[0].position[2] - fz * (run0 / 2);
	return { fx, fz, rx, rz, backX, backZ };
}

export function buildSawtoothFlights(params: {
	treads: Tread[];
	treadWidth: number;
	treadDepth: number;
	treadThickness: number;

	// stringers
	stringerPlateThickness?: number; // Extrude depth (m)
	stringerHeight?: number; // 2D plate height (m)

	// materials
	materialKind: 'wood' | 'metal' | 'stone';
	useSolidMat: boolean;
	solidTopColor: string;
	solidSideColor: string;
	buildFaceTextures: BuildFaceTextures;

	stepRailingSides?: Array<Side>;
	landingRailingSides?: Array<Side>;
}) {
	const {
		treads,
		treadWidth,
		treadDepth,
		treadThickness,
		materialKind,
		useSolidMat,
		solidTopColor,
		solidSideColor,
		buildFaceTextures,
		stepRailingSides,
		landingRailingSides,
	} = params;

	const plateTh = typeof params.stringerPlateThickness === 'number' ? params.stringerPlateThickness : 0.012; // 12mm
	// 10–15cm כדי לקבל "רצועה עדינה"
	const stringerH = typeof params.stringerHeight === 'number' ? params.stringerHeight : 0.12; // 120mm

	const stringerColor = useSolidMat ? solidSideColor : '#4b5563';

	const flights = Array.from(new Set(treads.map(tt => tt.flight))).sort((a, b) => a - b);
	const stringers: React.ReactNode[] = [];
	// ללא Gaps: המדרכים ברוחב מלא כדי להיראות כחלק מהסטרינגרים
	const innerTreadWidth = treadWidth;

	const faceMat = (dimU: number, dimV: number, rot: boolean, flipU: boolean = false) => {
		if (useSolidMat) return <meshBasicMaterial color={solidSideColor} side={2} />;
		const ft = buildFaceTextures(dimU, dimV, rot, flipU);
		return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
	};

	for (const flightIdx of flights) {
		const ftAll = treads.filter(tt => tt.flight === flightIdx);
		if (!ftAll.length) continue;

		const prof = buildSawtoothPlateShape({
			flightTreads: ftAll,
			treadThickness,
			treadDepth,
			stringerHeight: stringerH,
		});
		if (!prof) continue;

		const { fx, fz, rx, rz, backX, backZ } = computeFlightBasis(ftAll, treadDepth);

		const geo0 = new ExtrudeGeometry(prof.shape, {
			depth: plateTh,
			steps: 1,
			// Bevel על Shape קעור (ribbon זיגזג) גורם לעיתים לחורים/ארטיפקטים בטסלציה של Three,
			// ולכן מכובה כאן כדי לקבל סטרינגר "נקי" ולא מעוות.
			bevelEnabled: false,
		});
		// Extrude "מהחוץ פנימה": שמור על טווח Z=[0..plateTh] ונמקם כך שהפנים החיצוניות יהיו Flush עם קצה המדרך
		geo0.computeVertexNormals();

		const basis = new Matrix4().makeBasis(
			new Vector3(fx, 0, fz),
			new Vector3(0, 1, 0),
			new Vector3(rx, 0, rz),
		);
		basis.setPosition(new Vector3(backX, prof.y0, backZ));

		const rightOuterZ = (treadWidth / 2);
		const leftOuterZ = -(treadWidth / 2);

		const makeStringer = (zOffset: number, key: string) => {
			const g = geo0.clone();
			// move to side before basis transform (local Z -> right)
			g.translate(0, 0, zOffset);
			g.applyMatrix4(basis);
			g.computeVertexNormals();
			return (
				<mesh key={key} geometry={g} receiveShadow>
					<meshBasicMaterial
						color={stringerColor}
						side={2}
						// polygonOffset כדי למנוע Z-fighting כאשר המדרגה והסטרינגר באותו מישור
						polygonOffset
						polygonOffsetFactor={-2}
						polygonOffsetUnits={-2}
					/>
				</mesh>
			);
		};

		// יישור לפאה של המדרגה: הפאה של הסטרינגר Flush עם קצה המדרגה,
		// והעובי (plateTh) יוצא החוצה (לא נכנס לתוך המדרגה).
		// (ה־Extrude המקומי הוא Z=[0..plateTh])
		// ימין: הטווח הוא [rightOuterZ, rightOuterZ + plateTh]
		stringers.push(makeStringer(rightOuterZ, `sawtooth-stringer-r-${flightIdx}`));
		// שמאל: הטווח הוא [leftOuterZ - plateTh, leftOuterZ]
		stringers.push(makeStringer(leftOuterZ - plateTh, `sawtooth-stringer-l-${flightIdx}`));
	}

	return (
		<group>
			{/* המדרכים – כאלמנטים נפרדים (כמו rect), כדי לקבל טקסטורות/צבעים בדיוק כמו בשאר הדגמים */}
			{buildRectTreads({
				treads,
				materialKind,
				useSolidMat,
				solidTopColor,
				solidSideColor,
				buildFaceTextures,
				treadThickness,
				treadWidth: innerTreadWidth,
				stepRailingSides,
				landingRailingSides,
				hitech: false,
			})}
			{/* הקורות (Stringers) – שתי רצועות זיגזג מפלדה משני צדי המדרגה */}
			{stringers}
		</group>
	);
}

