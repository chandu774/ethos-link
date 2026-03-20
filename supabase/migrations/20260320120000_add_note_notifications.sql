CREATE OR REPLACE FUNCTION public.notify_on_note_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.create_notification_for_group_members(
    NEW.group_id,
    NEW.user_id,
    'new_note',
    'New note uploaded: ' || NEW.title,
    jsonb_build_object('subject', NEW.subject, 'note_id', NEW.id),
    NULL,
    NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notes_notify_members ON public.notes;
CREATE TRIGGER notes_notify_members
AFTER INSERT ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_note_created();
