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

	const outer: P2[] = [];
	let s = 0;

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
			// נקודת "שבירה" אנכית: בסוף ה‑run, הוסף נקודה באותו X עם Y של המדרגה הבאה
			outer.push({ x: s, y: ySupport });
			if (hasRise) outer.push({ x: s, y: ySupportN });
			continue;
		}

		// אין עליה – המשך אופקי רגיל
		outer.push({ x: s, y: ySupport });
	}

	if (outer.length < 2) return null;

	// קו תחתון: Offset אנכי של כל הזיגזג העליון (עובי אנכי קבוע לכל האורך)
	const bottom: P2[] = outer.map(p => ({ x: p.x, y: p.y - stringerHeight }));

	const shape = new Shape();
	shape.moveTo(outer[0].x, outer[0].y);
	for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i].x, outer[i].y);
	// סגירה בתחתית: ירידה לקו התחתון בקצה, ואז חזרה לאורך הזיגזג התחתון
	shape.lineTo(bottom[bottom.length - 1].x, bottom[bottom.length - 1].y);
	for (let i = bottom.length - 2; i >= 0; i--) shape.lineTo(bottom[i].x, bottom[i].y);
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
			// Bevel קטן (2mm) לעידון קצה המתכת כמו במציאות
			bevelEnabled: true,
			bevelThickness: 0.002,
			bevelSize: 0.002,
			bevelSegments: 1,
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

		// ימין: הטווח הוא [rightOuterZ - plateTh, rightOuterZ]
		stringers.push(makeStringer(rightOuterZ - plateTh, `sawtooth-stringer-r-${flightIdx}`));
		// שמאל: הטווח הוא [leftOuterZ, leftOuterZ + plateTh]
		stringers.push(makeStringer(leftOuterZ, `sawtooth-stringer-l-${flightIdx}`));
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
			{/* Risers – סגירה אנכית מלאה בין מדרגות (מבנה אטום) */}
			{(() => {
				const out: React.ReactNode[] = [];
				for (let i = 0; i < treads.length - 1; i++) {
					const cur = treads[i];
					const next = treads[i + 1];

					// סגירה הרמטית: מהרום של המדרך התחתון (Top face) ועד תחתית המדרך העליון (Bottom face)
					const yLowerTop = cur.position[1] + treadThickness / 2;
					const yUpperBot = next.position[1] - treadThickness / 2;
					const h = yUpperBot - yLowerTop;
					if (!(h > 1e-5)) continue;

					const run = cur.run || treadDepth;

					// forward (XZ) עבור זוג נקודות – עובד גם במעברים בין גרמים
					let fx = 1, fz = 0;
					{
						const dx = next.position[0] - cur.position[0];
						const dz = next.position[2] - cur.position[2];
						const hm = Math.hypot(dx, dz);
						if (hm > 1e-6) {
							fx = dx / hm;
							fz = dz / hm;
						} else {
							const yaw0 = (cur.rotation[1] as number) || 0;
							fx = Math.cos(yaw0);
							fz = Math.sin(yaw0);
						}
					}
					const yaw = Math.atan2(fz, fx);

					const frontX = cur.position[0] + fx * (run / 2 + 0.0008);
					const frontZ = cur.position[2] + fz * (run / 2 + 0.0008);
					const yMid = (yLowerTop + yUpperBot) / 2;

					// plane normal צריך להצביע קדימה (forward); planeGeometry normal הוא +Z
					const rotY = yaw - Math.PI / 2;
					const rotFrontBack = (Math.abs(Math.cos(yaw)) > 0.5); // לשמירת סיבוב UV דומה ל‑rect

					out.push(
						<mesh
							key={`sawtooth-riser-${i}`}
							position={[frontX, yMid, frontZ]}
							rotation={[0, rotY, 0]}
							receiveShadow
						>
							<planeGeometry args={[innerTreadWidth, h, 8, 2]} />
							{faceMat(innerTreadWidth, h, rotFrontBack, false)}
						</mesh>
					);
				}
				return <group>{out}</group>;
			})()}
			{/* הקורות (Stringers) – שתי רצועות זיגזג מפלדה משני צדי המדרגה */}
			{stringers}
		</group>
	);
}

