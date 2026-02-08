-- Fix INPUT_VALIDATION: Add database-level validation constraints

-- Add length constraints for messages
ALTER TABLE public.messages 
ADD CONSTRAINT message_content_length_check 
CHECK (char_length(content) BETWEEN 1 AND 10000);

-- Add length constraints for group messages
ALTER TABLE public.group_messages 
ADD CONSTRAINT group_message_content_length_check 
CHECK (char_length(content) BETWEEN 1 AND 10000);

-- Add length constraint for profile name
ALTER TABLE public.profiles 
ADD CONSTRAINT profile_name_length_check 
CHECK (char_length(name) BETWEEN 1 AND 100);

-- Add length constraint for group name and description
ALTER TABLE public.groups 
ADD CONSTRAINT group_name_length_check 
CHECK (char_length(name) BETWEEN 1 AND 100);

ALTER TABLE public.groups 
ADD CONSTRAINT group_description_length_check 
CHECK (description IS NULL OR char_length(description) <= 500);

-- Create validation function for non-empty content (using trigger instead of CHECK for better flexibility)
CREATE OR REPLACE FUNCTION public.validate_non_empty_content()
RETURNS TRIGGER AS $$
BEGIN
  -- Reject if content is only whitespace
  IF NEW.content IS NOT NULL AND NEW.content ~ '^\s*$' THEN
    RAISE EXCEPTION 'Content cannot be empty or only whitespace';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply validation trigger to messages
CREATE TRIGGER validate_message_content_trigger
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.validate_non_empty_content();

-- Apply validation trigger to group_messages
CREATE TRIGGER validate_group_message_content_trigger
BEFORE INSERT OR UPDATE ON public.group_messages
FOR EACH ROW EXECUTE FUNCTION public.validate_non_empty_content();

-- Fix MISSING_RLS: Add DELETE policy for messages
-- Allow users to delete messages they sent or received
CREATE POLICY "Users can delete their messages"
ON public.messages FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);