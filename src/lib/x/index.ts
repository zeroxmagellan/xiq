import { request } from './client';
import type { UserByScreenNameResponse, UserTweetsResponse } from './types';

const USER_BY_SCREEN_NAME_ENDPOINT = 'xmU6X_CKVnQ5lSrCbAmJsg/UserByScreenName';
const USER_TWEETS_ENDPOINT = 'E3opETHurmVJflFsUBVuUQ/UserTweets';

const USER_FEATURES = {
  hidden_profile_subscriptions_enabled: true,
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  subscriptions_verification_info_is_identity_verified_enabled: true,
  subscriptions_verification_info_verified_since_enabled: true,
  highlights_tweets_tab_ui_enabled: true,
  responsive_web_twitter_article_notes_tab_enabled: true,
  subscriptions_feature_can_gift_premium: true,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  responsive_web_graphql_timeline_navigation_enabled: true
};

const TWEETS_FEATURES = {
  rweb_tipjar_consumption_enabled: true,
  responsive_web_graphql_exclude_directive_enabled: true,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  creator_subscriptions_quote_tweet_preview_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  rweb_video_timestamps_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_enhance_cards_enabled: false
};

const userCache = new Map<string, { bio: string; userId: string }>();
const tweetsCache = new Map<string, string[]>();

export async function getUserBio(screenName: string): Promise<{ bio: string; userId: string } | null> {
  const cached = userCache.get(screenName);
  if (cached) return cached;

  try {
    console.log(`[x-iq] Fetching bio for @${screenName}`);
    const data = await request<UserByScreenNameResponse>(
      USER_BY_SCREEN_NAME_ENDPOINT,
      { screen_name: screenName, withSafetyModeUserFields: true },
      USER_FEATURES
    );

    if (!data) {
      console.warn(`[x-iq] No data returned for @${screenName}`);
      return null;
    }

    const user = data?.data?.user?.result;
    if (!user) {
      console.warn(`[x-iq] No user result for @${screenName}`, data);
      return null;
    }
    
    const bio = user.legacy?.description || '';
    const userId = user.rest_id;
    
    if (!userId) {
      console.warn(`[x-iq] No userId for @${screenName}`);
      return null;
    }

    const result = { bio, userId };
    console.log(`[x-iq] Got bio for @${screenName}: "${bio.slice(0, 50)}..."`);

    userCache.set(screenName, result);
    return result;
  } catch (e) {
    console.error(`[x-iq] Error fetching bio for @${screenName}:`, e);
    return null;
  }
}

export async function getUserTweets(userId: string, screenName: string, count = 5): Promise<string[]> {
  const cached = tweetsCache.get(screenName);
  if (cached) return cached;

  try {
    console.log(`[x-iq] Fetching tweets for @${screenName} (userId: ${userId})`);
    const data = await request<UserTweetsResponse>(
      USER_TWEETS_ENDPOINT,
      {
        userId,
        count: 20,
        includePromotedContent: false,
        withQuickPromoteEligibilityTweetFields: false,
        withVoice: false,
        withV2Timeline: true
      },
      TWEETS_FEATURES
    );

    if (!data) {
      console.warn(`[x-iq] No tweet data for @${screenName}`);
      tweetsCache.set(screenName, []);
      return [];
    }

    const instructions = data?.data?.user?.result?.timeline_v2?.timeline?.instructions || [];
    const tweets: string[] = [];

    for (const instruction of instructions) {
      if (instruction.type !== 'TimelineAddEntries') continue;
      
      for (const entry of instruction.entries || []) {
        const tweetResult = entry.content?.itemContent?.tweet_results?.result;
        const tweetText = tweetResult?.legacy?.full_text;
        if (tweetText && !tweetText.startsWith('RT @')) {
          tweets.push(tweetText);
          if (tweets.length >= count) break;
        }
      }
      if (tweets.length >= count) break;
    }

    console.log(`[x-iq] Got ${tweets.length} tweets for @${screenName}`);
    tweetsCache.set(screenName, tweets);
    return tweets;
  } catch (e) {
    console.error(`[x-iq] Error fetching tweets for @${screenName}:`, e);
    tweetsCache.set(screenName, []);
    return [];
  }
}

export async function getUserData(screenName: string): Promise<{ bio: string; tweets: string[] } | null> {
  // First get user info (needed for userId)
  const userInfo = await getUserBio(screenName);
  if (!userInfo) {
    console.warn(`[x-iq] Could not get user info for @${screenName}`);
    return null;
  }

  // Then fetch tweets (we need userId from above)
  const tweets = await getUserTweets(userInfo.userId, screenName);
  
  console.log(`[x-iq] getUserData complete for @${screenName}: bio=${userInfo.bio.length}chars, tweets=${tweets.length}`);
  
  return {
    bio: userInfo.bio,
    tweets
  };
}

export function isUserCached(screenName: string): boolean {
  return userCache.has(screenName) && tweetsCache.has(screenName);
}

export function clearUserCache(): void {
  userCache.clear();
  tweetsCache.clear();
}
