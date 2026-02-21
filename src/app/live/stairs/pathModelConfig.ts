/**
 * תצורת Mirror, bodyRotate180 ו־landingWalls לכל מבנה, זווית ודגם.
 * מקור אמת יחיד – מגדיר בדיוק איזה גרם/פודסט מקבל היפוך, סיבוב ואילו פאות קיר.
 *
 * מפתח: pathKey = getPathKey(path, flip, flight) או getPathKeyLandingL/U.
 * דגמים: rect | rounded | taper (דלתא) | wedge | ridge.
 */

export type BoxModel = 'rect' | 'rounded' | 'taper' | 'wedge' | 'ridge';

export interface SegmentConfig {
	mirror: boolean;
	bodyRotate180: boolean;
	/**
	 * מערך פאות שיקבלו קיר בפודסט (0–3). ברירת מחדל [1] אם לא הוגדר.
	 * פאות קבועות במרחב – לא מושפעות מ־bodyRotate180 של המדרגה:
	 *   0 = ימין (+X)  1 = גב (-Z)  2 = שמאל (-X)  3 = חזית (+Z)
	 */
	landingWalls?: number[];
}

export type PathKey =
	| 'straight_0'
	| 'straight_180'
	| 'L_0_flight_0'
	| 'L_0_flight_1'
	| 'L_0_landing'
	| 'L_180_flight_0'
	| 'L_180_flight_1'
	| 'L_180_landing'
	| 'U_0_landing_0'
	| 'U_0_landing_1'
	| 'U_180_landing_0'
	| 'U_180_landing_1'
	| string;

export const SEGMENT_CONFIG: Partial<Record<PathKey, Partial<Record<BoxModel, SegmentConfig>>>> = {
	straight_0: {
		ridge: { mirror: true, bodyRotate180: true },
		taper: { mirror: true, bodyRotate180: true },
		wedge: { mirror: false, bodyRotate180: true },
	},
	straight_180: {
		ridge: { mirror: true, bodyRotate180: true },
		taper: { mirror: true, bodyRotate180: true },
		wedge: { mirror: true, bodyRotate180: true },
	},
	L_0_flight_0: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: false, bodyRotate180: false },
		wedge: { mirror: true, bodyRotate180: false },
	},
	L_0_flight_1: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: true },
		wedge: { mirror: true, bodyRotate180: false },
	},
	L_180_flight_0: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: true },
		wedge: { mirror: true, bodyRotate180: false },
	},
	L_180_flight_1: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: true },
		wedge: { mirror: true, bodyRotate180: false },
	},
	L_0_landing: {
		taper: { mirror: true, bodyRotate180: true, landingWalls: [1, 2] },
	},
	L_180_landing: {
		taper: { mirror: true, bodyRotate180: true, landingWalls: [1, 2] },
	},
	U_0_landing_0: {
		taper: { mirror: false, bodyRotate180: false },
	},
	U_0_landing_1: {
		taper: { mirror: false, bodyRotate180: false },
	},
	U_180_landing_0: {
		taper: { mirror: false, bodyRotate180: false },
	},
	U_180_landing_1: {
		taper: { mirror: false, bodyRotate180: false },
	},
};

export function getDefaultMirror(flip: boolean, path: 'straight' | 'L' | 'U', flight: number): boolean {
	if (path === 'straight') return flip;
	if (path === 'L') return flip;
	return flight === 2 ? !flip : flip;
}

export function getMirror(model: string, pathKey: string, fallback: boolean): boolean {
	const cfg = SEGMENT_CONFIG[pathKey as PathKey]?.[model as BoxModel];
	if (cfg != null) return cfg.mirror;
	return fallback;
}

export function getBodyRotate180(model: string, pathKey: string): boolean {
	const cfg = SEGMENT_CONFIG[pathKey as PathKey]?.[model as BoxModel];
	if (cfg != null) return cfg.bodyRotate180;
	return false;
}

export function getLandingWalls(model: string, pathKey: string): number[] {
	const cfg = SEGMENT_CONFIG[pathKey as PathKey]?.[model as BoxModel];
	if (cfg != null && cfg.landingWalls != null) return cfg.landingWalls;
	return [1];
}

export function getPathKey(path: 'straight' | 'L' | 'U', flip: boolean, flight: number): string {
	const suffix = flip ? 180 : 0;
	if (path === 'straight') return `straight_${suffix}`;
	return `${path}_${suffix}_flight_${flight}`;
}

export function getPathKeyLandingL(flip: boolean): string {
	return flip ? 'L_180_landing' : 'L_0_landing';
}

export function getPathKeyLandingU(flip: boolean, index: 0 | 1): string {
	const suffix = flip ? 180 : 0;
	return `U_${suffix}_landing_${index}`;
}
