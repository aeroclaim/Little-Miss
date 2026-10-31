import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { useSettings } from '@/hooks/useSettings';
import { useLang } from '@/lib/lang';
import { LOGO_URL } from '@/lib/brand';

const FALLBACK_MS = 2000; // how long the logo screen lasts when no video was uploaded
const VIDEO_CAP_MS = 15000; // never wait longer than this for a video to end

// Full-screen welcome: plays the uploaded video (or shows the logo) while the app data loads.
export default function WelcomeScreen({ ready, error, onRetry, onFinish }) {
  const { t } = useLang();
  const { isLoading, videoUrl, videoLoading } = useSettings();
  const [progress, setProgress] = useState(0);
  const [videoDone, setVideoDone] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const settled = !isLoading && !videoLoading;

  useEffect(() => {
    if (!settled) return undefined;
    const id = setTimeout(() => setTimeUp(true), videoUrl ? VIDEO_CAP_MS : FALLBACK_MS);
    return () => clearTimeout(id);
  }, [settled, videoUrl]);

  useEffect(() => {
    if (ready && settled && (timeUp || videoDone)) onFinish();
  }, [ready, settled, timeUp, videoDone, onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-sidebar text-sidebar-foreground">
      {videoUrl ? (
        <video
          src={videoUrl} autoPlay muted playsInline
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) setProgress(v.currentTime / v.duration);
          }}
          onEnded={() => setVideoDone(true)}
          onError={() => setVideoDone(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/30 blur-3xl" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-sidebar/90 via-sidebar/10 to-sidebar/40" />

      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <Image src={LOGO_URL} alt="Little Miss" fittingType="fit" className="h-24 w-24 rounded-3xl bg-card shadow-lift" />
        <div>
          <h1 className="font-display text-4xl font-bold text-sidebar-accent-foreground sm:text-5xl">Little Miss</h1>
          <p className="mt-2 text-sm">{t('ניהול הפצה', 'Distribution manager')}</p>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-10 mx-auto flex w-full max-w-md flex-col items-center gap-4 px-6 pb-10">
        {error ? (
          <>
            <p className="text-sm">{t('לא הצלחנו לטעון את הנתונים.', 'We could not load your data.')}</p>
            <Button onClick={() => onRetry()}>{t('ניסיון חוזר', 'Try again')}</Button>
          </>
        ) : (
          <>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sidebar-accent">
              {videoUrl ? (
                <div className="h-full origin-left rounded-full bg-brand transition-transform rtl:origin-right" style={{ transform: `scaleX(${progress})` }} />
              ) : (
                <div className="h-full origin-left animate-bar-grow rounded-full bg-brand rtl:origin-right" style={{ animationDuration: `${FALLBACK_MS}ms` }} />
              )}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {!ready && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{ready ? t('מוכן', 'Ready') : t('טוענים את הנתונים...', 'Loading your data...')}</span>
            </div>
            <Button variant="secondary" onClick={onFinish}>{t('כניסה', 'Enter')}</Button>
          </>
        )}
      </div>
    </div>
  );
}