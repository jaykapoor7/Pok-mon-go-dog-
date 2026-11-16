/** Voice transport only. Record tools and Kaju's existing engine stay separate. */
export const VOICE_LANGUAGES = ["English", "Hindi", "Kannada"] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

export type VoiceTestConfig = {
  org_id: string;
  workspace_id: string;
  app_id: string;
  version: number;
  languages: VoiceLanguage[];
  user_identifier?: string;
  scope?: { kind: "standalone" | "organisation" | "public"; id: string };
  /** Non-secret context for the agent, set by the server for this session. */
  agent_variables?: Record<string, string>;
};

export const VOICE_TEST_HEADERS = { "X-StrayPaw-Voice-Test": "1" };
