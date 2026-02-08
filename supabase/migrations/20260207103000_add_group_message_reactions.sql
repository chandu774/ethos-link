-- Add reply support for group messages
ALTER TABLE public.group_messages
ADD COLUMN IF NOT EXISTS reply_to_message_id uuid REFERENCES public.group_messages(id) ON DELETE SET NULL;

-- Create reactions table for group messages
CREATE TABLE IF NOT EXISTS public.group_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;

-- Members can view reactions for group messages
CREATE POLICY "Members can view group message reactions"
ON public.group_message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.user_id = auth.uid()
      AND group_members.group_id = (
        SELECT group_messages.group_id
        FROM public.group_messages
        WHERE group_messages.id = group_message_reactions.message_id
      )
  )
);

-- Members can react to group messages
CREATE POLICY "Members can react to group messages"
ON public.group_message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.user_id = auth.uid()
      AND group_members.group_id = (
        SELECT group_messages.group_id
        FROM public.group_messages
        WHERE group_messages.id = group_message_reactions.message_id
      )
  )
);

-- Members can remove their reactions
CREATE POLICY "Members can remove group message reactions"
ON public.group_message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for group message reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'group_message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_message_reactions;
  END IF;
END $$;
