import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    if (!data.user.email_confirmed_at) {
      throw redirect({
        to: "/verificar-email",
        search: { email: data.user.email ?? undefined },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
