import React from 'react';
import { ExtrudeGeometry, Float32BufferAttribute, Shape } from 'three';

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

function applyProjectedUVsForBoxLike(geo: ExtrudeGeometry, dims: { run: number; thickness: number; width: number }, rotateTop90: boolean) {
	const pos = geo.getAttribute('position');
	const norm = geo.getAttribute('normal');
	if (!pos || !norm) return;
	const uvs = new Float32Array(pos.count * 2);
	const run = dims.run || 1;
	const th = dims.thickness || 1;
	const w = dims.width || 1;

	for (let i = 0; i < pos.count; i++) {
		const x = (pos as any).getX(i) as number;
		const y = (pos as any).getY(i) as number;
		const z = (pos as any).getZ(i) as number;
		const nx = Math.abs((norm as any).getX(i) as number);
		const ny = Math.abs((norm as any).getY(i) as number);
		const nz = Math.abs((norm as any).getZ(i) as number);

		let u = 0, v = 0;
		if (ny >= nx && ny >= nz) {
			// Top/Bottom: XZ projection
			u = (x / run) + 0.5;
			v = (z / w) + 0.5;
			if (rotateTop90) {
				const tmp = u; u = v; v = tmp;
			}
		} else if (nz >= nx && nz >= ny) {
			// Side faces (±Z): XY projection
			u = (x / run) + 0.5;
			v = (y / th) + 0.5;
		} else {
			// Front/Back faces (±X): ZY projection
			u = (z / w) + 0.5;
			v = (y / th) + 0.5;
		}

		uvs[i * 2 + 0] = u;
		uvs[i * 2 + 1] = v;
	}

	geo.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
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
				applyProjectedUVsForBoxLike(geo, { run, thickness: treadThickness, width: treadWidth }, rotTop);

				// חומר יחיד לכל ה-Extrude (Top + Sides + פינות מעוגלות) – אותן הגדרות לכל הפאות.
				// ה-UV נקבעים ע"י applyProjectedUVsForBoxLike כדי למנוע מראה מפורק.
				const matAll = (() => {
					const metalness = materialKind === 'metal' ? 1 : 0;
					const roughness = materialKind === 'metal' ? 0.35 : materialKind === 'stone' ? 0.68 : 0.82;
					const envMapIntensity = useSolidMat ? (materialKind === 'metal' ? 2.0 : 1.5) : 0.2;
					if (useSolidMat) return <meshStandardMaterial color={solidTopColor || solidSideColor} side={2} metalness={metalness} roughness={roughness} envMapIntensity={envMapIntensity} />;
					const ft = buildFaceTextures(run, treadWidth, rotTop);
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

				return (
					<group key={idx} position={t.position} rotation={t.rotation}>
						<mesh geometry={geo} receiveShadow castShadow={materialKind !== 'metal'}>
							{matAll}
						</mesh>
					</group>
				);
			})}
		</>
	);
}

