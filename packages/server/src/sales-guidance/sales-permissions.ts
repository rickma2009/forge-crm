export const salesEnhancementActions=['customer-directory','opportunity-directory'].flatMap(menuCode=>[
 ['suggestion-view','查看销售建议'],['suggestion-adopt','处理销售建议'],['comment-view','查看记录协作'],['comment-create','发表评论'],['comment-edit-own','修改本人评论'],['comment-moderate','管理隐藏评论'],
 ...(menuCode==='opportunity-directory'?[['score-view','查看跟进优先级'],['score-override','覆盖跟进优先级'],['score-rule-manage','管理评分规则']]:[]),
].map(([actionCode,actionName],index)=>({menuCode,actionCode,actionName,actionType:'CUSTOM' as const,sortNo:200+index})));
