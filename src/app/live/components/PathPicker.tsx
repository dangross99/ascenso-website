import React from 'react';
import type { PathSegment } from '../shared/path';

export function PathPicker(props: {
	shape: 'straight' | 'L' | 'U';
	steps: number;
	stepsTotalForPath: number;
	pathSegments: PathSegment[];
	setShape: (s: 'straight' | 'L' | 'U') => void;
	setPathSegments: React.Dispatch<React.SetStateAction<PathSegment[]>>;
}) {
	const { shape, steps, stepsTotalForPath, pathSegments, setShape, setPathSegments } = props;

	// ׳‘׳—׳™׳¨׳” ׳׳”׳™׳¨׳”: ׳™׳©׳¨ / L / U ג†’ ׳‘׳•׳ ׳” ׳×׳‘׳ ׳™׳× ׳׳¡׳׳•׳ ׳‘׳¡׳™׳¡׳™׳×
	const buildTemplate = (s: 'straight' | 'L' | 'U'): PathSegment[] => {
		const total = stepsTotalForPath || steps;
		if (s === 'straight') return [{ kind: 'straight' as const, steps: total }];
		if (s === 'L') {
			const a = Math.max(1, Math.round(total / 2));
			const b = Math.max(1, total - a);
			return [
				{ kind: 'straight' as const, steps: a },
				{ kind: 'landing' as const, turn: 'right' as const },
				{ kind: 'straight' as const, steps: b },
			];
		}
		// U
		const a = Math.max(1, Math.floor(total / 3));
		const b = Math.max(1, Math.floor(total / 3));
		const c = Math.max(1, total - a - b);
		return [
			{ kind: 'straight' as const, steps: a },
			{ kind: 'landing' as const, turn: 'right' as const },
			{ kind: 'straight' as const, steps: b },
			{ kind: 'landing' as const, turn: 'right' as const },
			{ kind: 'straight' as const, steps: c },
		];
	};

	const straightIdxs: number[] = [];
	pathSegments.forEach((seg, i) => {
		if (seg.kind === 'straight') straightIdxs.push(i);
	});
	const flights = straightIdxs.map((i) => ({ segIndex: i, steps: (pathSegments[i] as any).steps as number }));
	const cols = Math.max(1, flights.length);

	return (
		<div className="p-3">
			<div className="flex items-center justify-center gap-2 mb-3 text-center">
				{(['straight', 'L', 'U'] as const).map(s => (
					<button
						key={s}
						className={`px-4 py-2 text-base rounded-full border ${shape === s ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
						onClick={() => {
							setShape(s);
							setPathSegments(buildTemplate(s));
						}}
					>
						{s === 'straight' ? '׳™׳©׳¨' : s === 'L' ? '׳¦׳•׳¨׳× L' : '׳¦׳•׳¨׳× U'}
					</button>
				))}
			</div>

			{/* ׳›׳₪׳×׳•׳¨ ׳׳¨׳׳” ׳’׳׳•׳‘׳׳™ ג€“ ׳”׳•׳₪׳ ׳׳× ׳›׳ ׳”׳₪׳ ׳™׳•׳× ׳‘׳׳¡׳׳•׳ */}
			<div className="flex items-center justify-center mb-2">
				<button
					className="px-3 py-1 text-sm rounded-full border bg-white hover:bg-gray-100"
					onClick={() => {
						setPathSegments(prev => prev.map(seg => {
							if (seg.kind !== 'landing') return seg;
							if (!seg.turn) return seg;
							return { kind: 'landing', turn: (seg.turn === 'left' ? 'right' : 'left') };
						}));
					}}
					title="׳׳¨׳׳”"
					aria-label="׳׳¨׳׳”"
				>
					׳׳¨׳׳”
				</button>
			</div>

			<div className={`grid gap-3`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
				{flights.map((f, fi) => (
					<div key={fi} className="border rounded-md p-2 text-center">
						<div className="text-sm text-gray-600 mb-1">׳’׳¨׳ {fi + 1}</div>
						<div className="flex items-center justify-center gap-2">
							<button
								className="px-2 py-1 rounded border"
								aria-label="׳₪׳—׳•׳× ׳׳“׳¨׳’׳•׳×"
								onClick={() => {
									setPathSegments(prev => prev.map((seg, idx) => (
										idx === f.segIndex && seg.kind === 'straight'
											? { kind: 'straight', steps: Math.max(1, (seg as any).steps - 1) }
											: seg
									)));
								}}
							>
								-
							</button>
							<span className="text-base font-medium min-w-[3ch]">{f.steps}</span>
							<button
								className="px-2 py-1 rounded border"
								aria-label="׳™׳•׳×׳¨ ׳׳“׳¨׳’׳•׳×"
								onClick={() => {
									setPathSegments(prev => prev.map((seg, idx) => (
										idx === f.segIndex && seg.kind === 'straight'
											? { kind: 'straight', steps: Math.min(25, (seg as any).steps + 1) }
											: seg
									)));
								}}
							>
								+
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
