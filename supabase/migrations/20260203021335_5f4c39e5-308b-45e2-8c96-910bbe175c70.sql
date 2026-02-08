-- Allow users to delete their own AI conversations
CREATE POLICY "Users can delete own AI conversations" 
ON public.ai_conversations 
FOR DELETE 
USING (auth.uid() = user_id);