import React from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw } from './boxShared';

type V3 = [number, number, number];

function quadGeo(p0: V3, p1: V3, p2: V3, p3: V3, uvFor: (p: V3) => [number, number]) {
	const geo = new BufferGeometry();
	const pos = new Float32Array([
		p0[0], p0[1], p0[2],
		p1[0], p1[1], p1[2],
		p2[0], p2[1], p2[2],
		p3[0], p3[1], p3[2],
	]);
	const uv0 = uvFor(p0), uv1 = uvFor(p1), uv2 = uvFor(p2), uv3 = uvFor(p3);
	const uvs = new Float32Array([
		uv0[0], uv0[1],
		uv1[0], uv1[1],
		uv2[0], uv2[1],
		uv3[0], uv3[1],
	]);
	geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
	geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
	geo.setIndex([0, 1, 2, 0, 2, 3]);
	geo.computeVertexNormals();
	return geo;
}

export function buildChamferBoxTreads(params: {
	treads: Tread[];
	materialKind: 'wood' | 'metal' | 'stone';
	useSolidMat: boolean;
	solidTopColor: string;
	solidSideColor: string;
	buildFaceTextures: BuildFaceTextures;
	treadThickness: number;
	treadWidth: number;
	// כמה “נכנס פנימה” בתחתית מכל צד (ליצירת פאה אלכסונית לאורך)
	chamferInsetM?: number; // default 0.06
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
		chamferInsetM,
	} = params;

	const inset = Math.max(0, Math.min(treadWidth / 3, typeof chamferInsetM === 'number' ? chamferInsetM : 0.06));

	return (
		<>
			{treads.map((t, idx) => {
				const run = t.run;
				const yaw = t.rotation[1] as number;
				const axis = axisFromYaw(yaw);
				const rotTop = (axis === 'z');
				const rotateFrontBack = (axis === 'x');
				const rotateSides = (axis === 'z');

				// כיוון “קדימה” לצורך שמירת כיוון טקסטורה עקבי (כמו rect)
				const forwardSignBase = axis === 'x' ? (Math.cos(yaw) >= 0 ? 1 : -1) : (Math.sin(yaw) >= 0 ? 1 : -1);
				const forwardSign = (t.flight === 0 ? -forwardSignBase : forwardSignBase) as 1 | -1;

				const matTop = (() => {
					if (useSolidMat) return (<meshBasicMaterial color={solidTopColor} side={2} />);
					const ft = buildFaceTextures(run, treadWidth, rotTop, forwardSign < 0);
					return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />);
				})();
				const matBottom = (() => {
					if (useSolidMat) return (<meshBasicMaterial color={solidSideColor} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
					const ft = buildFaceTextures(run, Math.max(0.01, treadWidth - 2 * inset), rotTop, forwardSign < 0);
					return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
				})();
				const matFrontBack = (flipU: boolean = false) => {
					if (useSolidMat) return (<meshBasicMaterial color={solidSideColor} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
					const ft = buildFaceTextures(treadWidth, treadThickness, rotateFrontBack, flipU);
					return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
				};
				const matSides = (flipU: boolean = false) => {
					if (useSolidMat) return (<meshBasicMaterial color={solidSideColor} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
					// גובה “נטוי” של הפאה (slant)
					const slantH = Math.sqrt(treadThickness * treadThickness + inset * inset);
					const ft = buildFaceTextures(run, slantH, rotateSides, flipU);
					return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
				};

				// נקודות מקומיות
				const dx = run / 2;
				const dz = treadWidth / 2;
				const yTop = treadThickness / 2;
				const yBot = -treadThickness / 2;
				const zTopL = -dz, zTopR = dz;
				const zBotL = -dz + inset, zBotR = dz - inset;

				// top/bottom
				const topGeo = quadGeo(
					[-dx, yTop, zTopL], [dx, yTop, zTopL], [dx, yTop, zTopR], [-dx, yTop, zTopR],
					(p) => [(p[0] + dx) / run, (p[2] + dz) / (2 * dz)],
				);
				const bottomGeo = quadGeo(
					[-dx, yBot, zBotR], [dx, yBot, zBotR], [dx, yBot, zBotL], [-dx, yBot, zBotL],
					(p) => [(p[0] + dx) / run, (p[2] - zBotL) / Math.max(1e-6, (zBotR - zBotL))],
				);

				// sides (slanted)
				const leftSlant = quadGeo(
					[-dx, yTop, zTopL], [dx, yTop, zTopL], [dx, yBot, zBotL], [-dx, yBot, zBotL],
					(p) => {
						const u = (p[0] + dx) / run;
						const tV = (yTop - p[1]) / treadThickness; // 0..1 לאורך השיפוע
						return [u, tV];
					},
				);
				const rightSlant = quadGeo(
					[-dx, yTop, zTopR], [-dx, yBot, zBotR], [dx, yBot, zBotR], [dx, yTop, zTopR],
					(p) => {
						const u = (p[0] + dx) / run;
						const tV = (yTop - p[1]) / treadThickness;
						return [u, tV];
					},
				);

				// front/back trapezoids
				const front = quadGeo(
					[dx, yTop, zTopR], [dx, yTop, zTopL], [dx, yBot, zBotL], [dx, yBot, zBotR],
					(p) => [(p[2] + dz) / (2 * dz), (p[1] - yBot) / treadThickness],
				);
				const back = quadGeo(
					[-dx, yTop, zTopL], [-dx, yTop, zTopR], [-dx, yBot, zBotR], [-dx, yBot, zBotL],
					(p) => [(p[2] + dz) / (2 * dz), (p[1] - yBot) / treadThickness],
				);

				return (
					<group key={idx} position={t.position} rotation={t.rotation}>
						{/* top */}
						<mesh geometry={topGeo} castShadow={materialKind !== 'metal'} receiveShadow={materialKind !== 'metal'}>
							{matTop}
						</mesh>
						{/* bottom */}
						<mesh geometry={bottomGeo} receiveShadow>
							{matBottom}
						</mesh>
						{/* slanted sides */}
						<mesh geometry={leftSlant} receiveShadow>
							{matSides(forwardSign < 0)}
						</mesh>
						<mesh geometry={rightSlant} receiveShadow>
							{matSides(forwardSign > 0)}
						</mesh>
						{/* front/back */}
						<mesh geometry={front} receiveShadow>
							{matFrontBack(forwardSign < 0)}
						</mesh>
						<mesh geometry={back} receiveShadow>
							{matFrontBack(forwardSign > 0)}
						</mesh>
					</group>
				);
			})}
		</>
	);
}

