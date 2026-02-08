-- Ensure RLS is enabled for message reactions
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Recreate policies for message reactions
DROP POLICY IF EXISTS "Users can view reactions for their messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can react to their messages" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can remove their reactions" ON public.message_reactions;

CREATE POLICY "Users can view reactions for their messages"
ON public.message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.id = message_reactions.message_id
      AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
  )
);

CREATE POLICY "Users can react to their messages"
ON public.message_reactions FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages
    WHERE messages.id = message_reactions.message_id
      AND (messages.sender_id = auth.uid() OR messages.receiver_id = auth.uid())
  )
);

CREATE POLICY "Users can remove their reactions"
ON public.message_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
