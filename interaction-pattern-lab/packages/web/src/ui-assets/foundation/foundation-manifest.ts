export type FoundationCoverage = 'implemented' | 'gap';
export type FoundationRouteId = 'foundation-colors' | 'foundation-typography' | 'foundation-spacing' | 'foundation-icons';

export interface FoundationToken {
  id: string;
  value: string;
  sourceRefs: string[];
  consumerIds: string[];
  coverage: FoundationCoverage;
  purpose: string;
}

export interface FoundationSpecimenDefinition {
  routeId: FoundationRouteId;
  title: string;
  summary: string;
  tokens: FoundationToken[];
}

const stylesheetSource = 'packages/web/src/styles/index.css:1';
const showcaseStylesheetSource = 'packages/web/src/showcase/showcase.css:198';
const sliceSource = '.specify/specs/010-master-detail-document-assets/spec.md:REQ-1004';
const allSpecimenRoutes: FoundationRouteId[] = ['foundation-colors', 'foundation-typography', 'foundation-spacing', 'foundation-icons'];
const sharedSpecimenConsumers = () => [...allSpecimenRoutes];
const routeConsumer = (routeId: FoundationRouteId) => [routeId];

export const foundationManifest: FoundationSpecimenDefinition[] = [
  {
    routeId: 'foundation-colors', title: '颜色与主题', summary: '仅登记当前基础样本实际使用的语义表面、操作与状态色。',
    tokens: [
      { id: 'surface.canvas', value: 'var(--foundation-surface-canvas)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '承载四个基础样本页面的背景。' },
      { id: 'surface.default', value: 'var(--foundation-surface-default)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '承载样本中的令牌卡片和缺口区。' },
      { id: 'action.primary', value: 'var(--foundation-action-primary)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '标示样本页的资产层级标签。' },
      { id: 'status.success', value: 'var(--foundation-status-success)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '标示已实现令牌的覆盖状态。' },
      { id: 'status.success.wash', value: 'var(--foundation-status-success-wash)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '承载已实现覆盖状态的背景。' },
      { id: 'status.warning', value: 'var(--foundation-status-warning)', sourceRefs: [showcaseStylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '标示明确缺口的覆盖状态。' },
      { id: 'status.warning.wash', value: 'var(--foundation-status-warning-wash)', sourceRefs: [showcaseStylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '承载明确缺口覆盖状态的背景。' },
      { id: 'theme.dark', value: '未定义', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-colors'), coverage: 'gap', purpose: '深色主题不在当前切片范围，不能由页面临时补造。' },
      { id: 'data-viz.palette', value: '未定义', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-colors'), coverage: 'gap', purpose: '数据可视化色板尚无已批准消费场景。' },
    ],
  },
  {
    routeId: 'foundation-typography', title: '字体与排版', summary: '复用项目既有字体合同，并在样本边界内显式展示层级。',
    tokens: [
      { id: 'type.family.enterprise', value: 'var(--foundation-type-family)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '为四个基础样本提供一致的中英文字体回退序列。' },
      { id: 'type.meta.label', value: 'var(--foundation-type-meta)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '标示样本标签、字段名和覆盖状态。' },
      { id: 'type.body.compact', value: 'var(--foundation-type-body)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '维持样本正文和令牌值的紧凑信息密度。' },
      { id: 'type.heading.page', value: 'var(--foundation-type-heading)', sourceRefs: [stylesheetSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '为每个基础样本提供可辨识页面标题层级。' },
      { id: 'type.scale.responsive', value: '未定义', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-typography'), coverage: 'gap', purpose: '响应式字号比例尚未得到当前切片的消费与验证。' },
    ],
  },
  {
    routeId: 'foundation-spacing', title: '间距与布局', summary: '覆盖当前基础样本的紧凑控制、间距节奏和键盘焦点。',
    tokens: [
      { id: 'density.control.compact', value: 'var(--foundation-control-height)', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-spacing'), coverage: 'implemented', purpose: '规定焦点样本按钮的紧凑控制高度。' },
      { id: 'space.inline.default', value: 'var(--foundation-space-inline)', sourceRefs: [sliceSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '分隔同组样本内容。' },
      { id: 'space.section.default', value: 'var(--foundation-space-section)', sourceRefs: [sliceSource], consumerIds: sharedSpecimenConsumers(), coverage: 'implemented', purpose: '分隔样本标题、令牌网格和缺口区。' },
      { id: 'focus.visible', value: 'var(--foundation-focus-ring)', sourceRefs: [stylesheetSource], consumerIds: routeConsumer('foundation-spacing'), coverage: 'implemented', purpose: '为键盘抵达的焦点样本绘制可见轮廓。' },
      { id: 'grid.virtualization', value: '未定义', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-spacing'), coverage: 'gap', purpose: '虚拟化与超大表格预算尚无本切片实现。' },
    ],
  },
  {
    routeId: 'foundation-icons', title: '图标与状态色', summary: '明确样本当前图标尺寸、装饰语义和异步状态反馈。',
    tokens: [
      { id: 'icon.size.control', value: 'var(--foundation-icon-control-size)', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-icons'), coverage: 'implemented', purpose: '定义图标样本的可辨识控制尺寸。' },
      { id: 'icon.meaning.decorative', value: 'aria-hidden=true', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-icons'), coverage: 'implemented', purpose: '图标样本为装饰时不重复播报文本含义。' },
      { id: 'state.async.pending', value: '处理中', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-icons'), coverage: 'implemented', purpose: '展示可读的异步处理中状态。' },
      { id: 'state.async.failure', value: '操作失败，请重试', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-icons'), coverage: 'implemented', purpose: '展示可恢复的异步失败状态。' },
      { id: 'icon.illustration.system', value: '未定义', sourceRefs: [sliceSource], consumerIds: routeConsumer('foundation-icons'), coverage: 'gap', purpose: '空状态插画和多色图标不在当前最小基础层范围。' },
    ],
  },
];

export const foundationSpecimensByRouteId = Object.fromEntries(foundationManifest.map((item) => [item.routeId, item])) as Record<FoundationRouteId, FoundationSpecimenDefinition>;

export function isFoundationRouteId(value: string): value is FoundationRouteId {
  return foundationManifest.some((item) => item.routeId === value);
}
