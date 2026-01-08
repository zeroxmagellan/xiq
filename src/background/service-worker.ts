import { getSettings, saveIQResults, getIQStats } from '../lib/storage';
import { analyzeIQ, type UserIQInput, type IQAnalysisResult } from '../lib/ai';
import type { Message, IQResult } from '../types';

chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: Message) {
  switch (message.type) {
    case 'GET_SETTINGS': {
      return await getSettings();
    }

    case 'SAVE_SETTINGS': {
      return await getSettings();
    }

    case 'GET_IQ_STATS': {
      return await getIQStats();
    }

    case 'ANALYZE_IQ': {
      const settings = await getSettings();
      if (!settings.enabled || !settings.apiKey) {
        return { results: {} };
      }

      const payload = message.payload as { users: UserIQInput[] };
      
      const iqResults = await analyzeIQ(
        payload.users,
        settings.apiKey
      );

      // Save results to cache
      const now = Date.now();
      const resultsToSave: IQResult[] = Array.from(iqResults.entries()).map(
        ([screenName, result]) => ({
          screenName,
          iq: result.iq,
          reasoning: result.reasoning,
          analyzedAt: now
        })
      );

      await saveIQResults(resultsToSave);

      // Return results with threshold info
      const resultMap: Record<string, IQAnalysisResult> = {};
      for (const [screenName, result] of iqResults) {
        resultMap[screenName] = result;
      }

      return { results: resultMap, threshold: settings.iqThreshold, hideLowIQ: settings.hideLowIQ };
    }

    default:
      return null;
  }
}
