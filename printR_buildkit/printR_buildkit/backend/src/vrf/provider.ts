export type VrfSample = {
  requestId: string;
  proofRef?: string;
  z: number; // [-1,+1]
};

export interface VrfProvider {
  requestSample(sessionId: string, tickIndex: number): Promise<{ requestId: string }>;
  waitForSample(requestId: string): Promise<VrfSample>;
}
