import { stateApi } from './stateApi';

const APP_TOUR_KEY = 'app_guided_tour_completed';

export const hasCompletedAppTour = async (): Promise<boolean> => {
  return await stateApi.get<boolean>('preferences', APP_TOUR_KEY, false);
};

export const markAppTourCompleted = async (): Promise<void> => {
  await stateApi.set('preferences', APP_TOUR_KEY, true).catch(() => {});
};

// Backward-compatible aliases for older imports still referenced by Metro cache
// or partially updated files.
export const hasSeenSessionTour = hasCompletedAppTour;
export const markSessionTourSeen = markAppTourCompleted;
