export const salesOrderBase = '/showcase/sales-orders';
export const salesOutboundBase = '/showcase/sales-outbounds';
export const salesStatus = (value: string) => ({ DRAFT: '草稿', SUBMITTED: '已提交审核', APPROVED: '已审核', REVERSED: '已冲销', CANCELLED: '已取消' }[value] ?? value);
export const fulfillName = (value: string) => ({ NOT_SHIPPED: '未出货', PARTIAL: '部分出货', FULL: '全部出货', REMAINDER_CLOSED: '剩余已关闭' }[value] ?? value);
export const sourceName = (value: string) => ({ MANUAL: '按客户新建', OPPORTUNITY: '引入商机', QUOTATION: '引入报价单' }[value] ?? value);
export const money = (value: string | number) => Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const errorText = (error: unknown) => error instanceof Error ? error.message : '操作失败，请重试';
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
