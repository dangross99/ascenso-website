import React from 'react';

type BoxId = 'thick' | 'thin' | 'wedge' | 'ridge' | 'hitech' | 'accordion';

export function BoxPicker(props: {
	box: BoxId;
	setBox: (id: BoxId) => void;
}) {
	const { box, setBox } = props;
	const options: Array<{ id: BoxId; label: string }> = [
		{ id: 'thick', label: '׳×׳™׳‘׳” ׳¢׳‘׳”ג€‘׳“׳•׳₪׳' },
		{ id: 'thin', label: '׳×׳™׳‘׳” ׳“׳§׳”ג€‘׳“׳•׳₪׳' },
		{ id: 'wedge', label: '׳“׳’׳ ׳׳׳›׳¡׳•׳ ׳™' },
		{ id: 'ridge', label: '׳“׳’׳ ׳¨׳›׳¡ ׳׳¨׳›׳–׳™' },
		{ id: 'hitech', label: '׳“׳’׳ ׳”׳™׳™׳˜׳§' },
		{ id: 'accordion', label: '׳“׳’׳ ׳׳§׳•׳¨׳“׳™׳•׳' },
	];

	const a11y = (id: BoxId) =>
		id === 'thick'
			? '׳“׳’׳ ׳¢׳‘׳”'
			: id === 'thin'
			? '׳“׳’׳ ׳“׳§'
			: id === 'wedge'
			? '׳“׳’׳ ׳׳׳›׳¡׳•׳ ׳™'
			: id === 'ridge'
			? '׳“׳’׳ ׳¨׳›׳¡ ׳׳¨׳›׳–׳™'
			: id === 'accordion'
			? '׳“׳’׳ ׳׳§׳•׳¨׳“׳™׳•׳'
			: '׳“׳’׳ ׳”׳™׳™׳˜׳§';

	const short = (id: BoxId) =>
		id === 'thick' ? '׳¢׳‘׳”' : id === 'thin' ? '׳“׳§' : id === 'wedge' ? '׳׳׳›׳¡׳•׳ ׳™' : id === 'ridge' ? '׳¨׳›׳¡' : id === 'accordion' ? '׳׳§׳•׳¨׳“׳™׳•׳' : '׳”׳™׳™׳˜׳§';

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
							) : opt.id === 'wedge' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<polygon points="6,36 46,30 46,22 6,16" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<polygon points="6,36 46,30 46,22 6,16" fill="none" stroke="currentColor" strokeWidth="2" />
								</svg>
							) : opt.id === 'ridge' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<rect x="1" y="16" width="50" height="20" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<rect x="1" y="16" width="50" height="20" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
									<path d="M2 26 L26 18 L50 26" stroke="currentColor" strokeWidth="2" fill="none" />
								</svg>
							) : opt.id === 'accordion' ? (
								<svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true">
									<rect x="1" y="14" width="50" height="24" rx="0" fill={box === opt.id ? '#F2E9E3' : 'none'} />
									<path d="M8 20 L20 20 L20 30 L32 30 L32 22 L44 22" stroke="currentColor" strokeWidth="2" fill="none" />
									<path d="M8 32 L20 32 L20 22 L32 22 L32 30 L44 30" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.6" />
									<rect x="1" y="14" width="50" height="24" rx="0" stroke="currentColor" strokeWidth="2" fill="none" />
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
