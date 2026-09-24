/** Customer contact classification; dictionary module owns its initialization. */
export const contactProjectRoleSeed = {
  code: 'contact_project_role', name: '项目角色', groupCode: 'customer',
  description: '客户联系人在项目中的角色', sortNo: 50, itemsEditable: true,
  items: [
    ['decision_maker', '决策人', 'purple'],
    ['technical_selector', '技术选型人', 'blue'],
    ['user', '使用者', 'green'],
    ['budget_approver', '预算审批人', 'orange'],
    ['other', '其他', 'gray'],
  ],
} as const;
