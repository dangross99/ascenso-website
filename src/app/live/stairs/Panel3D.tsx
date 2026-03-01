'use client';

import React from 'react';

/** מידות לוח: 300×150 ס"מ. עובי 16 או 25 מ"מ (שכבת אבן + Honeycomb + אלומיניום). */
const WIDTH_M = 3;
const HEIGHT_M = 1.5;

const STONE_LAYER_MM = 4;
const ALUMINUM_BACK_MM = 5;

function panelLayers(thicknessMm: 16 | 25) {
	const totalM = thicknessMm / 1000;
	const stoneM = STONE_LAYER_MM / 1000;
	const backM = ALUMINUM_BACK_MM / 1000;
	const honeycombM = Math.max(0.003, totalM - stoneM - backM);
	return { totalM, stoneM, honeycombM, backM };
}

export default function Panel3D(props: {
	thicknessMm: 16 | 25;
	explodedView: boolean;
	textureUrl?: string | null;
	materialSolidColor?: string | null;
	materialKind: 'metal' | 'stone';
}) {
	const { thicknessMm, explodedView, materialSolidColor, materialKind } = props;
	const { totalM, stoneM, honeycombM, backM } = panelLayers(thicknessMm);

	const stoneZ = explodedView ? stoneM / 2 + 0.02 : totalM / 2 - stoneM / 2;
	const honeycombZ = explodedView ? -honeycombM / 2 : 0;
	const backZ = explodedView ? -totalM / 2 + backM / 2 - 0.02 : -totalM / 2 + backM / 2;

	return (
		<group position={[0, HEIGHT_M / 2, 0]}>
			{/* שכבת אבן עליונה */}
			<mesh position={[0, 0, stoneZ]} castShadow receiveShadow>
				<boxGeometry args={[WIDTH_M, HEIGHT_M, stoneM]} />
				<meshStandardMaterial
					color={materialSolidColor || '#e8e4df'}
					roughness={0.5}
					metalness={materialKind === 'metal' ? 0.3 : 0.12}
				/>
			</mesh>
			{/* ליבת Honeycomb */}
			<mesh position={[0, 0, honeycombZ]} castShadow receiveShadow>
				<boxGeometry args={[WIDTH_M, HEIGHT_M, honeycombM]} />
				<meshStandardMaterial color="#9ca3af" roughness={0.8} metalness={0.05} />
			</mesh>
			{/* גב אלומיניום */}
			<mesh position={[0, 0, backZ]} castShadow receiveShadow>
				<boxGeometry args={[WIDTH_M, HEIGHT_M, backM]} />
				<meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.25} />
			</mesh>
		</group>
	);
}

export const PANEL_WIDTH_M = WIDTH_M;
export const PANEL_HEIGHT_M = HEIGHT_M;
/** מרכז הלוח למטרת OrbitControls */
export const PANEL_CENTER: [number, number, number] = [0, HEIGHT_M / 2, 0];
