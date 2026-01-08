export interface UserSettings {
  enabled: boolean;
  apiKey: string;
  hideLowIQ: boolean;
  iqThreshold: number;
}

export interface IQResult {
  screenName: string;
  iq: number;
  reasoning?: string;
  analyzedAt: number;
}

export interface UserData {
  screenName: string;
  bio: string;
  tweets: string[];
}

export interface IQAnalysisRequest {
  users: UserData[];
}

export interface IQAnalysisResponse {
  results: Record<string, number>;
}

export interface Message {
  type: 'ANALYZE_IQ' | 'GET_SETTINGS' | 'SAVE_SETTINGS' | 'GET_IQ_STATS';
  payload?: unknown;
}

export const DEFAULT_SETTINGS: UserSettings = {
  enabled: true,
  apiKey: '',
  hideLowIQ: false,
  iqThreshold: 100
};
