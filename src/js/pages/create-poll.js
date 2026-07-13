import '../page-init.js';

import { getSupabaseClient } from '../services/supabase.js';

const form = document.getElementById('poll-form');
const messageBox = document.getElementById('poll-form-message');
const supabase = getSupabaseClient();

function showMessage(message, type = 'success') {
  if (!messageBox) {
    alert(message);
    return;
  }

  messageBox.className = `alert alert-${type}`;
  messageBox.textContent = message;
  messageBox.classList.remove('d-none');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!supabase) {
    showMessage('Supabase is not configured. Check your .env file and restart Vite.', 'danger');
    return;
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    showMessage('You must be logged in to create a poll.', 'warning');
    window.location.href = '/login.html';
    return;
  }

  const title = document.getElementById('poll-title').value.trim();
  const description = document.getElementById('poll-description').value.trim();
  const option1 = document.getElementById('poll-option-1').value.trim();
  const option2 = document.getElementById('poll-option-2').value.trim();
  const isPublic = document.getElementById('poll-public').checked;

  const { data: poll, error: pollError } = await supabase
    .from('polls')
    .insert({
      title,
      description,
      is_public: isPublic,
      user_id: userResult.user.id,
      image_url: null,
    })
    .select()
    .single();

  if (pollError) {
    showMessage(pollError.message, 'danger');
    return;
  }

  const optionsPayload = [
    { poll_id: poll.id, option_text: option1 },
    { poll_id: poll.id, option_text: option2 },
  ];

  const { error: optionsError } = await supabase.from('options').insert(optionsPayload);

  if (optionsError) {
    showMessage(optionsError.message, 'danger');
    return;
  }

  form.reset();
  showMessage('Poll created successfully.', 'success');
});
