import React from 'react';
import { ExtrudeGeometry, Matrix4, Shape, Vector3 } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { buildRectTreads } from './rect';

function buildZigzagRibbonShape(params: {
	flightTreads: Tread[];
	treadThickness: number;
	treadDepth: number;
	ribbonWidth: number; // thickness of the ribbon in the 2D profile (meters)
}) {
	const { flightTreads, treadThickness, treadDepth, ribbonWidth } = params;
	type P2 = { x: number; y: number };

	const outer: P2[] = [];
	let s = 0;

	const y0 = flightTreads[0].position[1] + treadThickness / 2;
	outer.push({ x: 0, y: 0 });

	for (let i = 0; i < flightTreads.length; i++) {
		const cur = flightTreads[i];
		const yTop = (cur.position[1] + treadThickness / 2) - y0;
		outer[outer.length - 1].y = yTop;
		const run = cur.run || treadDepth;
		s += run;
		outer.push({ x: s, y: yTop });
		const next = flightTreads[i + 1];
		if (next) {
			const yTopN = (next.position[1] + treadThickness / 2) - y0;
			if (Math.abs(yTopN - yTop) > 1e-6) {
				outer.push({ x: s, y: yTopN });
			}
		}
	}

	if (outer.length < 2) return null;

	const thick = ribbonWidth;
	const isH = (a: P2, b: P2) => Math.abs(a.y - b.y) < 1e-9;
	const isV = (a: P2, b: P2) => Math.abs(a.x - b.x) < 1e-9;

	// inner דרך offset+miter עבור מקטעים מאונכים
	const inner: P2[] = [];
	{
		const a = outer[0], b = outer[1];
		inner.push(isH(a, b) ? { x: a.x, y: a.y - thick } : { x: a.x - thick, y: a.y });
	}
	for (let i = 1; i < outer.length - 1; i++) {
		const pPrev = outer[i - 1], p = outer[i], pNext = outer[i + 1];
		const prevH = isH(pPrev, p), prevV = isV(pPrev, p);
		const nextH = isH(p, pNext), nextV = isV(p, pNext);
		if (prevH && nextV) inner.push({ x: p.x - thick, y: p.y - thick });
		else if (prevV && nextH) inner.push({ x: p.x - thick, y: p.y - thick });
		else if (prevH) inner.push({ x: p.x, y: p.y - thick });
		else inner.push({ x: p.x - thick, y: p.y });
	}
	{
		const a = outer[outer.length - 2], b = outer[outer.length - 1];
		inner.push(isH(a, b) ? { x: b.x, y: b.y - thick } : { x: b.x - thick, y: b.y });
	}

	const shape = new Shape();
	shape.moveTo(outer[0].x, outer[0].y);
	for (let i = 1; i < outer.length; i++) shape.lineTo(outer[i].x, outer[i].y);
	for (let i = inner.length - 1; i >= 0; i--) shape.lineTo(inner[i].x, inner[i].y);
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
	stringerRibbonWidth?: number; // 2D ribbon width (m)

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
	const ribbonW = typeof params.stringerRibbonWidth === 'number' ? params.stringerRibbonWidth : 0.04; // 40mm "גובה" רצועה

	const stringerColor = useSolidMat ? solidSideColor : '#4b5563';

	const flights = Array.from(new Set(treads.map(tt => tt.flight))).sort((a, b) => a - b);
	const stringers: React.ReactNode[] = [];

	for (const flightIdx of flights) {
		const ftAll = treads.filter(tt => tt.flight === flightIdx);
		if (!ftAll.length) continue;

		const prof = buildZigzagRibbonShape({
			flightTreads: ftAll,
			treadThickness,
			treadDepth,
			ribbonWidth: ribbonW,
		});
		if (!prof) continue;

		const { fx, fz, rx, rz, backX, backZ } = computeFlightBasis(ftAll, treadDepth);

		const geo0 = new ExtrudeGeometry(prof.shape, { depth: plateTh, steps: 1, bevelEnabled: false });
		// center extrude
		geo0.translate(0, 0, -plateTh / 2);
		geo0.computeVertexNormals();

		const basis = new Matrix4().makeBasis(
			new Vector3(fx, 0, fz),
			new Vector3(0, 1, 0),
			new Vector3(rx, 0, rz),
		);
		basis.setPosition(new Vector3(backX, prof.y0, backZ));

		const edgeOffset = (treadWidth / 2) - (plateTh / 2);

		const makeStringer = (zOffset: number, key: string) => {
			const g = geo0.clone();
			// move to side before basis transform (local Z -> right)
			g.translate(0, 0, zOffset);
			g.applyMatrix4(basis);
			g.computeVertexNormals();
			return (
				<mesh key={key} geometry={g} receiveShadow>
					<meshBasicMaterial color={stringerColor} side={2} />
				</mesh>
			);
		};

		stringers.push(makeStringer(+edgeOffset, `sawtooth-stringer-r-${flightIdx}`));
		stringers.push(makeStringer(-edgeOffset, `sawtooth-stringer-l-${flightIdx}`));
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
				treadWidth,
				stepRailingSides,
				landingRailingSides,
				hitech: false,
			})}
			{/* הקורות (Stringers) – שתי רצועות זיגזג מפלדה משני צדי המדרגה */}
			{stringers}
		</group>
	);
}

