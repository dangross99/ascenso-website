import React from 'react';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw } from './boxShared';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
	const rampCount = treads.reduce((acc, tt) => acc + (tt.isLanding ? 0 : 1), 0);
	const denom = Math.max(1, rampCount - 1);
	let rampI = -1;

	return (
		<>
			{treads.map((t, idx) => {
				const run = t.run;
				const yaw = t.rotation[1] as number;
				const axisTop = axisFromYaw(yaw);
				const rotTop = (axisTop === 'z');

				// ההצטמצמות היא לאורך כל הגרם (לא בתוך כל מדרך): לכל מדרך עובי אחיד,
				// אבל ככל שמתקדמים במדרגות העובי יורד מ-12cm ל-5cm.
				// rampI מתקדם רק במדרגות (לא בפודסטים). פודסטים מקבלים את העובי של המדרך האחרון.
				if (!t.isLanding) rampI++;
				const rampIdx = Math.max(0, rampI);
				const k = rampIdx / denom;
				const th = lerp(thickStart, thin, k);
				// הזזת הגוף כדי שהטופ יישאר באותו גובה (לפי thickStart) למרות שעובי משתנה
				const yBody = (thickStart - th) / 2;

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
						<mesh position={[0, yBody, 0]} receiveShadow castShadow={materialKind !== 'metal'}>
							<boxGeometry args={[run, th, treadWidth]} />
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

