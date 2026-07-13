import '../page-init.js';

import { getSupabaseClient } from '../services/supabase.js';

const root = document.getElementById('poll-details-root');
const messageBox = document.getElementById('poll-details-message');
const supabase = getSupabaseClient();
let currentPoll = null;

function showMessage(message, type = 'info') {
  if (!messageBox) {
    alert(message);
    return;
  }

  messageBox.className = `alert alert-${type}`;
  messageBox.textContent = message;
  messageBox.classList.remove('d-none');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderPoll(poll) {
  currentPoll = poll;

  const optionsMarkup = (poll.options ?? [])
    .map((option) => {
      const isUserChoice = poll.userVoteOptionId === option.id;

      return `
        <li class="list-group-item d-flex justify-content-between align-items-center">
          <span class="d-flex align-items-center gap-2">
            ${escapeHtml(option.option_text)}
            ${isUserChoice ? '<span class="badge text-bg-warning text-dark">Your answer</span>' : ''}
          </span>
          <span class="badge text-bg-primary rounded-pill">${option.vote_count ?? 0} votes</span>
        </li>
      `;
    })
    .join('');

  const imageMarkup = poll.image_url
    ? `<img src="${poll.image_url}" alt="${escapeHtml(poll.title)}" class="img-fluid rounded-4 mb-4" />`
    : '';

  const voteMessageMarkup = poll.voteMessage
    ? `<div class="alert alert-info mb-4">${escapeHtml(poll.voteMessage)}</div>`
    : '';

  const rememberedAnswerMarkup = poll.userVoteText
    ? `
      <div class="alert alert-success mb-4">
        <strong>Your saved answer:</strong> ${escapeHtml(poll.userVoteText)}
      </div>
    `
    : '';

  const voteFormMarkup = poll.canVote
    ? `
      <form id="vote-form" class="mb-4">
        <h2 class="h5 mb-3">Vote now</h2>
        <div class="d-grid gap-2 mb-3">
          ${(poll.options ?? [])
            .map(
              (option, index) => `
                <label class="border rounded-3 p-3 d-flex align-items-center gap-3">
                  <input class="form-check-input m-0" type="radio" name="poll-option" value="${option.id}" ${index === 0 ? 'required' : ''} />
                  <span>${escapeHtml(option.option_text)}</span>
                </label>
              `,
            )
            .join('')}
        </div>
        <button class="btn btn-primary" type="submit">Submit vote</button>
      </form>
    `
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
      <h1 class="h3 mb-3">${escapeHtml(poll.title)}</h1>
      <p class="text-secondary mb-4">${escapeHtml(poll.description)}</p>
      ${rememberedAnswerMarkup}
      ${voteMessageMarkup}
      ${voteFormMarkup}
      <h2 class="h5 mb-3">Current results</h2>
      <ul class="list-group mb-4">${optionsMarkup}</ul>
    </article>
  `;

  document.getElementById('vote-form')?.addEventListener('submit', handleVoteSubmit);
}

async function handleVoteSubmit(event) {
  event.preventDefault();

  if (!supabase || !currentPoll) {
    showMessage('Poll is not ready yet.', 'danger');
    return;
  }

  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult?.user) {
    showMessage('You need to log in before voting.', 'warning');
    window.location.href = '/login.html';
    return;
  }

  const selectedOption = document.querySelector('input[name="poll-option"]:checked');
  if (!selectedOption) {
    showMessage('Please choose an option before voting.', 'warning');
    return;
  }

  const { data: existingVote, error: existingVoteError } = await supabase
    .from('votes')
    .select('id, option_id, options(option_text)')
    .eq('poll_id', currentPoll.id)
    .eq('user_id', userResult.user.id)
    .maybeSingle();

  if (existingVoteError) {
    showMessage(existingVoteError.message, 'danger');
    return;
  }

  if (existingVote) {
    const existingVoteText = existingVote.options?.option_text ?? 'your previous choice';
    showMessage(`You already voted in this poll. Your answer was: ${existingVoteText}.`, 'info');
    await loadPoll();
    return;
  }

  const { error: voteError } = await supabase.from('votes').insert({
    poll_id: currentPoll.id,
    option_id: selectedOption.value,
    user_id: userResult.user.id,
  });

  if (voteError) {
    showMessage(voteError.message, 'danger');
    return;
  }

  showMessage('Your vote has been saved.', 'success');
  await loadPoll();
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

  const { data, error } = await supabase.rpc('get_poll_details_with_results', {
    p_poll_id: pollId,
  });

  if (error) {
    const fallbackPoll = await loadPollFallback(pollId);
    if (!fallbackPoll) {
      showMessage(error.message, 'danger');
      return;
    }

    renderPoll(fallbackPoll);
    return;
  }

  if (!data) {
    showMessage('Poll not found or you do not have access to it.', 'warning');
    return;
  }

  const hasSavedAnswer = Boolean(data.userVoteOptionId);

  renderPoll({
    ...data,
    canVote: !hasSavedAnswer,
    voteMessage: hasSavedAnswer
      ? `You already voted in this poll. Your answer was: ${data.userVoteText ?? 'your previous choice'}.`
      : 'Choose one option below and submit your vote.',
  });
}

async function loadPollFallback(pollId) {
  const { data: pollData, error: pollError } = await supabase
    .from('polls')
    .select('id, title, description, image_url, is_public, created_at, options(id, option_text, vote_count)')
    .eq('id', pollId)
    .single();

  if (pollError || !pollData) {
    return null;
  }

  const { data: userResult } = await supabase.auth.getUser();
  const userId = userResult?.user?.id ?? null;

  let userVoteOptionId = null;
  let userVoteText = '';

  if (userId) {
    const { data: existingVote } = await supabase
      .from('votes')
      .select('option_id, options(option_text)')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVote) {
      userVoteOptionId = existingVote.option_id;
      userVoteText = existingVote.options?.option_text ?? '';
    }
  }

  return {
    ...pollData,
    canVote: Boolean(userId && !userVoteOptionId),
    voteMessage: userId
      ? userVoteOptionId
        ? `You already voted in this poll. Your answer was: ${userVoteText || 'your previous choice'}.`
        : 'Choose one option below and submit your vote.'
      : 'Log in to vote on this poll.',
    userVoteOptionId,
    userVoteText,
  };
}

loadPoll();
