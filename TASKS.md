# Soundwave Whispers - Roadmap משימות

> נוצר 2026-05-27. סדר ביצוע: אחד אחרי השני בתוך כל שלב. מה שמסומן 🔀 אפשר למקבל (לעבוד במקביל).
> מקרא סטטוס קוד: ✅ קיים | 🐛 קיים, צריך תיקון | 🔌 קיים, צריך חיווט | 🆕 לבנות מאפס | 🔍 מחקר/החלטה

## החלטות שכבר נסגרו
- **סליקה:** נשארים עם iCount. (Lemon Squeezy / Paddle - ירדו מהשולחן)
- **ספק (Shine On):** API אוטומטי. ה-webhook אמור לשלוח אוטומטית בכל תשלום.
- **Lovable:** יצא. ניקוי קוד הושלם (build tooling, Playwright, webhook libs, פונקציות preview+suppression). נותר רק תשתית חיצונית: DNS + הגדרת hook ב-Dashboard (ראה B1).

---

## שלב A - תיקונים שמכניסים כסף (קודם, סדרתי)
- [ ] **A1. iCount → Shine On webhook** 🐛 - דיבאג מה שכבר בנוי ב-`supabase/functions/icount-payment-webhook/index.ts`. לוודא שתשלום מוצלח אכן שולח הזמנה ל-ShineOn. (#4 + #7)
- [ ] **A2. payload לספק** 🐛 - לוודא ש-Shine On מקבל: תמונת אודיו + ברקוד + Engrave-on-Back אופציונלי. (#19)
- [ ] **A3. רזולוציית print** 🐛 - בדיקת DPI של ה-PNG (כיום 1000×1788) מול דרישת ShineOn. `src/lib/svgExport.ts` + `supabase/functions/render-engraving-png/index.ts`. (#3)
- [x] **A4. מייל אחרי תשלום** 🔌 - חיווט תבנית `order-confirmation.tsx` הקיימת ל-webhook + קופון 15% (`d12ce1`) לרכישה הבאה. (#18)

## שלב B - Quick wins (אפשר למקבל בין עצמם 🔀)
- [~] **B1. ניתוק Lovable** 🔍 - בוצע בקוד: הוסר `lovable-tagger` (vite+package.json), Playwright עבר ל-`@playwright/test`. נמחקו 3 פונקציות Lovable-only: `handle-email-suppression` (מת), `preview-transactional-email`, ו-`auth-email-hook` (+ תבניות `_shared/email-templates/`). מיילי אימות (signup confirm / password reset של אדמין) עוברים עכשיו ל-Supabase Auth native. הוסרו `LOVABLE_API_KEY` + `AUTH_EMAIL_HOOK_SECRET`. **נותר (לא קוד):** (1) בדאשבורד Supabase לוודא ש-"Confirm email" + מיילי auth מוגדרים כרצוי (ברירת מחדל: Supabase שולח לבד; אופציונלי custom SMTP→Resend); (2) DNS `notify.animuswave.com` מופנה ל-Lovable nameservers - להעביר; (3) `bun.lock` מושך מ-registry של Lovable (`lovable-core-prod`) - לחדש עם npm/registry ציבורי. (#9, #10)
- [ ] **B2. הסרת Waitlist** 🆕 - כיום `/` = `PreOrderLanding`. להפוך את החנות לעמוד הבית. (#2)
- [ ] **B3. הסרת live preview** 🆕 - הסרת `src/components/LiveDemoModule.tsx`. (#14)
- [ ] **B4. אנליטיקס** 🆕 - Google Analytics + Microsoft Clarity + Google Search Console verification. Meta Pixel כבר מותקן. (#20)
- [ ] **B5. שיפור SEO** 🆕 - מטא, schema, sitemap. (#20)
- [ ] **B6. דף נגישות** 🆕 - חובה חוקית בישראל. ב-`PolicyPage.tsx`. (#13)
- [ ] **B7. דף פרטיות** 🆕 - חסר. Terms + Refund כבר קיימים. (#13)

## שלב C - Admin + לידים
- [x] **C1. איחוד דשבורד + הסרת Recovery** 🐛 - כיום 3 דשבורדים נפרדים (`AdminControl` / `AdminDashboard` / `AdminOrders`). לאחד, ולקפל את Recovery לתוך זרימת ההזמנות הרגילה. (#8)
- [x] **C3. מייל לכל הלידים** 🔌 - `send-campaign-email` קיים. להפעיל מהרשימה. (#15)

## שלב D - גדול, אחרון
- [ ] **D1. עיצוב מחדש לאתר** 🆕 - הכי גדול. דורש brainstorming לפני בנייה. (#1)
- [ ] **D2. הטמעת iCount באתר** 🔍 - ניסיון iframe במקום redirect. מגבלות PCI אפשריות. (#5)
- [ ] **D3. דומיין ל-Cloudflare** 🔍 - רק אם עוד לא בוצע. תלוי ב-B1. (#12)
- [ ] **D4. ייצוא CSV קיים** ✅🔍 - CSV export כבר קיים ב-`AdminDashboard.tsx`. לוודא שמספיק / הושלם. (#11)

---

## מקבילות (Parallelization)
- **שלב A סדרתי** - A1 → A2 → A3 → A4 (תלויים זה בזה, אותה זרימת webhook/render).
- **שלב B מקבילי לחלוטין 🔀** - כל B1-B7 עצמאיים. אפשר גם להריץ במקביל ל-A.
- **שלב C:** הושלם (C1 + C3).
- **שלב D:** D1 עצמאי וגדול. D3 תלוי ב-B1.

## מצב נוכחי
מתחילים מ-**A1**.
