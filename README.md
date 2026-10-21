# Speakly

İngilis dili speaking platforması: səviyyə testi ($3), onlayn sertifikat ($5), müəllimlə canlı speaking dərsləri (15 dəq / 30 dəq / 1 saat) və səviyyəyə görə qrammatika lesson-ları (A1 $7 … C1 $18).

## Nə hazırdır

| Bölmə | Səhifə |
| --- | --- |
| Qeydiyyat və giriş (tələbə və ya müəllim) | `/signup`, `/login` |
| Səviyyə testi, nəticə, sertifikat al | `/test`, `/test/result/…` |
| Sertifikatı yoxlama və çap / PDF | `/certificate/<kod>` |
| Müəllimlər siyahısı (səviyyəyə görə) və dərsə yazılma | `/tutors`, `/tutors/<id>` |
| Tələbənin dərsləri, müəllim qeydləri, tövsiyə olunan lesson-lar | `/dashboard` |
| Lessons kataloqu, alış, 4 hissəli lesson | `/lessons`, `/lessons/<slug>` |
| Müəllim paneli: boş vaxtlar, qarşıdakı dərslər, qeyd yazmaq | `/tutor` |
| Müəllim profili: təqdimat, səviyyələr, qiymətlər, video, dərs linki | `/tutor/profile` |
| İdarə: müəllimləri təsdiqləmək, gəlir | `/admin` |

Sayt 3 dildədir: Azərbaycan, İngilis və Rus. Dil yuxarıdakı AZ / EN / RU düymələri ilə seçilir və yadda qalır. İlk girişdə brauzerin dili seçilir. Mətnlər `lib/i18n/az.ts`, `en.ts`, `ru.ts` fayllarındadır.

Ödənişin iki rejimi var (`PAYMENT_PROVIDER`):

- `mock`: test rejimi, hər ödəniş dərhal "ödənilib" sayılır.
- `whatsapp`: tələbə "Ödə" basanda ödəniş səhifəsinə (`/pay/<id>`) keçir və hazır mesajı (xidmət, məbləğ, ödəniş kodu, ad) `WHATSAPP_NUMBER` nömrəsinə WhatsApp-da göndərir. Pul alınandan sonra admin `/admin` səhifəsində "Təsdiq gözləyən ödənişlər" bölməsində **Ödənildi, təsdiqlə** basır və test, sertifikat, dərs və ya lesson avtomatik açılır. **Ləğv et** ödənişi bağlayır və tutulmuş dərs vaxtını boşaldır.

## Quraşdırma

1. [supabase.com](https://supabase.com)-da pulsuz layihə yaradın.
2. Supabase → **SQL Editor**-da `supabase/setup_all.sql` faylının məzmununu işə salın. Bu, cədvəlləri, 20 test sualını, 20 lesson-u (3 dildə adları ilə) və 80 məşq sualını yaradır. Artıq qurulmuş bazaya yalnız yeni `supabase/migrations/` faylları əlavə olunur (məs. `0002_lesson_translations.sql`).
3. Supabase → **Authentication → URL Configuration**-da Site URL olaraq saytın ünvanını yazın.
4. `.env.example` faylını `.env.local` adı ilə köçürün və Supabase → **Project Settings → API**-dakı açarları yazın.
5. Lokal işə salmaq üçün:
   ```bash
   npm install
   npm run dev
   ```
6. İnternetə çıxarmaq üçün: [vercel.com](https://vercel.com)-da GitHub repo-nu import edin və eyni mühit dəyişənlərini (environment variables) əlavə edin.

### Özünüzü admin etmək

Saytda müəllim kimi qeydiyyatdan keçin, sonra Supabase SQL Editor-da:

```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = 'sizin@email.com');
update tutors set approved = true where id = (select id from auth.users where email = 'sizin@email.com');
```

Bundan sonra `/admin` səhifəsində yeni müəllimləri təsdiqləyə bilərsiniz. Təsdiqlənməmiş müəllim siyahıda görünmür.

### Məzmunu dəyişmək

Test sualları (`test_questions`), lesson-lar (`lessons`, video linkləri daxil) və məşq sualları (`lesson_questions`) Supabase → **Table Editor**-dan redaktə olunur. Video üçün YouTube (unlisted) və ya Vimeo linki yazmaq kifayətdir.

## Texniki qeydlər

- Next.js 15 (App Router), Supabase (Postgres, Auth, row level security).
- Test cavabları və qiymətlər yalnız serverdə yoxlanılır; brauzer düzgün cavabları görmür.
- Vaxtlar Bakı vaxtı (UTC+4) ilə göstərilir.
- `npm test` kiçik funksiyaların testlərini işə salır.
