# Soundwave Whispers — Roadmap משימות

> נוצר 2026-05-27. סדר ביצוע: אחד אחרי השני בתוך כל שלב. מה שמסומן 🔀 אפשר למקבל (לעבוד במקביל).
> מקרא סטטוס קוד: ✅ קיים | 🐛 קיים, צריך תיקון | 🔌 קיים, צריך חיווט | 🆕 לבנות מאפס | 🔍 מחקר/החלטה

## החלטות שכבר נסגרו
- **סליקה:** נשארים עם iCount. (Lemon Squeezy / Paddle — ירדו מהשולחן)
- **ספק (Shine On):** API אוטומטי. ה-webhook אמור לשלוח אוטומטית בכל תשלום.
- **Lovable:** המשתמש דיווח שיצא. ⚠️ צריך וידוא — הקוד עדיין מכיל שאריות (ראה B1).

---

## שלב A — תיקונים שמכניסים כסף (קודם, סדרתי)
- [ ] **A1. iCount → Shine On webhook** 🐛 — דיבאג מה שכבר בנוי ב-`supabase/functions/icount-payment-webhook/index.ts`. לוודא שתשלום מוצלח אכן שולח הזמנה ל-ShineOn. (#4 + #7)
- [ ] **A2. payload לספק** 🐛 — לוודא ש-Shine On מקבל: תמונת אודיו + ברקוד + Engrave-on-Back אופציונלי. (#19)
- [ ] **A3. רזולוציית print** 🐛 — בדיקת DPI של ה-PNG (כיום 1000×1788) מול דרישת ShineOn. `src/lib/svgExport.ts` + `supabase/functions/render-engraving-png/index.ts`. (#3)
- [ ] **A4. מייל אחרי תשלום** 🔌 — חיווט תבנית `order-confirmation.tsx` הקיימת ל-webhook. (#18)

## שלב B — Quick wins (אפשר למקבל בין עצמם 🔀)
- [ ] **B1. וידוא ניתוק Lovable** 🔍 — בדיקת שאריות: `lovable-tagger` ב-package.json, תיקיית `.lovable/`, ומייל דרך `notify.animuswave.com` (מופנה ל-Lovable nameservers). לוודא שמיילים לא יישברו. (#9, #10)
- [ ] **B2. הסרת Waitlist** 🆕 — כיום `/` = `PreOrderLanding`. להפוך את החנות לעמוד הבית. (#2)
- [ ] **B3. הסרת live preview** 🆕 — הסרת `src/components/LiveDemoModule.tsx`. (#14)
- [ ] **B4. אנליטיקס** 🆕 — Google Analytics + Microsoft Clarity + Google Search Console verification. Meta Pixel כבר מותקן. (#20)
- [ ] **B5. שיפור SEO** 🆕 — מטא, schema, sitemap. (#20)
- [ ] **B6. דף נגישות** 🆕 — חובה חוקית בישראל. ב-`PolicyPage.tsx`. (#13)
- [ ] **B7. דף פרטיות** 🆕 — חסר. Terms + Refund כבר קיימים. (#13)

## שלב C — Admin + לידים
- [ ] **C1. איחוד דשבורד + הסרת Recovery** 🐛 — כיום 3 דשבורדים נפרדים (`AdminControl` / `AdminDashboard` / `AdminOrders`). לאחד, ולקפל את Recovery לתוך זרימת ההזמנות הרגילה. (#8)
- [ ] **C2. ייבוא לידים מ-CSV** 🆕 — העלאת CSV → `waitlist_leads`. (#16)
- [ ] **C3. מייל לכל הלידים** 🔌 — `send-campaign-email` קיים. להפעיל מ-CSV / מהרשימה. (#15)
- [ ] **C4. מייל-בלחיצה לליד בודד** 🔌 — כפתור בודד עם הודעה מוגדרת מראש, ב-CRM. (#17)

## שלב D — גדול, אחרון
- [ ] **D1. עיצוב מחדש לאתר** 🆕 — הכי גדול. דורש brainstorming לפני בנייה. (#1)
- [ ] **D2. הטמעת iCount באתר** 🔍 — ניסיון iframe במקום redirect. מגבלות PCI אפשריות. (#5)
- [ ] **D3. דומיין ל-Cloudflare** 🔍 — רק אם עוד לא בוצע. תלוי ב-B1. (#12)
- [ ] **D4. ייצוא CSV קיים** ✅🔍 — CSV export כבר קיים ב-`AdminDashboard.tsx`. לוודא שמספיק / הושלם. (#11)

---

## מקבילות (Parallelization)
- **שלב A סדרתי** — A1 → A2 → A3 → A4 (תלויים זה בזה, אותה זרימת webhook/render).
- **שלב B מקבילי לחלוטין 🔀** — כל B1-B7 עצמאיים. אפשר גם להריץ במקביל ל-A.
- **שלב C:** C2 → C3 קצת תלויים (CSV קודם). C1 ו-C4 עצמאיים 🔀.
- **שלב D:** D1 עצמאי וגדול. D3 תלוי ב-B1.

## מצב נוכחי
מתחילים מ-**A1**.
