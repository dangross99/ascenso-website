'use client';

import React from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader, SRGBColorSpace, LinearSRGBColorSpace } from 'three';

/** מידות לוח ברירת מחדל (מ') – ניתן לדריסה על ידי props widthM, heightM. */
const DEFAULT_WIDTH_M = 2.9;
const DEFAULT_HEIGHT_M = 1.45;

/** מבנה לוח: 7 מ"מ אבן טבעית, 1 מ"מ פייבר גלס, 20 מ"מ חלת דבש אלומיניום, 1 מ"מ אלומיניום (סה"כ 29 מ"מ). עבור 16/25 מ"מ – יחס דומה. */
const STONE_MM = 7;
const FIBERGLASS_MM = 1;
const HONEYCOMB_MM = 20;
const ALUMINUM_BACK_MM = 1;

/** במבט מפוצץ: הזזה של 50 מ"מ (0.05 מ') כדי לחשוף את השכבות. */
const EXPLODED_OFFSET_M = 0.05;

/** URL פלייסהולדר כשאין טקסטורה – useLoader דורש URL קבוע (לא null). */
const FALLBACK_TEX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function panelLayers(thicknessMm: 16 | 25) {
	const totalM = thicknessMm / 1000;
	/** יחס השכבות מהמפרט: 7 : 1 : 20 : 1. עבור 25 מ"מ: 6, 1, 17, 1. עבור 16 מ"מ: 4, 1, 10, 1. */
	const stoneM = (thicknessMm === 25 ? 6 : 4) / 1000;
	const fiberM = 0.001;
	const honeycombM = (thicknessMm === 25 ? 17 : 10) / 1000;
	const backM = 0.001;
	return { totalM, stoneM, fiberM, honeycombM, backM };
}

export default function Panel3D(props: {
	thicknessMm: 16 | 25;
	explodedView: boolean;
	textureUrl?: string | null;
	/** מפת נורמל / bump ל-PBR – השתקפויות אור על גידים */
	normalMapUrl?: string | null;
	/** מפת ח roughness ל-PBR */
	roughnessMapUrl?: string | null;
	materialSolidColor?: string | null;
	materialKind: 'metal' | 'stone';
	backlit?: boolean;
	widthM?: number;
	heightM?: number;
	uvScale?: [number, number];
	uvOffset?: [number, number];
}) {
	const { thicknessMm, explodedView, textureUrl, normalMapUrl, roughnessMapUrl, materialSolidColor, materialKind, backlit = false, widthM = DEFAULT_WIDTH_M, heightM = DEFAULT_HEIGHT_M, uvScale, uvOffset } = props;
	const { totalM, stoneM, fiberM, honeycombM, backM } = panelLayers(thicknessMm);

	const texUrl = textureUrl && !materialSolidColor ? textureUrl : FALLBACK_TEX;
	const normUrl = normalMapUrl && !materialSolidColor ? normalMapUrl : FALLBACK_TEX;
	const roughUrl = roughnessMapUrl && !materialSolidColor ? roughnessMapUrl : FALLBACK_TEX;
	const [tex, normalMap, roughnessMap] = useLoader(TextureLoader, [texUrl, normUrl, roughUrl]);
	React.useEffect(() => {
		if (tex && texUrl !== FALLBACK_TEX) tex.colorSpace = SRGBColorSpace;
		if (normalMap && normUrl !== FALLBACK_TEX) normalMap.colorSpace = LinearSRGBColorSpace;
		if (roughnessMap && roughUrl !== FALLBACK_TEX) roughnessMap.colorSpace = LinearSRGBColorSpace;
	}, [tex, texUrl, normalMap, normUrl, roughnessMap, roughUrl]);

	const useTexture = !materialSolidColor && textureUrl && texUrl !== FALLBACK_TEX;
	const useNormal = normalMap && normUrl !== FALLBACK_TEX;
	const useRoughnessMap = roughnessMap && roughUrl !== FALLBACK_TEX;

	const displayTex = React.useMemo(() => {
		if (!tex || !useTexture || !uvScale || !uvOffset) return tex;
		const clone = tex.clone();
		clone.repeat.set(uvScale[0], uvScale[1]);
		clone.offset.set(uvOffset[0], uvOffset[1]);
		return clone;
	}, [tex, useTexture, uvScale, uvOffset]);
	const stoneMap = useTexture ? (uvScale && uvOffset ? displayTex : tex) : undefined;
	/** מפות PBR עם אותו repeat/offset כמו הצבע */
	const displayNormal = React.useMemo(() => {
		if (!normalMap || !useNormal || !uvScale || !uvOffset) return normalMap;
		const clone = normalMap.clone();
		clone.repeat.set(uvScale[0], uvScale[1]);
		clone.offset.set(uvOffset[0], uvOffset[1]);
		return clone;
	}, [normalMap, useNormal, uvScale, uvOffset]);
	const displayRoughness = React.useMemo(() => {
		if (!roughnessMap || !useRoughnessMap || !uvScale || !uvOffset) return roughnessMap;
		const clone = roughnessMap.clone();
		clone.repeat.set(uvScale[0], uvScale[1]);
		clone.offset.set(uvOffset[0], uvOffset[1]);
		return clone;
	}, [roughnessMap, useRoughnessMap, uvScale, uvOffset]);

	const stoneZ = explodedView ? stoneM / 2 + EXPLODED_OFFSET_M : totalM / 2 - stoneM / 2;
	const fiberZ = explodedView ? -fiberM / 2 : totalM / 2 - stoneM - fiberM / 2;
	const honeycombZ = explodedView ? -stoneM - fiberM - honeycombM / 2 : totalM / 2 - stoneM - fiberM - honeycombM / 2;
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
					roughness={useRoughnessMap ? 1 : 0.5}
					roughnessMap={useRoughnessMap ? displayRoughness : undefined}
					metalness={materialKind === 'metal' ? 0.5 : 0.12}
					map={stoneMap}
					normalMap={useNormal ? displayNormal : undefined}
					emissive={stoneEmissive}
					emissiveIntensity={stoneEmissiveIntensity}
					envMapIntensity={materialKind === 'metal' ? 1.4 : 1.0}
				/>
			</mesh>
			{/* שכבת פייבר גלס */}
			<mesh position={[0, 0, fiberZ]} castShadow receiveShadow>
				<boxGeometry args={[widthM, heightM, fiberM]} />
				<meshStandardMaterial color="#e8e8e8" roughness={0.6} metalness={0.05} />
			</mesh>
			{/* ליבת חלת דבש אלומיניום */}
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
