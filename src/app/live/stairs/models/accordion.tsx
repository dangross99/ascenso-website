import React from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';

export function buildAccordionFlightsOpenPlates(params: {
	treads: Array<{ flight: number; isLanding?: boolean; position: [number, number, number]; rotation: [number, number, number]; run: number }>;
	treadWidth: number;
	treadDepth: number;
	treadThickness: number;
	useSolidMat: boolean;
	solidSideColor: string;
	buildFaceTextures: (dimU: number, dimV: number, rotate90?: boolean, flipU?: boolean, flipV?: boolean) => { color: any };
}): React.ReactElement {
	const { treads, treadWidth, treadDepth, treadThickness, useSolidMat, solidSideColor, buildFaceTextures } = params;
	const out: React.ReactNode[] = [];
	const thick = 0.04; // 40mm
	const tHalf = thick / 2;
	const halfW = treadWidth / 2;
	const axisFromYaw = (yaw: number): 'x' | 'z' => (Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z');
	const faceMat = (dimU: number, dimV: number, rot: boolean, flipU: boolean = false, flipV: boolean = false) => {
		if (useSolidMat) return <meshBasicMaterial color={solidSideColor} side={2} />;
		const ft = buildFaceTextures(dimU, dimV, rot, flipU, flipV);
		return <meshBasicMaterial color={'#ffffff'} map={ft.color} side={2} />;
	};

	// === Treads (per flight yaw, for stable orientation) ===
	const flights = Array.from(new Set(treads.map(tt => tt.flight))).sort((a, b) => a - b);
	for (const flightIdx of flights) {
		const ftAll = treads.filter(tt => tt.flight === flightIdx);
		if (!ftAll.length) continue;

		// forward (XZ) יציב לגרם
		let fx = 1, fz = 0;
		if (ftAll.length >= 2) {
			const dx = ftAll[1].position[0] - ftAll[0].position[0];
			const dz = ftAll[1].position[2] - ftAll[0].position[2];
			const hm = Math.hypot(dx, dz);
			if (hm > 1e-6) {
				fx = dx / hm;
				fz = dz / hm;
			} else {
				const yaw0 = (ftAll[0].rotation[1] as number) || 0;
				fx = Math.cos(yaw0);
				fz = Math.sin(yaw0);
			}
		} else {
			const yaw0 = (ftAll[0].rotation[1] as number) || 0;
			fx = Math.cos(yaw0);
			fz = Math.sin(yaw0);
		}
		const yaw = Math.atan2(fz, fx);
		const axisAcc = axisFromYaw(yaw);
		const rotTop = (axisAcc === 'z');

		for (let i = 0; i < ftAll.length; i++) {
			const cur = ftAll[i];
			const run = cur.run || treadDepth;
			const yTop = cur.position[1] + treadThickness / 2;
			const yCenter = yTop - tHalf;
			out.push(
				<mesh key={`acc-tread-${flightIdx}-${i}`} position={[cur.position[0], yCenter, cur.position[2]]} rotation={[0, yaw, 0]} receiveShadow>
					<boxGeometry args={[run, thick, treadWidth]} />
					{faceMat(run, treadWidth, rotTop)}
				</mesh>
			);
		}
	}

	// === Risers + Miter planes (pairwise across entire sequence; includes landing -> next flight) ===
	for (let i = 0; i < treads.length - 1; i++) {
		const cur = treads[i];
		const next = treads[i + 1];

		const yTop = cur.position[1] + treadThickness / 2;
		const yTopN = next.position[1] + treadThickness / 2;
		const rise = yTopN - yTop;
		if (Math.abs(rise) < 1e-6) continue;

		// forward direction for this transition (use next-cur in XZ; fallback to yaw)
		let fx = 1, fz = 0;
		{
			const dx = next.position[0] - cur.position[0];
			const dz = next.position[2] - cur.position[2];
			const hm = Math.hypot(dx, dz);
			if (hm > 1e-6) {
				fx = dx / hm;
				fz = dz / hm;
			} else {
				const yaw0 = (cur.rotation[1] as number) || 0;
				fx = Math.cos(yaw0);
				fz = Math.sin(yaw0);
			}
		}
		const yaw = Math.atan2(fz, fx);
		const rx = -fz, rz = fx; // right = cross(Up, forward)
		const axisAcc = axisFromYaw(yaw);
		const rotFrontBack = (axisAcc === 'x');

		const run = cur.run || treadDepth;
		const frontX = cur.position[0] + fx * (run / 2);
		const frontZ = cur.position[2] + fz * (run / 2);

		// riser plate
		const riserCenterX = frontX - fx * tHalf;
		const riserCenterZ = frontZ - fz * tHalf;
		const yMid = (yTop + yTopN) / 2;
		out.push(
			<mesh key={`acc-riser-${cur.flight}-${i}`} position={[riserCenterX, yMid, riserCenterZ]} rotation={[0, yaw, 0]} receiveShadow>
				<boxGeometry args={[thick, Math.abs(rise), treadWidth]} />
				{faceMat(treadWidth, Math.abs(rise), rotFrontBack)}
			</mesh>
		);

		// miter plane (quad)
		const aL: [number, number, number] = [frontX + rx * (-halfW), yTop - thick, frontZ + rz * (-halfW)];
		const aR: [number, number, number] = [frontX + rx * (halfW), yTop - thick, frontZ + rz * (halfW)];
		const bBaseX = frontX - fx * thick;
		const bBaseZ = frontZ - fz * thick;
		const bL: [number, number, number] = [bBaseX + rx * (-halfW), yTop, bBaseZ + rz * (-halfW)];
		const bR: [number, number, number] = [bBaseX + rx * (halfW), yTop, bBaseZ + rz * (halfW)];
		const g = new BufferGeometry();
		g.setAttribute('position', new Float32BufferAttribute([
			aL[0], aL[1], aL[2],
			bL[0], bL[1], bL[2],
			bR[0], bR[1], bR[2],
			aR[0], aR[1], aR[2],
		], 3));
		g.setAttribute('uv', new Float32BufferAttribute([
			0, 0,
			0, 1,
			1, 1,
			1, 0,
		], 2));
		g.setIndex([0, 1, 2, 0, 2, 3]);
		g.computeVertexNormals();
		out.push(
			<mesh key={`acc-miter-${cur.flight}-${i}`} geometry={g} receiveShadow>
				{faceMat(treadWidth, thick * Math.SQRT2, rotFrontBack)}
			</mesh>
		);
	}

	return <group>{out}</group>;
}
