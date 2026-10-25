import React, { useRef, useState } from 'react';
import { Loader2, Play, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/hooks/useSettings';
import { useLang } from '@/lib/lang';
import PageHeader from '@/components/shared/PageHeader';
import Section from '@/components/shared/Section';

export default function Settings() {
  const { t } = useLang();
  const { videoRef, videoUrl, videoLoading, uploadVideo, removeVideo } = useSettings();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await uploadVideo(file);
    } catch {
      setError(t('ההעלאה נכשלה. נסו קובץ אחר.', 'The upload failed. Try another file.'));
    }
    setBusy(false);
  };

  const remove = async () => {
    setBusy(true);
    await removeVideo();
    setBusy(false);
  };

  // A full reload restarts the app, so the welcome screen plays again.
  const preview = () => window.location.assign('/');

  return (
    <>
      <PageHeader title={t('הגדרות', 'Settings')} />
      <Section
        title={t('סרטון פתיחה', 'Welcome video')}
        description={t('סרטון קצר (כ-4 שניות) שמתנגן במסך הטעינה בכניסה לאפליקציה. הקובץ נשמר באופן פרטי.', 'A short (about 4 second) video that plays on the loading screen when the app starts. The file is stored privately.')}
      >
        <div className="space-y-4">
          {!videoRef && (
            <p className="text-sm text-muted-foreground">
              {t('עדיין לא הועלה סרטון. עד אז יוצג מסך פתיחה עם הלוגו.', 'No video uploaded yet. Until then the welcome screen shows the logo.')}
            </p>
          )}
          {videoRef && videoLoading && (
            <div className="flex aspect-video w-full max-w-xl items-center justify-center rounded-xl bg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {videoRef && !videoLoading && videoUrl && (
            <video src={videoUrl} controls muted playsInline className="aspect-video w-full max-w-xl rounded-xl bg-sidebar" />
          )}
          {videoRef && !videoLoading && !videoUrl && (
            <p className="text-sm text-destructive">{t('לא ניתן לטעון את הסרטון.', 'The video could not be loaded.')}</p>
          )}
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onPick} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {videoRef ? t('החלפת סרטון', 'Replace video') : t('העלאת סרטון', 'Upload video')}
            </Button>
            {videoRef && (
              <Button variant="outline" onClick={remove} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                {t('הסרה', 'Remove')}
              </Button>
            )}
            <Button variant="outline" onClick={preview}>
              <Play className="h-4 w-4" />
              {t('תצוגה מקדימה של מסך הפתיחה', 'Preview welcome screen')}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </Section>
    </>
  );
}