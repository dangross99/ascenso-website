/**
 * תצורת Mirror ו־bodyRotate180 לכל מבנה, זווית ודגם.
 * מקור אמת יחיד – מגדיר בדיוק איזה גרם/פודסט מקבל היפוך וסיבוב.
 *
 * מפתח: pathKey = getPathKey(path, flip, flight)
 *   ישר:     straight_0, straight_180
 *   L:       L_0_flight_0, L_0_flight_1, L_0_landing (פודסט), L_180_flight_0, L_180_flight_1, L_180_landing
 *   U:       U_0_flight_0, U_0_flight_1, U_0_flight_2, U_0_landing_0, U_0_landing_1 (פודסטים)
 *
 * דגמים: rect | rounded | taper (דלתא) | wedge | ridge
 *
 * ┌─────────────────┬────────────┬────────────┬────────────┬────────────┬────────────┐
 * │ pathKey         │ rect       │ rounded    │ taper      │ wedge      │ ridge      │
 * ├─────────────────┼────────────┼────────────┼────────────┼────────────┼────────────┤
 * │ straight_0      │ -          │ -          │ M          │ -          │ M          │
 * │ straight_180    │ -          │ -          │ M          │ M          │ M          │
 * │ L_0_flight_0    │ -          │ -          │ M + R      │ M          │ M          │
 * │ L_0_flight_1    │ -          │ -          │ M + R      │ M          │ M          │
 * │ L_180_flight_0  │ -          │ -          │ false      │ M          │ M          │
 * │ L_180_flight_1  │ -          │ -          │ M          │ M          │ M          │
 * │ L_0_landing     │ -          │ -          │ M + R      │ -          │ -          │  (דלתא: הפודסט מתהפך)
 * │ L_180_landing   │ -          │ -          │ M + R      │ -          │ -          │
 * │ U_0_landing_0   │ -          │ -          │ M + R      │ -          │ -          │  (דלתא: פודסט ראשון)
 * │ U_0_landing_1   │ -          │ -          │ M + R      │ -          │ -          │  (דלתא: פודסט שני)
 * └─────────────────┴────────────┴────────────┴────────────┴────────────┴────────────┘
 * M = mirror, R = bodyRotate180.
 */

export type BoxModel = 'rect' | 'rounded' | 'taper' | 'wedge' | 'ridge';

export interface SegmentConfig {
	mirror: boolean;
	bodyRotate180: boolean;
}

/** מפתח מסלול – תואם ל־getPathKey(path, flip, flight) */
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

/**
 * טבלה מפורטת: לכל pathKey ולדגם – mirror ו־bodyRotate180.
 * רק דגמים שצריכים דריסה מופיעים; השאר משתמשים בברירת מחדל (getMirrorForTread, bodyRotate180: false).
 */
export const SEGMENT_CONFIG: Partial<Record<PathKey, Partial<Record<BoxModel, SegmentConfig>>>> = {
	// ─── ישר 0° ─────────────────────────────────────────────────────────────
	straight_0: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: false },
		wedge: { mirror: false, bodyRotate180: false },
	},
	// ─── ישר 180° ───────────────────────────────────────────────────────────
	straight_180: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: false },
		wedge: { mirror: true, bodyRotate180: false },
	},

	// ─── L 0° – גרם ראשון, פודסט (לא בטבלה = false/false), גרם שני ─────────
	L_0_flight_0: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: true },
		wedge: { mirror: true, bodyRotate180: false },
	},
	L_0_flight_1: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: true },
		wedge: { mirror: true, bodyRotate180: false },
	},

	// ─── L 180° – גרם ראשון, גרם שני (פודסט תמיד false/false) ───────────────
	L_180_flight_0: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: false, bodyRotate180: false },
		wedge: { mirror: true, bodyRotate180: false },
	},
	L_180_flight_1: {
		ridge: { mirror: true, bodyRotate180: false },
		taper: { mirror: true, bodyRotate180: false },
		wedge: { mirror: true, bodyRotate180: false },
	},

	// ─── L פודסט – דלתא: היפוך גם ב־0° וגם ב־180° ─────────────────────────────
	L_0_landing: {
		taper: { mirror: true, bodyRotate180: true },
	},
	L_180_landing: {
		taper: { mirror: true, bodyRotate180: true },
	},

	// ─── U פודסטים – דלתא: היפוך שני הפודסטים ─────────────────────────────────
	U_0_landing_0: {
		taper: { mirror: true, bodyRotate180: true },
	},
	U_0_landing_1: {
		taper: { mirror: true, bodyRotate180: true },
	},
	U_180_landing_0: {
		taper: { mirror: true, bodyRotate180: true },
	},
	U_180_landing_1: {
		taper: { mirror: true, bodyRotate180: true },
	},
};

/** ברירת מחדל ל־mirror לפי path ו־flip (כשאין דריסה בדגם) */
export function getDefaultMirror(flip: boolean, path: 'straight' | 'L' | 'U', flight: number): boolean {
	if (path === 'straight') return flip;
	if (path === 'L') return flip;
	return flight === 2 ? !flip : flip;
}

/**
 * מחזיר mirror לדגם ומסלול.
 * אם יש ערך ב־SEGMENT_CONFIG – משתמשים בו; אחרת ברירת מחדל.
 */
export function getMirror(model: string, pathKey: string, fallback: boolean): boolean {
	const cfg = SEGMENT_CONFIG[pathKey as PathKey]?.[model as BoxModel];
	if (cfg != null) return cfg.mirror;
	return fallback;
}

/**
 * מחזיר bodyRotate180 לדגם ומסלול.
 * אם יש ערך ב־SEGMENT_CONFIG – משתמשים בו; אחרת false.
 */
export function getBodyRotate180(model: string, pathKey: string): boolean {
	const cfg = SEGMENT_CONFIG[pathKey as PathKey]?.[model as BoxModel];
	if (cfg != null) return cfg.bodyRotate180;
	return false;
}

/**
 * יוצר pathKey תואם ל־Staircase3D (לשימוש משותף).
 */
export function getPathKey(path: 'straight' | 'L' | 'U', flip: boolean, flight: number): string {
	const suffix = flip ? 180 : 0;
	if (path === 'straight') return `straight_${suffix}`;
	return `${path}_${suffix}_flight_${flight}`;
}

/** מפתח לפודסט ב־L (לשימוש ב־SEGMENT_CONFIG). */
export function getPathKeyLandingL(flip: boolean): string {
	return flip ? 'L_180_landing' : 'L_0_landing';
}

/** מפתח לפודסט ב־U (לשימוש ב־SEGMENT_CONFIG). index: 0 = פודסט ראשון, 1 = פודסט שני. */
export function getPathKeyLandingU(flip: boolean, index: 0 | 1): string {
	const suffix = flip ? 180 : 0;
	return `U_${suffix}_landing_${index}`;
}
