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
	const [hoveredId, setHoveredId] = React.useState<string | null>(null);
	const showId = hoveredId ?? activeColor ?? items[0]?.id;
	const showSwatch = items.find(sw => sw.id === showId) ?? items[0];
	const showImg = showSwatch ? activeModel?.variants?.[showSwatch.id]?.[0] : undefined;
	const showSolid = showSwatch ? colorHex[showSwatch.id] : undefined;
	const PREVIEW_SIZE = 140;
	return (
		<div className="p-2 pt-1">
			<div className="flex flex-row items-start gap-4 flex-wrap">
				<div className="flex items-center justify-center gap-4 flex-wrap text-center min-w-0 flex-1">
				{items.map(sw => {
					const img = activeModel?.variants?.[sw.id]?.[0];
					const solid = colorHex[sw.id];
					return (
						<div key={sw.id} className="flex flex-col items-center w-16">
							<button
								aria-label={sw.label}
								title={sw.label}
								onClick={() => onPick(sw.id)}
								onMouseEnter={() => setHoveredId(sw.id)}
								onMouseLeave={() => setHoveredId(null)}
								className={`w-[52px] h-[52px] rounded-full border-2 cursor-pointer transition-transform duration-200 hover:scale-110 ${activeColor === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
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
				{showSwatch && (
					<div className="flex flex-col items-center shrink-0">
						<span className="text-xs font-semibold text-[#1a1a2e]/70 mb-2">תצוגה מקדימה – איך הגוון נראה</span>
						<div
							className="rounded-full border-2 border-[#1a1a2e]/20 bg-center bg-cover shadow-inner"
							style={{
								width: PREVIEW_SIZE,
								height: PREVIEW_SIZE,
								backgroundImage: showImg ? `url("${encodeURI(showImg)}")` : undefined,
								backgroundColor: showImg ? undefined : showSolid,
								backgroundSize: 'cover',
								backgroundPosition: 'center',
							}}
						/>
						<span className="mt-2 text-sm font-medium text-[#1a1a2e]">{showSwatch.label}</span>
					</div>
				)}
			</div>
		</div>
	);
}
