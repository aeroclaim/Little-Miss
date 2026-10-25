import React, { useState } from 'react';
import { Banknote, ShoppingBag, Truck, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLang } from '@/lib/lang';
import DeliveryForm from '@/components/deliveries/DeliveryForm';
import SaleForm from '@/components/sales/SaleForm';
import ReturnForm from '@/components/returns/ReturnForm';
import PaymentForm from '@/components/payments/PaymentForm';

// Shortcuts on a store's page: each opens its form with this store already selected.
export default function StoreActions({ storeId }) {
  const { t } = useLang();
  const [open, setOpen] = useState(null);
  const close = () => setOpen(null);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen('delivery')}><Truck className="h-4 w-4" />{t('אספקה חדשה', 'New delivery')}</Button>
      <Button variant="outline" onClick={() => setOpen('sale')}><ShoppingBag className="h-4 w-4" />{t('דיווח מכירה', 'Sales report')}</Button>
      <Button variant="outline" onClick={() => setOpen('return')}><Undo2 className="h-4 w-4" />{t('החזרה', 'Return')}</Button>
      <Button onClick={() => setOpen('payment')}><Banknote className="h-4 w-4" />{t('תשלום', 'Payment')}</Button>
      {open === 'delivery' && <DeliveryForm defaultStoreId={storeId} onClose={close} />}
      {open === 'sale' && <SaleForm defaultStoreId={storeId} onClose={close} />}
      {open === 'return' && <ReturnForm defaultStoreId={storeId} onClose={close} />}
      {open === 'payment' && <PaymentForm defaultStoreId={storeId} onClose={close} />}
    </>
  );
}