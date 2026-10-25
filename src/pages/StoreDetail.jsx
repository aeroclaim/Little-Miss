import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppData } from '@/hooks/useAppData';
import useNotFoundMeta from '@/hooks/useNotFoundMeta';
import { useLang } from '@/lib/lang';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import Section from '@/components/shared/Section';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import ModelBadge from '@/components/shared/ModelBadge';
import StoreActions from '@/components/stores/StoreActions';
import StoreShelf from '@/components/stores/StoreShelf';
import StoreLedger from '@/components/stores/StoreLedger';

export default function StoreDetail() {
  const { id } = useParams();
  const { t, isHe, num, money } = useLang();
  const { model } = useAppData();
  const store = model?.storeById[id];
  useNotFoundMeta(!!model && !store);
  if (!model) return <LoadingBlock />;

  const Back = isHe ? ArrowRight : ArrowLeft;
  if (!store) {
    return (
      <EmptyState
        icon={Store} title={t('החנות לא נמצאה', 'Store not found')}
        action={<Button asChild><Link to="/stores">{t('לכל החנויות', 'All stores')}</Link></Button>}
      />
    );
  }

  const stats = model.storeStats[id] || { delivered: 0, sold: 0, inStore: 0, serials: {} };
  const balance = model.finance[id]?.balance || 0;

  return (
    <>
      <Link to="/stores" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <Back className="h-4 w-4" />
        {t('כל החנויות', 'All stores')}
      </Link>
      <PageHeader
        eyebrow={store.town}
        title={store.name}
        subtitle={[store.contact_person, store.phone, store.address].filter(Boolean).join(' · ')}
        actions={<StoreActions storeId={id} />}
      />
      <div className="mb-3"><ModelBadge model={store.payment_model} /></div>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t('סופקו', 'Delivered')} value={num(stats.delivered)} />
        <StatCard label={t('נמכרו', 'Sold')} value={num(stats.sold)} tone="mint" />
        <StatCard label={t('על המדף', 'On shelf')} value={num(stats.inStore)} tone="rose" />
        <StatCard label={t('יתרת חוב', 'Balance')} value={money(balance)} tone="amber" />
      </div>
      <div className="space-y-6">
        <Section title={t('על המדף כרגע', 'On the shelf now')}>
          <StoreShelf stats={model.storeStats[id]} />
        </Section>
        <Section title={t('היסטוריה וחשבון', 'History and account')} bodyClassName="p-0">
          <StoreLedger storeId={id} />
        </Section>
      </div>
    </>
  );
}