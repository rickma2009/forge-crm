export function validateShowcaseRegistry(
  registry: unknown,
  options: {
    iconKeys: ReadonlySet<string>;
    rendererKeys: ReadonlySet<string>;
    traceabilityEvidence?: {
      assetIds: ReadonlySet<string>;
      implementationRefExists: (reference: string) => boolean;
    };
  },
): string[];
