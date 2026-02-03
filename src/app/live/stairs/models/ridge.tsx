import React from 'react';
import { Text } from '@react-three/drei';
import { BufferGeometry, Float32BufferAttribute } from 'three';

import type { Side, Tread, BuildFaceTextures } from './boxShared';
import { axisFromYaw, computeLocalFrame, getInnerIsRight, HitechVertexLabels } from './boxShared';

export function buildRidgeTreads(params: {
	treads: Tread[];
	useSolidMat: boolean;
	solidTopColor: string;
	solidSideColor: string;
	buildFaceTextures: BuildFaceTextures;
	treadThickness: number;
	treadWidth: number;
	stepRailingSides?: Array<Side>;
	landingRailingSides?: Array<Side>;
	debugLabels?: boolean;
	hitech?: boolean;
}) {
	const {
		treads,
		useSolidMat,
		solidTopColor,
		solidSideColor,
		buildFaceTextures,
		treadThickness,
		treadWidth,
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
						const backTh = treadThickness;
						const frontEdgeTh = backTh;
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

						const axis = axisFromYaw(yaw);
						const { forwardSign, innerSignLocal } = computeLocalFrame({
							yaw,
							isLanding: t.isLanding,
							flight: t.flight,
							axis,
							innerIsRight,
						});

						const xFront = forwardSign * (t.run / 2);
						const xBack = -forwardSign * (t.run / 2);
						const zRight = innerSignLocal * (treadWidth / 2 + seam);
						const zLeft = -zRight;
						const yTop = topY;
						const yBottomBack = yTop - backTh - seam;
						const yBottomFrontEdge = yTop - frontEdgeTh - seam;

						const faceMat = (dimU: number, dimV: number, rot: boolean, flipU: boolean = false, flipV: boolean = false) => {
							if (useSolidMat) return <meshBasicMaterial color={solidSideColor} side={2} />;
							const ft = buildFaceTextures(dimU, dimV, rot, flipU, flipV);
							return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
						};

						const front = (
							<mesh rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} position={[xFront + forwardSign * 0.0005, (yTop + yBottomFrontEdge) / 2, 0]} receiveShadow>
								<planeGeometry args={[treadWidth + seam * 2, frontEdgeTh + seam * 2, 8, 2]} />
								{faceMat(treadWidth, frontEdgeTh, axis === 'x', forwardSign < 0)}
							</mesh>
						);
						const frontMark = debugLabels ? (
							<Text position={[xFront + forwardSign * 0.004, (yTop + yBottomFrontEdge) / 2, 0]} rotation={[0, forwardSign > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">1</Text>
						) : null;
						const backMark = debugLabels ? (
							<Text position={[xBack - forwardSign * 0.004, (yTop + yBottomBack) / 2, 0]} rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">4</Text>
						) : null;
						const sideCenterY = (yTop + yBottomBack) / 2;
						const rightMark = debugLabels ? (
							<Text position={[0, sideCenterY, zRight + 0.004]} rotation={[0, 0, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">2</Text>
						) : null;
						const leftMark = debugLabels ? (
							<Text position={[0, sideCenterY, zLeft - 0.004]} rotation={[0, Math.PI, 0]} fontSize={0.08} color="#111111" anchorX="center" anchorY="middle">3</Text>
						) : null;

						const bottom = (() => {
							const A = [xFront, yBottomFrontEdge, zLeft] as const;
							const B = [xFront, yBottomFrontEdge, zRight] as const;
							const D = [xBack, yBottomBack, zLeft] as const;
							const E = [xBack, yBottomBack, zRight] as const;
							const one = [ (A[0] + D[0]) / 2, (yTop - 0.11 - seam), (A[2] + D[2]) / 2 ] as const;

							const pos = new Float32Array([
								...A, ...D, ...one,
								...A, ...one, ...B,
								...one, ...D, ...E,
								...one, ...E, ...B,
							]);
							const g2 = new BufferGeometry();
							g2.setAttribute('position', new Float32BufferAttribute(pos, 3));
							const uv = new Float32Array([
								0,0, 1,0, 0.5,0.5,
								0,0, 0.5,0.5, 0,1,
								0.5,0.5, 1,0, 1,1,
								0.5,0.5, 1,1, 0,1,
							]);
							g2.setAttribute('uv', new Float32BufferAttribute(uv, 2));
							g2.computeVertexNormals();
							return <mesh geometry={g2} receiveShadow>{faceMat(t.run, treadWidth, axis === 'z', forwardSign < 0)}</mesh>;
						})();

						const back = (
							<mesh rotation={[0, forwardSign > 0 ? Math.PI / 2 : -Math.PI / 2, 0]} position={[xBack - forwardSign * 0.0005, (yTop + yBottomBack)/2, 0]} receiveShadow>
								<planeGeometry args={[treadWidth + seam * 2, backTh + seam * 2, 8, 2]} />
								{faceMat(treadWidth, backTh, axis === 'x')}
							</mesh>
						);
						const sideRight = (
							<mesh rotation={[0, 0, 0]} position={[0, 0, zRight]} receiveShadow>
								<planeGeometry args={[t.run, backTh, 8, 2]} />
								{faceMat(t.run, backTh, axis === 'x')}
							</mesh>
						);
						const sideLeft = (
							<mesh rotation={[0, Math.PI, 0]} position={[0, 0, zLeft]} receiveShadow>
								<planeGeometry args={[t.run, backTh, 8, 2]} />
								{faceMat(t.run, backTh, axis === 'x')}
							</mesh>
						);

						const geomGroup = (
							<group rotation={[0, (t.flight === 0 ? Math.PI : 0), 0]}>
								{front}{bottom}{back}{sideRight}{sideLeft}
							</group>
						);
						return <group>{geomGroup}{frontMark}{backMark}{rightMark}{leftMark}</group>;
					})()}

					{/* שכבת פני השטח */}
					<mesh position={[0, (treadThickness / 2 + 0.0005), 0]} castShadow receiveShadow>
						<boxGeometry args={[t.run, 0.004, treadWidth]} />
						{(() => {
							if (useSolidMat) return (<meshBasicMaterial color={solidTopColor} side={2} />);
							const axisTop = axisFromYaw(t.rotation[1] as number);
							const ft = buildFaceTextures(t.run, treadWidth, axisTop === 'z');
							return (<meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />);
						})()}
					</mesh>

					{hitech ? <HitechVertexLabels t={t} treadThickness={treadThickness} treadWidth={treadWidth} /> : null}
				</group>
			))}
		</>
	);
}

