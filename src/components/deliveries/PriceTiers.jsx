import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Section from '@/components/shared/Section';
import { useAppData } from '@/hooks/useAppData';
import { useActions } from '@/hooks/useActions';
import { useLang } from '@/lib/lang';
import { sortTiers, tierUnitPrice } from '@/lib/logic/pricing';

export default function PriceTiers() {
  const { t, money } = useLang();
  const { data } = useAppData();
  const { save, remove } = useActions();
  const [size, setSize] = useState('');
  const [price, setPrice] = useState('');

  const add = async () => {
    await save('priceTiers', { batch_size: Number(size), batch_price: Number(price) });
    setSize('');
    setPrice('');
  };

  return (
    <Section title={t('מדרגות מחיר', 'Price tiers')} description={t('מחיר לחבילה; המחיר ליחידה מחושב לפי כמות האספקה', 'Price per batch; unit price follows the delivery size')} className="mb-6">
      <div className="flex flex-wrap gap-2">
        {sortTiers(data.priceTiers).map((tier) => (
          <span key={tier.id} className="inline-flex items-center gap-2 rounded-full bg-lavender px-3 py-1 text-sm">
            {tier.batch_size} = {money(tier.batch_price)} ({money(tierUnitPrice(tier))}/{t('יח׳', 'unit')})
            <button type="button" onClick={() => remove('priceTiers', tier.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Input type="number" dir="ltr" className="w-32" placeholder={t('כמות', 'Qty')} value={size} onChange={(e) => setSize(e.target.value)} />
        <Input type="number" dir="ltr" className="w-32" placeholder={t('מחיר ₪', 'Price ₪')} value={price} onChange={(e) => setPrice(e.target.value)} />
        <Button variant="outline" onClick={add} disabled={!size || !price}><Plus className="h-4 w-4" />{t('הוספה', 'Add')}</Button>
      </div>
    </Section>
  );
}