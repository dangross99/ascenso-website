import React from 'react';

type NonWoodModel = { id: string; name?: string; images?: string[] } & Record<string, any>;

const PREVIEW_SIZE = 140;

export function NonWoodTexturePicker(props: {
	nonWoodModels: NonWoodModel[];
	activeTexId: string | null;
	onPick: (id: string) => void;
}) {
	const { nonWoodModels, activeTexId, onPick } = props;
	const [hoveredId, setHoveredId] = React.useState<string | null>(null);
	const showId = hoveredId ?? activeTexId ?? nonWoodModels[0]?.id;
	const show = nonWoodModels.find(m => m.id === showId) ?? nonWoodModels[0];
	return (
		<div className="p-2 pt-1">
			<div className="flex flex-row items-start gap-4 flex-wrap">
				<div className="flex flex-wrap justify-center gap-4 text-center min-w-0 flex-1">
				{nonWoodModels.map(m => (
					<div key={m.id} className="flex flex-col items-center w-20">
						<button
							aria-label={m.name || m.id}
							title={m.name || m.id}
							onClick={() => onPick(m.id)}
							onMouseEnter={() => setHoveredId(m.id)}
							onMouseLeave={() => setHoveredId(null)}
							className={`w-[52px] h-[52px] rounded-full border-2 bg-center bg-cover cursor-pointer transition-transform duration-200 hover:scale-110 ${activeTexId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{
								backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined,
								backgroundColor: (!m.images || m.images.length === 0) && m.solid ? m.solid : undefined,
								borderColor: '#ddd',
							}}
						/>
						<span className="mt-1 text-[11px] text-gray-600 truncate w-20">{m.name || m.id}</span>
					</div>
				))}
				</div>
				{show && (
					<div className="flex flex-col items-center shrink-0">
						<span className="text-xs font-semibold text-[#1a1a2e]/70 mb-2">תצוגה מקדימה – איך החומר נראה</span>
						<div
							className="rounded-full border-2 border-[#1a1a2e]/20 bg-center bg-cover shadow-inner"
							style={{
								width: PREVIEW_SIZE,
								height: PREVIEW_SIZE,
								backgroundImage: show.images?.[0] ? `url("${encodeURI(show.images[0])}")` : undefined,
								backgroundColor: (!show.images || show.images.length === 0) && show.solid ? show.solid : undefined,
							}}
						/>
						<span className="mt-2 text-sm font-medium text-[#1a1a2e]">{show.name || show.id}</span>
					</div>
				)}
			</div>
		</div>
	);
}
