import React from 'react';

type WoodModel = { id: string; name?: string; images: string[] };
type Swatch = { id: string; label: string };
type ActiveModelLike = { variants?: Record<string, string[]> };

const PREVIEW_SIZE = 180;
const COLOR_CIRCLE_SIZE = 36;

function ColorCircle(props: {
	img?: string;
	solid?: string;
	label: string;
	active: boolean;
	onClick: () => void;
}) {
	const { img, solid, label, active, onClick } = props;
	return (
		<button
			type="button"
			aria-label={label}
			title={label}
			onClick={onClick}
			className={`w-9 h-9 rounded-full border-2 cursor-pointer transition-transform duration-200 hover:scale-110 shrink-0 ${active ? 'ring-2 ring-[#1a1a2e]' : ''}`}
			style={{
				backgroundImage: img ? `url("${encodeURI(img)}")` : undefined,
				backgroundColor: img ? undefined : solid,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				borderColor: '#ddd',
				width: COLOR_CIRCLE_SIZE,
				height: COLOR_CIRCLE_SIZE,
			}}
		/>
	);
}

export function WoodTexturePicker(props: {
	woodModels: WoodModel[];
	activeModelId: string | null;
	onPick: (id: string) => void;
	swatches?: Swatch[];
	activeModel?: ActiveModelLike | null;
	activeColor?: string;
	colorHex?: Record<string, string>;
	onPickColor?: (id: string) => void;
}) {
	const { woodModels, activeModelId, onPick, swatches, activeModel, activeColor, colorHex, onPickColor } = props;
	const [hoveredId, setHoveredId] = React.useState<string | null>(null);
	const showId = hoveredId ?? activeModelId ?? woodModels[0]?.id;
	const show = woodModels.find(m => m.id === showId) ?? woodModels[0];
	const colorItems = (swatches && activeModel && activeColor != null && colorHex && onPickColor)
		? swatches.filter(sw => !!activeModel?.variants?.[sw.id]).slice(0, 4)
		: [];
	return (
		<div className="p-2 pt-1">
			<div className="flex flex-row items-start gap-4 flex-wrap">
				<div className="flex flex-wrap justify-center gap-4 text-center min-w-0 flex-1">
				{woodModels.map(m => (
					<div key={m.id} className="flex flex-col items-center w-16">
						<button
							aria-label={m.name || m.id}
							title={m.name || m.id}
							onClick={() => onPick(m.id)}
							onMouseEnter={() => setHoveredId(m.id)}
							onMouseLeave={() => setHoveredId(null)}
							className={`w-[52px] h-[52px] rounded-full border-2 bg-center bg-cover cursor-pointer transition-transform duration-200 hover:scale-110 ${activeModelId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
						/>
						<span className="mt-1 text-[11px] text-gray-600 truncate w-16">{m.name || m.id}</span>
					</div>
				))}
				</div>
				{show && (
					<div className="flex flex-row items-center gap-3 shrink-0 overflow-visible" dir="rtl">
						<div className="flex flex-col items-center overflow-visible">
							<span className="text-xs font-semibold text-[#1a1a2e]/70 mb-2">תצוגה מקדימה – איך החומר נראה</span>
							<div
								className="rounded-full border-2 border-[#1a1a2e]/20 bg-center bg-cover shadow-inner transition-transform duration-200 origin-center hover:scale-[2] cursor-pointer"
								style={{
									width: PREVIEW_SIZE,
									height: PREVIEW_SIZE,
									backgroundImage: show.images?.[0] ? `url("${encodeURI(show.images[0])}")` : undefined,
									backgroundColor: show.images?.[0] ? undefined : '#e5e5e5',
								}}
							/>
							<span className="mt-2 text-sm font-medium text-[#1a1a2e]">{show.name || show.id}</span>
						</div>
						{colorItems.length > 0 && (
							<div className="grid grid-cols-2 grid-rows-2 gap-2.5 me-auto">
								{colorItems.map(sw => (
									<ColorCircle
										key={sw.id}
										img={activeModel?.variants?.[sw.id]?.[0]}
										solid={colorHex?.[sw.id]}
										label={sw.label}
										active={activeColor === sw.id}
										onClick={() => onPickColor?.(sw.id)}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
