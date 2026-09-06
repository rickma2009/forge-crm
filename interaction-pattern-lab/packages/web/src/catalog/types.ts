export type MaturityStatus =
  | 'idea'
  | 'candidate'
  | 'implementation-verified'
  | 'interaction-verified'
  | 'project-adopted'
  | 'business-validated'
  | 'released'
  | 'deprecated';

export type AssetKind = 'PAGE' | 'ACT' | 'VIEW' | 'STATE' | 'SPECIAL' | 'SCENE';
export type DemoAvailability = 'all' | 'available' | 'none';

export interface PatternSummary {
  problem: string;
  appliesWhen: string[];
  avoidWhen: string[];
  behaviors: string[];
  states: string[];
  risks: string[];
}

export interface DemoReference {
  validationId: string;
  label: string;
  demoId: string;
}

export interface PatternDefinition {
  id: string;
  kind: AssetKind;
  name: string;
  category: string;
  maturity: MaturityStatus;
  keywords: string[];
  summary: PatternSummary;
  sources: string[];
  evidence: string[];
  nextEvidence: string;
  coveredBy: string[];
  demos: DemoReference[];
}

export interface ValidationSliceDefinition {
  validationId: string;
  label: string;
  primaryAssetId: string;
  coveredAssetIds: string[];
  demoId?: string;
  validationState?: 'in-lab-candidate';
  specRef: string;
}

export interface PatternProjection {
  version: number;
  registryVersion: number;
  patterns: PatternDefinition[];
  validations: ValidationSliceDefinition[];
}

export interface PatternFilters {
  query?: string;
  maturity?: MaturityStatus | 'all';
  demoAvailability?: DemoAvailability;
}
