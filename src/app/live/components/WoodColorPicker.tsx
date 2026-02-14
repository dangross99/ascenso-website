import React from 'react';

type Swatch = { id: string; label: string };

type ActiveModelLike = {
	variants?: Record<string, string[]>;
};

export function WoodColorPicker(props: {
	swatches: Swatch[];
	activeModel: ActiveModelLike | null;
	activeColor: string;
	colorHex: Record<string, string>;
	onPick: (id: string) => void;
}) {
	const { swatches, activeModel, activeColor, colorHex, onPick } = props;
	const items = swatches.filter(sw => !!activeModel?.variants?.[sw.id]);
	if (items.length === 0) return null;
	return (
		<div className="pt-1 pb-1">
			<span className="text-xs font-semibold text-[#1a1a2e]/70 block mb-1.5 text-center">גוון</span>
			<div className="flex items-center justify-center gap-2 flex-wrap">
				{items.map(sw => {
					const img = activeModel?.variants?.[sw.id]?.[0];
					const solid = colorHex[sw.id];
					return (
						<div key={sw.id} className="flex flex-col items-center">
							<button
								aria-label={sw.label}
								title={sw.label}
								onClick={() => onPick(sw.id)}
								className={`w-9 h-9 rounded-full border-2 cursor-pointer transition-transform duration-200 hover:scale-110 ${activeColor === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
								style={{
									backgroundImage: img ? `url("${encodeURI(img)}")` : undefined,
									backgroundColor: img ? undefined : solid,
									backgroundSize: 'cover',
									backgroundPosition: 'center',
									borderColor: '#ddd',
								}}
							/>
							<span className="mt-0.5 text-[10px] text-gray-600 truncate max-w-[2.5rem]">{sw.label}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
