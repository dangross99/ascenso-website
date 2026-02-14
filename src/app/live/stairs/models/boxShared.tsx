import React from 'react';
import { Text } from '@react-three/drei';

export type Axis = 'x' | 'z';
export type Side = 'right' | 'left';

export type Tread = {
	position: [number, number, number];
	rotation: [number, number, number];
	run: number;
	isLanding: boolean;
	flight: number;
	/** היפוך צד ימין/שמאל (למודלים א-סימטריים: ridge, taper, wedge) – לפי טבלת מסלול/דגם */
	mirror?: boolean;
};

export type BuildFaceTextures = (
	dimU: number,
	dimV: number,
	rotate90?: boolean,
	flipU?: boolean,
	flipV?: boolean,
) => { color: any; bump?: any; rough?: any };

export function axisFromYaw(yaw: number): Axis {
	return (Math.abs(Math.cos(yaw)) > 0.5 ? 'x' : 'z') as Axis;
}

function rightLocalSignFor(yaw: number, axis: Axis, isLanding: boolean): 1 | -1 {
	const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
	let sign: 1 | -1 = (axis === 'x' ? (cosY >= 0 ? -1 : 1) : (sinY >= 0 ? 1 : -1)) as 1 | -1;
	// פודסטים לאורך Z – היפוך כדי לשמור "פנימה" עקבי בין גרמים
	if (isLanding && axis === 'z') sign = (sign === 1 ? -1 : 1) as 1 | -1;
	return sign;
}

export function computeLocalFrame(params: {
	yaw: number;
	isLanding: boolean;
	flight: number;
	axis?: Axis;
	innerIsRight: boolean;
}) {
	const { yaw, isLanding, flight, innerIsRight } = params;
	const axis = params.axis ?? axisFromYaw(yaw);
	const cosY = Math.cos(yaw), sinY = Math.sin(yaw);
	const forwardSignBase = axis === 'x' ? (cosY >= 0 ? 1 : -1) : (sinY >= 0 ? 1 : -1);
	// היפוך חד-פעמי בגרם הראשון כדי להציג "1" בתחילת המסע
	const forwardSign = (flight === 0 ? -forwardSignBase : forwardSignBase) as 1 | -1;
	const rightLocal = rightLocalSignFor(yaw, axis, isLanding);
	const innerSignLocal = (innerIsRight ? rightLocal : -rightLocal) as 1 | -1;
	// כיווני סיבוב טקסטורות
	const rotateFrontBack = (axis === 'x');
	const rotateSides = (axis === 'z');
	return { axis, forwardSign, innerSignLocal, rotateFrontBack, rotateSides } as const;
}

export function getInnerIsRight(params: {
	t: Tread;
	curStepIdx: number;
	stepRailingSides?: Array<Side>;
	landingRailingSides?: Array<Side>;
	landingIdx: number;
}) {
	const { t, curStepIdx, stepRailingSides, landingRailingSides, landingIdx } = params;
	return t.isLanding
		? (((landingRailingSides?.[landingIdx] ?? 'right') === 'right'))
		: ((typeof stepRailingSides !== 'undefined' ? (stepRailingSides[curStepIdx] ?? 'right') : 'right') === 'right');
}

export function HitechVertexLabels(props: { t: Tread; treadThickness: number; treadWidth: number }) {
	const { t, treadThickness, treadWidth } = props;
	const yTop = treadThickness / 2 + 0.015;
	const yBot = -treadThickness / 2 - 0.015;
	const dx = t.run / 2;
	const dz = treadWidth / 2;
	const fontSize = 0.045;
	const color = t.isLanding ? '#2563eb' : '#e11d48';
	return (
		<group>
			<Text position={[-dx, yTop, -dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">1</Text>
			<Text position={[ dx, yTop, -dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">2</Text>
			<Text position={[ dx, yTop,  dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">3</Text>
			<Text position={[-dx, yTop,  dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">4</Text>
			<Text position={[-dx, yBot, -dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">5</Text>
			<Text position={[ dx, yBot, -dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">6</Text>
			<Text position={[ dx, yBot,  dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">7</Text>
			<Text position={[-dx, yBot,  dz]} fontSize={fontSize} color={color} anchorX="center" anchorY="middle">8</Text>
		</group>
	);
}

