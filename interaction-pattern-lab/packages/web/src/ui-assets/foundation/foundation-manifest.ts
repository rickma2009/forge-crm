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
const sliceSource = '.specify/specs/010-master-detail-document-assets/spec.md:REQ-1004';

export const foundationManifest: FoundationSpecimenDefinition[] = [
  {
    routeId: 'foundation-colors', title: '颜色与主题', summary: '仅登记当前切片所需的语义表面、操作与状态色。',
    tokens: [
      { id: 'surface.canvas', value: 'var(--foundation-surface-canvas)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '承载页面背景并与内容表面区分。' },
      { id: 'surface.default', value: 'var(--foundation-surface-default)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '承载卡片、表单和工作区内容。' },
      { id: 'action.primary', value: 'var(--foundation-action-primary)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '标示当前场景的主提交或推进动作。' },
      { id: 'status.success', value: 'var(--foundation-status-success)', sourceRefs: [stylesheetSource, sliceSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '表达已完成或成功的独立状态反馈。' },
      { id: 'theme.dark', value: '未定义', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-002'], coverage: 'gap', purpose: '深色主题不在当前切片范围，不能由页面临时补造。' },
      { id: 'data-viz.palette', value: '未定义', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-002'], coverage: 'gap', purpose: '数据可视化色板尚无已批准消费场景。' },
    ],
  },
  {
    routeId: 'foundation-typography', title: '字体与排版', summary: '复用项目既有字体合同，不在资产层创建第二套全局排版。',
    tokens: [
      { id: 'type.family.enterprise', value: 'var(--foundation-type-family)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '为企业页面提供统一的中英文字体回退序列。' },
      { id: 'type.body.compact', value: 'var(--foundation-type-body)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '保持紧凑控件与表格的正文信息密度。' },
      { id: 'type.heading.page', value: 'var(--foundation-type-heading)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '仅为已声明的大标题层级提供放大字号。' },
      { id: 'type.scale.responsive', value: '未定义', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-012'], coverage: 'gap', purpose: '响应式字号比例尚未得到当前切片的消费与验证。' },
    ],
  },
  {
    routeId: 'foundation-spacing', title: '间距与布局', summary: '覆盖当前工作区的紧凑控制、间距节奏和可见焦点。',
    tokens: [
      { id: 'density.control.compact', value: 'var(--foundation-control-height)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '维持表单、工具栏和行操作的紧凑控制高度。' },
      { id: 'space.inline.default', value: 'var(--foundation-space-inline)', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '分隔同组动作和短内容。' },
      { id: 'space.section.default', value: 'var(--foundation-space-section)', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '分隔对象头、字段、行表和反馈区。' },
      { id: 'focus.visible', value: 'var(--foundation-focus-ring)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '让键盘焦点在当前企业工作区中可辨识。' },
      { id: 'grid.virtualization', value: '未定义', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-012'], coverage: 'gap', purpose: '虚拟化与超大表格预算尚无本切片实现。' },
    ],
  },
  {
    routeId: 'foundation-icons', title: '图标与状态色', summary: '明确当前图标尺寸、含义和异步状态反馈，未覆盖图标库治理。',
    tokens: [
      { id: 'icon.size.control', value: 'var(--foundation-icon-control-size)', sourceRefs: [stylesheetSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '保持菜单、工具栏和行操作图标的可辨识尺寸。' },
      { id: 'icon.meaning.decorative', value: 'aria-hidden=true', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-002', 'EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '仅装饰性图标不重复播报文本含义。' },
      { id: 'state.async.pending', value: '处理中', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '让异步动作在后续组件接入前有一致的可读状态词。' },
      { id: 'state.async.failure', value: '操作失败，请重试', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-012', 'EPM-PAGE-013'], coverage: 'implemented', purpose: '区分失败反馈与业务结果，保留恢复路径。' },
      { id: 'icon.illustration.system', value: '未定义', sourceRefs: [sliceSource], consumerIds: ['EPM-PAGE-002'], coverage: 'gap', purpose: '空状态插画和多色图标不在当前最小基础层范围。' },
    ],
  },
];

export const foundationSpecimensByRouteId = Object.fromEntries(foundationManifest.map((item) => [item.routeId, item])) as Record<FoundationRouteId, FoundationSpecimenDefinition>;

export function isFoundationRouteId(value: string): value is FoundationRouteId {
  return foundationManifest.some((item) => item.routeId === value);
}
