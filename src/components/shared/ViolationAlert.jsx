import React from 'react';
import { TriangleAlert } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';

// Explains why an action was refused: either a plain message or a list of quantity problems.
export default function ViolationAlert({ result }) {
  const { t, num } = useLang();
  const app = useAppData();
  if (!result) return null;
  const violations = result.violations || [];
  const lines = violations.slice(0, 6).map((v) => {
    if (v.type === 'stock') {
      return t(`מספר ${v.serial}: חסרות ${num(v.shortage)} יחידות במלאי הפנוי`, `#${v.serial}: short by ${num(v.shortage)} in free stock`);
    }
    if (v.type === 'store') {
      const name = app?.model?.storeById?.[v.storeId]?.name || '';
      return t(`${name} · מספר ${v.serial}: חסרות ${num(v.shortage)} יחידות בחנות`, `${name} · #${v.serial}: short by ${num(v.shortage)} on the shelf`);
    }
    return t(`מספר ${v.serial}: כמות התקולים גדולה מהכמות שהוחזרה`, `#${v.serial}: faulty quantity exceeds returned quantity`);
  });
  const heading =
    result.message || t('לא ניתן לבצע את הפעולה כי הכמויות לא מתאזנות:', 'This cannot be saved because the quantities would not balance:');

  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p className="font-medium">{heading}</p>
        {lines.map((line) => (
          <p key={line} className="text-xs">{line}</p>
        ))}
        {violations.length > 6 && <p className="text-xs">…</p>}
      </div>
    </div>
  );
}