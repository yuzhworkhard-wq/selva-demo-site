// ===== Init =====
document.getElementById('current-avatar').textContent = currentUser.short;
document.getElementById('current-avatar').style.background = currentUser.color;
document.getElementById('current-name').textContent = currentUser.name;
document.getElementById('current-role').textContent = ROLES[currentUser.role].label;
renderDashboard();
renderSidebarProjects();
