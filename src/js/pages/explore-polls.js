import '../page-init.js';

import { getSupabaseClient } from '../services/supabase.js';

const pollsList = document.getElementById('polls-list');
const messageBox = document.getElementById('polls-message');
const supabase = getSupabaseClient();

function showMessage(message, type = 'info') {
  if (!messageBox) {
    alert(message);
    return;
  }

  messageBox.className = `alert alert-${type}`;
  messageBox.textContent = message;
  messageBox.classList.remove('d-none');
}

function getCardBadge(poll) {
  return poll.is_public
    ? '<span class="badge text-bg-success">Public</span>'
    : '<span class="badge text-bg-secondary">Private</span>';
}

function renderPollCard(poll) {
  const options = poll.options ?? [];
  const optionCount = options.length;
  const imageHtml = poll.image_url
    ? `<img src="${poll.image_url}" class="card-img-top explore-poll-image" alt="${poll.title}" />`
    : '';

  const optionsPreview = options
    .slice(0, 4)
    .map((option) => `<li class="list-group-item px-0 border-0">${option.option_text}</li>`)
    .join('');

  return `
    <div class="col-12 col-md-6 col-xl-4">
      <article class="card h-100 shadow-sm border-0 overflow-hidden">
        ${imageHtml}
        <div class="card-body d-flex flex-column">
          <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
            ${getCardBadge(poll)}
            <small class="text-secondary">${new Date(poll.created_at).toLocaleDateString()}</small>
          </div>
          <h2 class="h5 card-title">${poll.title}</h2>
          <p class="card-text text-secondary flex-grow-1">${poll.description}</p>
          <div class="small text-secondary mb-2">${optionCount} option${optionCount === 1 ? '' : 's'}</div>
          <ul class="list-unstyled mb-3">${optionsPreview}</ul>
          <a class="btn btn-outline-primary mt-auto" href="/poll-details.html?id=${poll.id}">View poll</a>
        </div>
      </article>
    </div>
  `;
}

async function loadPolls() {
  if (!supabase) {
    showMessage('Supabase is not configured. Check your .env file and restart Vite.', 'danger');
    return;
  }

  const { data, error } = await supabase
    .from('polls')
    .select('id, title, description, image_url, is_public, created_at, options(id, option_text, vote_count)')
    .order('created_at', { ascending: false });

  if (error) {
    showMessage(error.message, 'danger');
    return;
  }

  if (!data?.length) {
    showMessage('No polls found yet. Be the first to create one.', 'info');
    return;
  }

  pollsList.innerHTML = data.map(renderPollCard).join('');
}

loadPolls();
