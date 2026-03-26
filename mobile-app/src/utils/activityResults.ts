import { stateApi } from './stateApi';

export type ActivityType = 'pronunciacion' | 'dictado' | 'traduccion' | 'lectura';

export interface ActivityResult {
  id: string;
  activityType: ActivityType;
  language: string;
  completedAt: string;
  score: number;
  durationSeconds: number;
}

const RESULTS_KEY = (language: string) => `activity_results_${language}`;

export const saveActivityResult = async (result: ActivityResult): Promise<void> => {
  try {
    const key = RESULTS_KEY(result.language);
    const existing = await stateApi.get<ActivityResult[]>('learning-state', key, []);
    existing.push(result);
    await stateApi.set('learning-state', key, existing);
  } catch {
    // non-critical
  }
};

export const getActivityResults = async (
  language: string,
  activityType?: ActivityType
): Promise<ActivityResult[]> => {
  try {
    const all = await stateApi.get<ActivityResult[]>('learning-state', RESULTS_KEY(language), []);
    return activityType ? all.filter(r => r.activityType === activityType) : all;
  } catch {
    return [];
  }
};

export const clearActivityResults = async (language: string): Promise<void> => {
  try {
    await stateApi.remove('learning-state', RESULTS_KEY(language));
  } catch {
    // non-critical
  }
};
