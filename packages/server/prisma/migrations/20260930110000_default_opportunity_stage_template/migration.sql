-- This demo portal uses the Public opportunity-stage template. Parameter values are plain text;
-- consumers resolve the template code and treat an invalid/disabled code as no default.
INSERT INTO sys_parameter (id,tenant_id,application_id,parameter_code,parameter_name,parameter_value,usage_note,sort_no,status,version,created_by,updated_by,created_at,updated_at)
SELECT gen_random_uuid(),a.tenant_id,a.id,'OPPORTUNITY_STAGE_TEMPLATE','本系统使用的商机阶段模板','public',
       '填写商机阶段模板编码；新增商机和商机分析调用时解析可用模板，找不到则无默认值。当前 public 对应“公共”。',30,'ACTIVE',1,'migration','migration',now(),now()
FROM sys_application a WHERE a.application_code='demo-portal'
ON CONFLICT (tenant_id,application_id,parameter_code) DO UPDATE
SET parameter_value='public',status='ACTIVE',parameter_name=EXCLUDED.parameter_name,
    usage_note=EXCLUDED.usage_note,sort_no=30,version=sys_parameter.version+1,updated_by='migration',updated_at=now();

UPDATE sd_opp_template t SET is_default=(t.template_code='public'),updated_by='migration',updated_at=now(),version=t.version+1
FROM sys_application a WHERE a.id=t.application_id AND a.application_code='demo-portal'
  AND t.is_default IS DISTINCT FROM (t.template_code='public');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM sd_opp o
    JOIN sys_application a ON a.id=o.application_id AND a.application_code='demo-portal'
    LEFT JOIN sd_opp_template public_template ON public_template.application_id=o.application_id AND public_template.template_code='public'
    LEFT JOIN sd_opp_stage source_stage ON source_stage.id=o.stage_id
    LEFT JOIN sd_opp_stage target_stage ON target_stage.template_id=public_template.id AND target_stage.sort_no=source_stage.sort_no
    WHERE public_template.id IS NULL OR target_stage.id IS NULL
  ) THEN RAISE EXCEPTION 'PUBLIC_OPPORTUNITY_STAGE_MAPPING_INCOMPLETE'; END IF;
END $$;

-- Preserve each demo opportunity's stage position, amount, status and dates; change only template/stage references and snapshots.
UPDATE sd_opp o
SET template_id=public_template.id,template_name=public_template.template_name,
    stage_id=target_stage.id,stage_name=target_stage.stage_name,stage_probability=target_stage.probability,
    version=o.version+1,updated_by='migration',updated_at=now()
FROM sys_application a,sd_opp_template public_template,sd_opp_stage source_stage,sd_opp_stage target_stage
WHERE a.id=o.application_id AND a.application_code='demo-portal'
  AND public_template.application_id=a.id AND public_template.template_code='public'
  AND source_stage.id=o.stage_id AND target_stage.template_id=public_template.id AND target_stage.sort_no=source_stage.sort_no
  AND (o.template_id IS DISTINCT FROM public_template.id OR o.template_name IS DISTINCT FROM public_template.template_name
       OR o.stage_id IS DISTINCT FROM target_stage.id OR o.stage_name IS DISTINCT FROM target_stage.stage_name
       OR o.stage_probability IS DISTINCT FROM target_stage.probability);

-- Historical demo analysis records also reference stages; keep their stage snapshots consistent with the unified template.
UPDATE sd_opp_analysis analysis
SET stage_id=target_stage.id,stage_name=target_stage.stage_name,stage_probability=target_stage.probability
FROM sd_opp o,sys_application app,sd_opp_template public_template,sd_opp_stage source_stage,sd_opp_stage target_stage
WHERE o.id=analysis.opportunity_id AND app.id=o.application_id AND app.application_code='demo-portal'
  AND public_template.application_id=app.id AND public_template.template_code='public'
  AND source_stage.id=analysis.stage_id AND target_stage.template_id=public_template.id AND target_stage.sort_no=source_stage.sort_no
  AND (analysis.stage_id IS DISTINCT FROM target_stage.id OR analysis.stage_name IS DISTINCT FROM target_stage.stage_name
       OR analysis.stage_probability IS DISTINCT FROM target_stage.probability);
