import React from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw, computeLocalFrame, getInnerIsRight } from './boxShared';

function buildWidthTaperBodyGeo(params: {
	run: number;
	width: number;
	thickOuter: number; // 0.12
	thickInner: number; // 0.05
	innerSignLocal: 1 | -1; // +1 => inner is +Z, -1 => inner is -Z
}) {
	const { run, width, thickOuter, thickInner, innerSignLocal } = params;
	const dx = run / 2;
	const dz = width / 2;
	const zInner = innerSignLocal * dz;
	const zOuter = -innerSignLocal * dz;

	// Top stays level (using thickOuter as reference).
	const yTop = thickOuter / 2;
	const yBotOuter = yTop - thickOuter; // = -thickOuter/2
	const yBotInner = yTop - thickInner;

	// Vertex order:
	// 0..3 top (outer edge then inner edge), 4..7 bottom
	const v = [
		[-dx, yTop, zOuter], // 0
		[ dx, yTop, zOuter], // 1
		[ dx, yTop, zInner], // 2
		[-dx, yTop, zInner], // 3
		[-dx, yBotOuter, zOuter], // 4
		[ dx, yBotOuter, zOuter], // 5
		[ dx, yBotInner, zInner], // 6
		[-dx, yBotInner, zInner], // 7
	] as const;

	const pos: number[] = [];
	for (const p of v) pos.push(p[0], p[1], p[2]);

	// 12 triangles
	const idx = [
		// top
		0, 1, 2, 0, 2, 3,
		// bottom (flip)
		4, 6, 5, 4, 7, 6,
		// front (+x)
		1, 5, 6, 1, 6, 2,
		// back (-x)
		0, 3, 7, 0, 7, 4,
		// outer side (zOuter)
		0, 4, 5, 0, 5, 1,
		// inner side (zInner)
		3, 2, 6, 3, 6, 7,
	];

	const geo = new BufferGeometry();
	geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
	geo.setIndex(idx);
	geo.computeVertexNormals();
	return geo;
}

export function buildTaperBoxTreads(params: {
	treads: Tread[];
	materialKind: 'wood' | 'metal' | 'stone';
	useSolidMat: boolean;
	solidTopColor: string;
	solidSideColor: string;
	buildFaceTextures: BuildFaceTextures;
	treadThickness: number; // should be thickStart (0.12) for this model
	treadWidth: number;
	thickEnd?: number; // default 0.05
	stepRailingSides?: Array<Side>;
	landingRailingSides?: Array<Side>;
}) {
	const {
		treads,
		materialKind,
		useSolidMat,
		solidTopColor,
		solidSideColor,
		buildFaceTextures,
		treadThickness,
		treadWidth,
		thickEnd,
		stepRailingSides,
		landingRailingSides,
	} = params;

	const thickStart = treadThickness;
	const thin = typeof thickEnd === 'number' ? thickEnd : 0.05;
	let stepIdx = 0;
	let landingIdx = 0;

	return (
		<>
			{treads.map((t, idx) => {
				const run = t.run;
				const yaw = t.rotation[1] as number;
				const axis = axisFromYaw(yaw);
				const rotTop = (axis === 'z');

				// ההצטמצמות היא לאורך כל הגרם (לא בתוך כל מדרך): לכל מדרך עובי אחיד,
				// כאן זה טייפר לרוחב: כל המדרגות זהות, 12cm בחוץ → 5cm בפנים.
				const curStepIdx = !t.isLanding ? (stepIdx++) : -1;
				const innerIsRight = getInnerIsRight({ t, curStepIdx, stepRailingSides, landingRailingSides, landingIdx });
				if (t.isLanding) landingIdx++;
				const { innerSignLocal } = computeLocalFrame({
					yaw,
					isLanding: t.isLanding,
					flight: t.flight,
					axis,
					innerIsRight,
				});

				const bodyGeo = buildWidthTaperBodyGeo({
					run,
					width: treadWidth,
					thickOuter: thickStart,
					thickInner: thin,
					innerSignLocal,
				});

				const topMat = (() => {
					if (useSolidMat) return <meshBasicMaterial color={solidTopColor} side={2} />;
					const ft = buildFaceTextures(run, treadWidth, rotTop);
					return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
				})();
				const sideMat = (
					<meshBasicMaterial
						color={solidSideColor}
						side={2}
						polygonOffset
						polygonOffsetFactor={1}
						polygonOffsetUnits={1}
					/>
				);

				return (
					<group key={idx} position={t.position} rotation={t.rotation}>
						{/* גוף/רום: קופסה אחידה לכל מדרך, עובי משתנה לאורך המדרגות */}
						<mesh geometry={bodyGeo} receiveShadow castShadow={materialKind !== 'metal'}>
							{sideMat}
						</mesh>

						{/* Top face עם UV רציף */}
						<mesh
							position={[0, thickStart / 2 + 0.002, 0]}
							castShadow={materialKind !== 'metal'}
							receiveShadow={materialKind !== 'metal'}
						>
							<boxGeometry args={[run, 0.004, treadWidth]} />
							{topMat}
						</mesh>
					</group>
				);
			})}
		</>
	);
}

