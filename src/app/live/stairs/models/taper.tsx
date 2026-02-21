import React from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw } from './boxShared';

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
	/** למצב L 0° / U – היפוך פנימי של הפאות (רק בתוך המודל, בלי לשנות Staircase3D) */
	shape?: 'straight' | 'L' | 'U';
	pathFlipped180?: boolean;
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
		shape,
	} = params;

	const thickStart = treadThickness;
	const thin = typeof thickEnd === 'number' ? thickEnd : 0.05;
	let stepIdx = 0;
	let landingIdx = 0;

	// כל tread עצמאי: t.mirror ו־t.bodyRotate180 מגיעים מ־pathModelConfig דרך Staircase3D (pathKey ייחודי לכל גרם/פודסט). אין לוגיקה מקומית.
	const quadGeo = (p0: [number, number, number], p1: [number, number, number], p2: [number, number, number], p3: [number, number, number], uvFor: (p: [number, number, number]) => [number, number]) => {
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
	};

	return (
		<>
			{treads.map((t, idx) => {
				const run = t.run;
				const yaw = t.rotation[1] as number;
				const axis = axisFromYaw(yaw);
				const rotTop = (axis === 'z');

				// ההצטמצמות היא לאורך כל הגרם (לא בתוך כל מדרך): לכל מדרך עובי אחיד,
				// כאן זה טייפר לרוחב: כל המדרגות זהות, 12cm בחוץ → 5cm בפנים.
				// חיבור בין גרמים: stepIdx גלובלי (כל המדרגות ברצף), אז שינוי מספר מדרגות בגרם אחד מזיז את האינדקס של הגרם השני ב־stepRailingSides.
				const curStepIdx = !t.isLanding ? (stepIdx++) : -1;
				const sidePref: Side = t.isLanding
					? (landingRailingSides?.[landingIdx] ?? 'right')
					: (stepRailingSides?.[curStepIdx] ?? 'right');
				if (t.isLanding) landingIdx++;

				// forwardSign לפי יאו בלבד; היפוך רק ב־bodyYaw למטה (מניעת כפילות – גרם ראשון ופודסט L0 דלתא יתהפכו)
				const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
				const forwardSignBase = axis === 'x' ? (cosY >= 0 ? 1 : -1) : (sinY >= 0 ? 1 : -1);
				const forwardSign = forwardSignBase as 1 | -1;
				let rightLocal: 1 | -1 = (axis === 'x' ? (cosY >= 0 ? -1 : 1) : (sinY >= 0 ? 1 : -1)) as 1 | -1;
				// פודסטים לאורך Z – היפוך כדי לשמור "פנימה" עקבי בין גרמים (כמו ב-boxShared)
				if (t.isLanding && axis === 'z') rightLocal = (rightLocal === 1 ? -1 : 1) as 1 | -1;
				// שים לב: stepRailingSide/landingRailingSide אצלנו מוגדרים כברירת מחדל כ*צד פנימי* (ראו LivePageInner.tsx).
				// לכן sidePref מייצג "פנים". החוץ הוא הצד ההפוך.
				const innerSignLocalRaw = (sidePref === 'right' ? rightLocal : (-rightLocal as 1 | -1)) as 1 | -1;
				// צד אחיד: finalInnerSign = innerSignLocalRaw ישירות (ללא בדיקת t.flight). השינוי הפיזי רק דרך Mirror חיצוני:
				// t.mirror ו־t.bodyRotate180 שמגיעים מה־Map ב־Staircase3D (pathModelConfig).
				const finalInnerSign = innerSignLocalRaw;
				const outerSignLocal = (-finalInnerSign as 1 | -1);
				const rotateFrontBack = (axis === 'x');
				const rotateSides = (axis === 'z');

				const matTop = (() => {
					// היפוך UV כמו בפאות הצד – כולל כשהגוף מסתובב (bodyRotate180) כדי שסיבי העץ יתהפכו עם הגוף
					const flipUTop = (forwardSign < 0) !== !!t.bodyRotate180;
					const ft = buildFaceTextures(run, treadWidth, rotTop, flipUTop);
					const metalness = materialKind === 'metal' ? 1 : 0;
					const roughness = materialKind === 'metal' ? 0.35 : materialKind === 'stone' ? 0.68 : 0.82;
					const envMapIntensity = useSolidMat ? (materialKind === 'metal' ? 2.0 : 1.5) : 0.2;
					if (useSolidMat) return (<meshStandardMaterial color={solidTopColor} side={2} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} />);
					return (
						<meshStandardMaterial
							color={'#ffffff'}
							map={ft.color}
							roughnessMap={ft.rough as any}
							bumpMap={ft.bump as any}
							bumpScale={materialKind === 'stone' ? 0.012 : 0.008}
							metalness={metalness}
							roughness={roughness}
							envMapIntensity={envMapIntensity}
							emissive="#ffffff"
							emissiveMap={ft.color}
							emissiveIntensity={0.1}
							side={2}
						/>
					);
				})();
				const matBottom = (() => {
					const ft = buildFaceTextures(run, treadWidth, rotTop);
					const metalness = materialKind === 'metal' ? 1 : 0;
					const roughness = materialKind === 'metal' ? 0.35 : materialKind === 'stone' ? 0.68 : 0.82;
					const envMapIntensity = useSolidMat ? (materialKind === 'metal' ? 2.0 : 1.5) : 0.2;
					if (useSolidMat) return (<meshStandardMaterial color={solidSideColor} side={2} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
					return (
						<meshStandardMaterial
							color={'#ffffff'}
							map={ft.color}
							roughnessMap={ft.rough as any}
							bumpMap={ft.bump as any}
							bumpScale={materialKind === 'stone' ? 0.012 : 0.008}
							metalness={metalness}
							roughness={roughness}
							envMapIntensity={envMapIntensity}
							emissive="#ffffff"
							emissiveMap={ft.color}
							emissiveIntensity={0.1}
							side={2}
							polygonOffset
							polygonOffsetFactor={-1}
							polygonOffsetUnits={-1}
						/>
					);
				})();
				const matFrontBack = (flipU: boolean = false) => {
					const ft = buildFaceTextures(treadWidth, thickStart, rotateFrontBack, flipU);
					const metalness = materialKind === 'metal' ? 1 : 0;
					const roughness = materialKind === 'metal' ? 0.35 : materialKind === 'stone' ? 0.68 : 0.82;
					const envMapIntensity = useSolidMat ? (materialKind === 'metal' ? 2.0 : 1.5) : 0.2;
					if (useSolidMat) return (<meshStandardMaterial color={solidSideColor} side={2} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
					return (
						<meshStandardMaterial
							color={'#ffffff'}
							map={ft.color}
							roughnessMap={ft.rough as any}
							bumpMap={ft.bump as any}
							bumpScale={materialKind === 'stone' ? 0.012 : 0.008}
							metalness={metalness}
							roughness={roughness}
							envMapIntensity={envMapIntensity}
							emissive="#ffffff"
							emissiveMap={ft.color}
							emissiveIntensity={0.1}
							side={2}
							polygonOffset
							polygonOffsetFactor={-1}
							polygonOffsetUnits={-1}
						/>
					);
				};
				const matSides = (flipU: boolean = false) => {
					const ft = buildFaceTextures(run, thickStart, rotateSides, flipU);
					const metalness = materialKind === 'metal' ? 1 : 0;
					const roughness = materialKind === 'metal' ? 0.35 : materialKind === 'stone' ? 0.68 : 0.82;
					const envMapIntensity = useSolidMat ? (materialKind === 'metal' ? 2.0 : 1.5) : 0.2;
					if (useSolidMat) return (<meshStandardMaterial color={solidSideColor} side={2} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} polygonOffset polygonOffsetFactor={-1} polygonOffsetUnits={-1} />);
					return (
						<meshStandardMaterial
							color={'#ffffff'}
							map={ft.color}
							roughnessMap={ft.rough as any}
							bumpMap={ft.bump as any}
							bumpScale={materialKind === 'stone' ? 0.012 : 0.008}
							metalness={metalness}
							roughness={roughness}
							envMapIntensity={envMapIntensity}
							emissive="#ffffff"
							emissiveMap={ft.color}
							emissiveIntensity={0.1}
							side={2}
							polygonOffset
							polygonOffsetFactor={-1}
							polygonOffsetUnits={-1}
						/>
					);
				};

				// Geometry points (local) – finalInnerSign מגדיר איזה צד עבה/דק; mirror מחליף בין zOuter ל-zInner.
				// מקור אמת יחיד: pathModelConfig דרך Staircase3D – אין לוגיקה מקומית, רק t.mirror / t.bodyRotate180.
				const effectiveMirror = t.mirror ?? false;
				const dx = run / 2;
				const dz = treadWidth / 2;
				const baseZOuter = -finalInnerSign * dz;
				const baseZInner = finalInnerSign * dz;
				const zOuter = effectiveMirror ? baseZInner : baseZOuter;
				const zInner = effectiveMirror ? baseZOuter : baseZInner;
				const yTop = thickStart / 2;
				const yBotOuter = yTop - thickStart;
				const yBotInner = yTop - thin;

				// Bottom (sloped across width)
				const geoBottom = quadGeo(
					[-dx, yBotOuter, zOuter],
					[ dx, yBotOuter, zOuter],
					[ dx, yBotInner, zInner],
					[-dx, yBotInner, zInner],
					(p) => [(p[0] + dx) / run, (p[2] + dz) / (2 * dz)],
				);

				// Front/back trapezoids (use Z for U, Y for V)
				const geoFront = quadGeo(
					[ dx, yTop, zOuter],
					[ dx, yTop, zInner],
					[ dx, yBotInner, zInner],
					[ dx, yBotOuter, zOuter],
					(p) => [(p[2] + dz) / (2 * dz), (p[1] - yBotOuter) / thickStart],
				);
				const geoBack = quadGeo(
					[-dx, yTop, zInner],
					[-dx, yTop, zOuter],
					[-dx, yBotOuter, zOuter],
					[-dx, yBotInner, zInner],
					(p) => [(p[2] + dz) / (2 * dz), (p[1] - yBotOuter) / thickStart],
				);

				// Outer/inner sides (rectangles)
				const geoOuter = quadGeo(
					[-dx, yTop, zOuter],
					[ dx, yTop, zOuter],
					[ dx, yBotOuter, zOuter],
					[-dx, yBotOuter, zOuter],
					(p) => [(p[0] + dx) / run, (p[1] - yBotOuter) / thickStart],
				);
				const geoInner = quadGeo(
					[-dx, yTop, zInner],
					[ dx, yTop, zInner],
					[ dx, yBotInner, zInner],
					[-dx, yBotInner, zInner],
					(p) => [(p[0] + dx) / run, (p[1] - yBotOuter) / thickStart],
				);

				// סיבוב גוף 180° – מהתצורה (pathModelConfig). פודסט דלתא L0: גיבוי לפי pathKey אם bodyRotate180 לא הועבר
				const bodyYaw = (t.pathKey === 'L_0_landing' || t.bodyRotate180) ? Math.PI : 0;
				return (
					<group key={idx} position={t.position} rotation={t.rotation}>
						<group rotation={[0, bodyYaw, 0]}>
							{/* Bottom */}
							<mesh geometry={geoBottom} receiveShadow castShadow={materialKind !== 'metal'}>
								{matBottom}
							</mesh>

							{/* Front / Back */}
							<mesh geometry={geoFront} receiveShadow castShadow={materialKind !== 'metal'}>
								{matFrontBack(forwardSign < 0)}
							</mesh>
							<mesh geometry={geoBack} receiveShadow castShadow={materialKind !== 'metal'}>
								{matFrontBack(forwardSign > 0)}
							</mesh>

							{/* Outer / Inner sides */}
							<mesh geometry={geoOuter} receiveShadow castShadow={materialKind !== 'metal'}>
								{matSides(forwardSign < 0)}
							</mesh>
							<mesh geometry={geoInner} receiveShadow castShadow={materialKind !== 'metal'}>
								{matSides(forwardSign > 0)}
							</mesh>

							{/* Top face עם UV רציף */}
							<mesh
								position={[0, thickStart / 2 + 0.002, 0]}
								castShadow={materialKind !== 'metal'}
								receiveShadow={materialKind !== 'metal'}
							>
								<boxGeometry args={[run, 0.004, treadWidth]} />
								{matTop}
							</mesh>
						</group>
					</group>
				);
			})}
		</>
	);
}

