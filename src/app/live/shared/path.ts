export type PathSegment =
	| { kind: 'straight'; steps: number }
	| { kind: 'landing'; turn?: 'left' | 'right' };

export function encodePath(segments: PathSegment[]): string {
	return segments
		.map(s => (s.kind === 'straight' ? `s${s.steps}` : `l${s.turn ? (s.turn === 'right' ? 'r' : 'l') : ''}`))
		.join(',');
}

export function decodePath(text: string | null | undefined): PathSegment[] | null {
	if (!text) return null;
	const parts = text.split(',').map(p => p.trim()).filter(Boolean);
	const out: PathSegment[] = [];
	for (const p of parts) {
		if (p.startsWith('s')) {
			const n = parseInt(p.slice(1), 10);
			if (Number.isFinite(n) && n > 0) out.push({ kind: 'straight', steps: Math.min(25, Math.max(1, n)) });
		} else if (p === 'lr') {
			out.push({ kind: 'landing', turn: 'right' });
		} else if (p === 'll') {
			out.push({ kind: 'landing', turn: 'left' });
		} else if (p === 'l') {
			out.push({ kind: 'landing' });
		}
	}
	return out.length ? out : null;
}
