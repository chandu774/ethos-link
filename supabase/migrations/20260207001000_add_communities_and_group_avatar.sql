-- Add avatar_url to groups
ALTER TABLE public.groups
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create communities table for real community data
CREATE TABLE IF NOT EXISTS public.communities (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text,
  color text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view communities"
ON public.communities FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_communities_updated_at
BEFORE UPDATE ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
