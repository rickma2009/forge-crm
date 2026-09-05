const sourceOnlyTerms = ['gf_scm', 'gf scm', '供应协同平台'];

function duplicateValues(values) {
  const seen = new Set();
  return [...new Set(values.filter((value) => seen.has(value) || !seen.add(value)))];
}

function walkNodes(nodes, visit) {
  for (const node of nodes) {
    visit(node);
    if (Array.isArray(node.children)) walkNodes(node.children, visit);
  }
}

export function validateShowcaseRegistry(registry, { iconKeys, rendererKeys, traceabilityEvidence }) {
  const errors = [];
  if (!registry || typeof registry !== 'object') return ['REGISTRY_NOT_OBJECT'];
  if (registry.version !== 1) errors.push('REGISTRY_VERSION_UNSUPPORTED');
  if (!registry.system?.name || !registry.system?.logoKey || !registry.system?.defaultPageId) errors.push('SYSTEM_FIELDS_REQUIRED');

  const capabilities = Array.isArray(registry.capabilities) ? registry.capabilities : [];
  const pages = Array.isArray(registry.pages) ? registry.pages : [];
  const roles = Array.isArray(registry.roles) ? registry.roles : [];
  for (const value of duplicateValues(capabilities)) errors.push(`DUPLICATE_CAPABILITY:${value}`);
  for (const value of duplicateValues(pages.map((page) => page.id))) errors.push(`DUPLICATE_PAGE_ID:${value}`);
  for (const value of duplicateValues(pages.map((page) => page.path))) errors.push(`DUPLICATE_PAGE_PATH:${value}`);

  const capabilitySet = new Set(capabilities);
  const pageById = new Map(pages.map((page) => [page.id, page]));
  const traceabilityRequiredPageIds = new Set(['template-form', 'template-workbench', 'template-master-detail']);
  for (const page of pages) {
    if (!page.id || !page.path || !page.title || !page.viewCapability || !page.rendererKey || !page.iconKey) errors.push(`PAGE_FIELDS_REQUIRED:${page.id ?? 'unknown'}`);
    if (!capabilitySet.has(page.viewCapability)) errors.push(`UNKNOWN_PAGE_CAPABILITY:${page.id}:${page.viewCapability}`);
    if (!rendererKeys.has(page.rendererKey)) errors.push(`UNKNOWN_RENDERER:${page.id}:${page.rendererKey}`);
    if (!iconKeys.has(page.iconKey)) errors.push(`UNKNOWN_PAGE_ICON:${page.id}:${page.iconKey}`);
    if (page.coverage === 'description-only' && (page.operations?.length ?? 0) > 0) errors.push(`DESCRIPTION_PAGE_HAS_OPERATIONS:${page.id}`);
    for (const operation of page.operations ?? []) {
      if (!capabilitySet.has(operation.capability)) errors.push(`UNKNOWN_OPERATION_CAPABILITY:${page.id}:${operation.capability}`);
    }
    for (const sourceRef of page.sourceRefs ?? []) {
      if (!/^UID-\d{3}$/.test(sourceRef)) errors.push(`INVALID_SOURCE_REF:${page.id}:${sourceRef}`);
    }
    validateTraceability(page, traceabilityRequiredPageIds, traceabilityEvidence, errors);
  }
  if (!pageById.has(registry.system?.defaultPageId)) errors.push('UNKNOWN_DEFAULT_PAGE');

  const admin = roles.find((role) => role.id === 'admin');
  const viewer = roles.find((role) => role.id === 'viewer');
  if (admin?.grantMode !== 'all-registered') errors.push('ADMIN_MUST_GRANT_ALL_REGISTERED');
  if (viewer?.grantMode !== 'explicit') errors.push('VIEWER_MUST_USE_EXPLICIT_GRANTS');
  for (const capability of viewer?.capabilities ?? []) {
    if (!capabilitySet.has(capability)) errors.push(`UNKNOWN_VIEWER_CAPABILITY:${capability}`);
  }
  for (const capability of ['showcase.user.view', 'showcase.role.view', 'showcase.policy.view', 'showcase.menu.view', 'showcase.log.view', 'showcase.resource.manage', 'showcase.resource.export']) {
    if (viewer?.capabilities?.includes(capability)) errors.push(`VIEWER_FORBIDDEN_CAPABILITY:${capability}`);
  }
  if (!viewer?.capabilities?.includes('showcase.resource.view')) errors.push('VIEWER_RESOURCE_VIEW_REQUIRED');

  const navigationIds = [];
  const referencedPageIds = new Set();
  const items = Array.isArray(registry.navigation?.items) ? registry.navigation.items : [];
  walkNodes(items, (node) => {
    navigationIds.push(node.id);
    if (!node.id || !node.label || !node.iconKey) errors.push(`NAV_FIELDS_REQUIRED:${node.id ?? 'unknown'}`);
    if (!iconKeys.has(node.iconKey)) errors.push(`UNKNOWN_NAV_ICON:${node.id}:${node.iconKey}`);
    const hasChildren = Array.isArray(node.children) && node.children.length > 0;
    if (hasChildren === Boolean(node.pageId)) errors.push(`NAV_NODE_TARGET_XOR_CHILDREN:${node.id}`);
    if (node.pageId) {
      referencedPageIds.add(node.pageId);
      if (!pageById.has(node.pageId)) errors.push(`UNKNOWN_NAV_PAGE:${node.id}:${node.pageId}`);
    }
  });
  for (const value of duplicateValues(navigationIds)) errors.push(`DUPLICATE_NAV_ID:${value}`);
  for (const page of pages) {
    if (!referencedPageIds.has(page.id)) errors.push(`UNREFERENCED_PAGE:${page.id}`);
  }

  const serialized = JSON.stringify(registry).toLowerCase();
  for (const term of sourceOnlyTerms) {
    if (serialized.includes(term.toLowerCase())) errors.push(`SOURCE_TERM_FORBIDDEN:${term}`);
  }
  return errors;
}

