import React from 'react';

export type MaterialKind = 'wood' | 'metal' | 'stone';

const MATERIAL_OPTIONS: MaterialKind[] = ['metal', 'stone'];

export function MaterialKindPicker(props: {
	activeMaterial: MaterialKind;
	onChange: (m: MaterialKind) => void;
}) {
	const { activeMaterial, onChange } = props;
	const effective = activeMaterial === 'wood' ? 'stone' : activeMaterial;
	return (
		<div className="p-3">
			<div className="flex flex-wrap justify-center gap-2 text-center">
				{MATERIAL_OPTIONS.map(m => (
					<button
						key={m}
						className={`px-4 py-2 text-base rounded-full border cursor-pointer ${effective === m ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
						onClick={() => onChange(m)}
					>
						{m === 'metal' ? 'מתכת' : 'אבן טבעית'}
					</button>
				))}
			</div>
		</div>
	);
}
