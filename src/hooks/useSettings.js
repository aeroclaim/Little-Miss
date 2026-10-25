import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dataLayer } from '@/data/dataLayer';

const KEY = ['settings'];
export const VIDEO_SETTING = 'welcome_video_ref';

// App settings (currently: the welcome video). Reads and writes only through the data layer.
export function useSettings() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: KEY, queryFn: () => dataLayer.loadSettings(), staleTime: Infinity });
  const records = query.data || [];
  const values = Object.fromEntries(records.map((r) => [r.key, r.value]));
  const videoRef = values[VIDEO_SETTING] || '';

  const urlQuery = useQuery({
    queryKey: ['fileUrl', videoRef],
    queryFn: () => dataLayer.resolveFileUrl(videoRef),
    enabled: !!videoRef,
    staleTime: 50 * 60 * 1000,
  });

  async function save(key, value) {
    const existing = records.find((r) => r.key === key);
    if (existing) await dataLayer.update('settings', existing.id, { value });
    else await dataLayer.create('settings', { key, value });
    await qc.invalidateQueries({ queryKey: KEY });
  }

  // The video file is stored privately; only its reference is kept in the settings.
  const uploadVideo = async (file) => save(VIDEO_SETTING, await dataLayer.uploadPrivateFile(file));
  const removeVideo = () => save(VIDEO_SETTING, '');

  return {
    isLoading: query.isLoading,
    values,
    videoRef,
    videoUrl: videoRef ? urlQuery.data || null : null,
    videoLoading: !!videoRef && urlQuery.isLoading,
    save,
    uploadVideo,
    removeVideo,
  };
}