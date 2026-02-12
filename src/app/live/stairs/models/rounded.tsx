import React from 'react';
import { ExtrudeGeometry, Shape } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw } from './boxShared';

function roundedRectShape(w: number, h: number, r: number) {
	const hw = w / 2;
	const hh = h / 2;
	const rr = Math.max(0, Math.min(r, hw - 1e-4, hh - 1e-4));
	const s = new Shape();
	s.moveTo(-hw + rr, -hh);
	s.lineTo(hw - rr, -hh);
	s.absarc(hw - rr, -hh + rr, rr, -Math.PI / 2, 0, false);
	s.lineTo(hw, hh - rr);
	s.absarc(hw - rr, hh - rr, rr, 0, Math.PI / 2, false);
	s.lineTo(-hw + rr, hh);
	s.absarc(-hw + rr, hh - rr, rr, Math.PI / 2, Math.PI, false);
	s.lineTo(-hw, -hh + rr);
	s.absarc(-hw + rr, -hh + rr, rr, Math.PI, (3 * Math.PI) / 2, false);
	s.closePath();
	return s;
}

export function buildRoundedTreads(params: {
	treads: Tread[];
	materialKind: 'wood' | 'metal' | 'stone';
	useSolidMat: boolean;
	solidTopColor: string;
	solidSideColor: string;
	buildFaceTextures: BuildFaceTextures;
	treadThickness: number;
	treadWidth: number;
	cornerRadiusM?: number;
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
		cornerRadiusM,
	} = params;

	const rDefault = 0.04; // 4cm פינה – נראה "עדין" בלי לאבד יותר מדי שטח
	const r = typeof cornerRadiusM === 'number' ? cornerRadiusM : rDefault;

	return (
		<>
			{treads.map((t, idx) => {
				const run = t.run;
				const yaw = t.rotation[1] as number;
				const axisTop = axisFromYaw(yaw);
				const rotTop = (axisTop === 'z');
				// רדיוס מוחל על כל ההיקף (כל 4 פינות). הפונקציה עצמה כבר מקלמפת אוטומטית לחצי הממד הקצר כדי לא לשבור גיאומטריה.
				const shape = roundedRectShape(run, treadWidth, r);
				const geo = new ExtrudeGeometry(shape, {
					depth: treadThickness,
					steps: 1,
					bevelEnabled: false,
				});
				// Extrude יוצא על ציר Z; מסובבים כדי שעובי יהיה על ציר Y
				geo.rotateX(-Math.PI / 2);
				// מרכז עובי סביב Y=0 כמו בשאר המודלים
				geo.translate(0, -treadThickness / 2, 0);
				geo.computeVertexNormals();

				const mat = (() => {
					if (useSolidMat) return <meshBasicMaterial color={solidTopColor || solidSideColor} side={2} />;
					const ft = buildFaceTextures(run, treadWidth, rotTop);
					return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
				})();

				return (
					<group key={idx} position={t.position} rotation={t.rotation}>
						<mesh geometry={geo} receiveShadow castShadow={materialKind !== 'metal'}>
							{mat}
						</mesh>
					</group>
				);
			})}
		</>
	);
}

