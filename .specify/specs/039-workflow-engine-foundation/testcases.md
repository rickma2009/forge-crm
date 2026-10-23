# 测试

- TC-WFE-01 → AC-WFE-01：99999.99/100000/100000.01走向；完整图保留8节点8连线；非法配置400。WorkflowIntegrationTest.completeGraphAndThresholdBoundaries/securityAndInputValidation。
- TC-WFE-02 → AC-WFE-02：同键重放同实例、异载荷409、并发两请求同实例。duplicateStartAndDifferentPayloadConflict/simultaneousSameCommandCreatesOneInstance。
- TC-WFE-03 → AC-WFE-03：新发布不改变旧实例路径；转交后任务版本递增、旧人无权，退回/拒绝终结本轮。versionSnapshotDoesNotChange/assigneeTransferAndStaleRevision/returnAndRejectEndRound。
- TC-WFE-04 → AC-WFE-04：跨scope不可见、非承办人和自审阻止；无令牌401；客户端失效关闭不泄漏服务错误。scopeIsolationAndSelfApproval/securityAndInputValidation与客户端5测试。
- TC-WFE-05 → AC-WFE-05：人工同意停在业务节点；失败仍等待；错误执行ID与已结束实例回调409；正确成功与重放只完成一次。businessFailureWaitsAndOnlyMatchingResultCompletes。

实际PostgreSQL集成9项、客户端5项、公共图形2项通过；HTTP与重启验收见review。
