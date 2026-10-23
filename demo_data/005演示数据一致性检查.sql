-- 只读检查。所有 invalid/mismatch/gap/duplicate/over_30 结果应为 0；所有 min 结果应 >= 5。
SELECT 'invalid_customer_codes' AS check_name, count(*) AS result FROM crm_customer WHERE customer_code !~ '^C[0-9]{7}$';
SELECT 'invalid_employee_codes', count(*) FROM org_employment WHERE employee_no !~ '^1[0-9]{6}$';
SELECT 'employee_relation_gaps', count(*) FROM org_employee e LEFT JOIN org_employment m ON m.employee_id=e.id LEFT JOIN org_employee_assignment a ON a.employee_id=e.id WHERE m.id IS NULL OR a.id IS NULL;
SELECT 'stale_business_auxiliary_rows',
  (SELECT count(*) FROM ai_analysis_task) +
  (SELECT count(*) FROM agent_task) +
  (SELECT count(*) FROM sys_agent_conversation) +
  (SELECT count(*) FROM sys_personal_todo) +
  (SELECT count(*) FROM sd_opp_stage_event) +
  (SELECT count(*) FROM sd_sales_activity) +
  (SELECT count(*) FROM sd_sales_suggestion) +
  (SELECT count(*) FROM sd_opp_score) +
  (SELECT count(*) FROM sd_score_override) +
  (SELECT count(*) FROM sd_record_comment) +
  (SELECT count(*) FROM sys_event_outbox) +
  (SELECT count(*) FROM sys_notification);
SELECT 'item_issues', count(*) FROM md_item WHERE status<>'ACTIVE' OR major_category_id IS NULL OR middle_category_id IS NULL OR minor_category_id IS NULL OR item_code !~ '^[0-9]{3}\.[0-9]{3}\.[0-9]{7}$';
SELECT 'duplicate_item_names', count(*) FROM (SELECT item_name FROM md_item GROUP BY item_name HAVING count(*)>1) d;
SELECT 'over_30_item_names', count(*) FROM md_item WHERE char_length(item_name)>30;
SELECT 'quote_total_mismatches', count(*) FROM (SELECT q.id FROM sd_quotation q JOIN sd_quotation_line l ON l.quotation_id=q.id GROUP BY q.id,q.total HAVING q.total<>sum(l.amount)) x;
SELECT 'order_total_mismatches', count(*) FROM (SELECT o.order_id FROM sd_sales_order o JOIN sd_sales_order_line l ON l.order_id=o.order_id GROUP BY o.order_id,o.amount HAVING o.amount<>sum(l.amount)) x;
WITH tx AS (
  SELECT tenant_id,legal_entity_id,warehouse_id,item_code,batch_no,sum(quantity) qty,sum(amount) amt
  FROM scm_inventory_txn GROUP BY 1,2,3,4,5
), cmp AS (
  SELECT coalesce(t.item_code,b.item_code) item_code,coalesce(t.qty,0) txn_qty,coalesce(b.quantity,0) balance_qty,coalesce(t.amt,0) txn_amt,coalesce(b.amount,0) balance_amt
  FROM tx t FULL JOIN scm_inventory_balance b USING(tenant_id,legal_entity_id,warehouse_id,item_code,batch_no)
)
SELECT 'inventory_balance_mismatches',count(*) FROM cmp WHERE txn_qty<>balance_qty OR txn_amt<>balance_amt;
SELECT 'customer_min_category_status', min(n) FROM (SELECT count(*) n FROM crm_customer GROUP BY category_value,status_value) x;
SELECT 'opportunity_min_business_status', min(n) FROM (SELECT count(*) n FROM sd_opp GROUP BY business_status) x;
SELECT 'opportunity_min_stage', min(n) FROM (SELECT count(*) n FROM sd_opp GROUP BY stage_id) x;
SELECT 'quotation_min_status', min(n) FROM (SELECT count(*) n FROM sd_quotation GROUP BY status) x;
SELECT 'sales_order_min_status', min(n) FROM (SELECT count(*) n FROM sd_sales_order GROUP BY status) x;
SELECT 'outbound_min_status', min(n) FROM (SELECT count(*) n FROM sd_sales_outbound GROUP BY status) x;
SELECT 'inbound_min_status', min(n) FROM (SELECT count(*) n FROM scm_inbound_order GROUP BY status) x;
SELECT 'inbound_min_type', min(n) FROM (SELECT count(*) n FROM scm_inbound_order GROUP BY inbound_type) x;
