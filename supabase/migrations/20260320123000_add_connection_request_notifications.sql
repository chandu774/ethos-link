CREATE OR REPLACE FUNCTION public.notify_on_connection_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      content,
      metadata
    ) VALUES (
      NEW.receiver_id,
      'connection_request',
      'Someone sent you a connection request.',
      jsonb_build_object('connection_id', NEW.id, 'community_id', NEW.community_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_connection_request_notification_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'pending' THEN
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = NEW.receiver_id
      AND type = 'connection_request'
      AND metadata ->> 'connection_id' = NEW.id::text;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS connections_notify_receiver ON public.connections;
CREATE TRIGGER connections_notify_receiver
AFTER INSERT ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_connection_request();

DROP TRIGGER IF EXISTS connections_update_request_notification ON public.connections;
CREATE TRIGGER connections_update_request_notification
AFTER UPDATE ON public.connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_connection_request_notification_update();
