/** Organization-maintained job posts and employee title labels. Values are stable business codes. */
export const organizationDictionarySeeds = [
  { code: 'employee_post', name: '岗位', groupCode: 'organization', description: '员工主职岗位，代码与组织岗位主数据一致', sortNo: 310, itemsEditable: true, items: [
    ['bg-manager', 'BG负责人', 'blue'], ['division-manager', '事业部总经理', 'blue'], ['department-manager', '部门经理', 'blue'],
    ['sales-manager', '销售经理', 'green'], ['sales-representative', '销售代表', 'green'], ['sales-operations', '销售运营', 'green'],
    ['rd-manager', '研发经理', 'purple'], ['rd-engineer', '研发工程师', 'purple'], ['finance-manager', '财务经理', 'orange'],
    ['accountant', '会计', 'orange'], ['supply-manager', '供应链经理', 'gray'], ['procurement-specialist', '采购专员', 'gray'],
  ] },
  { code: 'employee_job_title', name: '职位', groupCode: 'organization', description: '员工职位/职务称谓，可与岗位独立选择', sortNo: 320, itemsEditable: true, items: [
    ['DIRECTOR', '总监/总经理', 'blue'], ['MANAGER', '经理', 'green'], ['SUPERVISOR', '主管', 'purple'],
    ['SPECIALIST', '专员', 'orange'], ['ENGINEER', '工程师', 'gray'], ['STAFF', '职员', 'gray'],
  ] },
] as const;
