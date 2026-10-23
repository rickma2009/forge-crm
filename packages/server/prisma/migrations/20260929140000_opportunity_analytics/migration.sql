-- Add a read-only analysis resource. Existing customer and opportunity records are unchanged.
INSERT INTO sys_page_resource (id,tenant_id,application_id,page_code,page_name,parent_id,page_type,route_path,icon_key,sort_no,status,version,created_by,updated_by,created_at,updated_at)
SELECT gen_random_uuid(),p.tenant_id,p.application_id,'opportunity-analytics','商机分析',p.parent_id,'PAGE','/showcase/opportunity-analysis','table',12,'ACTIVE',1,p.created_by,p.updated_by,now(),now()
FROM sys_page_resource p WHERE p.page_code='opportunity-directory'
ON CONFLICT (application_id,page_code) DO NOTHING;
INSERT INTO sys_permission (id,application_id,permission_code,permission_name,resource_code,action_code,source,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.application_id,v.code,v.name,'opportunity-analytics',v.action,'SYSTEM','ACTIVE',1,now(),now()
FROM sys_menu m CROSS JOIN (VALUES ('navigation.opportunity-analytics.access','访问商机分析','access'),('menu.opportunity-analytics.view','查看商机分析','view')) AS v(code,name,action)
WHERE m.menu_code='opportunity-directory'
ON CONFLICT (application_id,permission_code) DO NOTHING;
INSERT INTO sys_menu (id,system_code,application_id,access_permission_id,page_resource_id,menu_code,menu_name,node_type,parent_id,route_path,icon_key,sort_no,menu_type,open_type,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.system_code,m.application_id,p.id,r.id,'opportunity-analytics','商机分析','PAGE',m.parent_id,'/showcase/opportunity-analysis','table',12,'PAGE','INTERNAL','ACTIVE',1,now(),now()
FROM sys_menu m JOIN sys_permission p ON p.application_id=m.application_id AND p.permission_code='navigation.opportunity-analytics.access'
JOIN sys_page_resource r ON r.application_id=m.application_id AND r.page_code='opportunity-analytics'
WHERE m.menu_code='opportunity-directory'
ON CONFLICT (system_code,menu_code) DO NOTHING;
INSERT INTO sys_menu_action (id,menu_id,permission_id,action_code,action_name,action_type,sort_no,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.id,p.id,'view','查看','VIEW',10,'ACTIVE',1,now(),now()
FROM sys_menu m JOIN sys_permission p ON p.application_id=m.application_id AND p.permission_code='menu.opportunity-analytics.view'
WHERE m.menu_code='opportunity-analytics'
ON CONFLICT (menu_id,action_code) DO NOTHING;
INSERT INTO sys_page_button (id,page_id,button_code,button_name,button_type,sort_no,status,version,created_by,updated_by,created_at,updated_at)
SELECT gen_random_uuid(),p.id,'view','查看','TOOL',10,'ACTIVE',1,p.created_by,p.updated_by,now(),now()
FROM sys_page_resource p WHERE p.page_code='opportunity-analytics'
ON CONFLICT (page_id,button_code) DO NOTHING;
-- Business roles opt in through existing role management; auto-register only the system manager.
INSERT INTO sys_role_permission (id,role_id,application_id,permission_id,status,version,created_at,updated_at)
SELECT gen_random_uuid(),r.id,r.application_id,p.id,'ACTIVE',1,now(),now()
FROM sys_role r JOIN sys_permission p ON p.application_id=r.application_id AND p.resource_code='opportunity-analytics'
WHERE r.role_code='system-manager' AND r.status='ACTIVE'
ON CONFLICT (role_id,permission_id) DO NOTHING;
