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
	return (
		<div className="p-2 pt-1">
			<div className="flex items-center justify-center gap-4 flex-wrap text-center">
				{items.map(sw => {
					const img = activeModel?.variants?.[sw.id]?.[0];
					const solid = colorHex[sw.id];
					return (
						<div key={sw.id} className="flex flex-col items-center w-16">
							<button
								aria-label={sw.label}
								title={sw.label}
								onClick={() => onPick(sw.id)}
								className={`w-[52px] h-[52px] rounded-full border-2 cursor-pointer ${activeColor === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
								style={{
									backgroundImage: img ? `url("${encodeURI(img)}")` : undefined,
									backgroundColor: img ? undefined : solid,
									backgroundSize: 'cover',
									backgroundPosition: 'center',
									borderColor: '#ddd',
								}}
							/>
							<span className="mt-1 text-[11px] text-gray-600 truncate w-16">{sw.label}</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
