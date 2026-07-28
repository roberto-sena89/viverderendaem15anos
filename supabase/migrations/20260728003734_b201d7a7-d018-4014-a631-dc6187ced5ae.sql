CREATE TABLE public.chat_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_mensagens TO authenticated;
GRANT ALL ON public.chat_mensagens TO service_role;

ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages"
  ON public.chat_mensagens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_mensagens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages"
  ON public.chat_mensagens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX chat_mensagens_user_created_idx ON public.chat_mensagens (user_id, created_at);