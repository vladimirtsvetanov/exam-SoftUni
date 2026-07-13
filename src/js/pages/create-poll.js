import '../page-init.js';

import { getSupabaseClient } from '../services/supabase.js';

const form = document.getElementById('poll-form');
const addOptionButton = document.getElementById('add-option-btn');
const optionsList = document.getElementById('poll-options-list');
const messageBox = document.getElementById('poll-form-message');
const supabase = getSupabaseClient();
let optionCounter = 2;

function createOptionField(index) {
  const wrapper = document.createElement('div');
  wrapper.className = 'poll-option-item';
  wrapper.innerHTML = `
    <label class="form-label" for="poll-option-${index}">Option ${index}</label>
    <input class="form-control poll-option-input" id="poll-option-${index}" type="text" required minlength="1" />
  `;

  return wrapper;
}

function showMessage(message, type = 'success') {
  if (!messageBox) {
    alert(message);
    return;
  }

  messageBox.className = `alert alert-${type}`;
  messageBox.textContent = message;
  messageBox.classList.remove('d-none');
}

addOptionButton?.addEventListener('click', () => {
  optionCounter += 1;
  optionsList?.appendChild(createOptionField(optionCounter));
});

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
  const isPublic = document.getElementById('poll-public').checked;
  const optionInputs = Array.from(document.querySelectorAll('.poll-option-input'));
  const optionTexts = optionInputs.map((input) => input.value.trim()).filter(Boolean);
  const imageInput = document.getElementById('poll-image');
  const imageFile = imageInput?.files?.[0] ?? null;

  if (optionTexts.length < 2) {
    showMessage('Please add at least 2 options.', 'warning');
    return;
  }

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

  const optionsPayload = optionTexts.map((optionText) => ({
    poll_id: poll.id,
    option_text: optionText,
  }));

  const { error: optionsError } = await supabase.from('options').insert(optionsPayload);

  if (optionsError) {
    showMessage(optionsError.message, 'danger');
    return;
  }

  if (imageFile) {
    const fileExt = imageFile.name.split('.').pop() || 'jpg';
    const filePath = `${userResult.user.id}/${poll.id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('poll-images')
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('poll-images').getPublicUrl(filePath);

      await supabase
        .from('polls')
        .update({ image_url: publicUrlData.publicUrl })
        .eq('id', poll.id);
    }
  }

  form.reset();
  optionCounter = 2;
  optionsList.innerHTML = '';
  optionsList.appendChild(createOptionField(1));
  optionsList.appendChild(createOptionField(2));
  showMessage('Poll created successfully.', 'success');
});
