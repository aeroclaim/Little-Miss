import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { isDesktop } from '@/lib/runtime';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

export const base44 = createClient({
  appId: appId || (isDesktop ? 'local-desktop' : appId),
  token,
  functionsVersion,
  serverUrl: '',
  appBaseUrl
});
