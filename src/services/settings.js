import { supabase } from "../services/supabaseClient";

export const loadAndApplyUserSettings = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!data) return null;

  // Apply theme + font globally
  document.documentElement.style.setProperty(
    "--font-scale",
    data.font_scale ?? 1
  );
  document.documentElement.dataset.theme = data.theme ?? "light";

  // Optional: expose AI tuning globally if you want
  window.__AI_SETTINGS__ = {
    judging_strength: data.judging_strength,
    feedback_level: data.feedback_level,
  };

  return data;
};
