import type { UserIQInput } from './types';

export function buildIQPrompt(users: UserIQInput[]): string {
  const usersText = users
    .map(u => {
      const tweetsText = u.tweets.length > 0 
        ? u.tweets.map((t, i) => `  ${i + 1}. ${t.slice(0, 200)}`).join('\n')
        : '  (no tweets)';
      
      return `[@${u.screenName}]
Bio: ${u.bio.slice(0, 300) || '(no bio)'}
Recent tweets:
${tweetsText}`;
    })
    .join('\n\n---\n\n');

  return `Estimate each Crypto Twitter user's IQ (50-200).

CONTEXT: Crypto Twitter has extreme slang. "Aping", "retarded", "degen", "ngmi" are neutral vocabulary. Everyone claims to be rich. Ignore the aesthetic - evaluate the MIND underneath.

HIGH IQ signals:
- Understands WHY something pumps/dumps, not just THAT it did
- Explains protocol mechanics correctly (not just "bullish on tech")
- Sees incentive structures and game theory
- Identifies risks others ignore (not just "NFA" disclaimers)
- Skeptical of narratives while still playing them
- Timing awareness: "this works until X happens"
- Understands liquidity, market structure, MEV, actual defi mechanics
- Makes non-consensus calls with reasoning
- Admits when wrong, updates views
- Separates "I'm betting on this" from "this is good"
- Compresses complex tokenomics into simple explanations
- Meta-awareness of CT dynamics and reflexivity

LOW IQ signals:
- Pure price talk with no reasoning ("$X going to $Y")
- Confuses luck with skill
- Repeats influencer takes as own thoughts
- "Bullish on the tech" with no specifics
- Doesn't understand what they're buying
- Falls for obvious tokenomics traps
- Engagement farming: "drop your address", "like if you..."
- Hindsight narratives ("I knew X would happen")
- Can't explain HOW something works, only that it's "good"
- Treats CT memes as actual analysis
- Shills without disclosure
- Binary thinking: "scam" or "generational wealth"

COMPLETELY IGNORE:
- "retard/ape/degen" language (it's neutral CT dialect)
- Lowercase, no punctuation
- Emoji spam (🚀💎🔥)
- Flexing bags/gains (everyone does it)
- Meme formats
- Profanity

IQ ranges for CT:
- 85-100: Repeats narratives, pure price speculation, no edge
- 100-115: Understands basics, can follow arguments, some pattern recognition  
- 115-130: Grasps mechanics, sees through some narratives, independent thinking
- 130-145: Deep protocol understanding, game theory awareness, consistent edge
- 145+: Rare - predicts dynamics others miss, builds mental models that work

Most CT users are 90-110. Loud ≠ smart. Rich ≠ smart. Early ≠ smart.

USERS:

${usersText}

Return JSON: {results: [{screenName, iq, reasoning}]}
IMPORTANT: screenName must be EXACTLY as shown (without the @ symbol). Example: "mert" not "@mert".
Reasoning: 1-2 sentences on what signals you detected.`;
}
