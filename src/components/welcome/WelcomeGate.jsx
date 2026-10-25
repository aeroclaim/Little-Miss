import React, { useCallback, useState } from 'react';
import { useAppData } from '@/hooks/useAppData';
import WelcomeScreen from '@/components/welcome/WelcomeScreen';

// The welcome screen plays every time the app starts (each full page load), never again while navigating.
let played = false;

export default function WelcomeGate({ children }) {
  const { model, error, refetch } = useAppData();
  const [done, setDone] = useState(played);

  const finish = useCallback(() => {
    played = true;
    setDone(true);
  }, []);

  if (done) return children;
  return <WelcomeScreen ready={!!model} error={error} onRetry={refetch} onFinish={finish} />;
}