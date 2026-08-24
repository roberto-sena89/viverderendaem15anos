-- Migration: push_subscriptions
-- Assinaturas Web Push para notificações push server-side (VAPID).
-- Cada linha representa um dispositivo de um usuário.

CREATE TABLE public.push_subscriptions (
  endpoint text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keys jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para consultas por usuário
CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions (user_id);

-- Apenas o próprio usuário (ou service_role) pode ver suas assinaturas
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: usuário autenticado pode ver/inserir/deletar suas próprias assinaturas
CREATE POLICY "Users can view their own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role tem acesso total (usado pelo hook notificar-push)
GRANT ALL ON public.push_subscriptions TO service_role;
GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;