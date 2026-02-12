import React from 'react';
import { ExtrudeGeometry, Shape } from 'three';

import type { Tread, BuildFaceTextures } from './boxShared';
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
				// IMPORTANT: רדיוס "ברום" = עיגול בחתך Run×Thickness (הפרופיל הצדדי),
				// ואז Extrude לרוחב (treadWidth). כך ה-Top נשאר מלבן, אבל הרום/חזית מקבל פינות מעוגלות.
				const shape = roundedRectShape(run, treadThickness, r);
				const geo = new ExtrudeGeometry(shape, {
					depth: treadWidth,
					steps: 1,
					bevelEnabled: false,
				});
				// Extrude יוצא על ציר Z: נמרכז לרוחב סביב Z=0 כמו boxGeometry
				geo.translate(0, 0, -treadWidth / 2);
				geo.computeVertexNormals();

				// טקסטורה "יושבת" נכון על ה-Top ע"י משטח עליון נפרד עם UV רציף (כמו בדגם rect),
				// ולא ע"י שימוש ב-UV של ExtrudeGeometry (שמייצר חלוקה לפאות/סגמנטים).
				const topMat = (() => {
					if (useSolidMat) return <meshBasicMaterial color={solidTopColor} side={2} />;
					const ft = buildFaceTextures(run, treadWidth, rotTop);
					return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
				})();
				const sideMat = <meshBasicMaterial color={solidSideColor} side={2} polygonOffset polygonOffsetFactor={1} polygonOffsetUnits={1} />;

				return (
					<group key={idx} position={t.position} rotation={t.rotation}>
						{/* גוף/רום (פינות מעוגלות בחתך) */}
						<mesh geometry={geo} receiveShadow castShadow={materialKind !== 'metal'}>
							{sideMat}
						</mesh>

						{/* Top face עם UV רציף כדי שהטקסטורה לא תיראה "בחלקים" */}
						<mesh
							position={[0, treadThickness / 2 + 0.002, 0]}
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

