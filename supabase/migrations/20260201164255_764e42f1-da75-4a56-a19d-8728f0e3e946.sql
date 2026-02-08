-- Create enum for user mode
CREATE TYPE public.user_mode AS ENUM ('professional', 'personal');

-- Create enum for connection status
CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mode user_mode NOT NULL DEFAULT 'professional',
  interests TEXT[] DEFAULT '{}',
  mindset_traits JSONB DEFAULT '{"curiosity": 50, "depth": 50, "risk": 50, "empathy": 50}',
  trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
  joined_communities TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create connections table
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  community_id TEXT, -- For personal mode connections within communities
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI conversations table for mindset discovery
CREATE TABLE public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Connections policies
CREATE POLICY "Users can view their connections" 
ON public.connections FOR SELECT 
TO authenticated 
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create connection requests" 
ON public.connections FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update connections they're part of" 
ON public.connections FOR UPDATE 
TO authenticated 
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own connection requests" 
ON public.connections FOR DELETE 
TO authenticated 
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Messages policies
CREATE POLICY "Users can view their messages" 
ON public.messages FOR SELECT 
TO authenticated 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" 
ON public.messages FOR UPDATE 
TO authenticated 
USING (auth.uid() = receiver_id);

-- AI conversations policies
CREATE POLICY "Users can view own AI conversations" 
ON public.ai_conversations FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI conversations" 
ON public.ai_conversations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own AI conversations" 
ON public.ai_conversations FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_connections_updated_at
BEFORE UPDATE ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
BEFORE UPDATE ON public.ai_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, mindset_traits, trust_score)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    '{"curiosity": 50, "depth": 50, "risk": 50, "empathy": 50}',
    50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to check if users are connected
CREATE OR REPLACE FUNCTION public.are_users_connected(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
    AND ((requester_id = user1_id AND receiver_id = user2_id)
      OR (requester_id = user2_id AND receiver_id = user1_id))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to calculate mindset similarity
CREATE OR REPLACE FUNCTION public.calculate_similarity(traits1 JSONB, traits2 JSONB)
RETURNS INTEGER AS $$
DECLARE
  curiosity_diff INTEGER;
  depth_diff INTEGER;
  risk_diff INTEGER;
  empathy_diff INTEGER;
  total_diff INTEGER;
BEGIN
  curiosity_diff := ABS(COALESCE((traits1->>'curiosity')::INTEGER, 50) - COALESCE((traits2->>'curiosity')::INTEGER, 50));
  depth_diff := ABS(COALESCE((traits1->>'depth')::INTEGER, 50) - COALESCE((traits2->>'depth')::INTEGER, 50));
  risk_diff := ABS(COALESCE((traits1->>'risk')::INTEGER, 50) - COALESCE((traits2->>'risk')::INTEGER, 50));
  empathy_diff := ABS(COALESCE((traits1->>'empathy')::INTEGER, 50) - COALESCE((traits2->>'empathy')::INTEGER, 50));
  
  total_diff := (curiosity_diff + depth_diff + risk_diff + empathy_diff) / 4;
  RETURN 100 - total_diff;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;