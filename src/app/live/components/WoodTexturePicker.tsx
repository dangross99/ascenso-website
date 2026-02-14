import React from 'react';

type WoodModel = { id: string; name?: string; images: string[] };

export function WoodTexturePicker(props: {
	woodModels: WoodModel[];
	activeModelId: string | null;
	onPick: (id: string) => void;
}) {
	const { woodModels, activeModelId, onPick } = props;
	return (
		<div className="p-2 pt-1">
			<div className="flex flex-wrap justify-center gap-4 text-center">
				{woodModels.map(m => (
					<div key={m.id} className="flex flex-col items-center w-16">
						<button
							aria-label={m.name || m.id}
							title={m.name || m.id}
							onClick={() => onPick(m.id)}
							className={`w-[52px] h-[52px] rounded-full border-2 bg-center bg-cover cursor-pointer transition-transform duration-200 hover:scale-150 ${activeModelId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
						/>
						<span className="mt-1 text-[11px] text-gray-600 truncate w-16">{m.name || m.id}</span>
					</div>
				))}
			</div>
		</div>
	);
}
