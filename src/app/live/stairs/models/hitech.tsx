import React from 'react';

export function HitechPlates(props: {
	hitech?: boolean;
	treads: any[];
	treadWidth: number;
	treadDepth: number;
	treadThickness: number;
	riser: number;
	floorBounds: { cx: number; cz: number; w: number; h: number; y: number };
	landingWidth: number;
	hitechPlateThickness?: number;
	hitechPlateTopOffsetM?: number;
	hitechPlateInsetFromEdge?: number;
	shouldRenderClosingCapForFlight: (flightIdx: number) => boolean;
	hitechBStartRef: React.MutableRefObject<{ top: [number, number, number]; bot: [number, number, number] } | null>;
	hitechCStartRef: React.MutableRefObject<{ top: [number, number, number]; bot: [number, number, number] } | null>;
}) {
	const {
		hitech,
		treads,
		treadWidth,
		treadDepth,
		treadThickness,
		riser,
		floorBounds,
		landingWidth,
		hitechPlateThickness,
		hitechPlateTopOffsetM,
		hitechPlateInsetFromEdge,
		shouldRenderClosingCapForFlight,
		hitechBStartRef,
		hitechCStartRef,
	} = props;

	if (!hitech) return null;

	return (
		<>			{/* דגם 'הייטק' – קווי עזר: גרם 1 בלבד
			    קו A: חיבור כל נקודות 4 (כולל פודסט ראשון)
			    קו B: חיבור כל נקודות 7 (ללא פודסט ראשון) */}
			{hitech ? (() => {
				// אסוף מדרגות של גרם ראשון (flight=0)
				const flightIdx = 0;
				const cosSin = (yaw: number) => ({ c: Math.cos(yaw), s: Math.sin(yaw) });
				const pts4Off: number[] = [];
				const pts7Off: number[] = [];
				const topStepOff: Array<[number, number, number]> = [];    // נקודות 4‑offset לכל מדרגה (ללא פודסט)
				const bottomStepOff: Array<[number, number, number]> = []; // נקודות 7‑offset לכל מדרגה
				const offsetY = Math.max(0, (typeof hitechPlateTopOffsetM === 'number' ? hitechPlateTopOffsetM : 0.03)); // היסט אנכי מהמשטח
				let firstP4: [number, number, number] | null = null;
				let firstP7: [number, number, number] | null = null;
				let firstYaw: number | null = null;
				let firstStepIdxInFlight: number | null = null; // אינדקס המדרגה הראשונה בגרם 2
				let closeP4: [number, number, number] | null = null; // נקודת 4 (פודסט ראשון) באופסט
				let closeP7: [number, number, number] | null = null; // נקודת 7 (מדרגה לפני הפודסט) באופסט
				let closeP8: [number, number, number] | null = null; // נקודת 8 (מדרגה לפני הפודסט) באופסט
				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					if (t.flight !== flightIdx) continue;
					const yaw = t.rotation[1] as number;
					const { c, s } = cosSin(yaw);
					const dx = t.run / 2;
					const dz = treadWidth / 2;
					// נקודה 4 – עליונה שמאל-קדימה: (-dx, +dz, yTop)
					let p4w: [number, number, number] | null = null;
					let p7w: [number, number, number] | null = null;
					{
						const lx = -dx, lz = dz;
						const rx = lx * c - lz * s;
						const rz = lx * s + lz * c;
						const wx = t.position[0] + rx;
						const wy = t.position[1] + treadThickness / 2;
						const wz = t.position[2] + rz;
						p4w = [wx, wy + offsetY, wz];
						pts4Off.push(p4w[0], p4w[1], p4w[2]);
						if (!t.isLanding && !firstP4) { firstP4 = p4w; if (firstStepIdxInFlight === null) firstStepIdxInFlight = i; }
						if (!t.isLanding) topStepOff.push(p4w);
					}
					// נקודה 7 – תחתונה ימין-קדימה: (+dx, +dz, yBot) – רק אם לא פודסט
					if (!t.isLanding) {
						const lx = dx, lz = dz;
						const rx = lx * c - lz * s;
						const rz = lx * s + lz * c;
						const wx = t.position[0] + rx;
						const wy = t.position[1] - treadThickness / 2;
						const wz = t.position[2] + rz;
						p7w = [wx, wy - offsetY, wz];
						pts7Off.push(p7w[0], p7w[1], p7w[2]);
						if (!firstP7) { firstP7 = p7w; firstYaw = yaw; }
						bottomStepOff.push(p7w);
						// אם המדרגה הבאה היא פודסט – זו המדרגה לפני הפודסט
						const next = treads[i + 1];
						if (next && next.flight === flightIdx && next.isLanding) {
							// קודקוד 7 הוא מהמדרגה הנוכחית (עם אופסט)
							closeP7 = p7w;
							// קודקוד 8 הוא מהמדרגה הנוכחית (עם אופסט) – אותו XZ כמו 4 של אותה מדרגה
							{
								const lx8 = -dx, lz8 = dz;
								const rx8 = lx8 * c - lz8 * s;
								const rz8 = lx8 * s + lz8 * c;
								const wx8 = t.position[0] + rx8;
								const wy8 = t.position[1] - treadThickness / 2 - offsetY;
								const wz8 = t.position[2] + rz8;
								closeP8 = [wx8, wy8, wz8];
							}
							// קודקוד 4 מהפודסט הבא (עם אופסט כלפי מעלה)
							const yaw2 = next.rotation[1] as number;
							const c2 = Math.cos(yaw2), s2 = Math.sin(yaw2);
							const dxL = next.run / 2, dzL = treadWidth / 2;
							const lx2 = -dxL, lz2 = dzL;
							const rx2 = lx2 * c2 - lz2 * s2;
							const rz2 = lx2 * s2 + lz2 * c2;
							const wx2 = next.position[0] + rx2;
							const wy2 = next.position[1] + treadThickness / 2 + offsetY;
							const wz2 = next.position[2] + rz2;
							closeP4 = [wx2, wy2, wz2];
						}
					}
				}
				// אופסט צידי ב‑XZ (Inset מהקצה) – חייב להיות יציב גם כשה‑Y משתנה בין רייזרים.
				// לכן לא נבנה אותו מ"עובי" שנגזר מחפיפות/נק׳ תחתונות, אלא רק מכיוון הגרם ב‑XZ + Up.
				let firstP4SideShift: [number, number, number] | null = null;
				let firstSideShiftVec: [number, number, number] | null = null;
				if (firstP4) {
					// u: כיוון קדימה של הגרם (מ‑firstP4 לנק׳ הבאה אם יש; אחרת לפי yaw)
					let ux = 1, uz = 0;
					if (pts4Off.length >= 6) {
						const x0 = firstP4[0], z0 = firstP4[2];
						const x1 = pts4Off[3], z1 = pts4Off[5];
						ux = x1 - x0; uz = z1 - z0;
					} else if (firstYaw !== null) {
						ux = Math.cos(firstYaw); uz = Math.sin(firstYaw);
					}
					// uH = normalize([ux,0,uz])
					const hm = Math.hypot(ux, uz) || 1;
					const uxH = ux / hm, uzH = uz / hm;
					// sBase = normalize(cross(Up, uH)) = [uzH, 0, -uxH]
					let sx = uzH, sz = -uxH;
					const sm = Math.hypot(sx, sz) || 1;
					sx /= sm; sz /= sm;
					// בחר כיוון יציב "פנימה" ע"י התאמה לוקטור XZ מ‑P4 אל P7 (ללא תלות ב‑Y)
					if (firstP7) {
						const vx = firstP7[0] - firstP4[0];
						const vz = firstP7[2] - firstP4[2];
						const d = sx * vx + sz * vz;
						if (d < 0) { sx = -sx; sz = -sz; }
					}
					const side = Math.max(0, (typeof hitechPlateInsetFromEdge === 'number' ? hitechPlateInsetFromEdge : 0.03));
					firstSideShiftVec = [sx * side, 0, sz * side];
					firstP4SideShift = [firstP4[0] + firstSideShiftVec[0], firstP4[1], firstP4[2] + firstSideShiftVec[2]];
				}

				if (pts4Off.length === 0 && pts7Off.length === 0) return null;
				// הרחבת קו העזר התחתון (5‑offset) בגרם 2: המשך באותו שיפוע עד המישור האנכי של הפוסט הראשון
				let pts7LineArr = pts7Off;
				if (firstP7 && firstYaw !== null) {
					// כיוון הגרם u לפי המדרגה הראשונה בגרם 2
					const ux = Math.cos(firstYaw);
					const uz = Math.sin(firstYaw);
					// מצא את המדרגה האחרונה בגרם 0 שמלפניה מגיע פודסט (פוסט ראשון)
					let anchorStep: typeof treads[number] | null = null;
					for (let k = 0; k < treads.length - 1; k++) {
						const tt = treads[k];
						const next = treads[k + 1];
						if (tt.flight === 0 && !tt.isLanding && next && next.flight === 0 && next.isLanding) {
							anchorStep = tt; break;
						}
					}
					if (anchorStep) {
						const yaw0 = anchorStep.rotation[1] as number;
						const c0 = Math.cos(yaw0), s0 = Math.sin(yaw0);
						const dx0 = anchorStep.run / 2, dz0 = treadWidth / 2;
						// קודקוד 2 של המדרגה בגרם 0: (+dx, -dz) במערכת מקומית
						const lx2 = dx0, lz2 = -dz0;
						const rx2 = lx2 * c0 - lz2 * s0;
						const rz2 = lx2 * s0 + lz2 * c0;
						const p2x = anchorStep.position[0] + rx2;
						const p2z = anchorStep.position[2] + rz2;
						// חיתוך קו דרך firstP7 בכיוון u עם המישור האנכי dot(u, x) = dot(u, p2)
						const dotU = (x: [number, number, number]) => (ux * x[0] + uz * x[2]);
						const planeU = dotU([p2x, 0, p2z]);
						const b0: [number, number, number] = firstP7;
						const t = planeU - dotU(b0);
						const ext: [number, number, number] = [b0[0] + ux * t, b0[1], b0[2] + uz * t];
						pts7LineArr = [ext[0], ext[1], ext[2], ...pts7Off];
					}
				}
				return (
					<group>
						{pts4Off.length >= 6 && (
							<line>
								<bufferGeometry attach="geometry">
									<bufferAttribute attach="attributes-position" args={[new Float32Array(pts4Off), 3]} />
								</bufferGeometry>
								<lineBasicMaterial attach="material" color="#6b7280" linewidth={1} depthTest={false} depthWrite={false} />
							</line>
						)}
						{pts7LineArr.length >= 6 && (
							<line>
								<bufferGeometry attach="geometry">
									<bufferAttribute attach="attributes-position" args={[new Float32Array(pts7LineArr), 3]} />
								</bufferGeometry>
								<lineBasicMaterial attach="material" color="#f87171" linewidth={1} depthTest={false} depthWrite={false} />
							</line>
						)}
						{/* (הוסר) קו ירוק אנכי בין 8‑offset ל‑4‑offset בפודסט */}
						{/* הארכה למטה עד הרצפה מהמדרגה הראשונה וסגירה ביניהן */}
						{firstP4 && firstP7 && (
							<group>
								{(() => {
									// אופסט צידי בתוך מישור הפלטה (רק בתחתית, מדרגה ראשונה)
									// u: כיוון הגרם לפי הקטע הראשון (ניחוש טוב: וקטור בין firstP4 ל‑נקודה הבאה ברייל העליון, ואם לא קיים – לפי פער ל‑closeP4)
									let ux = 1, uy = 0, uz = 0;
									if (pts4Off.length >= 6) {
										const x0 = firstP4[0], y0 = firstP4[1], z0 = firstP4[2];
										const x1 = pts4Off[3], y1 = pts4Off[4], z1 = pts4Off[5];
										ux = x1 - x0; uy = y1 - y0; uz = z1 - z0;
									}
									const umag = Math.hypot(ux, uy, uz) || 1;
									ux /= umag; uy /= umag; uz /= umag;
									// w: כיוון הרוחב (עליון-תחתון) במישור הפלטה
									const wx = firstP4[0] - firstP7[0];
									const wy = firstP4[1] - firstP7[1];
									const wz = firstP4[2] - firstP7[2];
									// נורמל למישור
									const nx = uy * wz - uz * wy;
									const ny = uz * wx - ux * wz;
									const nz = ux * wy - uy * wx;
									const nmag = Math.hypot(nx, ny, nz) || 1;
									const nxN = nx / nmag, nyN = ny / nmag, nzN = nz / nmag;
									// כיוון צד במישור הפלטה (ניצב ל‑u ושייך למישור): s = n × u
									const sx = nyN * uz - nzN * uy;
									const sy = nzN * ux - nxN * uz;
									const sz = nxN * uy - nyN * ux;
									const smag = Math.hypot(sx, sy, sz) || 1;
									const sxN = sx / smag, syN = sy / smag, szN = sz / smag;
									const side = Math.max(0, (typeof hitechPlateInsetFromEdge === 'number' ? hitechPlateInsetFromEdge : 0.03)); // היסט אופקי מהקצה
									const f4x = firstP4[0] + sxN * side;
									// היסט צידי טהור במישור XZ (ללא שינוי בגובה Y) כדי למנוע "שפיץ" בתחילת הפלטה
									const f4y = firstP4[1];
									const f4z = firstP4[2] + szN * side;
									// קודקוד 7 נשאר במקום (בלי אופסט צידי)
									const f7x = firstP7[0];
									const f7y = firstP7[1];
									const f7z = firstP7[2];
									// חישוב נפח לפאנל האנכי בגרם 1
									const thicknessPanelA = Math.max(0.001, (typeof hitechPlateThickness === 'number' ? hitechPlateThickness : 0.012));
									const offXA = nxN * thicknessPanelA, offYA = nyN * thicknessPanelA, offZA = nzN * thicknessPanelA;
									const v0A: [number, number, number] = [f4x, f4y, f4z];
									const v1A: [number, number, number] = [f7x, f7y, f7z];
									const v2A: [number, number, number] = [f4x, floorBounds.y, f4z];
									const v3A: [number, number, number] = [f7x, floorBounds.y, f7z];
									const v4A: [number, number, number] = [v0A[0] + offXA, v0A[1] + offYA, v0A[2] + offZA];
									const v5A: [number, number, number] = [v1A[0] + offXA, v1A[1] + offYA, v1A[2] + offZA];
									const v6A: [number, number, number] = [v2A[0] + offXA, v2A[1] + offYA, v2A[2] + offZA];
									const v7A: [number, number, number] = [v3A[0] + offXA, v3A[1] + offYA, v3A[2] + offZA];
									const panelPosA = new Float32Array([
										v0A[0], v0A[1], v0A[2],
										v1A[0], v1A[1], v1A[2],
										v2A[0], v2A[1], v2A[2],
										v3A[0], v3A[1], v3A[2],
										v4A[0], v4A[1], v4A[2],
										v5A[0], v5A[1], v5A[2],
										v6A[0], v6A[1], v6A[2],
										v7A[0], v7A[1], v7A[2],
									]);
									const panelIdxA = new Uint32Array([
										0,1,2, 2,1,3,
										4,6,5, 6,7,5,
										0,1,5, 0,5,4,
										1,3,7, 1,7,5,
										3,2,6, 3,6,7,
										2,0,4, 2,4,6,
									]);
									return (
										<group>
											<line>
												<bufferGeometry attach="geometry">
													<bufferAttribute attach="attributes-position" args={[new Float32Array([
														f4x, f4y, f4z,
														f4x, floorBounds.y, f4z,
													]), 3]} />
												</bufferGeometry>
												<lineBasicMaterial attach="material" color="#6b7280" linewidth={1} depthTest={false} depthWrite={false} />
											</line>
											<line>
												<bufferGeometry attach="geometry">
													<bufferAttribute attach="attributes-position" args={[new Float32Array([
														f7x, f7y, f7z,
														f7x, floorBounds.y, f7z,
													]), 3]} />
												</bufferGeometry>
												<lineBasicMaterial attach="material" color="#f87171" linewidth={1} depthTest={false} depthWrite={false} />
											</line>
											<line>
												<bufferGeometry attach="geometry">
													<bufferAttribute attach="attributes-position" args={[new Float32Array([
														f4x, floorBounds.y, f4z,
														f7x, floorBounds.y, f7z,
													]), 3]} />
												</bufferGeometry>
												<lineBasicMaterial attach="material" color="#111827" linewidth={1} depthTest={false} depthWrite={false} />
											</line>
											<mesh castShadow receiveShadow>
												<bufferGeometry attach="geometry">
													<bufferAttribute attach="attributes-position" args={[panelPosA, 3]} />
													<bufferAttribute attach="index" args={[panelIdxA, 1]} />
												</bufferGeometry>
												<meshBasicMaterial color="#4b5563" side={2} />
											</mesh>
										</group>
									);
								})()}
							</group>
						)}

						{/* פלטה A – רצועה מדויקת בין קווי האופסט (מילוי משולשים) */}
						{bottomStepOff.length > 0 && topStepOff.length > 0 && (() => {
							const baseTop: Array<[number, number, number]> = closeP4 ? [...topStepOff, closeP4] : [...topStepOff];
							// שמור את הרייל העליון המקורי לשימור השיפוע
							const topRail: Array<[number, number, number]> = baseTop;
							// הוסף נקודת סיום תחתונה מהפודסט אם קיימת, כדי לקבל לפחות שתי נקודות למסילה התחתונה
							const botRail: Array<[number, number, number]> = closeP7 ? [...bottomStepOff, closeP7] : [...bottomStepOff];
							// בחר אורך מקסימלי – אם מסילה אחת ארוכה יותר (למשל כוללת פודסט), נשכפל את הנקודה האחרונה של הקצרה
							const count = Math.max(topRail.length, botRail.length);
							if (count < 2) return null;
							const pos: number[] = [];
							const idx: number[] = [];
							const edgeLines: number[] = [];
							const pick = (arr: Array<[number, number, number]>, i: number) => arr[Math.min(i, arr.length - 1)];
							for (let i = 0; i < count - 1; i++) {
								let t1 = pick(topRail, i);
								let b1 = pick(botRail, i);
								const t2 = pick(topRail, i + 1);
								const b2 = pick(botRail, i + 1);
								// התחלת הפלטה בדיוק מהנקודות f4/f7 (firstP4SideShift/firstP7) כדי למנוע משולש חסר בתחילת הרצועה
								if (i === 0 && firstP4SideShift) {
									t1 = firstP4SideShift;
									if (firstP7) b1 = firstP7;
								}
								const baseIndex = pos.length / 3;
								// סדר נקודות: t1,b1,t2,b2
								pos.push(t1[0], t1[1], t1[2]);
								pos.push(b1[0], b1[1], b1[2]);
								pos.push(t2[0], t2[1], t2[2]);
								pos.push(b2[0], b2[1], b2[2]);
								// שני משולשים לכיסוי הריבוע
								idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
								idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
							}

							// בניית נפח לפלטה A (גרם 1) – עובי לפי hitechPlateThickness (ברירת‑מחדל 12 מ״מ)
							const thickness = Math.max(0.001, (typeof hitechPlateThickness === 'number' ? hitechPlateThickness : 0.012));
							// כיוון לאורך המסילה (u)
							let ux = 1, uy = 0, uz = 0;
							if (topRail.length >= 2) {
								ux = topRail[1][0] - topRail[0][0];
								uy = topRail[1][1] - topRail[0][1];
								uz = topRail[1][2] - topRail[0][2];
							}
							const um = Math.hypot(ux, uy, uz) || 1; ux /= um; uy /= um; uz /= um;
							// רוחב בין המסילות (w)
							let wx = (firstP4 && firstP7) ? (firstP4[0] - firstP7[0]) : (topRail[0][0] - botRail[0][0]);
							let wy = (firstP4 && firstP7) ? (firstP4[1] - firstP7[1]) : (topRail[0][1] - botRail[0][1]);
							let wz = (firstP4 && firstP7) ? (firstP4[2] - firstP7[2]) : (topRail[0][2] - botRail[0][2]);
							const nmX = uy * wz - uz * wy;
							const nmY = uz * wx - ux * wz;
							const nmZ = ux * wy - uy * wx;
							const nmag = Math.hypot(nmX, nmY, nmZ) || 1;
							const nxN = nmX / nmag, nyN = nmY / nmag, nzN = nmZ / nmag;
							const offX = nxN * thickness, offY = nyN * thickness, offZ = nzN * thickness;

							// שכבת גב: נעתיק את חזית הפלטה בהסט נורמל קבוע; יש לקבע אורכים לפני הרחבה
							const frontVertexCount = pos.length / 3;
							const backBase = frontVertexCount;
							for (let i = 0; i < frontVertexCount * 3; i += 3) {
								pos.push(pos[i] + offX, pos[i + 1] + offY, pos[i + 2] + offZ);
							}
							const frontIndexCount = idx.length;
							for (let i = 0; i < frontIndexCount; i += 3) {
								const a = idx[i], b = idx[i + 1], c = idx[i + 2];
								idx.push(backBase + a, backBase + c, backBase + b);
							}

							// דפנות סביב: עליון, תחתון, התחלה, סיום
							const addSideStrip = (rail: Array<[number, number, number]>) => {
								if (rail.length < 2) return;
								for (let i = 0; i < rail.length - 1; i++) {
									const pA = rail[i];
									const pB = rail[i + 1];
									const pAe: [number, number, number] = [pA[0] + offX, pA[1] + offY, pA[2] + offZ];
									const pBe: [number, number, number] = [pB[0] + offX, pB[1] + offY, pB[2] + offZ];
									const bi = pos.length / 3;
									pos.push(pA[0], pA[1], pA[2],  pB[0], pB[1], pB[2],  pBe[0], pBe[1], pBe[2],  pAe[0], pAe[1], pAe[2]);
									idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
								}
							};
							// אל תעשה prepend לנקודת inset בתחילת המסילה — זה יוצר מקטע אלכסוני קצר ("חצי רוחב").
							// מחליפים את נקודה 0 ומיישרים XZ של Bot ל‑Top.
							const topRailForSide =
								(firstP4SideShift && topRail.length >= 1)
									? [firstP4SideShift, ...topRail.slice(1)]
									: topRail;
							const botRailForSide =
								(firstP4SideShift && botRail.length >= 1)
									? [([firstP4SideShift[0], botRail[0][1], firstP4SideShift[2]] as [number, number, number]), ...botRail.slice(1)]
									: botRail;
							addSideStrip(topRailForSide);
							addSideStrip(botRailForSide);
							// (בוטל) קאפ אנכי בתחילת הפאנל – הוסר לטובת פתיחה פשוטה בפודסט
							// סיום
							if (shouldRenderClosingCapForFlight(flightIdx)) {
								// הצב את הקאפ בקצה המדרגה (נק׳ 3/7 של המדרגה האחרונה בגרם)
								let lastStep: any = null;
								for (let ii = treads.length - 1; ii >= 0; ii--) {
									const tt = treads[ii];
									if (tt.flight === flightIdx && !tt.isLanding) { lastStep = tt; break; }
								}
								if (lastStep) {
									const yaw = lastStep.rotation[1] as number;
									const { c, s } = cosSin(yaw);
									const dx = lastStep.run / 2;
									const dz = treadWidth / 2;
									// נק׳ 3 עליונה: (+dx, +dz) למעלה; נק׳ 7 תחתונה: (+dx, +dz) למטה
									const lx = dx, lz = dz;
									const rx = lx * c - lz * s;
									const rz = lx * s + lz * c;
									let lastT: [number, number, number] = [
										lastStep.position[0] + rx,
										lastStep.position[1] + treadThickness / 2 + offsetY,
										lastStep.position[2] + rz
									];
									let lastB: [number, number, number] = [
										lastT[0],
										lastStep.position[1] - treadThickness / 2 - offsetY,
										lastT[2]
									];
									// בחר בין אנך דרך P3 לאנך דרך P2 לפי המשך המסילה
									const candT3: [number, number, number] = [...lastT];
									const candB3: [number, number, number] = [...lastB];
									// P2: (+dx, -dz)
									const rx2 = lx * c - (-lz) * s;
									const rz2 = lx * s + (-lz) * c;
									const candT2: [number, number, number] = [
										lastStep.position[0] + rx2,
										lastStep.position[1] + treadThickness / 2 + offsetY,
										lastStep.position[2] + rz2
									];
									const candB2: [number, number, number] = [
										candT2[0],
										lastStep.position[1] - treadThickness / 2 - offsetY,
										candT2[2]
									];
									// הארכת מסילות 4‑offset ו‑7‑offset באותו שיפוע עד שנפגשות עם האנך ב‑P3
									const topEnd = topRail[topRail.length - 1];
									const topPrev = topRail.length >= 2 ? topRail[topRail.length - 2] : topEnd;
									const botEnd = botRail[botRail.length - 1];
									const botPrev = botRail.length >= 2 ? botRail[botRail.length - 2] : botEnd;
									let ux = topEnd[0] - topPrev[0], uz = topEnd[2] - topPrev[2], uy = topEnd[1] - topPrev[1];
									let vx = botEnd[0] - botPrev[0], vz = botEnd[2] - botPrev[2], vy = botEnd[1] - botPrev[1];
									// fallback: אם אין שני נק׳ למסילה, קח כיוון לפי yaw של המדרגה האחרונה (שטוח בגובה בתוך המדרך)
									if (Math.abs(ux) < 1e-9 && Math.abs(uz) < 1e-9) { ux = Math.cos(yaw); uz = Math.sin(yaw); uy = 0; }
									if (Math.abs(vx) < 1e-9 && Math.abs(vz) < 1e-9) { vx = Math.cos(yaw); vz = Math.sin(yaw); vy = 0; }
									let tTop = 0, tBot = 0;
									const projT = (pt: [number, number, number]) => {
										if (Math.abs(ux) >= Math.abs(uz) && Math.abs(ux) > 1e-9) return (pt[0] - topEnd[0]) / ux;
										if (Math.abs(uz) > 1e-9) return (pt[2] - topEnd[2]) / uz;
										return 0;
									};
									const projB = (pb: [number, number, number]) => {
										if (Math.abs(vx) >= Math.abs(vz) && Math.abs(vx) > 1e-9) return (pb[0] - botEnd[0]) / vx;
										if (Math.abs(vz) > 1e-9) return (pb[2] - botEnd[2]) / vz;
										return 0;
									};
									// בחר מועמד שנותן המשך קדימה (t>=0) והקרוב ביותר
									let tTop3 = projT(candT3), tBot3 = projB(candB3);
									let tTop2 = projT(candT2), tBot2 = projB(candB2);
									const good3 = tTop3 >= -1e-6 && tBot3 >= -1e-6;
									const good2 = tTop2 >= -1e-6 && tBot2 >= -1e-6;
									if (!good3 && good2) { lastT = candT2; lastB = candB2; tTop = tTop2; tBot = tBot2; }
									else if (good3 && good2) {
										const score3 = Math.abs(tTop3) + Math.abs(tBot3);
										const score2 = Math.abs(tTop2) + Math.abs(tBot2);
										if (score2 < score3) { lastT = candT2; lastB = candB2; tTop = tTop2; tBot = tBot2; } else { tTop = tTop3; tBot = tBot3; }
									} else { tTop = tTop3; tBot = tBot3; }
									const yTop = topEnd[1] + tTop * uy;
									const yBot = botEnd[1] + tBot * vy;
									lastT = [lastT[0], yTop, lastT[2]];
									lastB = [lastB[0], yBot, lastB[2]];
									// הוספת מקטע פלטה מגשר בין קצה הפלטה לנק׳ המפגש
									{
										const baseIndex = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2]);
										pos.push(botEnd[0], botEnd[1], botEnd[2]);
										pos.push(lastT[0], lastT[1], lastT[2]);
										pos.push(lastB[0], lastB[1], lastB[2]);
										idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
										idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
										const backBase = pos.length / 3;
										const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
										const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
										const t2e: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
										const b2e: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
										pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
										idx.push(backBase + 0, backBase + 2, backBase + 1);
										idx.push(backBase + 2, backBase + 3, backBase + 1);
										// דפנות עליון/תחתון של המקטע המגשר
										const biTop = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
										idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
										const biBot = pos.length / 3;
										pos.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
										idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
									}
									// הוספת מקטע חזית אחרון בין קצה הפלטה לקאפ (t1=topEnd,b1=botEnd,t2=lastT,b2=lastB)
									{
										const baseIndex = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2]);
										pos.push(botEnd[0], botEnd[1], botEnd[2]);
										pos.push(lastT[0], lastT[1], lastT[2]);
										pos.push(lastB[0], lastB[1], lastB[2]);
										idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
										idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
										// שכבת גב למקטע הזה
										const backBase = pos.length / 3;
										const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
										const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
										const t2e: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
										const b2e: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
										pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
										idx.push(backBase + 0, backBase + 2, backBase + 1);
										idx.push(backBase + 2, backBase + 3, backBase + 1);
										// דפנות עליונה ותחתונה למקטע ההארכה
										const biTop = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
										idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
										const biBot = pos.length / 3;
										pos.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
										idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
									}
									// הוספת מקטע חזית אחרון בין קצה הפלטה לקאפ (t1=topEnd,b1=botEnd,t2=lastT,b2=lastB)
									{
										const baseIndex = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2]);
										pos.push(botEnd[0], botEnd[1], botEnd[2]);
										pos.push(lastT[0], lastT[1], lastT[2]);
										pos.push(lastB[0], lastB[1], lastB[2]);
										idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
										idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
										// שכבת גב למקטע הזה
										const backBase = pos.length / 3;
										const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
										const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
										const t2e: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
										const b2e: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
										pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
										idx.push(backBase + 0, backBase + 2, backBase + 1);
										idx.push(backBase + 2, backBase + 3, backBase + 1);
										// דפנות עליונה ותחתונה למקטע ההארכה
										const biTop = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
										idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
										const biBot = pos.length / 3;
										pos.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
										idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
									}
									const lastTe: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
									const lastBe: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
									const bi = pos.length / 3;
									pos.push(lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2]);
									idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
									// מסגרת – 4 קווי מתאר
									edgeLines.push(
										lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],
										lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],
										lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2],
										lastTe[0], lastTe[1], lastTe[2],  lastT[0], lastT[1], lastT[2],
									);
								}
							}

							// בוטל: קאפ סיום בצד החיצוני

							// קאפ סיום – הוסר

							return (
								<group>
									<mesh castShadow receiveShadow>
										<bufferGeometry attach="geometry">
											<bufferAttribute attach="attributes-position" args={[new Float32Array(pos), 3]} />
											<bufferAttribute attach="index" args={[new Uint32Array(idx), 1]} />
										</bufferGeometry>
										<meshBasicMaterial color="#4b5563" side={2} />
									</mesh>
									{/* מסגרת קאפ סיום */}
									{edgeLines.length > 0 ? (
										<lineSegments>
											<bufferGeometry attach="geometry">
												<bufferAttribute attach="attributes-position" args={[new Float32Array(edgeLines), 3]} />
											</bufferGeometry>
											<lineBasicMaterial attach="material" color="#111827" linewidth={1} depthTest={true} depthWrite={false} />
										</lineSegments>
									) : null}
								</group>
							);
						})()}
						{/* פלטה A1 – נגדי לפלטה A: עליון P1 ותחתון P6
						    NOTE: A1 עכשיו נבנית כיחידה רציפה שכוללת גם הארכה על הפודסט.
						    landingWidth (אופציונלי) מאפשר לשלוט באורך ההארכה האופקית על הפודסט. */}
						{((landingWidth?: number) => {
							// אסוף נקודות צד נגדי (P1 למעלה, P6 למטה) עבור גרם ראשון
							const topP1: Array<[number, number, number]> = [];
							const botP6: Array<[number, number, number]> = [];
							let firstP1: [number, number, number] | null = null;
							let firstP6: [number, number, number] | null = null;
							let firstYaw: number | null = null;
							let closeP1: [number, number, number] | null = null; // נקודת 1 של הפודסט (עליונה)
							let closeP6: [number, number, number] | null = null; // נקודת 6 של המדרגה שלפני הפודסט (תחתונה)

							for (let i = 0; i < treads.length; i++) {
								const t = treads[i];
								if (t.flight !== 0) continue;
								const yaw = t.rotation[1] as number;
								const c = Math.cos(yaw), s = Math.sin(yaw);
								const dx = t.run / 2;
								const dz = treadWidth / 2;
								// P1 – עליונה שמאל-אחורה: (-dx, -dz)
								{
									const lx = -dx, lz = -dz;
									const rx = lx * c - lz * s;
									const rz = lx * s + lz * c;
									const wx = t.position[0] + rx;
									const wy = t.position[1] + treadThickness / 2;
									const wz = t.position[2] + rz;
									const p1: [number, number, number] = [wx, wy + offsetY, wz];
									if (!t.isLanding && !firstP1) firstP1 = p1;
									if (!t.isLanding) topP1.push(p1);
								}
								// P6 – תחתונה ימין-אחורה: (+dx, -dz) רק אם אינה פודסט
								if (!t.isLanding) {
									const lx = +dx, lz = -dz;
									const rx = lx * c - lz * s;
									const rz = lx * s + lz * c;
									const wx = t.position[0] + rx;
									const wy = t.position[1] - treadThickness / 2;
									const wz = t.position[2] + rz;
									const p6: [number, number, number] = [wx, wy - offsetY, wz];
									if (!firstP6) { firstP6 = p6; firstYaw = yaw; }
									botP6.push(p6);
									// אם הבאה היא פודסט – זו המדרגה שלפני פודסט: שמור 6 תחתון והוסף 1 עליון מפודסט
									const next = treads[i + 1];
									if (next && next.flight === 0 && next.isLanding) {
										closeP6 = p6;
										const yawL = next.rotation[1] as number;
										const cL = Math.cos(yawL), sL = Math.sin(yawL);
										const dxL = next.run / 2, dzL = treadWidth / 2;
										const lx1 = -dxL, lz1 = -dzL;
										const rx1 = lx1 * cL - lz1 * sL;
										const rz1 = lx1 * sL + lz1 * cL;
										const wx1 = next.position[0] + rx1;
										const wy1 = next.position[1] + treadThickness / 2 + offsetY;
										const wz1 = next.position[2] + rz1;
										closeP1 = [wx1, wy1, wz1];
									}
								}
							}
							// אם לא נמצאה נקודת פודסט קרובה בלולאה – חפש פודסט ראשון בגרם 0 כדי לאפשר הארכה ל‑30 מ״מ
							if (!closeP1) {
								for (let i = 0; i < treads.length; i++) {
									const t = treads[i];
									if (t.flight === 0 && t.isLanding) {
										const yawL = t.rotation[1] as number;
										const cL = Math.cos(yawL), sL = Math.sin(yawL);
										const dxL = t.run / 2, dzL = treadWidth / 2;
										const lx1 = -dxL, lz1 = -dzL;
										const rx1 = lx1 * cL - lz1 * sL;
										const rz1 = lx1 * sL + lz1 * cL;
										const wx1 = t.position[0] + rx1;
										const wy1 = t.position[1] + treadThickness / 2 + offsetY;
										const wz1 = t.position[2] + rz1;
										closeP1 = [wx1, wy1, wz1];
										break;
									}
								}
							}
							if (topP1.length === 0 || botP6.length === 0) return null;

							// אופסט צידי כדי למנוע "שפיץ" בתחילת הפלטה
							let firstP1Side: [number, number, number] | null = null;
							if (firstP1 && firstP6) {
								// כיוון לאורך המסילה u
								let ux = 1, uy = 0, uz = 0;
								if (topP1.length >= 2) {
									ux = topP1[1][0] - topP1[0][0];
									uy = topP1[1][1] - topP1[0][1];
									uz = topP1[1][2] - topP1[0][2];
									const m = Math.hypot(ux, uy, uz) || 1; ux /= m; uy /= m; uz /= m;
								} else if (firstYaw !== null) {
									ux = Math.cos(firstYaw); uy = 0; uz = Math.sin(firstYaw);
								}
								// נורמל למישור: n = u × (P1-P6)
								const wx = firstP1[0] - firstP6[0];
								const wy = firstP1[1] - firstP6[1];
								const wz = firstP1[2] - firstP6[2];
								let nx = uy * wz - uz * wy;
								let ny = uz * wx - ux * wz;
								let nz = ux * wy - uy * wx;
								{ const m = Math.hypot(nx, ny, nz) || 1; nx /= m; ny /= m; nz /= m; }
								// כיוון צד: s = n × u
								let sx = ny * uz - nz * uy;
								let sy = nz * ux - nx * uz;
								let sz = nx * uy - ny * ux;
								{ const m = Math.hypot(sx, sy, sz) || 1; sx /= m; sy /= m; sz /= m; }
								const sideInset = Math.max(0, (typeof hitechPlateInsetFromEdge === 'number' ? hitechPlateInsetFromEdge : 0.03));
								firstP1Side = [firstP1[0] + sx * sideInset, firstP1[1], firstP1[2] + sz * sideInset];
							}

							// מסילות עבור חזית
							const railTop: Array<[number, number, number]> = closeP1 ? [...topP1, closeP1] : [...topP1];
							let railBot: Array<[number, number, number]> = closeP6 ? [...botP6, closeP6] : [...botP6];
							const segCount = Math.max(railTop.length, railBot.length);
							if (segCount < 2) return null;

							// בניית חזית A1 (טריאנגולציה בין המסילות)
							const pos: number[] = [];
							const idx: number[] = [];
							const pick = (arr: Array<[number, number, number]>, i: number) => arr[Math.min(i, arr.length - 1)];
							for (let i = 0; i < segCount - 1; i++) {
								let t1 = pick(railTop, i);
								let b1 = pick(railBot, i);
								const t2 = pick(railTop, i + 1);
								const b2 = pick(railBot, i + 1);
								if (i === 0) {
									if (firstP1Side) t1 = firstP1Side;
									if (firstP6) b1 = firstP6;
								}
								const base = pos.length / 3;
								pos.push(t1[0], t1[1], t1[2],  b1[0], b1[1], b1[2],  t2[0], t2[1], t2[2],  b2[0], b2[1], b2[2]);
								idx.push(base + 0, base + 1, base + 2);
								idx.push(base + 2, base + 1, base + 3);
							}

							// הכנה להארכה עד סוף הפודסט (פלטה A1) – נשמור אופסט עליון קבוע, רוחב ייקבע מלמטה בהמשך
							let extTopAt30: [number, number, number] | null = null;
							let extBot30: [number, number, number] | null = null;
							((landingWidthOverride?: number) => {
								// מצא את הפודסט הראשון בגרם 0
								let landing: typeof treads[number] | null = null;
								for (let i = 0; i < treads.length; i++) {
									const t = treads[i];
									if (t.flight === 0 && t.isLanding) { landing = t; break; }
								}
								if (!landing) return;
								const yawL = landing.rotation[1] as number;
								const cL = Math.cos(yawL), sL = Math.sin(yawL);
								const landingWidthM = (typeof landingWidthOverride === 'number' && landingWidthOverride > 0) ? landingWidthOverride : landing.run;
								const dxL = landingWidthM / 2, dzL = treadWidth / 2;
								// קצה רחוק של הפודסט לאורך כיוון הגרם, בצד A1 (lz = -dzL)
								const lxFar = +dxL, lzFar = -dzL;
								const rxFar = lxFar * cL - lzFar * sL;
								const rzFar = lxFar * sL + lzFar * cL;
								const xFar = landing.position[0] + rxFar;
								const zFar = landing.position[2] + rzFar;
								// עליון ממשטח הפודסט + offsetY (האופסט מלמעלה נשמר קבוע)
								const yTop = landing.position[1] + treadThickness / 2 + offsetY;
								extTopAt30 = [xFar, yTop, zFar];
								// extBot30 יחושב בהמשך משימור רוחב הפלטה (כל הרוחב מגיע מלמטה)
							})(landingWidth);

							// עובי קבוע לפי נורמל המישור
							const thickness = Math.max(0.001, (typeof hitechPlateThickness === 'number' ? hitechPlateThickness : 0.012));
							let ux = 1, uy = 0, uz = 0;
							if (railTop.length >= 2) {
								ux = railTop[1][0] - railTop[0][0];
								uy = railTop[1][1] - railTop[0][1];
								uz = railTop[1][2] - railTop[0][2];
								const m = Math.hypot(ux, uy, uz) || 1; ux /= m; uy /= m; uz /= m;
							}
							let wx = (firstP1 && firstP6) ? (firstP1[0] - firstP6[0]) : (railTop[0][0] - railBot[0][0]);
							let wy = (firstP1 && firstP6) ? (firstP1[1] - firstP6[1]) : (railTop[0][1] - railBot[0][1]);
							let wz = (firstP1 && firstP6) ? (firstP1[2] - firstP6[2]) : (railTop[0][2] - railBot[0][2]);
							let nmX = uy * wz - uz * wy;
							let nmY = uz * wx - ux * wz;
							let nmZ = ux * wy - uy * wx;
							{ const m = Math.hypot(nmX, nmY, nmZ) || 1; nmX /= m; nmY /= m; nmZ /= m; }
							// כיוון "החוצה" לצד הנגדי: הופכים את כיוון הנורמל
							const offX = -nmX * thickness, offY = -nmY * thickness, offZ = -nmZ * thickness;

							// שכבת גב
							{
								const frontN = pos.length / 3;
								const backBase = frontN;
								for (let i = 0; i < frontN * 3; i += 3) {
                                    pos.push(pos[i] + offX, pos[i + 1] + offY, pos[i + 2] + offZ);
								}
								const frontI = idx.length;
								for (let i = 0; i < frontI; i += 3) {
                                    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
                                    idx.push(backBase + a, backBase + c, backBase + b);
								}
							}

							// דפנות לאורך המסילות
							const addSide = (rail: Array<[number, number, number]>) => {
								if (rail.length < 2) return;
								for (let i = 0; i < rail.length - 1; i++) {
									const pA = rail[i], pB = rail[i + 1];
									const pAe: [number, number, number] = [pA[0] + offX, pA[1] + offY, pA[2] + offZ];
									const pBe: [number, number, number] = [pB[0] + offX, pB[1] + offY, pB[2] + offZ];
									const bi = pos.length / 3;
									pos.push(pA[0], pA[1], pA[2],  pB[0], pB[1], pB[2],  pBe[0], pBe[1], pBe[2],  pAe[0], pAe[1], pAe[2]);
									idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
								}
							};
							const railTopForSide = firstP1Side ? [firstP1Side, ...railTop] : railTop;
							const railBotForSide = firstP6 ? [firstP6, ...railBot] : railBot;
							addSide(railTopForSide);
							addSide(railBotForSide);

							// התאמת המסילה התחתונה בקצה: הקרנה לאורך השיפוע עד מישור קצה הפודסט (לתיקון רוחב מדויק)
							if (extTopAt30) {
								const botEndW = railBotForSide[railBotForSide.length - 1];
								const botPrevW = railBotForSide.length >= 2 ? railBotForSide[railBotForSide.length - 2] : botEndW;
								// כיוון שיפוע המסילה התחתונה
								let vx = botEndW[0] - botPrevW[0];
								let vy = botEndW[1] - botPrevW[1];
								let vz = botEndW[2] - botPrevW[2];
								// אם הכיוון כמעט אפס – קח כיוון לפי yaw של הפודסט
								let landingYaw: number | null = null;
								for (let i = 0; i < treads.length; i++) {
									const t = treads[i];
									if (t.flight === 0 && t.isLanding) { landingYaw = t.rotation[1] as number; break; }
								}
								if (Math.abs(vx) < 1e-9 && Math.abs(vz) < 1e-9 && landingYaw !== null) {
									vx = Math.cos(landingYaw); vz = Math.sin(landingYaw); vy = 0;
								}
								// מישור קצה הפודסט: נקבע לפי רכיב dot(u, x) עם u = (cos(yaw), sin(yaw)) של הפודסט
								let ux = 1, uz = 0;
								if (landingYaw !== null) { ux = Math.cos(landingYaw); uz = Math.sin(landingYaw); }
								const dotU = (x: [number, number, number]) => (ux * x[0] + uz * x[2]);
								const planeU = dotU(extTopAt30);
								// נרצה לעבוד עם וקטור יחידה לאורך המסילה התחתונה
								const vmag = Math.hypot(vx, vy, vz) || 1;
								const vUx = vx / vmag, vUy = vy / vmag, vUz = vz / vmag;
								const denomU = ux * vUx + uz * vUz;
								let t0U = 0; // פרמטר לאורך וקטור היחידה
								if (Math.abs(denomU) > 1e-9) {
									t0U = (planeU - dotU(botEndW)) / denomU;
									extBot30 = [botEndW[0] + vUx * t0U, botEndW[1] + vUy * t0U, botEndW[2] + vUz * t0U];
								} else {
									// פולבאק: שמור רוחב לפי הווקטור בקצה הפלטה
									const topEndW = railTopForSide[railTopForSide.length - 1];
									const wdx = topEndW[0] - botEndW[0];
									const wdy = topEndW[1] - botEndW[1];
									const wdz = topEndW[2] - botEndW[2];
									extBot30 = [extTopAt30[0] - wdx, extTopAt30[1] - wdy, extTopAt30[2] - wdz];
								}
								// שלב עדין: אם הרוחב לא מדויק – המשך באותו שיפוע כלפי מעלה עד שהרוחב שווה לרוחב בקצה הפלטה
								if (extBot30) {
									const topEndW = railTopForSide[railTopForSide.length - 1];
									const botEndW2 = railBotForSide[railBotForSide.length - 1];
									const refW =
										Math.hypot(
											topEndW[0] - botEndW2[0],
											topEndW[1] - botEndW2[1],
											topEndW[2] - botEndW2[2],
										);
									// פתרון אנליטי ל-|w0 - t*vU| = refW, כאשר w0 = extTopAt30 - botEndW2
									const w0x = extTopAt30[0] - botEndW2[0];
									const w0y = extTopAt30[1] - botEndW2[1];
									const w0z = extTopAt30[2] - botEndW2[2];
									const w0dotv = w0x * vUx + w0y * vUy + w0z * vUz;
									const w0norm2 = w0x * w0x + w0y * w0y + w0z * w0z;
									const disc = (w0dotv * w0dotv) - (w0norm2 - refW * refW);
									if (disc >= 0) {
										const r1 = w0dotv + Math.sqrt(disc);
										const r2 = w0dotv - Math.sqrt(disc);
										// בחר פתרון שממשיך "כלפי מעלה" יחסית ל-t0U (כלומר vUy * (t - t0U) > 0) ובעל סטייה מינימלית
										const choose = (tCand: number) => {
											const scoreDir = vUy * (tCand - t0U);
											return { t: tCand, ok: scoreDir > -1e-9, dist: Math.abs(tCand - t0U) };
										};
										const c1 = choose(r1), c2 = choose(r2);
										let tBest = t0U;
										if (c1.ok && c2.ok) tBest = (c1.dist <= c2.dist) ? c1.t : c2.t;
										else if (c1.ok) tBest = c1.t;
										else if (c2.ok) tBest = c2.t;
										// עדכן נקודת תחתית
										extBot30 = [botEndW2[0] + vUx * tBest, botEndW2[1] + vUy * tBest, botEndW2[2] + vUz * tBest];
									}
								}
							}

							// מדידת סטיית רוחב בקצה הפודסט (דיבאג לקונסול)
							if (extTopAt30 && extBot30) {
								// חשיפה לגרם הבא: B1 יתחבר בדיוק לרוחב הסיום של A1
								hitechBStartRef.current = { top: extTopAt30, bot: extBot30 };
								const topEndMeas = railTopForSide[railTopForSide.length - 1];
								const botEndMeas = railBotForSide[railBotForSide.length - 1];
								const refW = Math.hypot(
									topEndMeas[0] - botEndMeas[0],
									topEndMeas[1] - botEndMeas[1],
									topEndMeas[2] - botEndMeas[2],
								);
								const extW = Math.hypot(
									extTopAt30[0] - extBot30[0],
									extTopAt30[1] - extBot30[1],
									extTopAt30[2] - extBot30[2],
								);
								const deltaMm = Math.round((extW - refW) * 1000);
								console.info('[A1] width check at landing end:', {
									delta_mm: deltaMm,
									ref_width_m: Number(refW.toFixed(6)),
									ext_width_m: Number(extW.toFixed(6)),
								});
							}

							// פאנל התחלה אנכי לרצפה (כמו בפלטה A): בין P1 למטה לרצפה ובין P6 למטה לרצפה, כולל עובי
							let startPanelMesh = null;
							if (firstP1 && firstP6) {
								const pTop = firstP1Side || firstP1;
								const pBot = firstP6;
								const v0: [number, number, number] = [pTop[0], pTop[1], pTop[2]];
								const v1: [number, number, number] = [pBot[0], pBot[1], pBot[2]];
								const v2: [number, number, number] = [pTop[0], floorBounds.y, pTop[2]];
								const v3: [number, number, number] = [pBot[0], floorBounds.y, pBot[2]];
								const v4: [number, number, number] = [v0[0] + offX, v0[1] + offY, v0[2] + offZ];
								const v5: [number, number, number] = [v1[0] + offX, v1[1] + offY, v1[2] + offZ];
								const v6: [number, number, number] = [v2[0] + offX, v2[1] + offY, v2[2] + offZ];
								const v7: [number, number, number] = [v3[0] + offX, v3[1] + offY, v3[2] + offZ];
								const panelPos = new Float32Array([
									v0[0], v0[1], v0[2],
									v1[0], v1[1], v1[2],
									v2[0], v2[1], v2[2],
									v3[0], v3[1], v3[2],
									v4[0], v4[1], v4[2],
									v5[0], v5[1], v5[2],
									v6[0], v6[1], v6[2],
									v7[0], v7[1], v7[2],
								]);
								const panelIdx = new Uint32Array([
									0,1,2, 2,1,3,
									4,6,5, 6,7,5,
									0,1,5, 0,5,4,
									1,3,7, 1,7,5,
									3,2,6, 3,6,7,
									2,0,4, 2,4,6,
								]);
								startPanelMesh = (
									<mesh castShadow receiveShadow>
										<bufferGeometry attach="geometry">
											<bufferAttribute attach="attributes-position" args={[panelPos, 3]} />
											<bufferAttribute attach="index" args={[panelIdx, 1]} />
										</bufferGeometry>
										<meshBasicMaterial color="#4b5563" side={2} />
									</mesh>
								);
							}

							// סיום: אם יש הארכת תחתון ל‑30 מ״מ – סגור לקאפ אנכי במיקום זה; אחרת fallback ללוגיקה הקיימת
							if (extBot30 && extTopAt30) {
								// קטע מגשר מקצה הפלטה אל מיקום ה‑30 מ״מ + שכבת גב + דפנות
								const topEnd = railTopForSide[railTopForSide.length - 1];
								const botEnd = railBotForSide[railBotForSide.length - 1];
								{
									const base = pos.length / 3;
									pos.push(topEnd[0], topEnd[1], topEnd[2]);
									pos.push(botEnd[0], botEnd[1], botEnd[2]);
									pos.push(extTopAt30[0], extTopAt30[1], extTopAt30[2]);
									pos.push(extBot30[0], extBot30[1], extBot30[2]);
									idx.push(base + 0, base + 1, base + 2);
									idx.push(base + 2, base + 1, base + 3);
									// שכבת גב
									const backBase = pos.length / 3;
									const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
									const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
									const t2e: [number, number, number] = [extTopAt30[0] + offX, extTopAt30[1] + offY, extTopAt30[2] + offZ];
									const b2e: [number, number, number] = [extBot30[0] + offX, extBot30[1] + offY, extBot30[2] + offZ];
									pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
									idx.push(backBase + 0, backBase + 2, backBase + 1);
									idx.push(backBase + 2, backBase + 3, backBase + 1);
									// דפנות
									const biTop = pos.length / 3;
									pos.push(topEnd[0], topEnd[1], topEnd[2],  extTopAt30[0], extTopAt30[1], extTopAt30[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
									idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
									const biBot = pos.length / 3;
									pos.push(botEnd[0], botEnd[1], botEnd[2],  extBot30[0], extBot30[1], extBot30[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
									idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
								}
								// מלבן קאפ אנכי במיקום ה‑30 מ״מ
								{
									const lastT = extTopAt30;
									const lastB = extBot30;
									const lastTe: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
									const lastBe: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
									const bi = pos.length / 3;
									pos.push(lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2]);
									idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
								}
							} else {
								let lastStep: any = null;
								for (let ii = treads.length - 1; ii >= 0; ii--) {
									const tt = treads[ii];
									if (tt.flight === 0 && !tt.isLanding) { lastStep = tt; break; }
								}
								if (lastStep) {
									const yaw = lastStep.rotation[1] as number;
									const c = Math.cos(yaw), s = Math.sin(yaw);
									const dx = lastStep.run / 2, dz = treadWidth / 2;
									// מועמדים לקו האנכי: דרך P2 (+dx,-dz) או דרך P1 (-dx,-dz)
									const cand = (lx: number, lz: number, yTop: number, yBot: number): [[number, number, number], [number, number, number]] => {
										const rx = lx * c - lz * s;
										const rz = lx * s + lz * c;
										const tx: [number, number, number] = [lastStep.position[0] + rx, yTop, lastStep.position[2] + rz];
										const bx: [number, number, number] = [tx[0], yBot, tx[2]];
										return [tx, bx];
									};
									// נקודות עליונה/תחתונה בגובה משוער (יעודכן לפי הקרנה)
									const yTop0 = lastStep.position[1] + treadThickness / 2 + offsetY;
									const yBot0 = lastStep.position[1] - treadThickness / 2 - offsetY;
									const [candT2, candB2] = cand(+dx, -dz, yTop0, yBot0);
									const [candT1, candB1] = cand(-dx, -dz, yTop0, yBot0);

									// כיוון המסילות בקצה
									const topEnd = railTopForSide[railTopForSide.length - 1];
									const topPrev = railTopForSide.length >= 2 ? railTopForSide[railTopForSide.length - 2] : topEnd;
									const botEnd = railBotForSide[railBotForSide.length - 1];
									const botPrev = railBotForSide.length >= 2 ? railBotForSide[railBotForSide.length - 2] : botEnd;
									let uxE = topEnd[0] - topPrev[0], uzE = topEnd[2] - topPrev[2], uyE = topEnd[1] - topPrev[1];
									let vxE = botEnd[0] - botPrev[0], vzE = botEnd[2] - botPrev[2], vyE = botEnd[1] - botPrev[1];
									if (Math.abs(uxE) < 1e-9 && Math.abs(uzE) < 1e-9) { uxE = Math.cos(yaw); uzE = Math.sin(yaw); uyE = 0; }
									if (Math.abs(vxE) < 1e-9 && Math.abs(vzE) < 1e-9) { vxE = Math.cos(yaw); vzE = Math.sin(yaw); vyE = 0; }

									const projT = (pt: [number, number, number]) => {
										if (Math.abs(uxE) >= Math.abs(uzE) && Math.abs(uxE) > 1e-9) return (pt[0] - topEnd[0]) / uxE;
										if (Math.abs(uzE) > 1e-9) return (pt[2] - topEnd[2]) / uzE;
										return 0;
									};
									const projB = (pb: [number, number, number]) => {
										if (Math.abs(vxE) >= Math.abs(vzE) && Math.abs(vxE) > 1e-9) return (pb[0] - botEnd[0]) / vxE;
										if (Math.abs(vzE) > 1e-9) return (pb[2] - botEnd[2]) / vzE;
										return 0;
									};
									let tTop2 = projT(candT2), tBot2 = projB(candB2);
									let tTop1 = projT(candT1), tBot1 = projB(candB1);
									const good2 = tTop2 >= -1e-6 && tBot2 >= -1e-6;
									const good1 = tTop1 >= -1e-6 && tBot1 >= -1e-6;
									let lastT = candT2, lastB = candB2, tTop = tTop2, tBot = tBot2;
									if (!good2 && good1) { lastT = candT1; lastB = candB1; tTop = tTop1; tBot = tBot1; }
									else if (good2 && good1) {
										const score2 = Math.abs(tTop2) + Math.abs(tBot2);
										const score1 = Math.abs(tTop1) + Math.abs(tBot1);
										if (score1 < score2) { lastT = candT1; lastB = candB1; tTop = tTop1; tBot = tBot1; }
									}

									// עדכון גבהים לפי הקרנה
									const yTop = topEnd[1] + tTop * uyE;
									const yBot = botEnd[1] + tBot * vyE;
									lastT = [lastT[0], yTop, lastT[2]];
									lastB = [lastB[0], yBot, lastB[2]];

									// הוספת מקטע מגשר בין קצה הפלטה לקאפ + שכבת גב + דפנות
									{
										const base = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2]);
										pos.push(botEnd[0], botEnd[1], botEnd[2]);
										pos.push(lastT[0], lastT[1], lastT[2]);
										pos.push(lastB[0], lastB[1], lastB[2]);
										idx.push(base + 0, base + 1, base + 2);
										idx.push(base + 2, base + 1, base + 3);
										const backBase = pos.length / 3;
										const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
										const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
										const t2e: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
										const b2e: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
										pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
										idx.push(backBase + 0, backBase + 2, backBase + 1);
										idx.push(backBase + 2, backBase + 3, backBase + 1);
										// דפנות עליון/תחתון
										const biTop = pos.length / 3;
										pos.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
										idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
										const biBot = pos.length / 3;
										pos.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
										idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
									}

									// מלבן קאפ סופי
									{
										const lastTe: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
										const lastBe: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
										const bi = pos.length / 3;
										pos.push(lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2]);
										idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
									}
								}
							}

							return (
								<group>
									<mesh castShadow receiveShadow>
										<bufferGeometry attach="geometry">
											<bufferAttribute attach="attributes-position" args={[new Float32Array(pos), 3]} />
											<bufferAttribute attach="index" args={[new Uint32Array(idx), 1]} />
										</bufferGeometry>
										<meshBasicMaterial color="#4b5563" side={2} />
									</mesh>
									{startPanelMesh}
								</group>
							);
						})(treadWidth)}
					</group>
				);
			})() : null}

			{/* דגם 'הייטק' – פלטה C: גרם 3 בדומה לפלטה B */}
			{hitech ? (() => {
				// אסוף מדרגות של גרם שלישי (flight=2)
				const flightIdx = 2;
				const cosSin = (yaw: number) => ({ c: Math.cos(yaw), s: Math.sin(yaw) });
				const topStepOff: Array<[number, number, number]> = [];    // נקודות 4‑offset לכל מדרגה (ללא פודסט)
				const bottomStepOff: Array<[number, number, number]> = []; // נקודות 7‑offset לכל מדרגה
				const offsetY = Math.max(0, (typeof hitechPlateTopOffsetM === 'number' ? hitechPlateTopOffsetM : 0.03));

				let firstP4: [number, number, number] | null = null;
				let firstP7: [number, number, number] | null = null;
				let firstYaw: number | null = null;
				let firstStepIdxInFlight: number | null = null;
				let closeP4: [number, number, number] | null = null; // נקודת 4 (פודסט) אחרי מדרגה אחרונה לפני פודסט
				let closeP7: [number, number, number] | null = null; // נקודת 7 של מדרגה לפני פודסט
				let closeP8: [number, number, number] | null = null;

				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					if (t.flight !== flightIdx) continue;
					const yaw = t.rotation[1] as number;
					const { c, s } = cosSin(yaw);
					const dx = t.run / 2;
					const dz = treadWidth / 2;

					// נקודה 4 עליונה
					{
						const lx = -dx, lz = dz;
						const rx = lx * c - lz * s;
						const rz = lx * s + lz * c;
						const wx = t.position[0] + rx;
						const wy = t.position[1] + treadThickness / 2;
						const wz = t.position[2] + rz;
						const p4w: [number, number, number] = [wx, wy + offsetY, wz];
						if (!t.isLanding && !firstP4) { firstP4 = p4w; if (firstStepIdxInFlight === null) firstStepIdxInFlight = i; }
						if (!t.isLanding) topStepOff.push(p4w);
					}
					// נקודה 7 תחתונה – רק אם לא פודסט
					if (!t.isLanding) {
						const lx = dx, lz = dz;
						const rx = lx * c - lz * s;
						const rz = lx * s + lz * c;
						const wx = t.position[0] + rx;
						const wy = t.position[1] - treadThickness / 2;
						const wz = t.position[2] + rz;
						const p7w: [number, number, number] = [wx, wy - offsetY, wz];
						if (!firstP7) { firstP7 = p7w; firstYaw = yaw; }
						bottomStepOff.push(p7w);

						// אם המדרגה הבאה היא פודסט – שמור סגירה
						const next = treads[i + 1];
						if (next && next.flight === flightIdx && next.isLanding) {
							closeP7 = p7w;
							// קודקוד 8 של המדרגה הנוכחית (אותו XZ כמו 4)
							{
								const lx8 = -dx, lz8 = dz;
								const rx8 = lx8 * c - lz8 * s;
								const rz8 = lx8 * s + lz8 * c;
								const wx8 = t.position[0] + rx8;
								const wy8 = t.position[1] - treadThickness / 2 - offsetY;
								const wz8 = t.position[2] + rz8;
								closeP8 = [wx8, wy8, wz8];
							}
							// קודקוד 4 של הפודסט הבא
							const yaw2 = next.rotation[1] as number;
							const c2 = Math.cos(yaw2), s2 = Math.sin(yaw2);
							const dxL = next.run / 2, dzL = treadWidth / 2;
							const lx2 = -dxL, lz2 = dzL;
							const rx2 = lx2 * c2 - lz2 * s2;
							const rz2 = lx2 * s2 + lz2 * c2;
							const wx2 = next.position[0] + rx2;
							const wy2 = next.position[1] + treadThickness / 2 + offsetY;
							const wz2 = next.position[2] + rz2;
							closeP4 = [wx2, wy2, wz2];
						}
					}
				}

				// אופסט צידי ב‑XZ (Inset מהקצה) – יציב גם כשה‑Y משתנה בין רייזרים (לא נשען על "חפיפה" כעובי).
				let firstP4SideShift: [number, number, number] | null = null;
				if (firstP4) {
					// u: כיוון קדימה של הגרם ב‑XZ (מ‑firstP4 לנק׳ הבאה אם יש; אחרת לפי yaw)
					let ux = 1, uz = 0;
					if (topStepOff.length >= 2) {
						const x0 = firstP4[0], z0 = firstP4[2];
						const x1 = topStepOff[1][0], z1 = topStepOff[1][2];
						ux = x1 - x0; uz = z1 - z0;
					} else if (firstYaw !== null) {
						ux = Math.cos(firstYaw); uz = Math.sin(firstYaw);
					}
					const hm = Math.hypot(ux, uz) || 1;
					const uxH = ux / hm, uzH = uz / hm;
					// sBase = normalize(cross(Up, uH)) = [uzH, 0, -uxH]
					let sx = uzH, sz = -uxH;
					{ const m = Math.hypot(sx, sz) || 1; sx /= m; sz /= m; }
					// כיוון "פנימה" לפי וקטור XZ מ‑P4 אל P7 (ללא תלות ב‑Y)
					if (firstP7) {
						const vx = firstP7[0] - firstP4[0];
						const vz = firstP7[2] - firstP4[2];
						const d = sx * vx + sz * vz;
						if (d < 0) { sx = -sx; sz = -sz; }
					}
					const side = Math.max(0, (typeof hitechPlateInsetFromEdge === 'number' ? hitechPlateInsetFromEdge : 0.03));
					firstP4SideShift = [firstP4[0] + sx * side, firstP4[1], firstP4[2] + sz * side];
				}

				if (topStepOff.length === 0 && bottomStepOff.length === 0) return null;

				// הוספת נקודת פתיחה מהפודסט שלפני גרם 3 (אם קיימת)
				let startFromLandingTop: [number, number, number] | null = null;
				let startFromLandingBot: [number, number, number] | null = null;
				if (firstStepIdxInFlight !== null && firstStepIdxInFlight > 0) {
					const prev = treads[firstStepIdxInFlight - 1];
					if (prev && prev.isLanding) {
						const yawL = prev.rotation[1] as number;
						const cL = Math.cos(yawL), sL = Math.sin(yawL);
						const dxL = prev.run / 2, dzL = treadWidth / 2;
						const lx4 = -dxL, lz4 = dzL;
						const rx4 = lx4 * cL - lz4 * sL;
						const rz4 = lx4 * sL + lz4 * cL;
						const wx4 = prev.position[0] + rx4;
						const wy4 = prev.position[1] + treadThickness / 2 + offsetY;
						const wz4 = prev.position[2] + rz4;
						startFromLandingTop = [wx4, wy4, wz4];
						const wy8 = prev.position[1] - treadThickness / 2 - offsetY;
						startFromLandingBot = [wx4, wy8, wz4];
					}
				}

				// בניית מסילות עליונה/תחתונה לפלטה C
				const baseTop: Array<[number, number, number]> = (() => {
					const arr = closeP4 ? [...topStepOff, closeP4] : [...topStepOff];
					return startFromLandingTop ? [startFromLandingTop, ...arr] : arr;
				})();
				const topRail: Array<[number, number, number]> = baseTop;
				const botRail: Array<[number, number, number]> = (() => {
					const arr = [...bottomStepOff];
					return startFromLandingBot ? [startFromLandingBot, ...arr] : arr;
				})();
				const count = Math.max(topRail.length, botRail.length);
				if (count < 2) return null;

				// חזית – טריאנגולציה בין המסילות
				const pos: number[] = [];
				const idx: number[] = [];
				const pick = (arr: Array<[number, number, number]>, i: number) => arr[Math.min(i, arr.length - 1)];
				for (let i = 0; i < count - 1; i++) {
					let t1 = pick(topRail, i);
					let b1 = pick(botRail, i);
					const t2 = pick(topRail, i + 1);
					const b2 = pick(botRail, i + 1);
					// ייצוב המקטע הראשון – אם אין התחלה מהפודסט
					if (i === 0) {
						const hasLandingStart = !!startFromLandingTop && !!startFromLandingBot;
						if (!hasLandingStart) {
							if (firstP4SideShift) t1 = firstP4SideShift;
							if (firstP7) b1 = firstP7;
						}
					}
					const baseIndex = pos.length / 3;
					pos.push(t1[0], t1[1], t1[2],  b1[0], b1[1], b1[2],  t2[0], t2[1], t2[2],  b2[0], b2[1], b2[2]);
					idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
					idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
				}

				// נורמל קבוע לפי u×w להתח ולבנות נפח
				const thickness = Math.max(0.001, (typeof hitechPlateThickness === 'number' ? hitechPlateThickness : 0.012));
				let ux = 1, uy = 0, uz = 0;
				if (topRail.length >= 2) {
					ux = topRail[1][0] - topRail[0][0];
					uy = topRail[1][1] - topRail[0][1];
					uz = topRail[1][2] - topRail[0][2];
				}
				{ const m = Math.hypot(ux, uy, uz) || 1; ux /= m; uy /= m; uz /= m; }
				let wx = (firstP4 && firstP7) ? (firstP4[0] - firstP7[0]) : (topRail[0][0] - botRail[0][0]);
				let wy = (firstP4 && firstP7) ? (firstP4[1] - firstP7[1]) : (topRail[0][1] - botRail[0][1]);
				let wz = (firstP4 && firstP7) ? (firstP4[2] - firstP7[2]) : (topRail[0][2] - botRail[0][2]);
				let nmX = uy * wz - uz * wy;
				let nmY = uz * wx - ux * wz;
				let nmZ = ux * wy - uy * wx;
				{ const m = Math.hypot(nmX, nmY, nmZ) || 1; nmX /= m; nmY /= m; nmZ /= m; }
				const offX = nmX * thickness, offY = nmY * thickness, offZ = nmZ * thickness;

				// שכבת גב
				const frontVertexCount = pos.length / 3;
				const backBase = frontVertexCount;
				for (let i = 0; i < frontVertexCount * 3; i += 3) {
					pos.push(pos[i] + offX, pos[i + 1] + offY, pos[i + 2] + offZ);
				}
				const frontIndexCount = idx.length;
				for (let i = 0; i < frontIndexCount; i += 3) {
					const a = idx[i], b = idx[i + 1], c = idx[i + 2];
					idx.push(backBase + a, backBase + c, backBase + b);
				}

				// דפנות לאורך המסילות
				const addSideStrip = (rail: Array<[number, number, number]>) => {
					if (rail.length < 2) return;
					for (let i = 0; i < rail.length - 1; i++) {
						const pA = rail[i];
						const pB = rail[i + 1];
						const pAe: [number, number, number] = [pA[0] + offX, pA[1] + offY, pA[2] + offZ];
						const pBe: [number, number, number] = [pB[0] + offX, pB[1] + offY, pB[2] + offZ];
						const bi = pos.length / 3;
						pos.push(pA[0], pA[1], pA[2],  pB[0], pB[1], pB[2],  pBe[0], pBe[1], pBe[2],  pAe[0], pAe[1], pAe[2]);
						idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
					}
				};
				const useLandingStart = !!startFromLandingTop && !!startFromLandingBot;
				// כמו בגרם 2: לא לעשות prepend לנקודת inset בתחילת המסילה (יוצר מקטע אלכסוני קצר — "חצי רוחב").
				// מחליפים את נקודה 0 ומיישרים XZ של Bot ל‑Top.
				const topRailForSide = useLandingStart
					? topRail
					: ((firstP4SideShift && topRail.length >= 1) ? [firstP4SideShift, ...topRail.slice(1)] : topRail);
				const botRailForSide = useLandingStart
					? botRail
					: ((firstP4SideShift && botRail.length >= 1)
						? [([firstP4SideShift[0], botRail[0][1], firstP4SideShift[2]] as [number, number, number]), ...botRail.slice(1)]
						: botRail);
				addSideStrip(topRailForSide);
				addSideStrip(botRailForSide);

				const edgeLines: number[] = [];
				// קאפ התחלה אנכי
				{
					const pT = topRailForSide[0];
					const pBy = botRailForSide[0][1];
					const pB: [number, number, number] = [pT[0], pBy, pT[2]];
					const pTe: [number, number, number] = [pT[0] + offX, pT[1] + offY, pT[2] + offZ];
					const pBe: [number, number, number] = [pB[0] + offX, pB[1] + offY, pB[2] + offZ];
					const bi = pos.length / 3;
					pos.push(pT[0], pT[1], pT[2],  pB[0], pB[1], pB[2],  pBe[0], pBe[1], pBe[2],  pTe[0], pTe[1], pTe[2]);
					idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
					edgeLines.push(
						pT[0], pT[1], pT[2],  pB[0], pB[1], pB[2],
						pB[0], pB[1], pB[2],  pBe[0], pBe[1], pBe[2],
						pBe[0], pBe[1], pBe[2],  pTe[0], pTe[1], pTe[2],
						pTe[0], pTe[1], pTe[2],  pT[0], pT[1], pT[2],
					);
				}
				// קאפ סיום אנכי (מבוסס מסילה) מבוטל – נשאר רק קאפ לפי 3/7
				if (shouldRenderClosingCapForFlight(flightIdx)) {
					// הצב את הקאפ בקצה המדרגה (נק׳ 3/7 של המדרגה האחרונה בגרם)
					let lastStep: any = null;
					for (let ii = treads.length - 1; ii >= 0; ii--) {
						const tt = treads[ii];
						if (tt.flight === flightIdx && !tt.isLanding) { lastStep = tt; break; }
					}
					if (lastStep) {
						const yaw = lastStep.rotation[1] as number;
						const { c, s } = cosSin(yaw);
						const dx = lastStep.run / 2;
						const dz = treadWidth / 2;
						const lx = dx, lz = dz;
						const rx = lx * c - lz * s;
						const rz = lx * s + lz * c;
						// מועמדים לקו האנכי: דרך P3 (קדמי‑ימני) או דרך P2 (אחורי‑ימני) – נבחר את זה שמתיישר עם כיוון המסילה
						const candT3: [number, number, number] = [
							lastStep.position[0] + rx,
							lastStep.position[1] + treadThickness / 2 + offsetY,
							lastStep.position[2] + rz
						];
						const candB3: [number, number, number] = [
							candT3[0],
							lastStep.position[1] - treadThickness / 2 - offsetY,
							candT3[2]
						];
						// P2: (+dx, -dz)
						const rx2 = lx * c - (-lz) * s;
						const rz2 = lx * s + (-lz) * c;
						const candT2: [number, number, number] = [
							lastStep.position[0] + rx2,
							lastStep.position[1] + treadThickness / 2 + offsetY,
							lastStep.position[2] + rz2
						];
						const candB2: [number, number, number] = [
							candT2[0],
							lastStep.position[1] - treadThickness / 2 - offsetY,
							candT2[2]
						];
						let lastT: [number, number, number] = candT3;
						let lastB: [number, number, number] = candB3;
						// הארכת מסילות 4‑offset ו‑7‑offset באותו שיפוע עד שנפגשות עם האנך ב‑P3
						const topEnd = topRailForSide[topRailForSide.length - 1];
						const topPrev = topRailForSide.length >= 2 ? topRailForSide[topRailForSide.length - 2] : topEnd;
						const botEnd = botRailForSide[botRailForSide.length - 1];
						const botPrev = botRailForSide.length >= 2 ? botRailForSide[botRailForSide.length - 2] : botEnd;
						let ux = topEnd[0] - topPrev[0], uz = topEnd[2] - topPrev[2], uy = topEnd[1] - topPrev[1];
						let vx = botEnd[0] - botPrev[0], vz = botEnd[2] - botPrev[2], vy = botEnd[1] - botPrev[1];
						// fallback: אם אין שני נק׳ למסילה, קח כיוון לפי yaw של המדרגה האחרונה (שטוח בגובה בתוך המדרך)
						if (Math.abs(ux) < 1e-9 && Math.abs(uz) < 1e-9) { ux = Math.cos(yaw); uz = Math.sin(yaw); uy = 0; }
						if (Math.abs(vx) < 1e-9 && Math.abs(vz) < 1e-9) { vx = Math.cos(yaw); vz = Math.sin(yaw); vy = 0; }
						// בחר מועמד (P3 או P2) שנותן המשך קדימה (t>=0) ובערך הקרוב ביותר
						const projT = (pt: [number, number, number]) => {
							if (Math.abs(ux) >= Math.abs(uz) && Math.abs(ux) > 1e-9) return (pt[0] - topEnd[0]) / ux;
							if (Math.abs(uz) > 1e-9) return (pt[2] - topEnd[2]) / uz;
							return 0;
						};
						const projB = (pb: [number, number, number]) => {
							if (Math.abs(vx) >= Math.abs(vz) && Math.abs(vx) > 1e-9) return (pb[0] - botEnd[0]) / vx;
							if (Math.abs(vz) > 1e-9) return (pb[2] - botEnd[2]) / vz;
							return 0;
						};
						let tTop = projT(lastT), tBot = projB(lastB);
						const tTop2 = projT(candT2), tBot2 = projB(candB2);
						const good1 = tTop >= -1e-6 && tBot >= -1e-6;
						const good2 = tTop2 >= -1e-6 && tBot2 >= -1e-6;
						if (!good1 && good2) { lastT = candT2; lastB = candB2; tTop = tTop2; tBot = tBot2; }
						else if (good1 && good2) {
							const score1 = Math.abs(tTop) + Math.abs(tBot);
							const score2 = Math.abs(tTop2) + Math.abs(tBot2);
							if (score2 < score1) { lastT = candT2; lastB = candB2; tTop = tTop2; tBot = tBot2; }
						}
						const yTop = topEnd[1] + tTop * uy;
						const yBot = botEnd[1] + tBot * vy;
						lastT = [lastT[0], yTop, lastT[2]];
						lastB = [lastB[0], yBot, lastB[2]];
						// הוספת מקטע חזית אחרון בין קצה הפלטה לקאפ (t1=topEnd,b1=botEnd,t2=lastT,b2=lastB)
						{
							const baseIndex = pos.length / 3;
							pos.push(topEnd[0], topEnd[1], topEnd[2]);
							pos.push(botEnd[0], botEnd[1], botEnd[2]);
							pos.push(lastT[0], lastT[1], lastT[2]);
							pos.push(lastB[0], lastB[1], lastB[2]);
							idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
							idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
							// שכבת גב למקטע הזה
							const backBase = pos.length / 3;
							const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
							const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
							const t2e: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
							const b2e: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
							pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
							idx.push(backBase + 0, backBase + 2, backBase + 1);
							idx.push(backBase + 2, backBase + 3, backBase + 1);
							// דפנות עליונה ותחתונה למקטע ההארכה
							const biTop = pos.length / 3;
							pos.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
							idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
							const biBot = pos.length / 3;
							pos.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
							idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
						}
						const lastTe: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
						const lastBe: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
						const bi = pos.length / 3;
						pos.push(lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2]);
						idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
						edgeLines.push(
							lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],
							lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],
							lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2],
							lastTe[0], lastTe[1], lastTe[2],  lastT[0], lastT[1], lastT[2],
						);
					}
				}

				// בוטל: קאפ סיום חיצוני לפי קודקודים 3 ו‑7

				// קאפ סיום – הוסר

				// פלטה C1 – הצד הנגדי בגרם השלישי (flight=2), בנייה רציפה ומדויקת לייצור (DXF-ready)
				// כללי מעבר (Transition) מיושמים כאן ללא clamps:
				// - תחילת שיפוע: L_bot = L_top + (dySlope - dyLanding) / tanSlope
				// - סוף שיפוע:   L_bot = L_top - (dySlope - dyLanding) / tanSlope
				const buildC1ForFlight2 = () => {
					const topP1: Array<[number, number, number]> = [];
					const botP6: Array<[number, number, number]> = [];
					let firstP1: [number, number, number] | null = null;
					let firstP6: [number, number, number] | null = null;
					let firstYaw: number | null = null;
					let firstStepIdxInFlight: number | null = null;
					let closeP1: [number, number, number] | null = null; // P1 של פודסט עליון (אם קיים)
					let closeP6: [number, number, number] | null = null; // P6 של מדרגה לפני פודסט עליון

					for (let i = 0; i < treads.length; i++) {
						const t = treads[i];
						if (t.flight !== flightIdx) continue;
						const yaw = t.rotation[1] as number;
						const { c, s } = cosSin(yaw);
						const dx = t.run / 2;
						const dz = treadWidth / 2;

						// P1 – עליונה שמאל‑אחורה: (-dx, -dz)
						{
							const lx = -dx, lz = -dz;
							const rx = lx * c - lz * s;
							const rz = lx * s + lz * c;
							const wx = t.position[0] + rx;
							const wy = t.position[1] + treadThickness / 2;
							const wz = t.position[2] + rz;
							const p1: [number, number, number] = [wx, wy + offsetY, wz];
							if (!t.isLanding && !firstP1) { firstP1 = p1; if (firstStepIdxInFlight === null) firstStepIdxInFlight = i; }
							if (!t.isLanding) topP1.push(p1);
						}
						// P6 – תחתונה ימין‑אחורה: (+dx, -dz) רק אם אינה פודסט
						if (!t.isLanding) {
							const lx = +dx, lz = -dz;
							const rx = lx * c - lz * s;
							const rz = lx * s + lz * c;
							const wx = t.position[0] + rx;
							const wy = t.position[1] - treadThickness / 2;
							const wz = t.position[2] + rz;
							const p6: [number, number, number] = [wx, wy - offsetY, wz];
							if (!firstP6) { firstP6 = p6; firstYaw = yaw; }
							botP6.push(p6);

							// אם הבאה פודסט – סגור לפודסט הבא
							const next = treads[i + 1];
							if (next && next.flight === flightIdx && next.isLanding) {
								closeP6 = p6;
								const yawL = next.rotation[1] as number;
								const cL = Math.cos(yawL), sL = Math.sin(yawL);
								const dxL = next.run / 2, dzL = treadWidth / 2;
								const lx1 = -dxL, lz1 = -dzL; // P1 של הפודסט
								const rx1 = lx1 * cL - lz1 * sL;
								const rz1 = lx1 * sL + lz1 * cL;
								const wx1 = next.position[0] + rx1;
								const wy1 = next.position[1] + treadThickness / 2 + offsetY;
								const wz1 = next.position[2] + rz1;
								closeP1 = [wx1, wy1, wz1];
							}
						}
					}
					if (topP1.length === 0 || botP6.length === 0) return null;

					const a2Anchor = hitechCStartRef.current;
					const hasPrevLanding =
						(firstStepIdxInFlight !== null && firstStepIdxInFlight > 0 && !!treads[firstStepIdxInFlight - 1]?.isLanding);

					// אם יש פודסט לפני גרם 3 אבל העוגן מ-B1 עדיין לא הגיע – עדיף לא לרנדר מאשר לרנדר במקום לא נכון.
					if (hasPrevLanding && !a2Anchor) return null;

					// נקודת פתיחה מהפודסט שלפני גרם 3 (אם קיימת) – רק כשאין Ref.
					let startFromLandingTop: [number, number, number] | null = null;
					let startFromLandingBot: [number, number, number] | null = null;
					if (!a2Anchor && firstStepIdxInFlight !== null && firstStepIdxInFlight > 0) {
						const prev = treads[firstStepIdxInFlight - 1];
						if (prev && prev.isLanding) {
							const yawL = prev.rotation[1] as number;
							const cL = Math.cos(yawL), sL = Math.sin(yawL);
							const dxL = prev.run / 2, dzL = treadWidth / 2;
							const lx1 = -dxL, lz1 = -dzL;
							const rx1 = lx1 * cL - lz1 * sL;
							const rz1 = lx1 * sL + lz1 * cL;
							const wx1 = prev.position[0] + rx1;
							const wy1 = prev.position[1] + treadThickness / 2 + offsetY;
							const wz1 = prev.position[2] + rz1;
							startFromLandingTop = [wx1, wy1, wz1];
							const wy6 = prev.position[1] - treadThickness / 2 - offsetY;
							startFromLandingBot = [wx1, wy6, wz1];
						}
					}

					// הוראה: אם יש a2Anchor – לא מבצעים חישוב Start ידני בכלל, מתחילים ישירות מה-Ref.
					const startTop = (a2Anchor?.top || startFromLandingTop || firstP1);
					const startBot = (a2Anchor?.bot || startFromLandingBot || firstP6);
					if (!startTop || !startBot) return null;

					// tan/cos שיפוע ועובי ניצב
					// IMPORTANT: dyLanding חייב להיות קבוע על מישור (פודסט).
					// דרישה: A1 מכתיבה את רוחב/עובי הפלטות B/B1 — dyLanding נגזר מה‑Ref של סוף A1 על הפודסט.
					const a1W = hitech ? hitechBStartRef.current : null;
					const dyFromA1 = a1W ? Math.abs(a1W.top[1] - a1W.bot[1]) : null;
					const dyLanding = Math.max(0.001, (dyFromA1 ?? (treadThickness + 2 * offsetY)));
					const yawS = (firstStepIdxInFlight !== null ? (treads[firstStepIdxInFlight]?.rotation[1] as number) : (firstYaw ?? 0)) || 0;
					const uxH = Math.cos(yawS);
					const uzH = Math.sin(yawS);
					const dotH = (p: [number, number, number]) => (p[0] * uxH + p[2] * uzH);
					let tanSlope = (riser / treadDepth);
					let cosSlope = 1 / Math.sqrt(1 + tanSlope * tanSlope);
					if (topP1.length >= 2) {
						const u0 = topP1[0], u1 = topP1[1];
						const dx = u1[0] - u0[0], dy = u1[1] - u0[1], dz = u1[2] - u0[2];
						const horiz = Math.hypot(dx, dz);
						if (horiz > 1e-9) {
							tanSlope = Math.abs(dy) / horiz;
							cosSlope = horiz / Math.hypot(horiz, dy);
						}
					}
					const safeCos = Math.max(0.1, cosSlope);
					const dySlope = dyLanding / safeCos;

					// Prefix עם Breakpoints בתחילת השיפוע (אם יש פודסט לפני הגרם)
					let topPrefix: Array<[number, number, number]> = [startTop];
					let botPrefix: Array<[number, number, number]> = [startBot];
					// תחילת שיפוע (מישור→שיפוע): אותו עיקרון כמו ב‑B1 גם אם ההתחלה מגיעה מ‑Ref.
					// מחשבים Ltop (קטע אופקי) מול המדרגה הראשונה, ואז:
					// Lbot = Ltop + (dySlope - dyLanding) / tanSlope
					if ((a2Anchor || (startFromLandingTop && startFromLandingBot)) && Math.abs(tanSlope) > 1e-9) {
						const firstSlopeTop = topP1[0];
						const deltaY = (firstSlopeTop[1] - startTop[1]);
						const requiredAlong = deltaY / tanSlope;
						const dAlong = (dotH(firstSlopeTop) - dotH(startTop));
						const Ltop = Math.max(0, dAlong - requiredAlong);
						const botOffset = (dySlope - dyLanding) / tanSlope;
						const Lbot = Ltop + botOffset;

						const breakTop: [number, number, number] = [startTop[0] + uxH * Ltop, startTop[1], startTop[2] + uzH * Ltop];
						// תחתון על הפודסט בדיוק בנקודת השבירה העליונה (שומר גובה פודסט)
						const breakBotAtLtop: [number, number, number] = [breakTop[0], breakTop[1] - dyLanding, breakTop[2]];
						// תחתון ממשיך אופקי עד Lbot בגובה פודסט
						const breakBotHAtLbot: [number, number, number] = [startTop[0] + uxH * Lbot, startTop[1] - dyLanding, startTop[2] + uzH * Lbot];
						// top על השיפוע ב‑Lbot (הטופ כבר התחיל לעלות ב‑Ltop, אז אחרי (Lbot-Ltop) יעלה ב‑tanSlope*(Lbot-Ltop))
						const topRise = tanSlope * (Lbot - Ltop);
						const breakTopSlopeAtLbot: [number, number, number] = [startTop[0] + uxH * Lbot, startTop[1] + topRise, startTop[2] + uzH * Lbot];
						const breakBotSAtLbot: [number, number, number] = [breakTopSlopeAtLbot[0], breakTopSlopeAtLbot[1] - dySlope, breakTopSlopeAtLbot[2]];

						// Prefix לפי דרישת ייצור:
						// Top:  [startTop, breakTop, breakTopSlopeAtLbot]
						// Bot:  [startBot, breakBotAtLtop, breakBotHAtLbot, breakBotSAtLbot]
						// (נאזן אורכים בהמשך ע"י שכפול נק' אחרונה אם צריך, בלי להזיז גיאומטריה)
						topPrefix = [startTop, breakTop, breakTopSlopeAtLbot];
						botPrefix = [startBot, breakBotAtLtop, breakBotHAtLbot, breakBotSAtLbot];
					}

					// Extras בסוף השיפוע (שיפוע→מישור) אם יש פודסט עליון
					let endTopExtras: Array<[number, number, number]> | null = null;
					let endBotExtras: Array<[number, number, number]> | null = null;
					if (closeP1 && topP1.length >= 1) {
						const topBreak = closeP1;
						const prevTop = topP1[topP1.length - 1];
						const dx = topBreak[0] - prevTop[0];
						const dy = topBreak[1] - prevTop[1];
						const dz = topBreak[2] - prevTop[2];
						const horiz = Math.hypot(dx, dz);
						if (horiz > 1e-9 && Math.abs(dy) > 1e-9) {
							const tanEnd = Math.abs(dy) / horiz;
							const cosEnd = horiz / Math.hypot(horiz, dy);
							const dySlopeEnd = dyLanding / cosEnd;
							const botOffsetEnd = (dySlopeEnd - dyLanding) / tanEnd;
							const uxE = dx / horiz, uzE = dz / horiz;
							const slopeYPerHoriz = dy / horiz;
							const topAtLbot: [number, number, number] = [
								topBreak[0] - uxE * botOffsetEnd,
								topBreak[1] - slopeYPerHoriz * botOffsetEnd,
								topBreak[2] - uzE * botOffsetEnd,
							];
							const botSlopeAtLbot: [number, number, number] = [topAtLbot[0], topAtLbot[1] - dySlopeEnd, topAtLbot[2]];
							const botPlaneAtTopBreak: [number, number, number] = [topBreak[0], topBreak[1] - dyLanding, topBreak[2]];
							endTopExtras = [topAtLbot, topBreak];
							endBotExtras = [botSlopeAtLbot, botPlaneAtTopBreak];
						}
					}

					const topCore = endTopExtras ? [...topP1, ...endTopExtras] : (closeP1 ? [...topP1, closeP1] : [...topP1]);
					const botCore = endBotExtras ? [...botP6, ...endBotExtras] : (closeP6 ? [...botP6, closeP6] : [...botP6]);
					// שמירה על סנכרון סגמנטים: אם למסילה התחתונה יש נקודה נוספת ב-prefix (כמו כאן) –
					// נשכפל את הנקודה האחרונה של ה-topPrefix (אותו XZ) כדי למנוע "משיכת" מקטעים.
					const topPrefixSynced =
						(topPrefix.length < botPrefix.length)
							? [...topPrefix, topPrefix[topPrefix.length - 1]]
							: topPrefix;
					const topRail = [...topPrefixSynced, ...topCore];
					const botRail = [...botPrefix, ...botCore];

					const segCount = Math.max(topRail.length, botRail.length);
					if (segCount < 2) return null;

					// חזית – טריאנגולציה
					const pos: number[] = [];
					const idx: number[] = [];
					const pick = (arr: Array<[number, number, number]>, i: number) => arr[Math.min(i, arr.length - 1)];
					for (let i = 0; i < segCount - 1; i++) {
						const t1 = pick(topRail, i);
						const b1 = pick(botRail, i);
						const t2 = pick(topRail, i + 1);
						const b2 = pick(botRail, i + 1);
						const base = pos.length / 3;
						pos.push(t1[0], t1[1], t1[2], b1[0], b1[1], b1[2], t2[0], t2[1], t2[2], b2[0], b2[1], b2[2]);
						idx.push(base + 0, base + 1, base + 2);
						idx.push(base + 2, base + 1, base + 3);
					}

					// עובי/נורמל + שכבת גב + דפנות
					const thickness = Math.max(0.001, (typeof hitechPlateThickness === 'number' ? hitechPlateThickness : 0.012));
					let ux = 1, uy = 0, uz = 0;
					if (topRail.length >= 2) {
						ux = topRail[1][0] - topRail[0][0];
						uy = topRail[1][1] - topRail[0][1];
						uz = topRail[1][2] - topRail[0][2];
						{ const m = Math.hypot(ux, uy, uz) || 1; ux /= m; uy /= m; uz /= m; }
					}
					const wx = topRail[0][0] - botRail[0][0];
					const wy = topRail[0][1] - botRail[0][1];
					const wz = topRail[0][2] - botRail[0][2];
					let nmX = uy * wz - uz * wy;
					let nmY = uz * wx - ux * wz;
					let nmZ = ux * wy - uy * wx;
					{ const m = Math.hypot(nmX, nmY, nmZ) || 1; nmX /= m; nmY /= m; nmZ /= m; }
					const offX = -nmX * thickness, offY = -nmY * thickness, offZ = -nmZ * thickness;

					// שכבת גב
					{
						const frontN = pos.length / 3;
						const backBase = frontN;
						for (let i = 0; i < frontN * 3; i += 3) pos.push(pos[i] + offX, pos[i + 1] + offY, pos[i + 2] + offZ);
						const frontI = idx.length;
						for (let i = 0; i < frontI; i += 3) {
							const a = idx[i], b = idx[i + 1], c = idx[i + 2];
							idx.push(backBase + a, backBase + c, backBase + b);
						}
					}
					const addSide = (rail: Array<[number, number, number]>) => {
						for (let i = 0; i < rail.length - 1; i++) {
							const pA = rail[i], pB = rail[i + 1];
							const pAe: [number, number, number] = [pA[0] + offX, pA[1] + offY, pA[2] + offZ];
							const pBe: [number, number, number] = [pB[0] + offX, pB[1] + offY, pB[2] + offZ];
							const bi = pos.length / 3;
							pos.push(pA[0], pA[1], pA[2], pB[0], pB[1], pB[2], pBe[0], pBe[1], pBe[2], pAe[0], pAe[1], pAe[2]);
							idx.push(bi + 0, bi + 1, bi + 2, bi + 0, bi + 2, bi + 3);
						}
					};
					addSide(topRail);
					addSide(botRail);

					// Closing Cap בסוף הגרם (מדרגה אחרונה לקומה) – סגירה אנכית/נקייה מול הריצוף
					if (shouldRenderClosingCapForFlight(flightIdx)) {
						// מצא את המדרגה האחרונה בגרם (flight=2) שאינה פודסט
						let lastStep: any = null;
						for (let ii = treads.length - 1; ii >= 0; ii--) {
							const tt = treads[ii];
							if (tt.flight === flightIdx && !tt.isLanding) { lastStep = tt; break; }
						}
						if (lastStep) {
							const yaw = lastStep.rotation[1] as number;
							const { c, s } = cosSin(yaw);
							const dx = lastStep.run / 2;
							const dz = treadWidth / 2;

							// כיוון המסילות בקצה (להארכה עד הקאפ)
							const topEnd = topRail[topRail.length - 1];
							const topPrev = topRail.length >= 2 ? topRail[topRail.length - 2] : topEnd;
							const botEnd = botRail[botRail.length - 1];
							const botPrev = botRail.length >= 2 ? botRail[botRail.length - 2] : botEnd;
							let uxE = topEnd[0] - topPrev[0], uzE = topEnd[2] - topPrev[2], uyE = topEnd[1] - topPrev[1];
							let vxE = botEnd[0] - botPrev[0], vzE = botEnd[2] - botPrev[2], vyE = botEnd[1] - botPrev[1];
							// fallback לכיוון אופקי לפי yaw אם חסרות שתי נקודות
							if (Math.abs(uxE) < 1e-9 && Math.abs(uzE) < 1e-9) { uxE = Math.cos(yaw); uzE = Math.sin(yaw); uyE = 0; }
							if (Math.abs(vxE) < 1e-9 && Math.abs(vzE) < 1e-9) { vxE = Math.cos(yaw); vzE = Math.sin(yaw); vyE = 0; }

							const projT = (pt: [number, number, number]) => {
								if (Math.abs(uxE) >= Math.abs(uzE) && Math.abs(uxE) > 1e-9) return (pt[0] - topEnd[0]) / uxE;
								if (Math.abs(uzE) > 1e-9) return (pt[2] - topEnd[2]) / uzE;
								return 0;
							};
							const projB = (pb: [number, number, number]) => {
								if (Math.abs(vxE) >= Math.abs(vzE) && Math.abs(vxE) > 1e-9) return (pb[0] - botEnd[0]) / vxE;
								if (Math.abs(vzE) > 1e-9) return (pb[2] - botEnd[2]) / vzE;
								return 0;
							};

							// מועמדים לקו האנכי: בקצה הקדמי (+dx) – על הצד של C1 (-dz) או צד נגדי (+dz) לפי התאמה למסילות
							const makeCand = (lz: number) => {
								const lx = dx;
								const rx = lx * c - lz * s;
								const rz = lx * s + lz * c;
								const tCand: [number, number, number] = [
									lastStep.position[0] + rx,
									lastStep.position[1] + treadThickness / 2 + offsetY,
									lastStep.position[2] + rz,
								];
								const bCand: [number, number, number] = [
									tCand[0],
									lastStep.position[1] - treadThickness / 2 - offsetY,
									tCand[2],
								];
								const tt = projT(tCand);
								const tb = projB(bCand);
								const yT = topEnd[1] + tt * uyE;
								const yB = botEnd[1] + tb * vyE;
								const tFin: [number, number, number] = [tCand[0], yT, tCand[2]];
								const bFin: [number, number, number] = [bCand[0], yB, bCand[2]];
								const penaltyBack = (tt < -1e-6 ? 10 : 0) + (tb < -1e-6 ? 10 : 0);
								const score = Math.abs(tt) + Math.abs(tb) + penaltyBack;
								return { tFin, bFin, score };
							};
							const cMain = makeCand(-dz); // P2/P6 – הצד של C1
							const cAlt = makeCand(+dz);  // P3/P7 – צד נגדי (למקרה שהכיוון מתהפך)
							const pick = (cMain.score <= cAlt.score) ? cMain : cAlt;
							const lastT = pick.tFin;
							const lastB = pick.bFin;

							// מקטע מגשר בין קצה המסילות לקאפ + שכבת גב + דפנות + קאפ סופי
							{
								// חזית
								const base = pos.length / 3;
								pos.push(topEnd[0], topEnd[1], topEnd[2],  botEnd[0], botEnd[1], botEnd[2],  lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2]);
								idx.push(base + 0, base + 1, base + 2);
								idx.push(base + 2, base + 1, base + 3);

								// שכבת גב למקטע המגשר
								const backBase = pos.length / 3;
								const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
								const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
								const t2e: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
								const b2e: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
								pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
								idx.push(backBase + 0, backBase + 2, backBase + 1);
								idx.push(backBase + 2, backBase + 3, backBase + 1);

								// דפנות עליונה/תחתונה למקטע המגשר
								const biTop = pos.length / 3;
								pos.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
								idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
								const biBot = pos.length / 3;
								pos.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
								idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);

								// קאפ סיום אנכי (המלבן הסופי)
								const lastTe: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
								const lastBe: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
								const bi = pos.length / 3;
								pos.push(lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2]);
								idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
							}
						}
					}

					return (
						<mesh castShadow receiveShadow>
							<bufferGeometry attach="geometry">
								<bufferAttribute attach="attributes-position" args={[new Float32Array(pos), 3]} />
								<bufferAttribute attach="index" args={[new Uint32Array(idx), 1]} />
							</bufferGeometry>
							<meshBasicMaterial color="#0ea5e9" side={2} />
						</mesh>
					);
				};

				return (
					<group>
						<mesh castShadow receiveShadow>
							<bufferGeometry attach="geometry">
								<bufferAttribute attach="attributes-position" args={[new Float32Array(pos), 3]} />
								<bufferAttribute attach="index" args={[new Uint32Array(idx), 1]} />
							</bufferGeometry>
							{/* פלטה C (צד אחד) */}
							<meshBasicMaterial color="#4b5563" side={2} />
						</mesh>
						{edgeLines.length > 0 ? (
							<lineSegments>
								<bufferGeometry attach="geometry">
									<bufferAttribute attach="attributes-position" args={[new Float32Array(edgeLines), 3]} />
								</bufferGeometry>
								<lineBasicMaterial attach="material" color="#0f172a" linewidth={1} depthTest={true} depthWrite={false} />
							</lineSegments>
						) : null}
						{/* פלטה C1 (צד נגדי) – כחול לפיתוח */}
						{buildC1ForFlight2()}
					</group>
				);
			})() : null}

			{/* דגם 'הייטק' – קווי עזר: גרם 2 */}
			{hitech ? (() => {
				// אסוף מדרגות של גרם שני (flight=1)
				const flightIdx = 1;
				const cosSin = (yaw: number) => ({ c: Math.cos(yaw), s: Math.sin(yaw) });
				const pts4Off: number[] = [];
				const pts7Off: number[] = [];
				const topStepOff: Array<[number, number, number]> = [];    // נקודות 4‑offset לכל מדרגה (ללא פודסט)
				const bottomStepOff: Array<[number, number, number]> = []; // נקודות 7‑offset לכל מדרגה
				const offsetY = Math.max(0, (typeof hitechPlateTopOffsetM === 'number' ? hitechPlateTopOffsetM : 0.03)); // היסט אנכי מהמשטח
				let firstP4: [number, number, number] | null = null;
				let firstP7: [number, number, number] | null = null;
				let firstYaw: number | null = null;
				let firstStepIdxInFlight: number | null = null;
				let closeP4: [number, number, number] | null = null; // נקודת 4 (פודסט ראשון) באופסט
				let closeP7: [number, number, number] | null = null; // נקודת 7 (מדרגה לפני הפודסט) באופסט
				let closeP8: [number, number, number] | null = null; // נקודת 8 (מדרגה לפני הפודסט) באופסט
				for (let i = 0; i < treads.length; i++) {
					const t = treads[i];
					if (t.flight !== flightIdx) continue;
					const yaw = t.rotation[1] as number;
					const { c, s } = cosSin(yaw);
					const dx = t.run / 2;
					const dz = treadWidth / 2;
					// נקודה 4 – עליונה שמאל-קדימה: (-dx, +dz, yTop)
					let p4w: [number, number, number] | null = null;
					let p7w: [number, number, number] | null = null;
					{
						const lx = -dx, lz = dz;
						const rx = lx * c - lz * s;
						const rz = lx * s + lz * c;
						const wx = t.position[0] + rx;
						const wy = t.position[1] + treadThickness / 2;
						const wz = t.position[2] + rz;
						p4w = [wx, wy + offsetY, wz];
						pts4Off.push(p4w[0], p4w[1], p4w[2]);
						if (!t.isLanding && !firstP4) { firstP4 = p4w; if (firstStepIdxInFlight === null) firstStepIdxInFlight = i; }
						if (!t.isLanding) topStepOff.push(p4w);
					}
					// נקודה 7 – תחתונה ימין-קדימה: (+dx, +dz, yBot) – רק אם לא פודסט
					if (!t.isLanding) {
						const lx = dx, lz = dz;
						const rx = lx * c - lz * s;
						const rz = lx * s + lz * c;
						const wx = t.position[0] + rx;
						const wy = t.position[1] - treadThickness / 2;
						const wz = t.position[2] + rz;
						p7w = [wx, wy - offsetY, wz];
						pts7Off.push(p7w[0], p7w[1], p7w[2]);
						if (!firstP7) { firstP7 = p7w; firstYaw = yaw; }
						bottomStepOff.push(p7w);
						// אם המדרגה הבאה היא פודסט – זו המדרגה לפני הפודסט
						const next = treads[i + 1];
						if (next && next.flight === flightIdx && next.isLanding) {
							// קודקוד 7 הוא מהמדרגה הנוכחית (עם אופסט)
							closeP7 = p7w;
							// קודקוד 8 הוא מהמדרגה הנוכחית (עם אופסט) – אותו XZ כמו 4 של אותה מדרגה
							{
								const lx8 = -dx, lz8 = dz;
								const rx8 = lx8 * c - lz8 * s;
								const rz8 = lx8 * s + lz8 * c;
								const wx8 = t.position[0] + rx8;
								const wy8 = t.position[1] - treadThickness / 2 - offsetY;
								const wz8 = t.position[2] + rz8;
								closeP8 = [wx8, wy8, wz8];
							}
							// קודקוד 4 מהפודסט הבא (עם אופסט כלפי מעלה)
							const yaw2 = next.rotation[1] as number;
							const c2 = Math.cos(yaw2), s2 = Math.sin(yaw2);
							const dxL = next.run / 2, dzL = treadWidth / 2;
							const lx2 = -dxL, lz2 = dzL;
							const rx2 = lx2 * c2 - lz2 * s2;
							const rz2 = lx2 * s2 + lz2 * c2;
							const wx2 = next.position[0] + rx2;
							const wy2 = next.position[1] + treadThickness / 2 + offsetY;
							const wz2 = next.position[2] + rz2;
							closeP4 = [wx2, wy2, wz2];
						}
					}
				}
				// אופסט צידי בתוך מישור הפלטה – מחושב רק עבור נקודת 4 של המדרגה הראשונה (מניעת "שפיץ")
				let firstP4SideShift: [number, number, number] | null = null;
				let firstSideShiftVec: [number, number, number] | null = null;
				if (firstP4 && firstP7) {
					// u: כיוון הרייל (ניחש מהמדרגה השנייה אם קיימת, אחרת מהyaw של הראשונה)
					let ux = 1, uy = 0, uz = 0;
					if (pts4Off.length >= 6) {
						const x0 = firstP4[0], y0 = firstP4[1], z0 = firstP4[2];
						const x1 = pts4Off[3], y1 = pts4Off[4], z1 = pts4Off[5];
						ux = x1 - x0; uy = y1 - y0; uz = z1 - z0;
					} else if (firstYaw !== null) {
						ux = Math.cos(firstYaw); uy = 0; uz = Math.sin(firstYaw);
					}
					const um = Math.hypot(ux, uy, uz) || 1; ux /= um; uy /= um; uz /= um;
					// נורמל למישור הפלטה: n = normalize(u × (firstP4-firstP7))
					const wx = firstP4[0] - firstP7[0];
					const wy = firstP4[1] - firstP7[1];
					const wz = firstP4[2] - firstP7[2];
					const nx = uy * wz - uz * wy;
					const ny = uz * wx - ux * wz;
					const nz = ux * wy - uy * wx;
					const nm = Math.hypot(nx, ny, nz) || 1;
					const nxN = nx / nm, nyN = ny / nm, nzN = nz / nm;
					// כיוון צד במישור: s = normalize(n × u)
					let sx = nyN * uz - nzN * uy;
					let sy = nzN * ux - nxN * uz;
					let sz = nxN * uy - nyN * ux;
					const sm = Math.hypot(sx, sy, sz) || 1; sx /= sm; sy /= sm; sz /= sm;
					const side = Math.max(0, (typeof hitechPlateInsetFromEdge === 'number' ? hitechPlateInsetFromEdge : 0.03));
					// אופסט צידי נטו (רק ב‑XZ), ללא שינוי בגובה Y
					firstSideShiftVec = [sx * side, 0, sz * side];
					firstP4SideShift = [firstP4[0] + firstSideShiftVec[0], firstP4[1], firstP4[2] + firstSideShiftVec[2]];
				}

				if (pts4Off.length === 0 && pts7Off.length === 0) return null;
				return (
					<group>
						{pts4Off.length >= 6 && (
							<line>
								<bufferGeometry attach="geometry">
									<bufferAttribute attach="attributes-position" args={[new Float32Array(pts4Off), 3]} />
								</bufferGeometry>
								<lineBasicMaterial attach="material" color="#6b7280" linewidth={1} depthTest={false} depthWrite={false} />
							</line>
						)}
						{pts7Off.length >= 6 && (
							<line>
								<bufferGeometry attach="geometry">
									<bufferAttribute attach="attributes-position" args={[new Float32Array(pts7Off), 3]} />
								</bufferGeometry>
								<lineBasicMaterial attach="material" color="#f87171" linewidth={1} depthTest={false} depthWrite={false} />
							</line>
						)}
						{/* (הוסר) קו ירוק אנכי לסימון סגירה לפני הפודסט */}
						{/* (הוסר) לוגיקת עזר/שמירה למדרגה הראשונה בגרם 2 */}

						{/* פלטה A – רצועה מדויקת בין קווי האופסט (מילוי משולשים) */}
						{bottomStepOff.length > 0 && topStepOff.length > 0 && (() => {
							// הוספת נקודת פתיחה מהפודסט שלפני גרם 2 (אם קיימת)
							let startFromLandingTop: [number, number, number] | null = null;
							let startFromLandingBot: [number, number, number] | null = null;
							if (firstStepIdxInFlight !== null && firstStepIdxInFlight > 0) {
								const prev = treads[firstStepIdxInFlight - 1];
								if (prev && prev.isLanding) {
									const yawL = prev.rotation[1] as number;
									const cL = Math.cos(yawL), sL = Math.sin(yawL);
									const dxL = prev.run / 2, dzL = treadWidth / 2;
									// p4 בלנדינג: (-dxL, +dzL) למעלה
									const lx4 = -dxL, lz4 = dzL;
									const rx4 = lx4 * cL - lz4 * sL;
									const rz4 = lx4 * sL + lz4 * cL;
									const wx4 = prev.position[0] + rx4;
									const wy4 = prev.position[1] + treadThickness / 2 + offsetY;
									const wz4 = prev.position[2] + rz4;
									startFromLandingTop = [wx4, wy4, wz4];
									// p8 "תחתון" תואם (אותו XZ, גובה תחתון)
									const wy8 = prev.position[1] - treadThickness / 2 - offsetY;
									startFromLandingBot = [wx4, wy8, wz4];
								}
							}
							// XZ lock (Start): ודא שה-Bot יושב בדיוק מתחת ל-Top (אותו XZ) גם אם חישובי המקור ישתנו בעתיד
							if (startFromLandingTop && startFromLandingBot) {
								startFromLandingBot = [startFromLandingTop[0], startFromLandingBot[1], startFromLandingTop[2]];
							}
							const baseTop: Array<[number, number, number]> = (() => {
								const arr = closeP4 ? [...topStepOff, closeP4] : [...topStepOff];
								return startFromLandingTop ? [startFromLandingTop, ...arr] : arr;
							})();
							// שמור את הרייל העליון המקורי לשימור השיפוע
							const topRail: Array<[number, number, number]> = baseTop;
							// תיקון עובי פלטה בגרם משופע:
							// בפודסט העובי "אנכי" (ΔY), ובשיפוע נדרש ΔY גדול יותר כדי לשמר עובי ניצב זהה.
							// dySlope = dyLanding / cos(slopeAngle)
							// IMPORTANT: dyLanding חייב להיות קבוע (פודסט/מישור).
							// דרישה: A1 מכתיבה את רוחב/עובי הפלטות B/B1 — dyLanding נגזר מה‑Ref של סוף A1 על הפודסט.
							const a1W = hitech ? hitechBStartRef.current : null;
							const dyFromA1 = a1W ? Math.abs(a1W.top[1] - a1W.bot[1]) : null;
							const dyLanding = Math.max(0.001, (dyFromA1 ?? (treadThickness + 2 * offsetY)));
							// XZ lock (Start): אחרי שיש לנו dyLanding, עדיף להגדיר Bot בדיוק כ-Top - dyLanding
							if (startFromLandingTop) {
								startFromLandingBot = [startFromLandingTop[0], startFromLandingTop[1] - dyLanding, startFromLandingTop[2]];
							}
							// slopeAngle נגזר מכיוון הרייל העליון (u) בין שתי נקודות בגרם (לא בפודסט)
							const idx0 = startFromLandingTop ? 1 : 0;
							const a0 = topRail[Math.min(idx0, topRail.length - 1)];
							const a1 = topRail[Math.min(idx0 + 1, topRail.length - 1)];
							let uxS = a1[0] - a0[0], uyS = a1[1] - a0[1], uzS = a1[2] - a0[2];
							{ const m = Math.hypot(uxS, uyS, uzS) || 1; uxS /= m; uyS /= m; uzS /= m; }
							const cosSlope = Math.hypot(uxS, uzS); // cos(angle from horizontal)
							const safeCos = Math.max(0.1, cosSlope);
							const dySlope = dyLanding / safeCos;
							// XZ lock (Extension/Suffix): נקודת הקצה על הפודסט (closeP4) חייבת לקבל Bot נעול-Top - dyLanding
							const extTopAtL: [number, number, number] | null = closeP4 ? closeP4 : null;
							const extBotAtL: [number, number, number] | null = extTopAtL ? [extTopAtL[0], extTopAtL[1] - dyLanding, extTopAtL[2]] : null;
							const botRail: Array<[number, number, number]> = topRail.map((t, i) => {
								if (extBotAtL && i === topRail.length - 1) return extBotAtL;
								const isLandingPoint =
									(!!startFromLandingTop && i === 0) ||
									(!!closeP4 && i === topRail.length - 1);
								// גם נקודות פודסט/הארכה חייבות להישאר בעובי dyLanding (אופקי נקי)
								const isExtensionPoint =
									(!!startFromLandingTop && i === 0) ||
									(!!closeP4 && i === topRail.length - 1);
								// אם גובה הנקודה זהה לגובה הפודסט (start/close) – חייבים dyLanding.
								// חשוב להשתמש בטולרנס (ולא ===) כדי לא ליפול על floating-point.
								const epsY = 1e-6;
								const yStart = startFromLandingTop?.[1];
								const yClose = closeP4?.[1];
								const isFlatByY =
									(typeof yStart === 'number' && Math.abs(t[1] - yStart) < epsY) ||
									(typeof yClose === 'number' && Math.abs(t[1] - yClose) < epsY);
								const dy = (isLandingPoint || isExtensionPoint || isFlatByY) ? dyLanding : dySlope;
								return [t[0], t[1] - dy, t[2]];
							});
							// בחר אורך מקסימלי – אם מסילה אחת ארוכה יותר (למשל כוללת פודסט), נשכפל את הנקודה האחרונה של הקצרה
							const count = Math.max(topRail.length, botRail.length);

							// (הוסר) קליפינג ייעודי להתחלת הרצועה בגרם 2
							const botRailWithExtension: Array<[number, number, number]> =
								botRail;
							const topRailClipped: Array<[number, number, number]> =
								topRail;

							// בניית רצועה החל מהמדרגה הראשונה (כולל) בגרם 2
							const topForFront: Array<[number, number, number]> = topRailClipped;
							const botForFront: Array<[number, number, number]> = botRailWithExtension;

							// הרחבת תחילת פלטת B "לפני" המדרגה הראשונה – התחלה מה"פודסט":
							// ללא הרחבה סינתטית: המקטע הראשון ייווצר בין מדרגה 1 למדרגה 2 בדיוק כמו שאר המקטעים

							// מאחדים: מהנקודה הזאת ואילך נשתמש באותן מסילות לכל החזית/דפנות/קאפ
							const railTop = topForFront;
							const railBot = botForFront;

							const pos: number[] = [];   // משטח קדמי
							const idx: number[] = [];
							const pick = (arr: Array<[number, number, number]>, i: number) => arr[Math.min(i, arr.length - 1)];
							const segCount = Math.max(railTop.length, railBot.length);
							if (segCount < 2) return null;
							for (let i = 0; i < segCount - 1; i++) {
								let t1 = pick(railTop, i);
								let b1 = pick(railBot, i);
								const t2 = pick(railTop, i + 1);
								const b2 = pick(railBot, i + 1);
								// ייצוב המקטע הראשון: שימוש בנקודות f4/f7 המדויקות אם קיימות
								if (i === 0) {
									// אם יש נקודת פתיחה מהפודסט – לא לעקוף אותה
									const hasLandingStart = !!startFromLandingTop && !!startFromLandingBot;
									if (!hasLandingStart) {
										if (firstP4SideShift) t1 = firstP4SideShift;
										// תחתון תמיד אנכי מתחת לעליון (ΔY לפי dySlope) כדי לשמור עובי ניצב זהה בשיפוע
										b1 = [t1[0], t1[1] - dySlope, t1[2]];
									}
								}
								const baseIndex = pos.length / 3;
								// סדר נקודות: t1,b1,t2,b2
								pos.push(t1[0], t1[1], t1[2]);
								pos.push(b1[0], b1[1], b1[2]);
								pos.push(t2[0], t2[1], t2[2]);
								pos.push(b2[0], b2[1], b2[2]);
								// שני משולשים לכיסוי הריבוע
								idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
								idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
							}

							// בניית נפח: משטח אחורי והדפנות על סמך normal קבוע של המישור
							const thickness = Math.max(0.001, (typeof hitechPlateThickness === 'number' ? hitechPlateThickness : 0.012));
							// כיוון לאורך המסילה (u)
							let ux = 1, uy = 0, uz = 0;
							if (railTop.length >= 2) {
								ux = railTop[1][0] - railTop[0][0];
								uy = railTop[1][1] - railTop[0][1];
								uz = railTop[1][2] - railTop[0][2];
							}
							const um = Math.hypot(ux, uy, uz) || 1; ux /= um; uy /= um; uz /= um;
							// רוחב בין המסילות (w)
							// רוחב בין המסילות (w) – אחרי התיקון הוא אנכי (אותו XZ), ולכן מדידה ישירה מהריילים יציבה יותר
							let wx = (railTop[0][0] - railBot[0][0]);
							let wy = (railTop[0][1] - railBot[0][1]);
							let wz = (railTop[0][2] - railBot[0][2]);
							const nmX = uy * wz - uz * wy;
							const nmY = uz * wx - ux * wz;
							const nmZ = ux * wy - uy * wx;
							const nmag = Math.hypot(nmX, nmY, nmZ) || 1;
							const nxN = nmX / nmag, nyN = nmY / nmag, nzN = nmZ / nmag;
							const offX = nxN * thickness, offY = nyN * thickness, offZ = nzN * thickness;

							// משטח אחורי (הזזה ב-n) – יש ללכוד את אורך החזית לפני ההוספה כדי לא לגדול באותה לולאה
							const frontVertexCount = pos.length / 3;
							const backBase = frontVertexCount;
							for (let i = 0; i < frontVertexCount * 3; i += 3) {
								pos.push(pos[i] + offX, pos[i + 1] + offY, pos[i + 2] + offZ);
							}
							// אינדקסים למשטח האחורי בהיפוך כיוון – לולאה על האינדקסים המקוריים בלבד
							const frontIndexCount = idx.length;
							for (let i = 0; i < frontIndexCount; i += 3) {
								const a = idx[i], b = idx[i + 1], c = idx[i + 2];
								idx.push(backBase + a, backBase + c, backBase + b);
							}

							// פונקציה לעדכון דפנות על קו שבין שתי רשימות נקודות
							const addSideStrip = (rail: Array<[number, number, number]>) => {
								if (rail.length < 2) return;
								for (let i = 0; i < rail.length - 1; i++) {
									const pA = rail[i];
									const pB = rail[i + 1];
									const pAe: [number, number, number] = [pA[0] + offX, pA[1] + offY, pA[2] + offZ];
									const pBe: [number, number, number] = [pB[0] + offX, pB[1] + offY, pB[2] + offZ];
									const bi = pos.length / 3;
									pos.push(pA[0], pA[1], pA[2],  pB[0], pB[1], pB[2],  pBe[0], pBe[1], pBe[2],  pAe[0], pAe[1], pAe[2]);
									idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
								}
							};
							// דופן עליונה ותחתונה – אם מתחילים מהפודסט, אל תוסיף אופסטים; אחרת הוסף inset בתחילת המסילה
							const useLandingStart = !!startFromLandingTop && !!startFromLandingBot;
							// חשוב: לא לעשות prepend לנקודת inset בתחילת המסילה (יוצר מקטע אלכסוני קצר – "חצי רוחב").
							// במקום זה מחליפים את נקודה 0 ומיישרים XZ של Bot ל‑Top תוך שמירה על Y שכבר חושב (railBot[0][1]).
							const topRailForSideB = useLandingStart
								? railTop
								: ((firstP4SideShift && railTop.length >= 1) ? [firstP4SideShift, ...railTop.slice(1)] : railTop);
							const botRailForSideB = useLandingStart
								? railBot
								: ((firstP4SideShift && railBot.length >= 1)
									? [([firstP4SideShift[0], railBot[0][1], firstP4SideShift[2]] as [number, number, number]), ...railBot.slice(1)]
									: railBot);
							// אם אין לפחות מקטע אחד ברצועה – אל תיצור דפנות/קאפ (ימנע "פלטה מוזרה")
							if (segCount >= 2) {
								// דפנות החל מהמקטע הראשון
								addSideStrip(topRailForSideB);
								addSideStrip(botRailForSideB);
								// דופן התחלה (קאפ) – מיישר את תחילת הפלטה עם הנורמל
								if (!useLandingStart) {
									const firstT = topRailForSideB[0];
									// קאפ אנכי: תחתון באותו XZ כמו העליון, Y מתחתון הקיים
									const firstBy = botRailForSideB[0][1];
									const firstB: [number, number, number] = [firstT[0], firstBy, firstT[2]];
									const firstTe: [number, number, number] = [firstT[0] + offX, firstT[1] + offY, firstT[2] + offZ];
									const firstBe: [number, number, number] = [firstB[0] + offX, firstB[1] + offY, firstB[2] + offZ];
									const bi = pos.length / 3;
									pos.push(firstT[0], firstT[1], firstT[2],  firstB[0], firstB[1], firstB[2],  firstBe[0], firstBe[1], firstBe[2],  firstTe[0], firstTe[1], firstTe[2]);
									idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
								}
							}
							// דופן סיום
							if (shouldRenderClosingCapForFlight(flightIdx)) {
								// הצב את הקאפ בקצה המדרגה (נק׳ 3/7 של המדרגה האחרונה בגרם)
								let lastStep: any = null;
								for (let ii = treads.length - 1; ii >= 0; ii--) {
									const tt = treads[ii];
									if (tt.flight === flightIdx && !tt.isLanding) { lastStep = tt; break; }
								}
								if (lastStep) {
									const yaw = lastStep.rotation[1] as number;
									const { c, s } = cosSin(yaw);
									const dx = lastStep.run / 2;
									const dz = treadWidth / 2;
									const lx = dx, lz = dz;
									const rx = lx * c - lz * s;
									const rz = lx * s + lz * c;
									let lastT: [number, number, number] = [
										lastStep.position[0] + rx,
										lastStep.position[1] + treadThickness / 2 + offsetY,
										lastStep.position[2] + rz
									];
									let lastB: [number, number, number] = [
										lastT[0],
										lastStep.position[1] - treadThickness / 2 - offsetY,
										lastT[2]
									];
									// הארכת מסילות 4‑offset ו‑7‑offset באותו שיפוע עד שנפגשות עם האנך ב‑P3
									const topEnd = topRailForSideB[topRailForSideB.length - 1];
									const topPrev = topRailForSideB.length >= 2 ? topRailForSideB[topRailForSideB.length - 2] : topEnd;
									const botEnd = botRailForSideB[botRailForSideB.length - 1];
									const botPrev = botRailForSideB.length >= 2 ? botRailForSideB[botRailForSideB.length - 2] : botEnd;
									let ux = topEnd[0] - topPrev[0], uz = topEnd[2] - topPrev[2], uy = topEnd[1] - topPrev[1];
									let vx = botEnd[0] - botPrev[0], vz = botEnd[2] - botPrev[2], vy = botEnd[1] - botPrev[1];
									// fallback: אם אין שני נק׳ למסילה, קח כיוון לפי yaw של המדרגה האחרונה (שטוח בגובה בתוך המדרך)
									if (Math.abs(ux) < 1e-9 && Math.abs(uz) < 1e-9) { ux = Math.cos(yaw); uz = Math.sin(yaw); uy = 0; }
									if (Math.abs(vx) < 1e-9 && Math.abs(vz) < 1e-9) { vx = Math.cos(yaw); vz = Math.sin(yaw); vy = 0; }
										// הקרנה לקבלת גובהים ב‑lastT/lastB
										let tTop = 0, tBot = 0;
										if (Math.abs(ux) >= Math.abs(uz) && Math.abs(ux) > 1e-9) tTop = (lastT[0] - topEnd[0]) / ux;
										else if (Math.abs(uz) > 1e-9) tTop = (lastT[2] - topEnd[2]) / uz;
										if (Math.abs(vx) >= Math.abs(vz) && Math.abs(vx) > 1e-9) tBot = (lastB[0] - botEnd[0]) / vx;
										else if (Math.abs(vz) > 1e-9) tBot = (lastB[2] - botEnd[2]) / vz;
										const yTop = topEnd[1] + tTop * uy;
										const yBot = botEnd[1] + tBot * vy;
										lastT = [lastT[0], yTop, lastT[2]];
										lastB = [lastB[0], yBot, lastB[2]];

										// הוספת מקטע חזית מגשר בין קצה הפלטה (topEnd/botEnd) אל נק׳ הקאפ (lastT/lastB)
										{
											const baseIndex = pos.length / 3;
											pos.push(topEnd[0], topEnd[1], topEnd[2]);
											pos.push(botEnd[0], botEnd[1], botEnd[2]);
											pos.push(lastT[0], lastT[1], lastT[2]);
											pos.push(lastB[0], lastB[1], lastB[2]);
											idx.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
											idx.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);

											// שכבת גב למקטע המגשר
											const backBase = pos.length / 3;
											const t1e: [number, number, number] = [topEnd[0] + offX, topEnd[1] + offY, topEnd[2] + offZ];
											const b1e: [number, number, number] = [botEnd[0] + offX, botEnd[1] + offY, botEnd[2] + offZ];
											const t2e: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
											const b2e: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
											pos.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
											idx.push(backBase + 0, backBase + 2, backBase + 1);
											idx.push(backBase + 2, backBase + 3, backBase + 1);

											// דפנות עליונה ותחתונה למקטע המגשר
											const biTop = pos.length / 3;
											pos.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
											idx.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
											const biBot = pos.length / 3;
											pos.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
											idx.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
										}

										// קאפ סיום אנכי (המלבן הסופי)
										const lastTe: [number, number, number] = [lastT[0] + offX, lastT[1] + offY, lastT[2] + offZ];
										const lastBe: [number, number, number] = [lastB[0] + offX, lastB[1] + offY, lastB[2] + offZ];
										const bi = pos.length / 3;
										pos.push(lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2]);
										idx.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
								}
							}

							// קאפ סיום – הוסר

						// בוטל: קאפ סיום חיצוני לפי 3/7

							// --- פלטה B1 לגרם 2 (flight=1) – העתק של B בצד הנגדי (P1 למעלה, P6 למטה) עם הארכות בפודסטים ---
							const buildB1ForFlight1 = () => {
								const topP1: Array<[number, number, number]> = [];
								const botP6: Array<[number, number, number]> = [];
								let firstP1: [number, number, number] | null = null;
								let firstP6: [number, number, number] | null = null;
								let firstYaw: number | null = null;
								let firstStepIdxInFlight: number | null = null;
								let closeP1: [number, number, number] | null = null; // נקודת 1 של הפודסט (עליונה)
								let closeP6: [number, number, number] | null = null; // נקודת 6 של המדרגה שלפני הפודסט (תחתונה)
								let closeLanding: typeof treads[number] | null = null; // הפודסט שאליו B1 נסגרת (בסוף הגרם)

								for (let i = 0; i < treads.length; i++) {
									const t = treads[i];
									if (t.flight !== 1) continue;
									const yaw = t.rotation[1] as number;
									const c = Math.cos(yaw), s = Math.sin(yaw);
									const dx = t.run / 2;
									const dz = treadWidth / 2;
									// P1 – עליונה שמאל‑אחורה: (-dx, -dz)
									{
										const lx = -dx, lz = -dz;
										const rx = lx * c - lz * s;
										const rz = lx * s + lz * c;
										const wx = t.position[0] + rx;
										const wy = t.position[1] + treadThickness / 2;
										const wz = t.position[2] + rz;
										const p1: [number, number, number] = [wx, wy + offsetY, wz];
										if (!t.isLanding && !firstP1) { firstP1 = p1; if (firstStepIdxInFlight === null) firstStepIdxInFlight = i; }
										if (!t.isLanding) topP1.push(p1);
									}
									// P6 – תחתונה ימין‑אחורה: (+dx, -dz) רק אם אינה פודסט
									if (!t.isLanding) {
										const lx = +dx, lz = -dz;
										const rx = lx * c - lz * s;
										const rz = lx * s + lz * c;
										const wx = t.position[0] + rx;
										const wy = t.position[1] - treadThickness / 2;
										const wz = t.position[2] + rz;
										const p6: [number, number, number] = [wx, wy - offsetY, wz];
										if (!firstP6) { firstP6 = p6; firstYaw = yaw; }
										botP6.push(p6);
										// אם הבאה פודסט – סגור לפודסט הבא
										const next = treads[i + 1];
										if (next && next.flight === 1 && next.isLanding) {
											closeP6 = p6;
											closeLanding = next;
											const yawL = next.rotation[1] as number;
											const cL = Math.cos(yawL), sL = Math.sin(yawL);
											const dxL = next.run / 2, dzL = treadWidth / 2;
											const lx1 = -dxL, lz1 = -dzL; // P1 של הפודסט
											const rx1 = lx1 * cL - lz1 * sL;
											const rz1 = lx1 * sL + lz1 * cL;
											const wx1 = next.position[0] + rx1;
											const wy1 = next.position[1] + treadThickness / 2 + offsetY;
											const wz1 = next.position[2] + rz1;
											closeP1 = [wx1, wy1, wz1];
										}
									}
								}

								// הארכה מהפודסט הקודם (אם קיים לפני תחילת הגרם)
								let startFromLandingTop: [number, number, number] | null = null;
								let startFromLandingBot: [number, number, number] | null = null;
								if (firstStepIdxInFlight !== null && firstStepIdxInFlight > 0) {
									const prev = treads[firstStepIdxInFlight - 1];
									if (prev && prev.isLanding) {
										const yawL = prev.rotation[1] as number;
										const cL = Math.cos(yawL), sL = Math.sin(yawL);
										const dxL = prev.run / 2, dzL = treadWidth / 2;
										// B1 יושב על צד P1 (שמאל‑אחורה) — בפודסט צריך לקחת את אותה פינה, אחרת פס הפודסט יוצא אלכסוני.
										// לכן: (-dxL, -dzL) ולא (+dxL, -dzL)
										const lx1 = -dxL, lz1 = -dzL;
										const rx1 = lx1 * cL - lz1 * sL;
										const rz1 = lx1 * sL + lz1 * cL;
										const wx1 = prev.position[0] + rx1;
										const wy1 = prev.position[1] + treadThickness / 2 + offsetY;
										const wz1 = prev.position[2] + rz1;
										startFromLandingTop = [wx1, wy1, wz1];
										const wy6 = prev.position[1] - treadThickness / 2 - offsetY;
										startFromLandingBot = [wx1, wy6, wz1];
									}
								}
								// חיבור Hitech חדש: A1 מוארכת וכוללת את הפודסט, לכן נקודת ההתחלה של B1 מגיעה ישירות מקצה A1.
								// אין ציור פודסט נפרד עבור B1 ואין חישובי intersection/גרונג בתחילת הגרם.
								const a1Anchor = hitechBStartRef.current;
								const startTop = (a1Anchor?.top || startFromLandingTop || firstP1);
								let startBot = (a1Anchor?.bot || startFromLandingBot || firstP6);
								if (!startTop || !startBot) return null;

								// דיוק תחילת B1:
								// מוסיפים קטע אופקי קצר (Horizontal Extension) לפני תחילת השיפוע, כדי שהשיפוע לא יתחיל מוקדם מדי
								// ושהחיבור ל‑A1 יישאר "יצוק" עם רוחב אחיד.
								// IMPORTANT: dyLanding חייב להיות קבוע על מישור (פודסט).
								// דרישה: A1 מכתיבה את רוחב/עובי הפלטות B/B1 — dyLanding נגזר מה‑Ref של סוף A1 על הפודסט.
								const a1W = hitech ? hitechBStartRef.current : null;
								const dyFromA1 = a1W ? Math.abs(a1W.top[1] - a1W.bot[1]) : null;
								const dyLanding = Math.max(0.001, (dyFromA1 ?? (treadThickness + 2 * offsetY)));
								// כיוון אופקי של הגרם (ב‑XZ) לפי ה‑yaw של המדרגה הראשונה
								const yawS = (firstStepIdxInFlight !== null ? (treads[firstStepIdxInFlight]?.rotation[1] as number) : (firstYaw ?? 0)) || 0;
								const uxH = Math.cos(yawS);
								const uzH = Math.sin(yawS);
								const dotH = (p: [number, number, number]) => (p[0] * uxH + p[2] * uzH);
								// טנגנס השיפוע וה‑cos לצורך עובי ניצב
								let tanSlope = (riser / treadDepth);
								let cosSlope = 1 / Math.sqrt(1 + tanSlope * tanSlope);
								if (topP1.length >= 2) {
									const u0 = topP1[0], u1 = topP1[1];
									const dx = u1[0] - u0[0], dy = u1[1] - u0[1], dz = u1[2] - u0[2];
									const horiz = Math.hypot(dx, dz);
									if (horiz > 1e-6) {
										tanSlope = Math.abs(dy) / horiz;
										cosSlope = horiz / Math.hypot(horiz, dy);
									}
								}
								const safeCos = Math.max(0.1, cosSlope);
								const dySlope = dyLanding / safeCos;
								// Start XZ lock + עובי נכון בתחילת המסילה:
								// אם נקודת ההתחלה מגיעה מהפודסט/הארכה (A1 anchor או landing start) — Bot חייב להיות Top - dyLanding.
								// אחרת (התחלה בשיפוע) — Bot חייב להיות Top - dySlope.
								const startIsFlat = !!a1Anchor?.top || !!startFromLandingTop;
								startBot = [startTop[0], startTop[1] - (startIsFlat ? dyLanding : dySlope), startTop[2]];
								// חשוב: botP6 (קודקודי מדרגה "מתחת" למדרך) נותנים הפרש אנכי קבוע dyLanding,
								// אבל בשיפוע אנחנו צריכים ΔY גדול יותר (dySlope) כדי לשמור עובי ניצב אחיד.
								// לכן נבנה "רייל תחתון" לשיפוע כנגזרת של topP1 עם dySlope.
								const botP6Perp: Array<[number, number, number]> = topP1.map((t) => [t[0], t[1] - dySlope, t[2]]);

								// Transition (גרונג) בסוף השיפוע לפני הפודסט העליון:
								// מוסיפים נקודות "ברך" כדי שהמסילה התחתונה תפסיק שיפוע מוקדם יותר,
								// ואז המשך אופקי עד קצה הפודסט יהיה עם עובי יציב (ללא עיוות בפינה).
								let endTopKnee: [number, number, number] | null = null;
								let endBotSlopeKnee: [number, number, number] | null = null;
								let endBotPlaneAtTopBreak: [number, number, number] | null = null;
								if (closeP1 && topP1.length >= 1 && tanSlope > 1e-6) {
									const topBreak = closeP1; // עליון בתחילת הפודסט
									const prevTop = topP1[topP1.length - 1];
									const dxE = topBreak[0] - prevTop[0];
									const dzE = topBreak[2] - prevTop[2];
									const horizE = Math.hypot(dxE, dzE);
									if (horizE > 1e-6) {
										const uxE = dxE / horizE;
										const uzE = dzE / horizE;
										// Reverse Bot Offset לסיום: L_bot = L_top - (dySlope-dyLanding)/tanSlope
										const botOffsetEnd = (dySlope - dyLanding) / tanSlope;
										endTopKnee = [
											topBreak[0] - uxE * botOffsetEnd,
											topBreak[1] - tanSlope * botOffsetEnd,
											topBreak[2] - uzE * botOffsetEnd,
										];
										// XZ lock: knee בתחתון חייב לשבת בדיוק מתחת לעליון (אותו XZ)
										endBotSlopeKnee = [endTopKnee[0], endTopKnee[1] - dySlope, endTopKnee[2]];
										endBotPlaneAtTopBreak = [topBreak[0], topBreak[1] - dyLanding, topBreak[2]];
									}
								}
								// חישוב נקודת שבירה: בוחרים L כך שהאלכסון מ‑breakTop יפגוש את המדרגה הראשונה בזווית השיפוע הנכונה
								// מבלי "לחנוק" את עובי הפלטה. (דחיית תחילת השיפוע)
								let breakTop: [number, number, number] | null = null;
								let breakTopSlopeAtLbot: [number, number, number] | null = null; // נקודת top על השיפוע ב-Lbot
								let breakBotAtL: [number, number, number] | null = null; // תחתון בקצה העליון (ב-L) עם dyLanding
								let breakBotHAtLbot: [number, number, number] | null = null; // תחתון אופקי עד Lbot (dyLanding)
								let breakBotSAtLbot: [number, number, number] | null = null; // תחילת השיפוע בתחתון (dySlope) ב-Lbot
								const firstSlopeTop = topP1.length >= 1 ? topP1[0] : null;
								if (firstSlopeTop && tanSlope > 1e-6) {
									const deltaY = (firstSlopeTop[1] - startTop[1]);
									const requiredAlong = Math.max(0, deltaY / tanSlope);
									const dAlong = (dotH(firstSlopeTop) - dotH(startTop)); // כמה רחוק המדרגה הראשונה קדימה ביחס ל‑startTop
									const L = Math.max(0, dAlong - requiredAlong);
									breakTop = [startTop[0] + uxH * L, startTop[1], startTop[2] + uzH * L];
									// כדי למנוע "שפיץ" בתחתית: מתחילים את השיפוע בתחתון מאוחר יותר ב-offset אופקי:
									// Bot_Offset = (dySlope - dyLanding) / tanSlope
									const botOffset = Math.max(0, (dySlope - dyLanding) / tanSlope);
									const Lbot = L + botOffset;
									breakBotAtL = [breakTop[0], breakTop[1] - dyLanding, breakTop[2]];
									// top על השיפוע ב-Lbot (הטופ כבר התחיל לעלות ב-L, אז אחרי botOffset יעלה ב-tanSlope*botOffset)
									breakTopSlopeAtLbot = [startTop[0] + uxH * Lbot, startTop[1] + tanSlope * botOffset, startTop[2] + uzH * Lbot];
									// XZ lock: נקודת "ברך" אופקית בתחתון חייבת לשבת בדיוק מתחת ל-top ב-Lbot (אותו XZ)
									breakBotHAtLbot = [breakTopSlopeAtLbot[0], startTop[1] - dyLanding, breakTopSlopeAtLbot[2]];
									// XZ lock: knee בתחתון חייב לשבת בדיוק מתחת לעליון (אותו XZ)
									breakBotSAtLbot = [breakTopSlopeAtLbot[0], breakTopSlopeAtLbot[1] - dySlope, breakTopSlopeAtLbot[2]];
								}

								// בניית מסילות B1 (שומרים את מספר הנקודות המקורי של המדרגות; מוסיפים רק את "קטע 0→1" האופקי בתחילה)
								const topRailB1: Array<[number, number, number]> = (() => {
									// סנכרון קודקודים לסוף השיפוע (מניעת "שפיץ" בטריאנגולציה):
									// Top: [..., endTopKnee, closeP1, closeP1]
									// Bot: [..., endBotSlopeKnee, endBotSlopeKnee, endBotPlaneAtTopBreak]
									const topTail =
										(closeP1 && endTopKnee && endBotSlopeKnee && endBotPlaneAtTopBreak)
											? [...topP1, endTopKnee, closeP1, closeP1]
											: (closeP1 ? [...topP1, closeP1] : [...topP1]);
									// Prefix מדויק (כמו הדרישה): topPrefix=[startTop, breakTop, breakTopSlopeAtLbot]
									// וסנכרון: שכפול נקודה אחת בלבד ב-Top כדי להשוות לאורך ה-Bot prefix.
									if (breakTop && breakTopSlopeAtLbot) {
										const topPrefix: Array<[number, number, number]> = [startTop, breakTop, breakTopSlopeAtLbot];
										const topPrefixSynced: Array<[number, number, number]> = [...topPrefix, topPrefix[topPrefix.length - 1]];
										return [...topPrefixSynced, ...topTail];
									}
									return [startTop, ...topTail];
								})();
								let botRailB1: Array<[number, number, number]> = (() => {
									const botTail =
										(closeP1 && endTopKnee && endBotSlopeKnee && endBotPlaneAtTopBreak)
											? [...botP6Perp, endBotSlopeKnee, endBotSlopeKnee, endBotPlaneAtTopBreak]
											: (closeP6 ? [...botP6, closeP6] : [...botP6]);
									// Prefix מדויק (כמו הדרישה): botPrefix=[startBot, breakBotAtL, breakBotHAtLbot, breakBotSAtLbot]
									if (breakBotAtL && breakBotHAtLbot && breakBotSAtLbot) {
										const botPrefix: Array<[number, number, number]> = [startBot, breakBotAtL, breakBotHAtLbot, breakBotSAtLbot];
										return [...botPrefix, ...botTail];
									}
									return [startBot, ...botTail];
								})();
								// יישור אורכים דטרמיניסטי: מונע טריאנגולציה באלכסון כשיש #נקודות שונה (גורם "שפיץ" ויזואלי)
								const topRailB1A: Array<[number, number, number]> = [...topRailB1];
								const botRailB1A: Array<[number, number, number]> = [...botRailB1];
								while (topRailB1A.length < botRailB1A.length) topRailB1A.push(topRailB1A[topRailB1A.length - 1]);
								while (botRailB1A.length < topRailB1A.length) botRailB1A.push(botRailB1A[botRailB1A.length - 1]);
								const segCountB1 = topRailB1A.length;

								// חזית
								const posB1: number[] = [];
								const idxB1: number[] = [];
								// (בוטל) מקטע אופקי בלנדינג העליון
								const pickB1 = (arr: Array<[number, number, number]>, i: number) => arr[Math.min(i, arr.length - 1)];
								if (segCountB1 < 2) return null;

								for (let i = 0; i < segCountB1 - 1; i++) {
									let t1 = pickB1(topRailB1A, i);
									let b1 = pickB1(botRailB1A, i);
									const t2 = pickB1(topRailB1A, i + 1);
									const b2 = pickB1(botRailB1A, i + 1);
									const baseIndex = posB1.length / 3;
									posB1.push(t1[0], t1[1], t1[2],  b1[0], b1[1], b1[2],  t2[0], t2[1], t2[2],  b2[0], b2[1], b2[2]);
									idxB1.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
									idxB1.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
								}

								// fallback נוסף: אם משום מה לא נוצרו משולשים (לדוגמה נקודות חופפות) – צור סגמנט ראשון מינימלי
								if (posB1.length === 0 && topRailB1A.length >= 2 && botRailB1A.length >= 2) {
									const t1 = topRailB1A[0], t2 = topRailB1A[1];
									const b1 = botRailB1A[0], b2 = botRailB1A[1];
									const baseIndex = posB1.length / 3;
									posB1.push(t1[0], t1[1], t1[2],  b1[0], b1[1], b1[2],  t2[0], t2[1], t2[2],  b2[0], b2[1], b2[2]);
									idxB1.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
									idxB1.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
								}

								// A1 כבר מכסה את הפודסט, לכן B1 לא מייצרת משטח/סלב נפרד של פודסט.

								// עובי ונורמל (מישור הפלטה)
								const thicknessB1 = Math.max(0.001, (typeof hitechPlateThickness === 'number' ? hitechPlateThickness : 0.012));
								let uxB = 1, uyB = 0, uzB = 0;
								if (topRailB1A.length >= 2) {
									uxB = topRailB1A[1][0] - topRailB1A[0][0];
									uyB = topRailB1A[1][1] - topRailB1A[0][1];
									uzB = topRailB1A[1][2] - topRailB1A[0][2];
									{ const m = Math.hypot(uxB, uyB, uzB) || 1; uxB /= m; uyB /= m; uzB /= m; }
								}
								// רוחב בין המסילות – חובה להשתמש בריילים עצמם (אחרי dySlope/dyLanding),
								// כדי שהנורמל לא "יקפוץ" בגלל שימוש בקודקודי מדרגה (dyLanding קבוע) בשיפוע.
								let wxB = (topRailB1A[0][0] - botRailB1A[0][0]);
								let wyB = (topRailB1A[0][1] - botRailB1A[0][1]);
								let wzB = (topRailB1A[0][2] - botRailB1A[0][2]);
								let nmXB = uyB * wzB - uzB * wyB;
								let nmYB = uzB * wxB - uxB * wzB;
								let nmZB = uxB * wyB - uyB * wxB;
								{ const m = Math.hypot(nmXB, nmYB, nmZB) || 1; nmXB /= m; nmYB /= m; nmZB /= m; }
								// הקפנו לצד הנגדי (כמו A1) לשמירה על נקרא "חוץ"
								const offXB = -nmXB * thicknessB1, offYB = -nmYB * thicknessB1, offZB = -nmZB * thicknessB1;

								// בוטל: מלבן קשיח לאורך צד הפודסט – נבנה רק פס חיבור לפי כיוון הפלטה לשמירת רוחב אחיד
								// שכבת גב
								{
									const frontN = posB1.length / 3;
									const backBase = frontN;
									for (let i = 0; i < frontN * 3; i += 3) {
										posB1.push(posB1[i] + offXB, posB1[i + 1] + offYB, posB1[i + 2] + offZB);
									}
									const frontI = idxB1.length;
									for (let i = 0; i < frontI; i += 3) {
										const a = idxB1[i], b = idxB1[i + 1], c = idxB1[i + 2];
										idxB1.push(backBase + a, backBase + c, backBase + b);
									}
								}

								// דפנות
								const addSideB1 = (rail: Array<[number, number, number]>) => {
									if (rail.length < 2) return;
									for (let i = 0; i < rail.length - 1; i++) {
										const pA = rail[i], pB = rail[i + 1];
										const pAe: [number, number, number] = [pA[0] + offXB, pA[1] + offYB, pA[2] + offZB];
										const pBe: [number, number, number] = [pB[0] + offXB, pB[1] + offYB, pB[2] + offZB];
										const bi = posB1.length / 3;
										posB1.push(pA[0], pA[1], pA[2],  pB[0], pB[1], pB[2],  pBe[0], pBe[1], pBe[2],  pAe[0], pAe[1], pAe[2]);
										idxB1.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
									}
								};
								addSideB1(topRailB1A);
								addSideB1(botRailB1A);

								// הארכה לסוף הפודסט הבא אם יש (בדומה ל‑A1): שמור אופסט עליון, התאם תחתון בשיפוע
								let extTopAtL: [number, number, number] | null = null;
								let extBotAtL: [number, number, number] | null = null;
								if (closeP1) {
									// השתמש בפודסט שאליו נסגרנו בפועל (closeLanding) כדי לשמור Ref בקצה הרחוק הנכון.
									// אחרת, אם ניקח "הפודסט הראשון ב-flight=1" נקבל בטעות את תחילת הפודסט (איפה ש‑B1 נגמרת לעלות).
									const nextLanding = closeLanding;
									if (nextLanding) {
										const yawL = nextLanding.rotation[1] as number;
										const cL = Math.cos(yawL), sL = Math.sin(yawL);
										const dxL = nextLanding.run / 2, dzL = treadWidth / 2;
										// קצה רחוק בצד B1: (+dxL, -dzL)
										const lxFar = +dxL, lzFar = -dzL;
										const rxFar = lxFar * cL - lzFar * sL;
										const rzFar = lxFar * sL + lzFar * cL;
										const xFar = nextLanding.position[0] + rxFar;
										const zFar = nextLanding.position[2] + rzFar;
										const yTop = nextLanding.position[1] + treadThickness / 2 + offsetY;
										extTopAtL = [xFar, yTop, zFar];
										// אחרי ה-Transition (גרונג) בנקודת closeP1, ההמשך לפודסט הוא אופקי,
										// לכן תחתון בקצה הרחוק הוא פשוט Offset אנכי (dyLanding) מתחת ל-Top.
										extBotAtL = [xFar, yTop - dyLanding, zFar];
									}
								}

								// חשיפה לגרם הבא: C1 תתחיל בדיוק בנקודות הסיום של B1 על הפודסט השני (קו חיצוני רציף/Flush)
								hitechCStartRef.current = (extTopAtL && extBotAtL) ? { top: extTopAtL, bot: extBotAtL } : null;

								// אם יש הארכה לפודסט – הוסף מקטע מגשר וקאפ סופי
								if (extTopAtL && extBotAtL) {
									const topEnd = topRailB1[topRailB1.length - 1];
									const botEnd = botRailB1[botRailB1.length - 1];
									{
										const base = posB1.length / 3;
										posB1.push(topEnd[0], topEnd[1], topEnd[2]);
										posB1.push(botEnd[0], botEnd[1], botEnd[2]);
										posB1.push(extTopAtL[0], extTopAtL[1], extTopAtL[2]);
										posB1.push(extBotAtL[0], extBotAtL[1], extBotAtL[2]);
										idxB1.push(base + 0, base + 1, base + 2);
										idxB1.push(base + 2, base + 1, base + 3);
										// שכבת גב
										const backBase = posB1.length / 3;
										const t1e: [number, number, number] = [topEnd[0] + offXB, topEnd[1] + offYB, topEnd[2] + offZB];
										const b1e: [number, number, number] = [botEnd[0] + offXB, botEnd[1] + offYB, botEnd[2] + offZB];
										const t2e: [number, number, number] = [extTopAtL[0] + offXB, extTopAtL[1] + offYB, extTopAtL[2] + offZB];
										const b2e: [number, number, number] = [extBotAtL[0] + offXB, extBotAtL[1] + offYB, extBotAtL[2] + offZB];
										posB1.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
										idxB1.push(backBase + 0, backBase + 2, backBase + 1);
										idxB1.push(backBase + 2, backBase + 3, backBase + 1);
										// דפנות
										const biTop = posB1.length / 3;
										posB1.push(topEnd[0], topEnd[1], topEnd[2],  extTopAtL[0], extTopAtL[1], extTopAtL[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
										idxB1.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
										const biBot = posB1.length / 3;
										posB1.push(botEnd[0], botEnd[1], botEnd[2],  extBotAtL[0], extBotAtL[1], extBotAtL[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
										idxB1.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
									}
									// (בוטל) מלבן לאורך צד הפודסט העליון
								}

								// אם אין פודסט המשך – סגור בקאפ כמו ב‑B (בצד הנגדי)
								if (!extTopAtL && !extBotAtL && shouldRenderClosingCapForFlight(1)) {
									let lastStep: any = null;
									for (let ii = treads.length - 1; ii >= 0; ii--) {
										const tt = treads[ii];
										if (tt.flight === 1 && !tt.isLanding) { lastStep = tt; break; }
									}
									if (lastStep) {
										const yaw = lastStep.rotation[1] as number;
										const c = Math.cos(yaw), s = Math.sin(yaw);
										const dx = lastStep.run / 2, dz = treadWidth / 2;
										// מועמדים לקו האנכי: דרך P3 (קדמי‑ימני) או דרך P2 (אחורי‑ימני) – נבחר את זה שמתיישר עם כיוון המסילה
										const lx = dx, lz = dz;
										const rx = lx * c - lz * s;
										const rz = lx * s + lz * c;
										const candT3: [number, number, number] = [
											lastStep.position[0] + rx,
											lastStep.position[1] + treadThickness / 2 + offsetY,
											lastStep.position[2] + rz
										];
										const candB3: [number, number, number] = [
											candT3[0],
											lastStep.position[1] - treadThickness / 2 - offsetY,
											candT3[2]
										];
										// P2: (+dx, -dz)
										const rx2 = lx * c - (-lz) * s;
										const rz2 = lx * s + (-lz) * c;
										const candT2: [number, number, number] = [
											lastStep.position[0] + rx2,
											lastStep.position[1] + treadThickness / 2 + offsetY,
											lastStep.position[2] + rz2
										];
										const candB2: [number, number, number] = [
											candT2[0],
											lastStep.position[1] - treadThickness / 2 - offsetY,
											candT2[2]
										];

										// כיוון המסילות בקצה
										const topEnd = topRailB1[topRailB1.length - 1];
										const topPrev = topRailB1.length >= 2 ? topRailB1[topRailB1.length - 2] : topEnd;
										const botEnd = botRailB1[botRailB1.length - 1];
										const botPrev = botRailB1.length >= 2 ? botRailB1[botRailB1.length - 2] : botEnd;
										let ux = topEnd[0] - topPrev[0], uz = topEnd[2] - topPrev[2], uy = topEnd[1] - topPrev[1];
										let vx = botEnd[0] - botPrev[0], vz = botEnd[2] - botPrev[2], vy = botEnd[1] - botPrev[1];
										if (Math.abs(ux) < 1e-9 && Math.abs(uz) < 1e-9) { ux = Math.cos(yaw); uz = Math.sin(yaw); uy = 0; }
										if (Math.abs(vx) < 1e-9 && Math.abs(vz) < 1e-9) { vx = Math.cos(yaw); vz = Math.sin(yaw); vy = 0; }

										const projT = (pt: [number, number, number]) => {
											if (Math.abs(ux) >= Math.abs(uz) && Math.abs(ux) > 1e-9) return (pt[0] - topEnd[0]) / ux;
											if (Math.abs(uz) > 1e-9) return (pt[2] - topEnd[2]) / uz;
											return 0;
										};
										const projB = (pb: [number, number, number]) => {
											if (Math.abs(vx) >= Math.abs(vz) && Math.abs(vx) > 1e-9) return (pb[0] - botEnd[0]) / vx;
											if (Math.abs(vz) > 1e-9) return (pb[2] - botEnd[2]) / vz;
											return 0;
										};
										// בחר אוטומטית עמודת סגירה שמתיישרת עם המסילות: נסה P4/P8 (שמאל‑קדמי) או P2/P6 (ימין‑אחורי) ובחר לפי ציון
										const makeCand = (lx: number, lz: number) => {
											const rx = lx * c - lz * s;
											const rz = lx * s + lz * c;
											const tCand: [number, number, number] = [
												lastStep.position[0] + rx,
												lastStep.position[1] + treadThickness / 2 + offsetY,
												lastStep.position[2] + rz
											];
											const bCand: [number, number, number] = [
												tCand[0],
												lastStep.position[1] - treadThickness / 2 - offsetY,
												tCand[2]
											];
											const tt = projT(tCand);
											const tb = projB(bCand);
											// עדכון גבהים על המסילות
											const yT = topEnd[1] + tt * uy;
											const yB = botEnd[1] + tb * vy;
											const tFin: [number, number, number] = [tCand[0], yT, tCand[2]];
											const bFin: [number, number, number] = [bCand[0], yB, bCand[2]];
											// ציון: העדף קדימה (tt,tb>=0) וציון קרבה קטן
											const penaltyBack = (tt < -1e-6 ? 10 : 0) + (tb < -1e-6 ? 10 : 0);
											const score = Math.abs(tt) + Math.abs(tb) + penaltyBack;
											return { tFin, bFin, score };
										};
										const cLeft = makeCand(-dx, +dz);   // P4/P8 – שמאל‑קדמי
										const cAlt  = makeCand(+dx, -dz);   // P2/P6 – ימין‑אחורי (אלטרנטיבה אם השמאלי לא מסתדר)
										const pick = (cLeft.score <= cAlt.score) ? cLeft : cAlt;
										const lastT = pick.tFin;
										const lastB = pick.bFin;
										// מקטע מגשר + שכבת גב + דפנות
										{
											const baseIndex = posB1.length / 3;
											posB1.push(topEnd[0], topEnd[1], topEnd[2]);
											posB1.push(botEnd[0], botEnd[1], botEnd[2]);
											posB1.push(lastT[0], lastT[1], lastT[2]);
											posB1.push(lastB[0], lastB[1], lastB[2]);
											idxB1.push(baseIndex + 0, baseIndex + 1, baseIndex + 2);
											idxB1.push(baseIndex + 2, baseIndex + 1, baseIndex + 3);
											const backBase = posB1.length / 3;
											const t1e: [number, number, number] = [topEnd[0] + offXB, topEnd[1] + offYB, topEnd[2] + offZB];
											const b1e: [number, number, number] = [botEnd[0] + offXB, botEnd[1] + offYB, botEnd[2] + offZB];
											const t2e: [number, number, number] = [lastT[0] + offXB, lastT[1] + offYB, lastT[2] + offZB];
											const b2e: [number, number, number] = [lastB[0] + offXB, lastB[1] + offYB, lastB[2] + offZB];
											posB1.push(t1e[0], t1e[1], t1e[2],  b1e[0], b1e[1], b1e[2],  t2e[0], t2e[1], t2e[2],  b2e[0], b2e[1], b2e[2]);
											idxB1.push(backBase + 0, backBase + 2, backBase + 1);
											idxB1.push(backBase + 2, backBase + 3, backBase + 1);
											const biTop = posB1.length / 3;
											posB1.push(topEnd[0], topEnd[1], topEnd[2],  lastT[0], lastT[1], lastT[2],  t2e[0], t2e[1], t2e[2],  t1e[0], t1e[1], t1e[2]);
											idxB1.push(biTop + 0, biTop + 1, biTop + 2,  biTop + 0, biTop + 2, biTop + 3);
											const biBot = posB1.length / 3;
											posB1.push(botEnd[0], botEnd[1], botEnd[2],  lastB[0], lastB[1], lastB[2],  b2e[0], b2e[1], b2e[2],  b1e[0], b1e[1], b1e[2]);
											idxB1.push(biBot + 0, biBot + 1, biBot + 2,  biBot + 0, biBot + 2, biBot + 3);
										}
										// קאפ סופי
										{
											const lastTe: [number, number, number] = [lastT[0] + offXB, lastT[1] + offYB, lastT[2] + offZB];
											const lastBe: [number, number, number] = [lastB[0] + offXB, lastB[1] + offYB, lastB[2] + offZB];
											const bi = posB1.length / 3;
											posB1.push(lastT[0], lastT[1], lastT[2],  lastB[0], lastB[1], lastB[2],  lastBe[0], lastBe[1], lastBe[2],  lastTe[0], lastTe[1], lastTe[2]);
											idxB1.push(bi + 0, bi + 1, bi + 2,  bi + 0, bi + 2, bi + 3);
										}
									}
								}

								return (
									<group>
										<mesh castShadow receiveShadow>
											<bufferGeometry attach="geometry">
												<bufferAttribute attach="attributes-position" args={[new Float32Array(posB1), 3]} />
												<bufferAttribute attach="index" args={[new Uint32Array(idxB1), 1]} />
											</bufferGeometry>
											<meshBasicMaterial color="#16a34a" side={2} />
										</mesh>
									</group>
								);
							};

							return (
								<group>
									<mesh castShadow receiveShadow>
										<bufferGeometry attach="geometry">
											<bufferAttribute attach="attributes-position" args={[new Float32Array(pos), 3]} />
											<bufferAttribute attach="index" args={[new Uint32Array(idx), 1]} />
										</bufferGeometry>
										<meshBasicMaterial color="#16a34a" side={2} />
									</mesh>
									{buildB1ForFlight1()}
								</group>
							);
						})()}
					</group>
				);
			})() : null}

			{/* דגם 'הייטק' – מחבר בין פלטה A (גרם 0) לפלטה B (גרם 1) – מבוטל */}
			{hitech ? null : null}
		</>
	);
}
