// ===== Navigation =====
function goPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page], #workspace-nav .nav-item[data-ws-section]').forEach(n => n.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); el.classList.add('fade-in'); }
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');

  if (page === 'projects') renderProjects();
  if (page === 'dashboard') renderDashboard();
  if (page === 'folder') renderFolder();
  if (page === 'workspace') renderWorkspace();
  if (page === 'library') renderLibrary();
  if (page === 'tasks') renderTaskCenter();
  if (page === 'assets-center') renderAssetsCenter();
  if (page === 'settings') renderSettingsPage();
  if (page === 'stats') renderStatsPage();
  if (page === 'effects') renderDataCenterPage();
  renderSidebarProjects();
  updateWorkspaceNav();
  renderWorkspaceNavSelection();
}

// ===== Filter =====
function setFilter(f) {
  projectFilter = f;
  document.querySelectorAll('[id^="filter-"]').forEach(b => {
    b.className = 'btn btn-ghost btn-sm';
    b.style.background = '';
    b.style.color = '';
  });
  document.getElementById('filter-' + f).style.background = '#7c3aed33';
  document.getElementById('filter-' + f).style.color = '#a78bfa';
  document.getElementById('filter-' + f).className = 'btn btn-sm';
  renderProjects();
}
