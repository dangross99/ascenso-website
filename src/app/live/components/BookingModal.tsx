import React from 'react';
import { BrandWordmark } from './BrandWordmark';

type BookingStep = 'name' | 'city' | 'date' | 'time';

type TwoWeeksDate = { value: string; label: string; weekday: string; disabled: boolean };

export function BookingModal(props: {
	open: boolean;
	isKeyboardOpen: boolean;
	bookingSubmitted: boolean;
	bookingStep: BookingStep;
	stepIndex: number;
	stepTotal: number;
	stepPercent: number;
	answerWidthPx: number | null;
	twoWeeksDates: TwoWeeksDate[];
	preferredDate: string;
	preferredTime: string;
	fullName: string;
	city: string;
	cityOptions: string[];
	setBookingOpen: (v: boolean) => void;
	setBookingSubmitted: (v: boolean) => void;
	setBookingStep: (s: BookingStep) => void;
	setFullName: (v: string) => void;
	setCity: (v: string) => void;
	setPreferredDate: (v: string) => void;
	setPreferredTime: (v: string) => void;
	handleBookingSubmit: (e: React.FormEvent) => void;
	refs: {
		dialogRef: React.RefObject<HTMLDivElement | null>;
		firstInputRef: React.RefObject<HTMLInputElement | null>;
		cityInputRef: React.RefObject<HTMLInputElement | null>;
		questionRef: React.RefObject<HTMLDivElement | null>;
	};
}) {
	const {
		open,
		isKeyboardOpen,
		bookingSubmitted,
		bookingStep,
		stepIndex,
		stepTotal,
		stepPercent,
		answerWidthPx,
		twoWeeksDates,
		preferredDate,
		preferredTime,
		fullName,
		city,
		cityOptions,
		setBookingOpen,
		setBookingStep,
		setFullName,
		setCity,
		setPreferredDate,
		setPreferredTime,
		handleBookingSubmit,
		refs,
	} = props;

	if (!open) return null;

	return (
		<div
			className={`fixed inset-0 z-[70] bg-[#0b1020]/70 backdrop-blur-sm flex ${isKeyboardOpen ? 'items-start pt-6' : 'items-center'} justify-center p-4 overscroll-contain`}
			dir="rtl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="bookingTitle"
			onKeyDown={(e) => {
				if (e.key === 'Escape') setBookingOpen(false);
			}}
			onClick={() => setBookingOpen(false)}
		>
			<div
				ref={refs.dialogRef}
				className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl border border-[#C5A059]/30 max-h-[90dvh]"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="px-5 py-4 bg-[#1a1a2e] text-white relative border-b border-[#C5A059]/30">
					<div className="text-center" aria-label="ASCENSO logo">
						<BrandWordmark size="md" color="#ffffff" />
					</div>
				</div>

				{!bookingSubmitted ? (
					<form onSubmit={handleBookingSubmit} className="bg-[#f6f7fb] text-[#0f1424] p-6">
						<div className="mb-4">
							<div className="flex items-center justify-between text-xs md:text-sm text-[#0f1424]/70" dir="rtl">
								<span>שלב {stepIndex + 1} מתוך {stepTotal}</span>
								<span>{stepPercent}%</span>
							</div>
							<div className="h-1.5 bg-black/10 rounded-full overflow-hidden mt-1">
								<div className="h-full bg-[#1a1a2e]" style={{ width: `${stepPercent}%` }} />
							</div>
						</div>

						<div className="mb-2 relative flex justify-center">
							<div className="absolute left-2 md:left-4 lg:left-20 top-1/2 -translate-y-1/2 mt-1 pointer-events-none text-[#0f1424]">
								<svg
									className="w-[2.72rem] h-[2.72rem] md:w-[3.2rem] md:h-[3.2rem]"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
									aria-hidden="true"
								>
									<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
									<line x1="16" y1="2" x2="16" y2="6"></line>
									<line x1="8" y1="2" x2="8" y2="6"></line>
									<line x1="3" y1="10" x2="21" y2="10"></line>
								</svg>
							</div>
							<div className="flex flex-col items-center w-full">
								<div className="leading-relaxed text-[1.35rem] md:text-[1.6875rem] font-semibold text-center">באיזה תאריך נוח לך להיפגש?</div>
									<div className="text-[#0f1424]/80 leading-relaxed text-base md:text-lg text-center">מה המועד הנוח לך להיפגש</div>
							</div>
						</div>

						<div className="grid grid-cols-1 gap-4">
							<div className="flex items-start mt-1 md:mt-2">
								<div ref={refs.questionRef} className="bg-[#1a1a2e] text-white rounded-2xl px-4 py-2 text-base md:text-lg leading-snug inline-block">
									{bookingStep === 'name' ? 'מה שמך?' : bookingStep === 'city' ? 'איזו עיר?' : bookingStep === 'date' ? 'מתי נוח לך לתאם?' : 'איזה שעות נוח לך לבחור?'}
								</div>
							</div>

							{bookingStep === 'name' && (
								<div className="block" style={answerWidthPx ? { width: answerWidthPx } : undefined}>
									<label className="block" htmlFor="fullName">
										<input
											id="fullName"
											type="text"
											required
											value={fullName}
											onChange={(e) => setFullName(e.target.value)}
											ref={refs.firstInputRef}
											className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059]"
											placeholder="שם מלא (או חברה)"
										/>
									</label>
								</div>
							)}

							{bookingStep === 'city' && (
								<div className="block" style={answerWidthPx ? { width: answerWidthPx } : undefined}>
									<label className="block" htmlFor="city">
										<input
											id="city"
											type="text"
											value={city}
											onChange={(e) => setCity(e.target.value)}
											ref={refs.cityInputRef}
											list="city-list"
											className="mt-1 w-full rounded-2xl bg-white text-[#0f1424] border border-[#C5A059]/40 px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C5A059] focus:border-[#C5A059] appearance-none"
											style={{ backgroundImage: 'none' }}
											placeholder="עיר: הקלד או בחר"
										/>
										<datalist id="city-list">
											{cityOptions.map((opt) => (<option value={opt} key={opt} />))}
										</datalist>
									</label>
								</div>
							)}

							{bookingStep === 'date' && (
								<div className="mt-1 rounded-2xl border border-[#C5A059]/40 bg-white text-[#0f1424] w-full">
									{(() => {
										const rows = Math.max(1, Math.ceil(twoWeeksDates.length / 2));
										return (
											<div className="grid grid-cols-2 grid-flow-col gap-1 p-2 rounded-2xl" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, height: '12rem' }}>
												{twoWeeksDates.map(d => (
													<label key={d.value} className={`flex items-center justify-between px-2 py-1 rounded-lg border ${d.disabled ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' : 'cursor-pointer hover:bg-gray-50 border-gray-200'}`}>
														<span className="text-xs md:text-sm">{d.weekday} – {d.label}</span>
														<input type="radio" name="preferredDate" value={d.value} checked={preferredDate === d.value} onChange={() => !d.disabled && setPreferredDate(d.value)} disabled={d.disabled} />
													</label>
												))}
											</div>
										);
									})()}
								</div>
							)}

							{bookingStep === 'time' && (
								<div className="mt-1 rounded-2xl border border-[#C5A059]/40 bg-white text-[#0f1424] w-full">
									<div className="grid grid-cols-3 gap-2 p-2 rounded-2xl">
										{[8, 11, 14].map((start) => {
											const end = start + 3;
											const to2 = (n: number) => n.toString().padStart(2, '0');
											const label = `${to2(start)}:00–${to2(end)}:00`;
											return (
												<label key={label} className="flex items-center justify-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-2xl border border-gray-200">
													<input type="radio" name="preferredTime" value={label} checked={preferredTime === label} onChange={() => setPreferredTime(label)} />
													<span className="text-sm">{label}</span>
												</label>
											);
										})}
									</div>
								</div>
							)}
						</div>

						<div className="mt-6 flex flex-col sm:flex-row gap-2">
							<div className="flex w-full gap-2">
								<button
									type="button"
									onClick={() => {
										const steps: BookingStep[] = ['name', 'city', 'date', 'time'];
										const i = steps.indexOf(bookingStep);
										if (i > 0) setBookingStep(steps[i - 1]);
									}}
									disabled={bookingStep === 'name'}
									className="flex-1 px-5 py-3 rounded-md font-semibold border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
								>
									הקודם
									</button>

								{bookingStep !== 'time' ? (
									<button
										type="button"
										onClick={(e) => {
											e.preventDefault();
											e.stopPropagation();
											const steps: BookingStep[] = ['name', 'city', 'date', 'time'];
											const i = steps.indexOf(bookingStep);
											if (i < steps.length - 1) setTimeout(() => setBookingStep(steps[i + 1]), 0);
										}}
										disabled={
											(bookingStep === 'name' && !(fullName && fullName.trim().length > 1)) ||
											(bookingStep === 'city' && !city) ||
											(bookingStep === 'date' && !preferredDate)
										}
										className="flex-1 px-5 py-3 rounded-md font-semibold text-white bg-[#1a1a2e] hover:opacity-95 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
									>
									המשך
									</button>
								) : (
									<button
										type="submit"
										disabled={!preferredTime || !preferredDate || !(fullName && fullName.trim().length > 1) || !city}
										className="flex-1 px-5 py-3 rounded-md font-semibold text-white bg-[#25D366] hover:bg-[#20c15b] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
									>
										<span className="inline-flex items-center justify-center gap-2">
											<span>שלח</span>
											<svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
												<path d="M20.52 3.48A11.77 11.77 0 0 0 12.02 0C5.4 0 .02 5.37.02 12c0 2.11.55 4.17 1.6 6L0 24l6.14-1.6a11.98 11.98 0 0 0 5.88 1.52h.01c6.62 0 12-5.37 12-12 0-3.2-1.25-6.21-3.51-8.39zM12.02 22a9.96 9.96 0 0 1-5.08-1.39l-.36-.21-3.64.95.97-3.55-.24-.37A9.95 9.95 0 0 1 2.02 12C2.02 6.51 6.53 2 12.02 2c2.66 0 5.16 1.04 7.04 2.92A9.9 9.9 0 0 1 22.02 12c0 5.49-4.51 10-10 10z"/>
												<path d="M17.48 14.11c-.3-.15-1.77-.87-2.05-.97-.27-.1-.47-.15-.67.15-.19.3-.76.98-.93 1.17-.17.2-.35.22-.65.08-.3-.14-1.27-.47-2.41-1.5-.89-.79-1.49-1.77-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.37.45-.56.15-.18.2-.31.3-.51.1-.2.05-.37-.02-.52-.07-.14-.67-1.63-.92-2.23-.24-.6-.49-.52-.66-.53l-.57-.01c-.19 0-.5.07-.77.36s-1.01 1.02-1.01 2.49 1.04 2.88 1.19 3.08c.14.2 2.04 3.18 4.96 4.47.7.3 1.24.49 1.66.62.7.22 1.33.2 1.84.13.56-.08 1.75-.71 2-1.41.24-.7.24-1.29.17-1.41-.07-.12-.27-.2-.56-.34z"/>
											</svg>
										</span>
									</button>
								)}
							</div>
						</div>
					</form>
				) : (
					<div className="bg-white text-[#0f1424] p-8 text-center">
						<div className="mx-auto mb-4 w-14 h-14 rounded-full border-2 border-[#22c55e] bg-[#22c55e]/10 flex items-center justify-center">
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" aria-hidden="true">
								<path d="M20 6L9 17l-5-5" />
							</svg>
						</div>
						<p className="text-xl font-semibold mb-1">תודה שפנית אלינו</p>
						<p className="text-gray-600">נחזור אליך בהקדם לקבוע פגישה.</p>
						<div className="mt-6">
							<button onClick={() => setBookingOpen(false)} className="inline-flex justify-center items-center px-6 py-3 rounded-md font-semibold text-white bg-[#1a1a2e] hover:opacity-95 cursor-pointer">
									סגור
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
