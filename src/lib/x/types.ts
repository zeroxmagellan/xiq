export interface UserByScreenNameResponse {
  data?: {
    user?: {
      result?: {
        __typename?: string;
        id?: string;
        rest_id?: string;
        legacy?: {
          description?: string;
          name?: string;
          screen_name?: string;
          followers_count?: number;
          friends_count?: number;
          statuses_count?: number;
          verified?: boolean;
        };
      };
    };
  };
}

export interface UserTweetsResponse {
  data?: {
    user?: {
      result?: {
        timeline_v2?: {
          timeline?: {
            instructions?: Array<{
              type?: string;
              entries?: Array<{
                content?: {
                  itemContent?: {
                    tweet_results?: {
                      result?: {
                        legacy?: {
                          full_text?: string;
                        };
                      };
                    };
                  };
                };
              }>;
            }>;
          };
        };
      };
    };
  };
}

export interface AboutAccountResponse {
  data?: {
    user_result_by_screen_name?: {
      result?: {
        about_profile?: {
          account_based_in?: string;
        };
      };
    };
  };
}
