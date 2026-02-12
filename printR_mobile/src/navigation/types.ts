export type RootStackParamList = {
  MainTabs: undefined;
  VrfProofModal: { vrf: any };
};

export type MainTabParamList = {
  PlayTab: undefined;
  ProgressTab: undefined;
  Store: undefined;
  Governance: undefined;
  Profile: undefined;
};

export type PlayStackParamList = {
  Home: undefined;
  LiveRound: { sessionId?: string };
  Result: undefined;
};

export type ProgressStackParamList = {
  Progress: undefined;
  Vault: undefined;
  Leaderboard: undefined;
  History: undefined;
};
