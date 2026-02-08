-- Enforce one reaction per user per message (direct + group)

DO $$
BEGIN
  IF to_regclass('public.message_reactions') IS NOT NULL THEN
    -- Direct message reactions: keep most recent per (message_id, user_id)
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY message_id, user_id
          ORDER BY created_at DESC, id DESC
        ) AS rn
      FROM public.message_reactions
    )
    DELETE FROM public.message_reactions
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

    ALTER TABLE public.message_reactions
      DROP CONSTRAINT IF EXISTS message_reactions_message_id_user_id_emoji_key;
    ALTER TABLE public.message_reactions
      ADD CONSTRAINT message_reactions_message_id_user_id_key UNIQUE (message_id, user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.group_message_reactions') IS NOT NULL THEN
    -- Group message reactions: keep most recent per (message_id, user_id)
    WITH ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY message_id, user_id
          ORDER BY created_at DESC, id DESC
        ) AS rn
      FROM public.group_message_reactions
    )
    DELETE FROM public.group_message_reactions
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

    ALTER TABLE public.group_message_reactions
      DROP CONSTRAINT IF EXISTS group_message_reactions_message_id_user_id_emoji_key;
    ALTER TABLE public.group_message_reactions
      ADD CONSTRAINT group_message_reactions_message_id_user_id_key UNIQUE (message_id, user_id);
  END IF;
END $$;
