// Import your configured Supabase client
// (Adjust this path to where your actual Supabase configuration is initialized)
import { supabase } from '../supabase.js'; 

const adminContent = document.getElementById('admin-content');
const adminMessage = document.getElementById('admin-message');
const pollsTableBody = document.getElementById('admin-polls-table-body');
const totalPollsCount = document.getElementById('total-polls-count');
const totalUsersCount = document.getElementById('total-users-count');

// Initialize Admin View
async function initAdmin() {
  // 1. Check user authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    showError('Access denied. Please log in to view the Admin panel.');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 2000);
    return;
  }

  // OPTIONAL: If you have an admin flag on user metadata or a profiles table:
  // const isAdmin = user.user_metadata?.role === 'admin';
  // if (!isAdmin) { ... handle access restriction ... }

  // 2. Load Dashboard Data
  adminContent.classList.remove('d-none');
  await fetchAndRenderPolls();
}

// Fetch all polls from Supabase
async function fetchAndRenderPolls() {
  try {
    const { data: polls, error } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderPollsTable(polls);
    totalPollsCount.textContent = polls.length;
    
    // Simulate user count (or fetch unique user profiles if you have a profiles table)
    const uniqueCreators = new Set(polls.map(p => p.user_id));
    totalUsersCount.textContent = uniqueCreators.size;

  } catch (error) {
    showError(`Failed to fetch dashboard data: ${error.message}`);
  }
}

// Render dynamic table rows
function renderPollsTable(polls) {
  pollsTableBody.innerHTML = '';

  if (polls.length === 0) {
    pollsTableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No polls found.</td></tr>`;
    return;
  }

  polls.forEach(poll => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <a href="/poll-details.html?id=${poll.id}" class="fw-bold text-decoration-none text-dark">${escapeHtml(poll.title)}</a>
      </td>
      <td><span class="text-muted text-truncate d-inline-block" style="max-width: 150px;">${poll.user_id}</span></td>
      <td>
        <span class="badge ${poll.is_public ? 'bg-success' : 'bg-secondary'}">
          ${poll.is_public ? 'Public' : 'Private'}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger delete-poll-btn" data-id="${poll.id}">
          Delete
        </button>
      </td>
    `;
    pollsTableBody.appendChild(row);
  });

  // Attach delete event listeners
  document.querySelectorAll('.delete-poll-btn').forEach(button => {
    button.addEventListener('click', handleDeletePoll);
  });
}

// Handle deleting a poll
async function handleDeletePoll(e) {
  const pollId = e.target.getAttribute('data-id');
  if (!confirm('Are you sure you want to permanently delete this poll?')) return;

  try {
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (error) throw error;

    showSuccess('Poll successfully deleted.');
    await fetchAndRenderPolls(); // Refresh the view
  } catch (error) {
    showError(`Failed to delete poll: ${error.message}`);
  }
}

// UI helper messages
function showError(message) {
  adminMessage.className = 'alert alert-danger';
  adminMessage.textContent = message;
  adminMessage.classList.remove('d-none');
}

function showSuccess(message) {
  adminMessage.className = 'alert alert-success';
  adminMessage.textContent = message;
  adminMessage.classList.remove('d-none');
  setTimeout(() => adminMessage.classList.add('d-none'), 3000);
}

// Helper utility to avoid XSS injections
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Run setup on load
document.addEventListener('DOMContentLoaded', initAdmin);