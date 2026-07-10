import ModCardApp from '@/components/ModCardApp';
import { I18nProvider } from '@/i18n/I18nProvider';
import { normalizeLang } from '@/i18n';

// Đọc ?lang= ⇒ route phải render động (không prerender tĩnh).
export const dynamic = 'force-dynamic';

/**
 * Server component: đọc `?lang=` (Hub truyền xuống khi nhúng iframe) rồi bơm bộ chuỗi
 * đúng ngôn ngữ vào cây client NGAY TỪ LẦN RENDER ĐẦU.
 * Nhờ vậy HTML của server khớp client → không lệch hydration, không nháy ngôn ngữ.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const lang = normalizeLang(sp.lang);
  return (
    <I18nProvider lang={lang}>
      <ModCardApp />
    </I18nProvider>
  );
}
