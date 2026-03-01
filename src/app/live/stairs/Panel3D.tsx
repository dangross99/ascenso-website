'use client';

import React from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, SRGBColorSpace } from 'three';

/** מידות לוח ברירת מחדל (מ') – ניתן לדריסה על ידי props widthM, heightM. */
const DEFAULT_WIDTH_M = 2.9;
const DEFAULT_HEIGHT_M = 1.45;

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
	backlit?: boolean;
	widthM?: number;
	heightM?: number;
	/** כשמוצג קיר מפולג: כל תא מציג חלק מהטקסטורה (0–1). למשל [1/nx, 1/ny] */
	uvScale?: [number, number];
	/** א offset ב-UV לחיתוך החלק הרלוונטי. למשל [j/nx, i/ny] */
	uvOffset?: [number, number];
}) {
	const { thicknessMm, explodedView, textureUrl, materialSolidColor, materialKind, backlit = false, widthM = DEFAULT_WIDTH_M, heightM = DEFAULT_HEIGHT_M, uvScale, uvOffset } = props;
	const { totalM, stoneM, honeycombM, backM } = panelLayers(thicknessMm);

	const texUrl = textureUrl && !materialSolidColor ? textureUrl : FALLBACK_TEX;
	const tex = useLoader(TextureLoader, texUrl);
	React.useEffect(() => {
		if (tex && texUrl !== FALLBACK_TEX) {
			tex.colorSpace = SRGBColorSpace;
		}
	}, [tex, texUrl]);

	const useTexture = !materialSolidColor && textureUrl && texUrl !== FALLBACK_TEX;
	/** כשמועברים uvScale/uvOffset – משתמשים בהעתק טקסטורה שמציג רק את החלק הרלוונטי (קיר אחד עם חלוקה) */
	const displayTex = React.useMemo(() => {
		if (!tex || !useTexture || !uvScale || !uvOffset) return tex;
		const clone = tex.clone();
		clone.repeat.set(uvScale[0], uvScale[1]);
		clone.offset.set(uvOffset[0], uvOffset[1]);
		return clone;
	}, [tex, useTexture, uvScale, uvOffset]);
	const stoneMap = useTexture ? (uvScale && uvOffset ? displayTex : tex) : undefined;

	const stoneZ = explodedView ? stoneM / 2 + EXPLODED_OFFSET_M : totalM / 2 - stoneM / 2;
	const honeycombZ = explodedView ? -honeycombM / 2 : 0;
	const backZ = explodedView ? -totalM / 2 + backM / 2 - EXPLODED_OFFSET_M : -totalM / 2 + backM / 2;

	/** צבע בסיס – לבן/אפור בהיר כדי שאם הטקסטורה לא נטענת או הנתיב שגוי הלוח לא ייראה שחור */
	const stoneColor = materialSolidColor || '#ffffff';
	const stoneEmissive = backlit ? '#e8e8e8' : '#000000';
	const stoneEmissiveIntensity = backlit ? 1.2 : 0;

	return (
		<group position={[0, heightM / 2, 0]}>
			{/* שכבת אבן עליונה – טקסטורה Wild/גידים להמחשת Bookmatch; color לבן = גיבוי אם map חסר */}
			<mesh position={[0, 0, stoneZ]} castShadow receiveShadow>
				<boxGeometry args={[widthM, heightM, stoneM]} />
				<meshStandardMaterial
					color={stoneColor}
					roughness={0.5}
					metalness={materialKind === 'metal' ? 0.5 : 0.12}
					map={stoneMap}
					emissive={stoneEmissive}
					emissiveIntensity={stoneEmissiveIntensity}
				/>
			</mesh>
			{/* ליבת Honeycomb */}
			<mesh position={[0, 0, honeycombZ]} castShadow receiveShadow>
				<boxGeometry args={[widthM, heightM, honeycombM]} />
				<meshStandardMaterial color="#ffffff" roughness={0.8} metalness={0.05} />
			</mesh>
			{/* גב אלומיניום */}
			<mesh position={[0, 0, backZ]} castShadow receiveShadow>
				<boxGeometry args={[widthM, heightM, backM]} />
				<meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.5} />
			</mesh>
		</group>
	);
}

/** מרכז הלוח למטרת OrbitControls – יש להעביר heightM כפרמטר (מרכז ב-Y = heightM/2) */
export function getPanelCenter(heightM: number): [number, number, number] {
	return [0, heightM / 2, 0];
}
