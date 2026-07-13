// 1. IMPORT PAGE INITIALIZATION FIRST to make sure the header always loads!
import '../page-init.js';
import { getSupabaseClient } from '../services/supabase.js'; 

// 2. Initialize the client instance
const supabase = getSupabaseClient();

// 3. Define your authorized admin emails here
const AUTHORIZED_ADMINS = ['admin@pollsystem.com', 'vladimircvetanov12@gmail.com']; 

const adminContent = document.getElementById('admin-content');
const adminMessage = document.getElementById('admin-message');
const pollsTableBody = document.getElementById('admin-polls-table-body');
const totalPollsCount = document.getElementById('total-polls-count');
const totalUsersCount = document.getElementById('total-users-count');

// Initialize Admin View with strict authorization check
async function initAdmin() {
  // A. Let page-init.js finish rendering the header/layout first 
  // We wrap our checks in a brief microtask/timeout to allow the DOM header to mount fully.
  setTimeout(async () => {
    // Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      showError('Access denied. Please log in to view the Admin panel.');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
      return;
    }

    // Check if the user's email is in the admin list
    if (!AUTHORIZED_ADMINS.includes(user.email)) {
      showError('Access denied. You do not have administrator privileges.');
      
      // Keep the admin content block hidden
      if (adminContent) {
        adminContent.classList.add('d-none'); 
      }
      
      // Redirect them back to the home page after 2.5 seconds
      setTimeout(() => {
        window.location.href = '/index.html';
      }, 2500);
      return;
    }

    // B. Load Dashboard Data only if they passed both checks
    if (adminContent) {
      adminContent.classList.remove('d-none');
    }
    await fetchAndRenderPolls();
  }, 50); // Small 50ms delay to let page-init.js safely inject the header
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
    
    // Calculate unique user count based on the creators of the polls
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
  setTimeout(() => adminMessage.className = 'd-none', 3000);
}

// Helper utility to avoid XSS injections
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Run setup on load
document.addEventListener('DOMContentLoaded', initAdmin);