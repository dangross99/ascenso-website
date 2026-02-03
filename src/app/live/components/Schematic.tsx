import React from 'react';

export function Schematic({ shape, steps }: { shape: 'straight' | 'L' | 'U'; steps: number }) {
	// ׳¦׳™׳•׳¨ ׳¡׳›׳׳˜׳™ ׳₪׳©׳•׳˜ ׳׳₪׳™ ׳¦׳•׳¨׳” ׳•׳׳¡׳₪׳¨ ׳׳“׳¨׳’׳•׳×
	const w = 360;
	const h = 220;
	const stairColor = '#1f2937';
	const stepW = Math.min(28, Math.max(10, Math.floor((w - 80) / Math.min(steps, 10))));
	const stepH = 10;
	const pad = 18;
	const baseY = h - pad;
	const baseX = pad;

	const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
	const addStep = (x: number, y: number) => {
		// L: riser then tread
		lines.push({ x1: x, y1: y, x2: x, y2: y - stepH });
		lines.push({ x1: x, y1: y - stepH, x2: x + stepW, y2: y - stepH });
	};

	if (shape === 'straight') {
		let x = baseX;
		let y = baseY;
		for (let i = 0; i < steps; i++) {
			addStep(x, y);
			x += stepW;
			y -= stepH;
		}
	} else if (shape === 'L') {
		const half = Math.floor(steps / 2);
		let x = baseX;
		let y = baseY;
		for (let i = 0; i < half; i++) {
			addStep(x, y);
			x += stepW;
			y -= stepH;
		}
		// landing + turn
		lines.push({ x1: x, y1: y, x2: x + stepW * 1.4, y2: y });
		x += stepW * 1.4;
		for (let i = half; i < steps; i++) {
			addStep(x, y);
			// go "up" in X as schematic
			y -= stepH;
		}
	} else {
		const third = Math.floor(steps / 3);
		let x = baseX;
		let y = baseY;
		for (let i = 0; i < third; i++) {
			addStep(x, y);
			x += stepW;
			y -= stepH;
		}
		lines.push({ x1: x, y1: y, x2: x + stepW * 1.4, y2: y });
		x += stepW * 1.4;
		for (let i = third; i < third * 2; i++) {
			addStep(x, y);
			x += stepW;
			y -= stepH;
		}
		lines.push({ x1: x, y1: y, x2: x + stepW * 1.4, y2: y });
	}

	return (
		<svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="max-w-full" aria-label="Schematic">
			<rect x={0} y={0} width={w} height={h} fill="#ffffff" />
			{lines.map((l, i) => (
				<line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={stairColor} strokeWidth={3} />
			))}
		</svg>
	);
}
