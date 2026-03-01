'use client';

import React from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, SRGBColorSpace } from 'three';

/** מידות לוח: 300×150 ס"מ. עובי 16 או 25 מ"מ (שכבת אבן + Honeycomb + אלומיניום). */
const WIDTH_M = 3;
const HEIGHT_M = 1.5;

const STONE_LAYER_MM = 4;
const ALUMINUM_BACK_MM = 5;

/** במבט מפוצץ: הזזה של 50 מ"מ (0.05 מ') כדי לחשוף את ה-Honeycomb – "Money Shot". */
const EXPLODED_OFFSET_M = 0.05;

/** URL פלייסהולדר כשאין טקסטורה – useLoader דורש URL קבוע (לא null). */
const FALLBACK_TEX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

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
	const { thicknessMm, explodedView, textureUrl, materialSolidColor, materialKind } = props;
	const { totalM, stoneM, honeycombM, backM } = panelLayers(thicknessMm);

	const texUrl = textureUrl && !materialSolidColor ? textureUrl : FALLBACK_TEX;
	const tex = useLoader(TextureLoader, texUrl);
	React.useEffect(() => {
		if (tex && texUrl !== FALLBACK_TEX) {
			tex.colorSpace = SRGBColorSpace;
		}
	}, [tex, texUrl]);

	const stoneZ = explodedView ? stoneM / 2 + EXPLODED_OFFSET_M : totalM / 2 - stoneM / 2;
	const honeycombZ = explodedView ? -honeycombM / 2 : 0;
	const backZ = explodedView ? -totalM / 2 + backM / 2 - EXPLODED_OFFSET_M : -totalM / 2 + backM / 2;

	const useTexture = !materialSolidColor && textureUrl && texUrl !== FALLBACK_TEX;

	return (
		<group position={[0, HEIGHT_M / 2, 0]}>
			{/* שכבת אבן עליונה – טקסטורה Wild/גידים להמחשת Bookmatch */}
			<mesh position={[0, 0, stoneZ]} castShadow receiveShadow>
				<boxGeometry args={[WIDTH_M, HEIGHT_M, stoneM]} />
				<meshStandardMaterial
					color={materialSolidColor || '#e8e4df'}
					roughness={0.5}
					metalness={materialKind === 'metal' ? 0.3 : 0.12}
					map={useTexture ? tex : undefined}
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