function validateTraceability(page, requiredPageIds, evidence, errors) {
  const traceability = page.traceability;
  if (!traceability) {
    if (requiredPageIds.has(page.id)) errors.push(`TRACEABILITY_REQUIRED:${page.id}`);
    return;
  }

  const references = [
    ['directSourceRefs', /^REQSRC-\d{3}$/, 'INVALID_DIRECT_SOURCE_REF'],
    ['extractionRefs', /^UID-\d{3}$/, 'INVALID_EXTRACTION_REF'],
    ['assetRefs', /^EPM-(?:PAGE|ACT|VIEW|STATE|SPECIAL)-\d{3}$/, 'INVALID_ASSET_REF'],
    ['implementationRefs', /.+/, 'INVALID_IMPLEMENTATION_REF'],
    ['qaRefs', /.+/, 'INVALID_QA_REF'],
  ];
  for (const [field, format, errorCode] of references) {
    const values = traceability[field];
    if (!Array.isArray(values)) {
      errors.push(`TRACEABILITY_FIELD_REQUIRED:${page.id}:${field}`);
      continue;
    }
    for (const value of values) {
      if (typeof value !== 'string' || !format.test(value)) errors.push(`${errorCode}:${page.id}:${value}`);
    }
  }
  for (const field of ['directSourceRefs', 'extractionRefs', 'assetRefs', 'implementationRefs']) {
    if (!Array.isArray(traceability[field]) || traceability[field].length === 0) errors.push(`TRACEABILITY_REFERENCE_REQUIRED:${page.id}:${field}`);
  }
  const qaRefs = Array.isArray(traceability.qaRefs) ? traceability.qaRefs : [];
  if (traceability.qaStatus !== 'not-run' && traceability.qaStatus !== 'recorded') errors.push(`INVALID_QA_STATUS:${page.id}:${traceability.qaStatus}`);
  if (traceability.qaStatus === 'not-run' && qaRefs.length > 0) errors.push(`NOT_RUN_QA_HAS_REFS:${page.id}`);
  if (traceability.qaStatus === 'recorded' && qaRefs.length === 0) errors.push(`RECORDED_QA_REFS_REQUIRED:${page.id}`);

  for (const assetRef of traceability.assetRefs ?? []) {
    if (evidence?.assetIds && !evidence.assetIds.has(assetRef)) errors.push(`UNKNOWN_EPM_ASSET:${page.id}:${assetRef}`);
  }
  for (const implementationRef of traceability.implementationRefs ?? []) {
    if (evidence?.implementationRefExists && !evidence.implementationRefExists(implementationRef)) errors.push(`MISSING_IMPLEMENTATION_REF:${page.id}:${implementationRef}`);
  }
}
