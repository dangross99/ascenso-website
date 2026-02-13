import React from 'react';

type BoxId = 'thick' | 'thin' | 'rounded' | 'taper' | 'wedge' | 'ridge';

export function BoxPicker(props: {
	box: BoxId;
	setBox: (id: BoxId) => void;
}) {
	const { box, setBox } = props;
	const options: Array<{ id: BoxId; label: string }> = [
		{ id: 'thick', label: 'תיבה עבה‑דופן' },
		{ id: 'thin', label: 'תיבה דקה‑דופן' },
		{ id: 'rounded', label: 'תיבה מעוגלת' },
		{ id: 'taper', label: 'תיבה מצטמצמת' },
		{ id: 'ridge', label: 'דגם רכס מרכזי' },
		{ id: 'wedge', label: 'דגם אלכסוני' },
	];

	const a11y = (id: BoxId) =>
		id === 'thick'
			? 'דגם עבה'
			: id === 'thin'
			? 'דגם דק'
			: id === 'rounded'
			? 'דגם מעוגל'
			: id === 'taper'
			? 'דגם מצטמצם'
			: id === 'wedge'
			? 'דגם אלכסוני'
			: id === 'ridge'
			? 'דגם רכס מרכזי'
			: 'דגם תיבה';

	const short = (id: BoxId) =>
		id === 'thick'
			? 'עבה'
			: id === 'thin'
			? 'דק'
			: id === 'rounded'
			? 'מעוגל'
			: id === 'taper'
			? 'מצטמצם'
			: id === 'wedge'
			? 'אלכסוני'
			: id === 'ridge'
			? 'רכס'
			: 'תיבה';

	return (
		<div className="p-2 pt-1">
			<div className="flex flex-wrap justify-center gap-6">
				{options.map(opt => (
					<div key={opt.id} className="flex flex-col items-center">
						<button
							aria-label={a11y(opt.id)}
							title={a11y(opt.id)}
							className={`w-[52px] h-[52px] inline-flex items-center justify-center bg-transparent border-0 ${box === opt.id ? 'text-[#1a1a2e]' : 'text-gray-500 hover:text-gray-700'}`}
							onClick={() => setBox(opt.id)}
						>
							{opt.id === 'thick' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<rect x="1" y="16" width="50" height="20" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<rect x="1" y="16" width="50" height="20" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
								</svg>
							) : opt.id === 'thin' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<rect x="1" y="20" width="50" height="12" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<rect x="1" y="20" width="50" height="12" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
								</svg>
							) : opt.id === 'rounded' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<rect x="4" y="18" width="44" height="16" rx="8" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<rect x="4" y="18" width="44" height="16" rx="8" stroke="currentColor" strokeWidth="2" fill="none" />
								</svg>
							) : opt.id === 'taper' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<polygon points="6,34 46,30 46,20 6,18" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<polygon points="6,34 46,30 46,20 6,18" fill="none" stroke="currentColor" strokeWidth="2" />
								</svg>
							) : opt.id === 'wedge' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<g transform="rotate(180 26 26)">
										{/* טריז: צד שמאל גבוה, צד ימין נמוך */}
										<polygon points="6,14 46,22 46,38 6,38" fill={box === opt.id ? '#F2E9E3' : 'none'} />
										<polygon points="6,14 46,22 46,38 6,38" fill="none" stroke="currentColor" strokeWidth="2" />
										{/* קו עזר עליון כדי להדגיש את האלכסון */}
										<path d="M6 14 L46 22" stroke="currentColor" strokeWidth="2" fill="none" />
									</g>
								</svg>
							) : opt.id === 'ridge' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<g transform="rotate(180 26 26)">
										{/* רכס: רק משולש */}
										<polygon
											points="2,34 26,18 50,34"
											fill={box === opt.id ? '#F2E9E3' : 'none'}
											stroke="currentColor"
											strokeWidth="2"
										/>
									</g>
								</svg>
							) : (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<rect x="6" y="18" width="40" height="16" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<rect x="6" y="18" width="40" height="16" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
									<rect x="6" y="18" width="2" height="16" fill="currentColor" />
									<rect x="44" y="18" width="2" height="16" fill="currentColor" />
								</svg>
							)}
							<span className="sr-only">{opt.label}</span>
						</button>
						<span className="mt-1 text-xs text-gray-600">{short(opt.id)}</span>
					</div>
				))}
			</div>
		</div>
	);
}
