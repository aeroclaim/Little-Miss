import React, { useState } from 'react';
import { toast } from '@/components/ui/use-toast';
import { useLang } from '@/lib/lang';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import ViolationAlert from '@/components/shared/ViolationAlert';

// Confirm-then-delete flow shared by every list.
//   run(id)  -> { ok, violations?, message? }
//   const { ask, dialog } = useDeleteFlow({ run, title: (record) => '...' });   ...   {dialog}
export default function useDeleteFlow({ run, title, text }) {
  const { t } = useLang();
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);

  const confirm = async () => {
    setBusy(true);
    const res = await run(target.id);
    setBusy(false);
    if (res.ok) {
      toast({ title: t('נמחק בהצלחה', 'Deleted') });
      setTarget(null);
    } else {
      setFailure(res);
    }
  };

  const dialog = target ? (
    <ConfirmDialog
      title={title(target)}
      text={text ? text(target) : t('הפעולה אינה ניתנת לביטול.', 'This cannot be undone.')}
      confirmLabel={t('מחיקה', 'Delete')}
      busy={busy}
      onConfirm={confirm}
      onClose={() => setTarget(null)}
      extra={failure ? <ViolationAlert result={failure} /> : null}
    />
  ) : null;

  return {
    ask: (record) => {
      setFailure(null);
      setTarget(record);
    },
    dialog,
  };
}