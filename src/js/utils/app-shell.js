export function setupAppShell() {
  document.documentElement.classList.add('js-enabled');

  renderSiteHeader();
}

function renderSiteHeader() {
  const currentPath = window.location.pathname;
  const activePage = getActivePage(currentPath);

  const existingHeader = document.querySelector('.site-header');
  if (existingHeader) {
    updateHeaderLinks(existingHeader, activePage);
    return;
  }

  const header = document.createElement('header');
  header.className = 'site-header border-bottom';
  header.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark container py-3">
      <div class="d-flex align-items-center gap-3">
        <a class="navbar-brand fw-bold" href="/index.html">Poll System</a>
      </div>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="mainNav">
        <ul class="navbar-nav ms-auto gap-lg-2">
          <li class="nav-item"><a class="nav-link" href="/index.html">Home</a></li>
          <li class="nav-item"><a class="nav-link" href="/explore-polls.html">Explore Polls</a></li>
          <li class="nav-item"><a class="nav-link" href="/login.html">Login</a></li>
          <li class="nav-item"><a class="nav-link" href="/register.html">Register</a></li>
          <li class="nav-item"><a class="nav-link" href="/create-poll.html">Create Poll</a></li>
          <li class="nav-item"><a class="nav-link" href="/admin.html">Admin</a></li>
        </ul>
      </div>
    </nav>
  `;

  const main = document.querySelector('main');
  document.body.insertBefore(header, main || document.body.firstChild);
  updateHeaderLinks(header, activePage);
}

function updateHeaderLinks(header, activePage) {
  header.querySelectorAll('.nav-link').forEach((link) => {
    const isActive = link.getAttribute('href') === `/${activePage}.html`;
    link.classList.toggle('active', isActive);
  });
}

function getActivePage(pathname) {
  if (pathname === '/' || pathname === '/index.html') {
    return 'index';
  }

  const lastSegment = pathname.split('/').filter(Boolean).pop() || 'index.html';
  return lastSegment.replace('.html', '');
}
