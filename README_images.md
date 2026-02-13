הפעלת עיבוד תמונות חומרים (ללא מסד נתונים)

1) שים את קבצי המקור בתיקייה:
   - `assets/materials_src/metal/` (או `wood/`, `stone/` לפי הצורך)
   - שמות קבצים חופשיים; המזהה נבנה מהשם (slug)

2) התקנת חבילה (פעם אחת):
   - `npm i`

3) הרצת העיבוד:
   - `npm run process:materials`
   - מה קורה:
     - חיתוך פסים שחורים, סיבוב אוטומטי, normalize + sharpen עדין
     - חיתוך/כיסוי ליחס 3:5 עומד
     - יצוא ל־WebP/AVIF ברוחבים 400/700/1000 ל־`public/images/materials`
     - עדכון/יצירת `public/data/materials.json`

4) בדיקה:
   - פתח את `/materials` – הנתונים נטענים מה־JSON.

הערות:
- ניתן להריץ שוב בבטחה – הסקריפט מבצע upsert לפי id.
- אפשר לשנות קטגוריה לפי שם תיקיית האב (`wood/metal/stone`).
- צבע/מחיר מחדל ניתנים לעריכה ידנית ב־`public/data/materials.json`.


