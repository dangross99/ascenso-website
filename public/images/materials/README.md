# תמונות חומרים (טקסטורות)

הנתיבים ב־`public/data/materials.json` מפנים לקבצים תחת `public/`.

**דוגמה:**  
אם ב־JSON רשום:
```json
"/images/materials/wood/earth/earth-black.png"
```
הקובץ הפיזי צריך להיות:
```
public/images/materials/wood/earth/earth-black.png
```

**מבנה נדרש לעץ (wood):**
- `public/images/materials/wood/earth/` – אדמה (earth-natural, earth-walnut, earth-white, earth-black)
- `public/images/materials/wood/carved/` – חריטה
- `public/images/materials/wood/chocolate/` – שוקולד
- `public/images/materials/wood/painted/` – ציור
- `public/images/materials/wood/domino/` – דומינו
- `public/images/materials/wood/hammered/` – פטיש
- `public/images/materials/wood/wrapped/` – עטיפה
- `public/images/materials/wood/plain/` – נקי

אם תמונה חסרה – השגיאה תופיע בקונסול עם הנתיב המלא (למשל `Could not load /images/materials/wood/earth/earth-black.png`). יש ליצור את התיקיות ולהוסיף את הקבצים המתאימים.
