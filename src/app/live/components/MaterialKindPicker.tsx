import React from 'react';

export type MaterialKind = 'wood' | 'metal' | 'stone';

/** MIRZA: בורסה רק אבן טבעית ו-Artistic Metals – אין אופציית עץ. */
const MATERIAL_OPTIONS: ('metal' | 'stone')[] = ['stone', 'metal'];

const LABELS: Record<'metal' | 'stone', string> = {
	metal: 'מתכת',
	stone: 'אבן טבעית',
};

export function MaterialKindPicker(props: {
	activeMaterial: MaterialKind;
	onChange: (m: MaterialKind) => void;
}) {
	const { activeMaterial, onChange } = props;
	const effective: 'metal' | 'stone' = activeMaterial === 'wood' ? 'stone' : (activeMaterial === 'metal' ? 'metal' : 'stone');
	return (
		<div className="p-3">
			<div className="flex flex-wrap justify-center gap-2 text-center">
				{MATERIAL_OPTIONS.map(m => (
					<button
						key={m}
						className={`px-4 py-2 text-base rounded-full border cursor-pointer ${effective === m ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
						onClick={() => onChange(m)}
					>
						{LABELS[m]}
					</button>
				))}
			</div>
		</div>
	);
}
