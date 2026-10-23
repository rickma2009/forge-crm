-- Reserve the media-detection menu and three honest description-only page entries.
INSERT INTO sys_page_resource (id,tenant_id,application_id,page_code,page_name,parent_id,page_type,route_path,icon_key,sort_no,status,version,created_by,updated_by,created_at,updated_at)
SELECT gen_random_uuid(),p.tenant_id,p.application_id,'image-video-detection','图片视频检测',p.parent_id,'MODULE',NULL,'resource',35,'ACTIVE',1,p.created_by,p.updated_by,now(),now()
FROM sys_page_resource p WHERE p.page_code='inventory-management'
ON CONFLICT (application_id,page_code) DO NOTHING;

INSERT INTO sys_permission (id,application_id,permission_code,permission_name,resource_code,action_code,source,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.application_id,'navigation.image-video-detection.access','访问图片视频检测','image-video-detection','access','SYSTEM','ACTIVE',1,now(),now()
FROM sys_menu m WHERE m.menu_code='inventory-management'
ON CONFLICT (application_id,permission_code) DO NOTHING;

INSERT INTO sys_menu (id,system_code,application_id,access_permission_id,page_resource_id,menu_code,menu_name,node_type,parent_id,route_path,icon_key,sort_no,menu_type,open_type,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.system_code,m.application_id,p.id,r.id,'image-video-detection','图片视频检测','GROUP',NULL,NULL,'resource',35,'GROUP','INTERNAL','ACTIVE',1,now(),now()
FROM sys_menu m
JOIN sys_permission p ON p.application_id=m.application_id AND p.permission_code='navigation.image-video-detection.access'
JOIN sys_page_resource r ON r.application_id=m.application_id AND r.page_code='image-video-detection'
WHERE m.menu_code='inventory-management'
ON CONFLICT (system_code,menu_code) DO NOTHING;

INSERT INTO sys_page_resource (id,tenant_id,application_id,page_code,page_name,parent_id,page_type,route_path,icon_key,sort_no,status,version,created_by,updated_by,created_at,updated_at)
SELECT gen_random_uuid(),r.tenant_id,r.application_id,v.code,v.name,r.id,'PAGE',v.path,'resource',v.sort_no,'ACTIVE',1,r.created_by,r.updated_by,now(),now()
FROM sys_page_resource r CROSS JOIN (VALUES
  ('image-detection','图片检测','/showcase/media/image-detection',10),
  ('moving-object-recognition','移动物品识别','/showcase/media/moving-object-recognition',20),
  ('video-action-recognition','视频动作识别','/showcase/media/video-action-recognition',30)
) AS v(code,name,path,sort_no)
WHERE r.page_code='image-video-detection'
ON CONFLICT (application_id,page_code) DO NOTHING;

INSERT INTO sys_permission (id,application_id,permission_code,permission_name,resource_code,action_code,source,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.application_id,v.prefix || v.code || v.suffix,v.permission_name,v.code,v.action,'SYSTEM','ACTIVE',1,now(),now()
FROM sys_menu m CROSS JOIN (VALUES
  ('image-detection','访问图片检测','access','navigation.','.access'),
  ('image-detection','查看图片检测','view','menu.','.view'),
  ('moving-object-recognition','访问移动物品识别','access','navigation.','.access'),
  ('moving-object-recognition','查看移动物品识别','view','menu.','.view'),
  ('video-action-recognition','访问视频动作识别','access','navigation.','.access'),
  ('video-action-recognition','查看视频动作识别','view','menu.','.view')
) AS v(code,permission_name,action,prefix,suffix)
WHERE m.menu_code='image-video-detection'
ON CONFLICT (application_id,permission_code) DO NOTHING;

INSERT INTO sys_menu (id,system_code,application_id,access_permission_id,page_resource_id,menu_code,menu_name,node_type,parent_id,route_path,icon_key,sort_no,menu_type,open_type,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.system_code,m.application_id,p.id,r.id,r.page_code,r.page_name,'PAGE',m.id,r.route_path,'resource',r.sort_no,'PAGE','INTERNAL','ACTIVE',1,now(),now()
FROM sys_menu m
JOIN sys_page_resource r ON r.application_id=m.application_id AND r.parent_id=m.page_resource_id
JOIN sys_permission p ON p.application_id=m.application_id AND p.permission_code='navigation.' || r.page_code || '.access'
WHERE m.menu_code='image-video-detection'
ON CONFLICT (system_code,menu_code) DO NOTHING;

INSERT INTO sys_menu_action (id,menu_id,permission_id,action_code,action_name,action_type,sort_no,status,version,created_at,updated_at)
SELECT gen_random_uuid(),m.id,p.id,'view','查看','VIEW',10,'ACTIVE',1,now(),now()
FROM sys_menu m JOIN sys_permission p ON p.application_id=m.application_id AND p.permission_code='menu.' || m.menu_code || '.view'
WHERE m.menu_code IN ('image-detection','moving-object-recognition','video-action-recognition')
ON CONFLICT (menu_id,action_code) DO NOTHING;

INSERT INTO sys_page_button (id,page_id,button_code,button_name,button_type,sort_no,status,version,created_by,updated_by,created_at,updated_at)
SELECT gen_random_uuid(),p.id,'view','查看','TOOL',10,'ACTIVE',1,p.created_by,p.updated_by,now(),now()
FROM sys_page_resource p WHERE p.page_code IN ('image-detection','moving-object-recognition','video-action-recognition')
ON CONFLICT (page_id,button_code) DO NOTHING;

INSERT INTO sys_role_permission (id,role_id,application_id,permission_id,status,version,created_at,updated_at)
SELECT gen_random_uuid(),r.id,r.application_id,p.id,'ACTIVE',1,now(),now()
FROM sys_role r JOIN sys_permission p ON p.application_id=r.application_id
WHERE r.role_code='system-manager' AND r.status='ACTIVE'
  AND p.resource_code IN ('image-video-detection','image-detection','moving-object-recognition','video-action-recognition')
ON CONFLICT (role_id,permission_id) DO NOTHING;
