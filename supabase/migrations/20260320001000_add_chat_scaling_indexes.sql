-- Chat/read-path indexes to improve scalability for high message volume

-- Conversation pagination in direct chat:
-- WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
-- ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS messages_sender_receiver_created_idx
ON public.messages (sender_id, receiver_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_sender_created_idx
ON public.messages (receiver_id, sender_id, created_at DESC);

-- Recent chats list:
-- WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS messages_sender_created_idx
ON public.messages (sender_id, created_at DESC);

CREATE INDEX IF NOT EXISTS messages_receiver_created_idx
ON public.messages (receiver_id, created_at DESC);

-- Frequent membership checks in policies and read-path queries.
CREATE INDEX IF NOT EXISTS group_members_group_user_idx
ON public.group_members (group_id, user_id);

CREATE INDEX IF NOT EXISTS group_members_user_group_idx
ON public.group_members (user_id, group_id);
