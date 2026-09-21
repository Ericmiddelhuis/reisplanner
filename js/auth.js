// Inloggen met magic link (geen wachtwoorden)
import { supabase } from './db.js';

export async function huidigeSessie() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function stuurMagicLink(email) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    // Terug naar dezelfde pagina: werkt lokaal en op GitHub Pages
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw error;
}

export async function uitloggen() {
  await supabase.auth.signOut();
}

// Na de eerste login: uitnodigingen op dit e-mailadres koppelen aan het account
export async function claimUitnodigingen() {
  await supabase.rpc('claim_memberships');
}
