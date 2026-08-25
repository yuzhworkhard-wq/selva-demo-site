// ===== Navigation =====
function goPage(page, opts) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-page], #workspace-nav .nav-item[data-ws-section]').forEach(n => {
    n.classList.remove('active');
    n.removeAttribute('aria-current');
  });
  const el = document.getElementById('page-' + page);
  if (el) { el.classList.add('active'); el.classList.add('fade-in'); }
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) {
    nav.classList.add('active');
    nav.setAttribute('aria-current', 'page');
  }

  if (page === 'projects') renderProjects();
  if (page === 'dashboard') renderDashboard();
  if (page === 'folder') renderFolder();
  if (page === 'workspace') renderWorkspace();
  if (page === 'viral-library') {
    /* 视频生成「查看全部」已经在子应用里打开库页并带上 TikTok/Kwai。
       这里只高亮侧栏，不要再发 selva-hot-library-open，否则会把渠道打回 TikTok。 */
    if (opts && opts.skipViralLibraryEmbed) {
      const overlay = typeof ensureCloneFrame === 'function' ? ensureCloneFrame() : document.getElementById('cloneToolOverlay');
      if (overlay) overlay.style.display = 'block';
    } else {
      openViralLibraryTool();
    }
  }
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
