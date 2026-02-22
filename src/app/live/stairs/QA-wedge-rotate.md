# בדיקת QA – החלפת עבה/דק בדגם מרום (wedge)

## זרימת נתונים (מקור אמת)

1. **pathModelConfig.ts**
   - `SEGMENT_CONFIG[pathKey][model]` – טבלה לפי pathKey ודגם.
   - `getBodyRotate180(model, pathKey)` – מנרמל `model` ל־lowercase, מחזיר `true`/`false`.
   - ערכים צפויים ל־wedge ב־L:
     - `L_0_flight_0` → `true`
     - `L_0_flight_1` → `false`
     - `L_180_flight_0` → `false`
     - `L_180_flight_1` → `true`

2. **Staircase3D.tsx**
   - `getTreads()` קורא ל־`getBodyRotate180(boxModel ?? 'rect', pathKey)` לכל tread.
   - תלויות `useMemo`: `[shape, steps, JSON.stringify(pathSegments), pathFlipped180, boxModel]` – שינוי ב־boxModel מחשב treads מחדש.
   - יש להעביר `boxModel="wedge"` (lowercase) מהאב.

3. **wedge.tsx**
   - `bodyRotate180ForFrame = t.bodyRotate180 ?? fallback` (fallback: גרם 0, yaw 0 → true).
   - **החלפת עבה/דק**: סיבוב גוף הטריז ב־180° כאשר `bodyRotate180ForFrame === true`:
     - `geomGroup` עטוף ב־`<group rotation={[0, Math.PI, 0]}>`.
   - `computeLocalFrame` מקבל `bodyRotate180: false` (ללא היפוך כפול).

## רשימת בדיקה ידנית

- [ ] L 0°, דגם מרום, גרם ראשון: הצד העבה והדק מוחלפים (סיבוב ויזואלי).
- [ ] L 0°, גרם שני: כיוון נכון (ללא סיבוב מיותר).
- [ ] L 180°, גרם ראשון: כיוון נכון.
- [ ] L 180°, גרם שני: סיבוב ויזואלי.
- [ ] ישר (straight), מרום: סיבוב לפי תצורה.

## אם עדיין לא מסתובב

1. **ולידציה ב־runtime**: ב־wedge, זמנית להוסיף `console.log(idx, t.flight, t.bodyRotate180, bodyRotate180ForFrame)` ולוודא שערך `true` מגיע לגרם/מדרגה הרלוונטיים.
2. **אב מעביר דגם**: לוודא שהקומפוננטה שקוראת ל־Staircase3D מעבירה `boxModel="wedge"` (לא `Wedge` או חסר).
3. **pathSegments**: ב־L עם pathSegments, לוודא `isL === true` (שני straights ופודסט אחד) כדי להיכנס לענף שמגדיר `pathKey0`/`pathKey1` ומעביר `bodyRotate180`.
