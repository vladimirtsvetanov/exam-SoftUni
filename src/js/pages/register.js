import '../page-init.js';

import { getSupabaseClient } from '../services/supabase.js';

const form = document.getElementById('register-form');
const supabase = getSupabaseClient();

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  if (!supabase) {
    alert('Supabase is not configured. Check your .env file and restart Vite.');
    return;
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = '/login.html';
});
