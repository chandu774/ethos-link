-- Add UPDATE policies and ensure unique constraints for reactions

DO $$
BEGIN
  IF to_regclass('public.message_reactions') IS NOT NULL THEN
    -- Direct message reactions
    DROP POLICY IF EXISTS "users can insert their reaction" ON public.message_reactions;
    DROP POLICY IF EXISTS "users can update their reaction" ON public.message_reactions;
    DROP POLICY IF EXISTS "users can delete their reaction" ON public.message_reactions;

    CREATE POLICY "users can insert their reaction"
    ON public.message_reactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "users can update their reaction"
    ON public.message_reactions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

    CREATE POLICY "users can delete their reaction"
    ON public.message_reactions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.group_message_reactions') IS NOT NULL THEN
    -- Group message reactions
    DROP POLICY IF EXISTS "users can insert their group reaction" ON public.group_message_reactions;
    DROP POLICY IF EXISTS "users can update their group reaction" ON public.group_message_reactions;
    DROP POLICY IF EXISTS "users can delete their group reaction" ON public.group_message_reactions;

    CREATE POLICY "users can insert their group reaction"
    ON public.group_message_reactions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "users can update their group reaction"
    ON public.group_message_reactions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

    CREATE POLICY "users can delete their group reaction"
    ON public.group_message_reactions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;
