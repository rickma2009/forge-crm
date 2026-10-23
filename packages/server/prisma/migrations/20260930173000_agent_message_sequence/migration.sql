ALTER TABLE "sys_agent_message" ADD COLUMN "sequence" INTEGER;
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at, id) AS position
  FROM sys_agent_message
)
UPDATE sys_agent_message AS message SET sequence = ordered.position FROM ordered WHERE message.id = ordered.id;
ALTER TABLE "sys_agent_message" ALTER COLUMN "sequence" SET NOT NULL;
ALTER TABLE "sys_agent_message" ALTER COLUMN "sequence" SET DEFAULT 0;
CREATE UNIQUE INDEX "sys_agent_msg_sequence_key" ON "sys_agent_message"("conversation_id", "sequence");
