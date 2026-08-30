export type ValidationStatus = 'idea' | 'candidate' | 'validated-once' | 'validated-multiple';

export interface PatternSummary {
  problem: string;
  appliesWhen: string[];
  avoidWhen: string[];
  behaviors: string[];
  states: string[];
  risks: string[];
}

export interface PatternDefinition {
  id: string;
  name: string;
  category: string;
  validationStatus: ValidationStatus;
  keywords: string[];
  summary: PatternSummary;
  sources: string[];
  sourceFingerprint: {
    path: string;
    sha256: string;
  };
  demoId: 'navigation-shell' | 'record-workspace';
}
