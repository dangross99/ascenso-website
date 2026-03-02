import React from 'react';

export type MaterialKind = 'metal' | 'stone';

const MATERIAL_OPTIONS: MaterialKind[] = ['stone', 'metal'];

const LABELS: Record<MaterialKind, string> = {
	metal: 'מתכת',
	stone: 'אבן טבעית',
};

export function MaterialKindPicker(props: {
	activeMaterial: MaterialKind;
	onChange: (m: MaterialKind) => void;
}) {
	const { activeMaterial, onChange } = props;
	return (
		<div className="p-3">
			<div className="flex flex-wrap justify-center gap-2 text-center">
				{MATERIAL_OPTIONS.map(m => (
					<button
						key={m}
						className={`px-4 py-2 text-base rounded-full border cursor-pointer ${activeMaterial === m ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
						onClick={() => onChange(m)}
					>
						{LABELS[m]}
					</button>
				))}
			</div>
		</div>
	);
}
