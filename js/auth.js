// Inloggen met e-mail en wachtwoord.
// Was eerst een magic link, maar een link in Mail opent nooit de geïnstalleerde app op het beginscherm
// (en op iPhone soms zelfs een aparte opslag): met een wachtwoord log je rechtstreeks in de app zelf in.
import { supabase } from './db.js';

export async function huidigeSessie() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function login(email, wachtwoord) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: wachtwoord });
  if (error) throw error;
}

// Stuurt een mail met een link om een (nieuw) wachtwoord in te stellen. Werkt zowel voor het allereerste
// wachtwoord (voor accounts die nog van vóór de omschakeling komen) als om een vergeten wachtwoord te resetten.
export async function stuurWachtwoordLink(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: location.origin + location.pathname,
  });
  if (error) throw error;
}

// Wordt aangeroepen op de pagina waar de link uit stuurWachtwoordLink naartoe leidt
export async function nieuwWachtwoord(wachtwoord) {
  const { error } = await supabase.auth.updateUser({ password: wachtwoord });
  if (error) throw error;
}

export async function uitloggen() {
  await supabase.auth.signOut();
}

// Na de eerste login: uitnodigingen op dit e-mailadres koppelen aan het account
export async function claimUitnodigingen() {
  await supabase.rpc('claim_memberships');
}
