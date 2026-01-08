import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { BatchIQResponseSchema, type UserIQInput } from './types';
import { buildIQPrompt } from './prompt';

const MODEL = 'gemini-2.0-flash';
const BATCH_SIZE = 5;
const MAX_CONCURRENT = 2;

export interface IQAnalysisResult {
  iq: number;
  reasoning?: string;
}

export async function analyzeIQ(
  users: UserIQInput[],
  apiKey: string
): Promise<Map<string, IQAnalysisResult>> {
  const results = new Map<string, IQAnalysisResult>();

  if (!apiKey || users.length === 0) {
    return results;
  }

  const google = createGoogleGenerativeAI({ apiKey });

  const batches: UserIQInput[][] = [];
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    batches.push(users.slice(i, i + BATCH_SIZE));
  }

  const processBatch = async (batch: UserIQInput[]): Promise<void> => {
    console.log(`[x-iq] Analyzing IQ for ${batch.length} users: ${batch.map(u => u.screenName).join(', ')}`);
    try {
      const { object } = await generateObject({
        model: google(MODEL),
        schema: BatchIQResponseSchema,
        prompt: buildIQPrompt(batch)
      });

      console.log(`[x-iq] Got IQ results:`, object.results.map(r => `@${r.screenName}: ${r.iq}`).join(', '));

      for (const item of object.results) {
        // Normalize screenName - remove @ prefix if present
        const normalizedName = item.screenName.replace(/^@/, '');
        results.set(normalizedName, { iq: item.iq, reasoning: item.reasoning });
      }
    } catch (e) {
      console.error('[x-iq] LLM analysis error:', e);
      // On error, assign default IQ of 100
      for (const user of batch) {
        results.set(user.screenName, { iq: 100 });
      }
    }
  };

  const semaphore = new Array(MAX_CONCURRENT).fill(Promise.resolve());
  let semIdx = 0;

  const tasks = batches.map(batch => {
    const idx = semIdx++ % MAX_CONCURRENT;
    semaphore[idx] = semaphore[idx].then(() => processBatch(batch));
    return semaphore[idx];
  });

  await Promise.all(tasks);

  return results;
}

export type { UserIQInput } from './types';
