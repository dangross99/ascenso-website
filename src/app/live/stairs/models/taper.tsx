import React from 'react';
import { ExtrudeGeometry, Shape } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw } from './boxShared';

function taperProfileShape(params: {
	run: number;
	thickStart: number; // at back (-x)
	thickEnd: number; // at front (+x)
}) {
	const { run, thickStart, thickEnd } = params;
	const x0 = -run / 2;
	const x1 = run / 2;
	const topY = thickStart / 2; // keep top plane fixed using the max thickness
	const botY0 = -thickStart / 2;
	const botY1 = topY - thickEnd; // thickness at front is thickEnd

	const s = new Shape();
	s.moveTo(x0, botY0);
	s.lineTo(x1, botY1);
	s.lineTo(x1, topY);
	s.lineTo(x0, topY);
	s.closePath();
	return s;
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
	} = params;

	const thickStart = treadThickness;
	const thin = typeof thickEnd === 'number' ? thickEnd : 0.05;

	return (
		<>
			{treads.map((t, idx) => {
				const run = t.run;
				const yaw = t.rotation[1] as number;
				const axisTop = axisFromYaw(yaw);
				const rotTop = (axisTop === 'z');

				const profile = taperProfileShape({ run, thickStart, thickEnd: thin });
				const geo = new ExtrudeGeometry(profile, {
					depth: treadWidth,
					steps: 1,
					bevelEnabled: false,
				});
				// center across width
				geo.translate(0, 0, -treadWidth / 2);
				geo.computeVertexNormals();

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
						{/* גוף/רום עם טייפר (ללא טקסטורה כדי לא להיראות "מפורק") */}
						<mesh geometry={geo} receiveShadow castShadow={materialKind !== 'metal'}>
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

