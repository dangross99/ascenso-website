import React from 'react';
import { Text } from '@react-three/drei';
import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw, computeLocalFrame, getInnerIsRight, HitechVertexLabels } from './boxShared';

export function buildRectTreads(params: {
	treads: Tread[];
	materialKind: 'wood' | 'metal' | 'stone';
	useSolidMat: boolean;
	solidTopColor: string;
	solidSideColor: string;
	buildFaceTextures: BuildFaceTextures;
	treadThickness: number;
	treadWidth: number;
	stepRailingSides?: Array<Side>;
	landingRailingSides?: Array<Side>;
	hitech?: boolean;
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
		stepRailingSides,
		landingRailingSides,
		hitech = false,
	} = params;

	let stepIdx = 0;
	let landingIdx = 0;

	return (
		<>
			{treads.map((t, idx) => (
				<group key={idx} position={t.position} rotation={t.rotation}>
					{/* בסיס: בדגם rect מצוירות פאות בנפרד; לא יוצרים קוביה מלאה כדי להימנע מזי-פייטינג */}
					{null}

					{/* שכבת פני השטח */}
					<mesh
						position={[0, (treadThickness / 2 + 0.002), 0]}
						castShadow={materialKind !== 'metal'}
						receiveShadow={materialKind !== 'metal'}
					>
						<boxGeometry args={[t.run, 0.004, treadWidth]} />
						{materialKind === 'wood' ? (
							(() => {
								const axisTop = axisFromYaw(t.rotation[1] as number);
								// Top: טקסטורה יציבה לפי ציר בלבד (ללא flip), כדי לא "להתהפך" בין גרמים
								const ft = buildFaceTextures(t.run, treadWidth, axisTop === 'z');
								return (
									<meshStandardMaterial
										color={'#ffffff'}
										map={ft.color}
										roughnessMap={ft.rough as any}
										bumpMap={ft.bump as any}
										bumpScale={0.008}
										metalness={0}
										roughness={0.82}
										envMapIntensity={0.25}
										side={2}
									/>
								);
							})()
						) : (
							(() => {
								const metalness = materialKind === 'metal' ? 1 : 0;
								const roughness = materialKind === 'metal' ? 0.35 : materialKind === 'stone' ? 0.68 : 0.82;
								const envMapIntensity = materialKind === 'metal' ? 0.75 : 0.25;
								if (useSolidMat) return (<meshStandardMaterial color={solidTopColor} side={2} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} />);
								const axisTop = axisFromYaw(t.rotation[1] as number);
								const ft = buildFaceTextures(t.run, treadWidth, axisTop === 'z');
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
										side={2}
									/>
								);
							})()
						)}
					</mesh>

					{/* BOTTOM face */}
					<mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -treadThickness / 2 - 0.0005, 0]} receiveShadow>
						<planeGeometry args={[t.run, treadWidth, 8, 8]} />
						{(() => {
							const axisBottom = axisFromYaw(t.rotation[1] as number);
							const ft = buildFaceTextures(t.run, treadWidth, axisBottom === 'z');
							const metalness = materialKind === 'metal' ? 1 : 0;
							const roughness = materialKind === 'metal' ? 0.35 : materialKind === 'stone' ? 0.68 : 0.82;
							const envMapIntensity = materialKind === 'metal' ? 0.75 : 0.25;
							if (useSolidMat) return (<meshStandardMaterial color={solidSideColor} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} />);
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
								/>
							);
						})()}
					</mesh>

					{/* FRONT/BACK and SIDES */}
					{(() => {
						const curStepIdx = !t.isLanding ? (stepIdx++) : -1;
						const yaw = t.rotation[1] as number;
						const axis = axisFromYaw(yaw);
						const innerIsRight = getInnerIsRight({ t, curStepIdx, stepRailingSides, landingRailingSides, landingIdx });
						if (t.isLanding) landingIdx++;

						const { forwardSign, innerSignLocal, rotateFrontBack, rotateSides } = computeLocalFrame({
							yaw,
							isLanding: t.isLanding,
							flight: t.flight,
							axis,
							innerIsRight,
						});

						const matFrontBack = (flipU: boolean = false) => {
							const ft = buildFaceTextures(treadWidth, treadThickness, rotateFrontBack, flipU);
							const metalness = materialKind === 'metal' ? 1 : 0;
							const roughness = materialKind === 'metal' ? 0.22 : materialKind === 'stone' ? 0.55 : 0.7;
							const envMapIntensity = materialKind === 'metal' ? 1.35 : 0.9;
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
									side={2}
									polygonOffset
									polygonOffsetFactor={-1}
									polygonOffsetUnits={-1}
								/>
							);
						};
						const matSides = (flipU: boolean = false) => {
							const ft = buildFaceTextures(t.run, treadThickness, rotateSides, flipU);
							const metalness = materialKind === 'metal' ? 1 : 0;
							const roughness = materialKind === 'metal' ? 0.22 : materialKind === 'stone' ? 0.55 : 0.7;
							const envMapIntensity = materialKind === 'metal' ? 1.35 : 0.9;
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
									side={2}
									polygonOffset
									polygonOffsetFactor={-1}
									polygonOffsetUnits={-1}
								/>
							);
						};

						const frontRotY = forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2;
						const backRotY = -frontRotY;
						const eps = 0.0008;
						const frontX = forwardSign * (t.run / 2) + forwardSign * eps;
						const backX = -forwardSign * (t.run / 2) - forwardSign * eps;

						return (
							<>
								<mesh rotation={[0, frontRotY, 0]} position={[frontX, 0, 0]} receiveShadow>
									<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
									{matFrontBack(forwardSign < 0)}
								</mesh>
								<mesh rotation={[0, backRotY, 0]} position={[backX, 0, 0]} receiveShadow>
									<planeGeometry args={[treadWidth, treadThickness, 8, 8]} />
									{matFrontBack(forwardSign > 0)}
								</mesh>
								<mesh rotation={[0, 0, 0]} position={[0, 0, treadWidth / 2 + eps]} receiveShadow>
									<planeGeometry args={[t.run, treadThickness, 8, 8]} />
									{matSides(forwardSign < 0)}
								</mesh>
								<mesh rotation={[0, Math.PI, 0]} position={[0, 0, -treadWidth / 2 - eps]} receiveShadow>
									<planeGeometry args={[t.run, treadThickness, 8, 8]} />
									{matSides(forwardSign > 0)}
								</mesh>
								{/* תיוג 2=פנימי, 3=חיצוני (כבוי כברירת מחדל) */}
								{false && (
									<>
										<Text position={[0, 0, innerSignLocal * (treadWidth / 2 + 0.004)]} rotation={[0, innerSignLocal > 0 ? 0 : Math.PI, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">2</Text>
										<Text position={[0, 0, -innerSignLocal * (treadWidth / 2 + 0.004)]} rotation={[0, innerSignLocal > 0 ? Math.PI : 0, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">3</Text>
									</>
								)}
							</>
						);
					})()}

					{hitech ? <HitechVertexLabels t={t} treadThickness={treadThickness} treadWidth={treadWidth} /> : null}
				</group>
			))}
		</>
	);
}

