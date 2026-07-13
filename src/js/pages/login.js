import '../page-init.js';

import { getSupabaseClient } from '../services/supabase.js';

const form = document.getElementById('login-form');
const supabase = getSupabaseClient();

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!supabase) {
    console.warn('Supabase is not configured yet.');
    return;
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = '/index.html';
});
