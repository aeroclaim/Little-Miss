import React from 'react';
import { Gem } from 'lucide-react';
import { useAppData } from '@/hooks/useAppData';
import { useLang } from '@/lib/lang';
import { LEVELS } from '@/lib/logic/rarity';
import { collectionLabel, productLabel } from '@/lib/logic/serials';
import { formatPercent } from '@/lib/logic/format';
import PageHeader from '@/components/shared/PageHeader';
import Section from '@/components/shared/Section';
import DataTable from '@/components/shared/DataTable';
import EmptyState from '@/components/shared/EmptyState';
import LoadingBlock from '@/components/shared/LoadingBlock';
import LevelBadge from '@/components/shared/LevelBadge';
import RateBar from '@/components/shared/RateBar';
import SerialBadge from '@/components/shared/SerialBadge';
import RarityHeatmap from '@/components/rarity/RarityHeatmap';

const CARD_ORDER = ['very_rare', 'rare', 'common', 'abundant', 'absent'];

export default function Rarity() {
  const { t, lang, num } = useLang();
  const { model } = useAppData();
  if (!model) return <LoadingBlock />;

  const { overall, byTown } = model.rarity;
  const header = (
    <PageHeader
      title={t('נדירות מספרים', 'Number rarity')}
      subtitle={t(
        'כל מספר נמדד לפי כמות העותקים שלו בשוק (אספקות פחות החזרות), ביחס לממוצע של המספרים שהופצו.',
        'Each number is measured by its copies in the market (deliveries minus returns) against the average of the numbers that were distributed.'
      )}
    />
  );
  if (!overall.rows.length) {
    return (
      <>
        {header}
        <EmptyState icon={Gem} title={t('עוד לא הודפס מלאי', 'Nothing printed yet')} text={t('נדירות נמדדת רק על מספרים שהודפסו.', 'Rarity is only measured for numbers that were printed.')} />
      </>
    );
  }

  const rows = overall.rows.map((r) => ({ ...r, id: r.serial }));
  const columns = [
    { key: 'rank', header: '#', sort: (r) => r.rank, cell: (r) => <span className="tabular-nums text-muted-foreground">{r.rank}</span> },
    { key: 'serial', header: t('מספר', 'No.'), sort: (r) => r.serial, cell: (r) => <SerialBadge serial={r.serial} /> },
    { key: 'name', header: t('שם', 'Name'), cell: (r) => productLabel(model.entryBySerial[r.serial], lang) || '—' },
    { key: 'collection', header: t('אוסף', 'Collection'), cell: (r) => collectionLabel(model.collectionBySerial[r.serial], lang) },
    { key: 'count', header: t('עותקים בשוק', 'In the market'), sort: (r) => r.count, cell: (r) => num(r.count) },
    { key: 'ratio', header: t('מול הממוצע', 'Vs. average'), sort: (r) => r.ratio, cell: (r) => <RateBar value={r.ratio} max={2} label={formatPercent(r.ratio)} tone="indigo" /> },
    { key: 'level', header: t('דרגה', 'Level'), sort: (r) => LEVELS.indexOf(r.level), cell: (r) => <LevelBadge level={r.level} /> },
  ];

  return (
    <>
      {header}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CARD_ORDER.map((level) => (
          <div key={level} className="rounded-2xl border bg-card p-4 shadow-soft">
            <LevelBadge level={level} />
            <p className="mt-3 font-display text-3xl font-bold tabular-nums">{num(overall.levelCounts[level])}</p>
          </div>
        ))}
      </div>
      <div className="space-y-6">
        <Section title={t('דירוג נדירות', 'Rarity ranking')} description={t('הנדיר ביותר ראשון', 'The rarest first')} bodyClassName="p-0">
          <DataTable columns={columns} rows={rows} initialSort={{ key: 'rank', dir: 'asc' }} className="border-0 shadow-none" />
        </Section>
        <Section
          title={t('מפת חום: עיר × מספר', 'Heat map: town × number')}
          description={t('כל תא הוא מספר העותקים בעיר. הצבע משווה את המספר לממוצע של העיר עצמה.', "Each cell is the number of copies in the town. The colour compares the number to that town's own average.")}
        >
          <RarityHeatmap towns={model.towns} serials={model.printedSerials} byTown={byTown} />
        </Section>
      </div>
    </>
  );
}