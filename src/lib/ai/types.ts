import { z } from 'zod';

export const IQResultSchema = z.object({
  screenName: z.string(),
  iq: z.number().min(50).max(200),
  reasoning: z.string().optional()
});

export const BatchIQResponseSchema = z.object({
  results: z.array(IQResultSchema)
});

export interface UserIQInput {
  screenName: string;
  bio: string;
  tweets: string[];
}
