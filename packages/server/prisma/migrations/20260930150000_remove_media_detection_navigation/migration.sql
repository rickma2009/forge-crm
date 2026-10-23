-- Retire the four placeholder media navigation resources. The media demo now lives outside this project.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM sys_menu child
    WHERE child.parent_id IN (
      SELECT id FROM sys_menu
      WHERE menu_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
    )
    AND child.menu_code NOT IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
  ) OR EXISTS (
    SELECT 1 FROM sys_page_resource child
    WHERE child.parent_id IN (
      SELECT id FROM sys_page_resource
      WHERE page_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
    )
    AND child.page_code NOT IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
  ) THEN
    RAISE EXCEPTION 'Media navigation contains additional child resources; review them before removal';
  END IF;
END $$;

DELETE FROM sys_role_permission
WHERE permission_id IN (
  SELECT id FROM sys_permission
  WHERE resource_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
);

DELETE FROM sys_menu_action
WHERE menu_id IN (
  SELECT id FROM sys_menu
  WHERE menu_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
);

DELETE FROM sys_page_button
WHERE page_id IN (
  SELECT id FROM sys_page_resource
  WHERE page_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
);

DELETE FROM sys_page_tab
WHERE page_id IN (
  SELECT id FROM sys_page_resource
  WHERE page_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
)
OR target_page_id IN (
  SELECT id FROM sys_page_resource
  WHERE page_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition')
);

DELETE FROM sys_menu
WHERE menu_code IN ('image-detection', 'moving-object-recognition', 'video-action-recognition');
DELETE FROM sys_menu WHERE menu_code = 'image-video-detection';

DELETE FROM sys_page_resource
WHERE page_code IN ('image-detection', 'moving-object-recognition', 'video-action-recognition');
DELETE FROM sys_page_resource WHERE page_code = 'image-video-detection';

DELETE FROM sys_permission
WHERE resource_code IN ('image-video-detection', 'image-detection', 'moving-object-recognition', 'video-action-recognition');

COMMIT;
