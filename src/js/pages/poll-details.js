import '../page-init.js';

import { getSupabaseClient } from '../services/supabase.js';

const root = document.getElementById('poll-details-root');
const messageBox = document.getElementById('poll-details-message');
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

function renderPoll(poll) {
  const optionsMarkup = (poll.options ?? [])
    .map(
      (option) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span>${option.option_text}</span>
          <span class="badge text-bg-primary rounded-pill">${option.vote_count ?? 0} votes</span>
        </li>
      `,
    )
    .join('');

  const imageMarkup = poll.image_url
    ? `<img src="${poll.image_url}" alt="${poll.title}" class="img-fluid rounded-4 mb-4" />`
    : '';

  if (!root) {
    return;
  }

  root.innerHTML = `
    <article>
      <a class="btn btn-outline-secondary btn-sm mb-4" href="/explore-polls.html">Back to polls</a>
      ${imageMarkup}
      <div class="d-flex align-items-center gap-2 mb-3">
        <span class="badge ${poll.is_public ? 'text-bg-success' : 'text-bg-secondary'}">${poll.is_public ? 'Public' : 'Private'}</span>
        <small class="text-secondary">Created ${new Date(poll.created_at).toLocaleString()}</small>
      </div>
      <h1 class="h3 mb-3">${poll.title}</h1>
      <p class="text-secondary mb-4">${poll.description}</p>
      <h2 class="h5 mb-3">Options</h2>
      <ul class="list-group mb-4">${optionsMarkup}</ul>
    </article>
  `;
}

async function loadPoll() {
  if (!supabase) {
    showMessage('Supabase is not configured. Check your .env file and restart Vite.', 'danger');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const pollId = params.get('id');

  if (!pollId) {
    showMessage('No poll ID was provided.', 'warning');
    return;
  }

  const { data, error } = await supabase
    .from('polls')
    .select('id, title, description, image_url, is_public, created_at, options(id, option_text, vote_count)')
    .eq('id', pollId)
    .single();

  if (error) {
    showMessage(error.message, 'danger');
    return;
  }

  renderPoll(data);
}

loadPoll();
