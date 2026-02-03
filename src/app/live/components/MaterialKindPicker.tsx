import React from 'react';

type MaterialKind = 'wood' | 'metal' | 'stone';

export function MaterialKindPicker(props: {
	activeMaterial: MaterialKind;
	onChange: (m: MaterialKind) => void;
}) {
	const { activeMaterial, onChange } = props;
	return (
		<div className="p-3">
			<div className="flex flex-wrap justify-center gap-2 text-center">
				{(['wood', 'metal', 'stone'] as const).map(m => (
					<button
						key={m}
						className={`px-4 py-2 text-base rounded-full border ${activeMaterial === m ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
						onClick={() => onChange(m)}
					>
						{m === 'wood' ? '׳¢׳¥' : m === 'metal' ? '׳׳×׳›׳×' : '׳׳‘׳ ׳˜׳‘׳¢׳™׳×'}
					</button>
				))}
			</div>
		</div>
	);
}
