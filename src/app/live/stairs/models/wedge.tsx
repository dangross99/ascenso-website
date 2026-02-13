import React from 'react';
import { Text } from '@react-three/drei';
import { BufferGeometry, Float32BufferAttribute } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw, computeLocalFrame, getInnerIsRight, HitechVertexLabels } from './boxShared';

export function buildWedgeTreads(params: {
	treads: Tread[];
	materialKind: 'wood' | 'metal' | 'stone';
	useSolidMat: boolean;
	solidTopColor: string;
	solidSideColor: string;
	buildFaceTextures: BuildFaceTextures;

	treadThickness: number;
	treadWidth: number;

	wedgeFrontFraction?: number;
	wedgeFrontThicknessM?: number;

	stepRailingSides?: Array<Side>;
	landingRailingSides?: Array<Side>;

	debugLabels?: boolean;
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
		wedgeFrontFraction,
		wedgeFrontThicknessM,
		stepRailingSides,
		landingRailingSides,
		debugLabels = false,
		hitech = false,
	} = params;

	let stepIdx = 0;
	let landingIdx = 0;

	return (
		<>
			{treads.map((t, idx) => (
				<group key={idx} position={t.position} rotation={t.rotation}>
					{(() => {
						const curStepIdx = !t.isLanding ? (stepIdx++) : -1;
						const topY = treadThickness / 2;
						const frontFrac = Math.max(0.1, Math.min(0.9, typeof wedgeFrontFraction === 'number' ? wedgeFrontFraction : 0.35));
						const desiredFront = typeof wedgeFrontThicknessM === 'number' ? wedgeFrontThicknessM : (treadThickness * frontFrac);
						const frontTh = Math.max(0.01, Math.min(treadThickness - 0.005, desiredFront));
						const seam = 0.001;
						const yaw = t.rotation[1] as number;
						const innerIsRight = getInnerIsRight({
							t,
							curStepIdx,
							stepRailingSides,
							landingRailingSides,
							landingIdx,
						});
						if (t.isLanding) landingIdx++;

						const axisFromYawLocal = axisFromYaw(yaw);
						const { forwardSign, innerSignLocal } = computeLocalFrame({
							yaw,
							isLanding: t.isLanding,
							flight: t.flight,
							axis: axisFromYawLocal,
							innerIsRight,
						});

						const xFront = forwardSign * (t.run / 2);
						const xBack = -forwardSign * (t.run / 2);
						const zRight = innerSignLocal * (treadWidth / 2 + seam);
						const zLeft = -zRight;
						const yTop = topY;
						const yBottomBack = yTop - treadThickness - seam;
						const yBottomFront = yTop - frontTh - seam;

						const faceMat = (dimU: number, dimV: number, rot: boolean, flipU: boolean = false, flipV: boolean = false) => {
							const ft = buildFaceTextures(dimU, dimV, rot, flipU, flipV);
							const metalness = materialKind === 'metal' ? 1 : 0;
							const roughness = materialKind === 'metal' ? 0.22 : materialKind === 'stone' ? 0.55 : 0.7;
							const envMapIntensity = materialKind === 'metal' ? 1.35 : 0.9;
							if (useSolidMat) return <meshStandardMaterial color={solidSideColor} side={2} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} />;
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
						};

						const yCenterFront = (yTop + yBottomFront) / 2;
						const yCenterBack = (yTop + yBottomBack) / 2;

						const front = (
							<mesh key="front" rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} position={[xFront + forwardSign * 0.0005, yCenterFront, 0]} receiveShadow>
								<planeGeometry args={[treadWidth + seam * 2, frontTh + seam * 2, 8, 2]} />
								{faceMat(treadWidth, frontTh, axisFromYawLocal === 'x', forwardSign < 0)}
							</mesh>
						);
						const frontMark = debugLabels ? (
							<Text position={[xFront + forwardSign * 0.004, yCenterFront, 0]} rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">1</Text>
						) : null;
						const backMark = debugLabels ? (
							<Text position={[xBack - forwardSign * 0.004, yCenterBack, 0]} rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">4</Text>
						) : null;
						const sideCenterY = (yTop + Math.min(yBottomBack, yBottomFront)) / 2;
						const rightMark = debugLabels ? (
							<Text position={[0, sideCenterY, zRight + 0.004]} rotation={[0, 0, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">2</Text>
						) : null;
						const leftMark = debugLabels ? (
							<Text position={[0, sideCenterY, zLeft - 0.004]} rotation={[0, Math.PI, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">3</Text>
						) : null;

						const back = (
							<mesh key="back" rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} position={[xBack - forwardSign * 0.0005, yCenterBack, 0]} receiveShadow>
								<planeGeometry args={[treadWidth + seam * 2, treadThickness + seam * 2, 8, 2]} />
								{faceMat(treadWidth, treadThickness, axisFromYawLocal === 'x', forwardSign > 0)}
							</mesh>
						);

						const rightGeom = new BufferGeometry();
						rightGeom.setAttribute('position', new Float32BufferAttribute([
							xFront, yBottomFront, zRight,
							xBack,  yBottomBack,  zRight,
							xFront, yTop + seam,  zRight,
							xBack,  yTop + seam,  zRight,
						], 3));
						rightGeom.setIndex([0,1,2,2,1,3]);
						rightGeom.setAttribute('uv', new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2));
						rightGeom.computeVertexNormals();
						const right = (
							<mesh key="right" geometry={rightGeom} receiveShadow>
								{faceMat(t.run, (treadThickness + frontTh) / 2, axisFromYawLocal === 'x', forwardSign < 0)}
							</mesh>
						);

						const leftGeom = new BufferGeometry();
						leftGeom.setAttribute('position', new Float32BufferAttribute([
							xBack,  yBottomBack,  zLeft,
							xFront, yBottomFront, zLeft,
							xBack,  yTop + seam,  zLeft,
							xFront, yTop + seam,  zLeft,
						], 3));
						leftGeom.setIndex([0,1,2,2,1,3]);
						leftGeom.setAttribute('uv', new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2));
						leftGeom.computeVertexNormals();
						const left = (
							<mesh key="left" geometry={leftGeom} receiveShadow>
								{faceMat(t.run, (treadThickness + frontTh) / 2, axisFromYawLocal === 'x', forwardSign > 0)}
							</mesh>
						);

						const bottomGeom = new BufferGeometry();
						bottomGeom.setAttribute('position', new Float32BufferAttribute([
							xFront, yBottomFront - seam, zLeft,
							xBack,  yBottomBack - seam,  zLeft,
							xFront, yBottomFront - seam, zRight,
							xBack,  yBottomBack - seam,  zRight,
						], 3));
						bottomGeom.setIndex([0,1,2,2,1,3]);
						bottomGeom.setAttribute('uv', new Float32BufferAttribute([0,0, 1,0, 0,1, 1,1], 2));
						bottomGeom.computeVertexNormals();
						const bottom = (
							<mesh key="bottom" geometry={bottomGeom} receiveShadow>
								{faceMat(t.run, treadWidth, axisFromYawLocal === 'z')}
							</mesh>
						);

						const geomGroup = (
							<group rotation={[0, Math.PI, 0]}>
								{front}{back}{right}{left}{bottom}
							</group>
						);

						return <group>{geomGroup}{frontMark}{backMark}{rightMark}{leftMark}</group>;
					})()}

					{/* שכבת פני השטח */}
					<mesh
						position={[0, (treadThickness / 2 + 0.0005), 0]}
						castShadow={materialKind !== 'metal'}
						receiveShadow={materialKind !== 'metal'}
					>
						<boxGeometry args={[t.run, 0.004, treadWidth]} />
						{materialKind === 'wood' ? (
							(() => {
								const axisTop = axisFromYaw(t.rotation[1] as number);
								const ft = buildFaceTextures(t.run, treadWidth, axisTop === 'z');
								return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
							})()
						) : (
							(() => {
								if (useSolidMat) return (<meshBasicMaterial color={solidTopColor} side={2} />);
								const axisTop = axisFromYaw(t.rotation[1] as number);
								const ft = buildFaceTextures(t.run, treadWidth, axisTop === 'z');
								return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
							})()
						)}
					</mesh>

					{hitech ? <HitechVertexLabels t={t} treadThickness={treadThickness} treadWidth={treadWidth} /> : null}
				</group>
			))}
		</>
	);
}

