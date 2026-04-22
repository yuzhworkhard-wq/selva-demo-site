// ===== Render helpers =====
function visIcon(v) { return v === 'private' ? '🔒' : '🌐'; }
function roleBadge(r) {
  const map = { owner: ['拥有者','tag-owner'], editor: ['可编辑','tag-editor'], viewer: ['只读','tag-viewer'] };
  const [l,c] = map[r] || ['--',''];
  return `<span class="tag ${c}">${l}</span>`;
}
function systemRoleBadge(role) {
  return `<span class="tag tag-${role}">${ROLES[role] ? ROLES[role].label : role}</span>`;
}
function avatarStack(memberList, max=3) {
  // Support both [{userId}] and [string] formats
  const ids = memberList.map(m => typeof m === 'string' ? m : m.userId);
  const shown = ids.slice(0, max);
  const extra = ids.length - max;
  let html = '<div class="avatar-stack">';
  shown.forEach(uid => {
    const u = getUserById(uid);
    if (u) html += `<div class="mini-avatar" style="background:${u.color}" title="${u.name}">${u.short}</div>`;
  });
  if (extra > 0) html += `<div class="mini-avatar" style="background:#333">+${extra}</div>`;
  html += '</div>';
  return html;
}

// ===== Projects =====
function renderProjects() {
  const btnNewProj = document.getElementById('btn-new-project');
  if (btnNewProj) btnNewProj.style.display = ROLES[currentUser.role].canCreateProject ? '' : 'none';
  const q = (document.getElementById('project-search')?.value || '').toLowerCase();
  const industryFilter = document.getElementById('project-filter-industry')?.value || '';
  const mediaFilter = document.getElementById('project-filter-media')?.value || '';

  // Populate industry select from PROJECT_INDUSTRY_OPTIONS
  const industrySelect = document.getElementById('project-filter-industry');
  if (industrySelect && industrySelect.options.length <= 1) {
    PROJECT_INDUSTRY_OPTIONS.forEach(option => {
      const opt = document.createElement('option');
      opt.value = option.v;
      opt.textContent = option.l;
      industrySelect.appendChild(opt);
    });
  }

  let filtered = projects.filter(p => canSeeProject(p));
  if (projectFilter === 'my') filtered = filtered.filter(p => p.owner === currentUser.id);
  if (projectFilter === 'shared') filtered = filtered.filter(p => p.visibility === 'shared');
  if (q) filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q) || (p.client || '').toLowerCase().includes(q) || (p.product || '').toLowerCase().includes(q));
  if (industryFilter) filtered = filtered.filter(p => (p.industry || dcDeriveIndustry(p)) === industryFilter);
  if (mediaFilter) filtered = filtered.filter(p => p.media === mediaFilter);

  document.getElementById('projects-list').innerHTML = filtered.length ? filtered.map(p => {
    const myRole = getMyRoleInProject(p);
    const owner = getUserById(p.owner);
    const visibleFolders = p.folders.filter(f => canSeeFolder(f));
    return `
    <div class="project-card" onclick="openProject(${p.id})" oncontextmenu="showProjectContextMenu(event, ${p.id})">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="display:flex; gap:4px;">
          <span class="tag ${p.visibility === 'private' ? 'tag-private' : 'tag-shared'}">${visIcon(p.visibility)} ${p.visibility === 'private' ? '私有' : '共享'}</span>
          ${roleBadge(myRole)}
        </div>
        <button onclick="toggleProjectStar(${p.id}, event)" title="${isProjectStarred(p.id) ? '取消固定' : '固定到左侧导航'}" style="background:none; border:none; cursor:pointer; font-size:15px; padding:2px 4px; color:${isProjectStarred(p.id) ? '#f59e0b' : '#555'}; transition:color .15s;">${isProjectStarred(p.id) ? '★' : '☆'}</button>
      </div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="meta">
        <span class="count">📁 ${visibleFolders.length} 文件夹 ${avatarStack(p.members)}</span>
        <span>${p.updated}</span>
      </div>
      <div style="margin-top:8px; font-size:11px; color:#666;">
        创建者: ${owner ? owner.name : '未知'}
        ${p.visibleTo.type === 'groups' ? ' · 可见: ' + p.visibleTo.groups.map(g => getGroupById(g)?.name || g).join(', ') : ''}
      </div>
    </div>`;
  }).join('') : '<div style="color:#666; padding:40px; text-align:center;">暂无可见项目</div>';
}

function renderDashboard() {
  const visible = projects.filter(p => canSeeProject(p)).slice(0, 3);
  document.getElementById('dashboard-recent').innerHTML = visible.map(p => {
    const myRole = getMyRoleInProject(p);
    const owner = getUserById(p.owner);
    const visibleFolders = p.folders.filter(f => canSeeFolder(f));
    return `
    <div class="project-card" onclick="openProject(${p.id})">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <div style="display:flex; gap:4px;">
          <span class="tag ${p.visibility === 'private' ? 'tag-private' : 'tag-shared'}">${visIcon(p.visibility)} ${p.visibility === 'private' ? '私有' : '共享'}</span>
          ${roleBadge(myRole)}
        </div>
      </div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="meta">
        <span class="count">📁 ${visibleFolders.length} 文件夹 ${avatarStack(p.members)}</span>
        <span>${p.updated}</span>
      </div>
      <div style="margin-top:8px; font-size:11px; color:#666;">
        创建者: ${owner ? owner.name : '未知'}
        ${p.visibleTo.type === 'groups' ? ' · 可见: ' + p.visibleTo.groups.map(g => getGroupById(g)?.name || g).join(', ') : ''}
      </div>
    </div>`;
  }).join('');
}

function openProject(id) {
  currentProject = projects.find(p => p.id === id);
  currentFolder = null;
  updateWorkspaceNav();
  goPage('folder');
  renderSidebarProjects();
}

function updateWorkspaceNav() {
  const el = document.getElementById('workspace-nav');
  const inProjectContext = currentPage === 'folder' || currentPage === 'workspace';
  if (!currentProject || !currentFolder || !inProjectContext || !isProjectStarred(currentProject.id)) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  document.getElementById('ws-nav-dot').style.background = currentProject.color;
  document.getElementById('ws-nav-path').textContent = currentProject.name + ' / ' + currentFolder.name;
  renderWorkspaceNavSelection();
}

let projectListCollapsed = true;
function toggleProjectList() {
  projectListCollapsed = !projectListCollapsed;
  applyProjectListState();
}
function collapseProjectList() {
  if (!projectListCollapsed) {
    projectListCollapsed = true;
    applyProjectListState();
  }
}
function applyProjectListState() {
  const list = document.getElementById('project-list-collapsible');
  const arrow = document.getElementById('project-list-arrow');
  if (projectListCollapsed) {
    list.style.maxHeight = '0';
    arrow.classList.add('collapsed');
  } else {
    renderSidebarProjects();
    list.style.maxHeight = '500px';
    arrow.classList.remove('collapsed');
  }
}

// ===== Folder Generation History =====
function _getFolderTaskIds(folder) {
  if (!folder || !folder.files) return [];
  const ids = new Set();
  folder.files.forEach(f => { if (f.taskId) ids.add(f.taskId); });
  return [...ids];
}

function _getFolderTasks(folder) {
  const taskIds = _getFolderTaskIds(folder);
  return MOCK_TASKS.filter(t => taskIds.includes(t.id))
    .sort((a, b) => {
      const da = new Date(a.createdAt.replace(' ', 'T') + ':00');
      const db = new Date(b.createdAt.replace(' ', 'T') + ':00');
      return db - da;
    });
}

function _historyStatusDot(status) {
  const colors = { completed: '#4ade80', generating: '#60a5fa', failed: '#f87171', partial: '#fbbf24', draft: '#888' };
  const c = colors[status] || '#888';
  return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${c};flex-shrink:0;"></span>`;
}

function _historySourceIcon(source) {
  if (source === 'workflow') return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>';
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>';
}

function _historyOutputIcons(task) {
  const types = task.outputTypes || [];
  let html = '';
  if (types.includes('video')) html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#a78bfa;"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 9 5 3-5 3V9z"/></svg>';
  if (types.includes('script')) html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#60a5fa;"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
  if (types.includes('translation')) html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#4ade80;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
  if (types.includes('voice')) html += '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:#fbbf24;"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>';
  return html || '<span style="color:#555;">—</span>';
}

function shouldShowTaskOwnership(user = currentUser) {
  return getVisibleDataCenterUserIds(user).size > 1;
}

const TASK_OWNER_BY_NAME = {
  '新品发布-脚本确认': 'u2',
  '春季活动-多语言': 'u3',
  '消除游戏-脚本生成视频': 'u2',
  '口播视频-文案提取': 'u8',
  '新品发布-Veo31': 'u6',
  '消除游戏-清明节脚本': 'u4',
  '春季营销-Grok短视频': 'u8',
  '赚钱App-五语言翻译': 'u10',
  '品牌推广-Veo3.1首发': 'u8',
  '赚钱App-提现主题': 'u7',
  '消除游戏-双音色配音': 'u6',
  '春季营销-脚本视频联动': 'u8',
  '竞品-文案提取': 'u2',
  '消除游戏-Grok批量': 'u6',
  '品牌推广-双语字幕': 'u8',
  '多语言投放-印尼脚本': 'u7',
  '多语言投放-葡西联动': 'u3',
  '春季营销-竞品理解': 'u6',
  '消除游戏-母亲节脚本': 'u4',
  '赚钱App-Veo3.1测试': 'u10',
  '消除游戏-爆款模仿': 'u6',
  '品牌推广-旁白配音': 'u6',
  '春季营销-踏青主题': 'u8',
  '赚钱App-日语本地化': 'u10',
  '品牌推广-脚本视频联动': 'u8',
  '春季营销-Grok补量': 'u6',
  '海外竞品-文案提取': 'u3',
  '赚钱App-愚人节脚本': 'u7',
  '消除游戏-Grok首测': 'u4',
  '春季营销-甜美配音': 'u8',
  '赚钱App-竞品视频理解': 'u3',
  '消除游戏-儿童节预热脚本': 'u4',
};

function getTaskOwnerUser(task) {
  if (!task) return null;

  const explicitId = task.ownerId || task.creatorId || task.userId || task.requesterId || TASK_OWNER_BY_NAME[task.name];
  if (explicitId) {
    const explicitUser = getUserById(explicitId);
    if (explicitUser) {
      task.ownerId = explicitUser.id;
      return explicitUser;
    }
  }

  const creatorIds = [...getTaskCreatorIds(task.id)];
  if (creatorIds.length) {
    const nonAdmins = creatorIds.filter(id => getUserById(id)?.role !== 'superadmin');
    const resolvedId = nonAdmins[0] || creatorIds[0];
    const resolvedUser = getUserById(resolvedId);
    if (resolvedUser) {
      task.ownerId = resolvedUser.id;
      return resolvedUser;
    }
  }

  return null;
}

function getTaskOwnerUsers(task) {
  const owner = getTaskOwnerUser(task);
  return owner ? [owner] : [];
}

function renderTaskOwnerList(task, options = {}) {
  const owner = getTaskOwnerUser(task);
  const fontSize = options.fontSize || 11;
  const emptyLabel = options.emptyLabel || '未知用户';
  if (!owner) return `<span style="font-size:${fontSize}px; color:#666;">${emptyLabel}</span>`;

  return `
    <span style="display:inline-flex; align-items:center; gap:5px; padding:2px 8px 2px 5px; border-radius:999px; background:${owner.color}22; color:${owner.color}; font-size:${fontSize}px; white-space:nowrap;">
      <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; border-radius:50%; background:${owner.color}; color:#fff; font-size:10px;">${getUserInitial(owner)}</span>
      <span>${owner.name}</span>
    </span>`;
}

function renderTaskOwnerMeta(task, label = '归属用户') {
  return `<span style="display:inline-flex; align-items:center; gap:6px; flex-wrap:wrap;"><span style="color:#555;">${label}：</span>${renderTaskOwnerList(task, { fontSize: 11 })}</span>`;
}

function renderFolderHistory(folder) {
  const tasks = _getFolderTasks(folder);
  const generating = tasks.filter(t => t.status === 'generating');
  const history = tasks.filter(t => t.status !== 'generating');
  const showOwnership = shouldShowTaskOwnership();

  let html = '<div class="section-title" style="margin-bottom:14px;">生成历史';
  html += `<span style="font-size:12px; font-weight:400; color:#666; margin-left:8px;">${tasks.length} 条记录</span>`;
  html += '</div>';

  if (!tasks.length) {
    html += '<div style="background:#16161f; border:1px solid #1e1e2e; border-radius:12px; padding:32px; text-align:center; color:#555; font-size:13px;">暂无生成记录，使用工作流或工具箱开始创作</div>';
    return html;
  }

  // Active tasks (generating)
  if (generating.length) {
    html += '<div style="margin-bottom:16px;">';
    html += '<div style="font-size:12px; color:#60a5fa; margin-bottom:8px; display:flex; align-items:center; gap:6px;">';
    html += '<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#60a5fa;animation:taskPulse 1.6s ease-in-out infinite;"></span>';
    html += `进行中 (${generating.length})</div>`;
    generating.forEach(t => {
      html += _renderFolderHistoryRow(t, true);
    });
    html += '</div>';
  }

  // History table
  if (history.length) {
    html += '<div style="background:#16161f; border:1px solid #1e1e2e; border-radius:12px; overflow:hidden;">';
    html += '<table style="width:100%; border-collapse:collapse;">';
    html += '<thead><tr>';
    html += '<th style="text-align:left; font-size:11px; color:#555; padding:10px 14px; border-bottom:1px solid #1e1e2e; font-weight:500; text-transform:uppercase; letter-spacing:.5px;">任务</th>';
    html += '<th style="text-align:left; font-size:11px; color:#555; padding:10px 14px; border-bottom:1px solid #1e1e2e; font-weight:500; text-transform:uppercase; letter-spacing:.5px;">状态</th>';
    html += '<th style="text-align:left; font-size:11px; color:#555; padding:10px 14px; border-bottom:1px solid #1e1e2e; font-weight:500; text-transform:uppercase; letter-spacing:.5px;">来源</th>';
    if (showOwnership) html += '<th style="text-align:left; font-size:11px; color:#555; padding:10px 14px; border-bottom:1px solid #1e1e2e; font-weight:500; text-transform:uppercase; letter-spacing:.5px;">归属成员</th>';
    html += '<th style="text-align:left; font-size:11px; color:#555; padding:10px 14px; border-bottom:1px solid #1e1e2e; font-weight:500; text-transform:uppercase; letter-spacing:.5px;">产出</th>';
    html += '<th style="text-align:left; font-size:11px; color:#555; padding:10px 14px; border-bottom:1px solid #1e1e2e; font-weight:500; text-transform:uppercase; letter-spacing:.5px;">耗时</th>';
    html += '<th style="text-align:left; font-size:11px; color:#555; padding:10px 14px; border-bottom:1px solid #1e1e2e; font-weight:500; text-transform:uppercase; letter-spacing:.5px;">时间</th>';
    html += '<th style="width:40px; border-bottom:1px solid #1e1e2e;"></th>';
    html += '</tr></thead><tbody>';
    history.forEach(t => {
      html += _renderFolderHistoryTableRow(t, showOwnership);
    });
    html += '</tbody></table></div>';
  }

  // Link to task center
  html += '<div style="margin-top:12px; text-align:right;">';
  html += '<a style="font-size:12px; color:#a78bfa; cursor:pointer; text-decoration:none;" onclick="goPage(\'tasks\')">在任务中心查看全部 →</a>';
  html += '</div>';

  return html;
}

function _renderFolderHistoryRow(task, isActive) {
  const pulse = isActive ? 'animation:taskPulse 1.6s ease-in-out infinite;' : '';
  const ownerMeta = shouldShowTaskOwnership() ? `<span>${renderTaskOwnerMeta(task)}</span>` : '';
  return `
    <div style="background:#16161f; border:1px solid ${isActive ? '#3b82f633' : '#1e1e2e'}; border-radius:10px; padding:14px 16px; margin-bottom:8px; display:flex; align-items:center; gap:14px; cursor:pointer; transition:border-color .15s;" onclick="goToFolderTaskDetail('${task.id}')" onmouseenter="this.style.borderColor='#7c3aed'" onmouseleave="this.style.borderColor='${isActive ? '#3b82f633' : '#1e1e2e'}'">
      <div style="flex:1; min-width:0;">
        <div style="font-size:13px; font-weight:600; margin-bottom:3px; display:flex; align-items:center; gap:8px;">
          ${task.name}
          <span class="task-status ${getTaskStatusClass(task.status)}" style="${pulse}">${getTaskStatusLabel(task.status)}</span>
        </div>
        <div style="font-size:11px; color:#666; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="display:inline-flex; align-items:center; gap:4px;">${_historySourceIcon(task.source)} ${task.toolName}</span>
          <span>${task.outputSummary}</span>
          ${ownerMeta}
        </div>
      </div>
      <div style="text-align:right; flex-shrink:0;">
        <div style="font-size:11px; color:#888;">${task.createdAt}</div>
        ${task.duration && task.duration !== '—' ? '<div style="font-size:11px; color:#555; margin-top:2px;">' + task.duration + '</div>' : ''}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
}

function _renderFolderHistoryTableRow(task, showOwnership = false) {
  return `
    <tr style="cursor:pointer; transition:background .1s;" onclick="goToFolderTaskDetail('${task.id}')" onmouseenter="this.style.background='#1a1a2e'" onmouseleave="this.style.background=''">
      <td style="padding:12px 14px; border-bottom:1px solid #1e1e2e;">
        <div style="font-size:13px; font-weight:500;">${task.name}</div>
        <div style="font-size:11px; color:#555; margin-top:2px;">${task.id}</div>
      </td>
      <td style="padding:12px 14px; border-bottom:1px solid #1e1e2e;">
        <span style="display:inline-flex; align-items:center; gap:5px;">
          ${_historyStatusDot(task.status)}
          <span class="task-status ${getTaskStatusClass(task.status)}">${getTaskStatusLabel(task.status)}</span>
        </span>
      </td>
      <td style="padding:12px 14px; border-bottom:1px solid #1e1e2e;">
        <span style="display:inline-flex; align-items:center; gap:5px; font-size:12px; color:#999;">${_historySourceIcon(task.source)} ${task.toolName}</span>
      </td>
      ${showOwnership ? `<td style="padding:12px 14px; border-bottom:1px solid #1e1e2e;">${renderTaskOwnerList(task, { fontSize: 11 })}</td>` : ''}
      <td style="padding:12px 14px; border-bottom:1px solid #1e1e2e;">
        <div style="display:flex; align-items:center; gap:6px;">${_historyOutputIcons(task)}</div>
        <div style="font-size:11px; color:#666; margin-top:2px;">${task.outputSummary}</div>
      </td>
      <td style="padding:12px 14px; border-bottom:1px solid #1e1e2e; font-size:12px; color:#888; white-space:nowrap;">${task.duration}</td>
      <td style="padding:12px 14px; border-bottom:1px solid #1e1e2e; font-size:11px; color:#666; white-space:nowrap;">${task.createdAt}</td>
      <td style="padding:12px 14px; border-bottom:1px solid #1e1e2e;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </td>
    </tr>`;
}

function goToFolderTaskDetail(taskId) {
  currentTaskDetailId = taskId;
  _taskWfInitialized = false;
  const task = MOCK_TASKS.find(t => t.id === taskId);
  if (task && task.source === 'workflow' && task.workflowTemplate) {
    currentTaskDetailNodeId = null;
  } else {
    currentTaskDetailNodeId = null;
  }
  currentTaskOutputScopeKey = '';
  currentTaskOutputSelection = new Set();
  goPage('tasks');
}

// ===== Folder =====
function renderFolder() {
  if (!currentProject) return;
  updateWorkspaceNav();
  const bc = document.getElementById('breadcrumb');
  const title = document.getElementById('folder-title');
  const content = document.getElementById('folder-content');
  const actionsEl = document.getElementById('folder-actions');
  const myProjRole = getMyRoleInProject(currentProject);
  const canCreate = myProjRole === 'owner' || myProjRole === 'editor';

  if (!currentFolder) {
    bc.innerHTML = `<a onclick="goPage('projects')">项目空间</a> <span>/</span> <span>${currentProject.name}</span>
      <span class="tag ${currentProject.visibility === 'private' ? 'tag-private' : 'tag-shared'}" style="margin-left:8px;">${visIcon(currentProject.visibility)} ${currentProject.visibility === 'private' ? '私有' : '共享'}</span>`;
    title.textContent = currentProject.name;

    actionsEl.innerHTML = `
      ${canCreate ? '<button class="btn btn-ghost" onclick="showModal(\'folder\')">+ 新建文件夹</button>' : ''}
      ${myProjRole === 'owner' || ROLES[currentUser.role].canManageTeam ? '<button class="btn btn-ghost" onclick="showModal(\'edit-project\')">✏️ 编辑项目</button>' : ''}
      ${myProjRole === 'owner' || ROLES[currentUser.role].canManageTeam ? '<button class="btn btn-ghost" onclick="showModal(\'project-perm\')">⚙ 权限设置</button>' : ''}
    `;

    const visibleFolders = currentProject.folders.filter(f => canSeeFolder(f));
    content.innerHTML = visibleFolders.length ? `
      <div class="folder-grid">
        ${visibleFolders.map(f => {
          const myFolderRole = getMyRoleInFolder(f);
          return `
          <div class="folder-item" onclick="openFolder(${f.id})" oncontextmenu="showFolderContextMenu(event, ${f.id})" style="position:relative;">
            <span class="folder-icon">${f.visibility === 'private' ? '🔒' : '📂'}</span>
            <div style="flex:1;">
              <h4>${f.name}</h4>
              <small>${f.files.length} 个文件 · ${f.visibility === 'private' ? '私有' : '共享'}</small>
              <div style="margin-top:4px;">${avatarStack(f.members, 4)}</div>
            </div>
            <div style="position:absolute;bottom:8px;right:8px;">${roleBadge(myFolderRole)}</div>
          </div>`;
        }).join('')}
      </div>
    ` : '<div style="color:#666; padding:40px; text-align:center;">暂无可见文件夹</div>';
  } else {
    const myFolderRole = getMyRoleInFolder(currentFolder);
    bc.innerHTML = `<a onclick="goPage('projects')">项目空间</a> <span>/</span> <a onclick="currentFolder=null;goPage('folder');renderSidebarProjects();">${currentProject.name}</a> <span>/</span> <span>${currentFolder.name}</span>
      <span class="tag ${currentFolder.visibility === 'private' ? 'tag-private' : 'tag-shared'}" style="margin-left:8px;">${visIcon(currentFolder.visibility)} ${currentFolder.visibility === 'private' ? '私有' : '共享'}</span>
      ${roleBadge(myFolderRole)}`;
    title.textContent = currentFolder.name;

    const canEdit = myFolderRole === 'owner' || myFolderRole === 'editor';
    actionsEl.innerHTML = `
      ${canEdit ? '<button class="btn btn-ghost" onclick="showModal(\'edit-folder\')">✏️ 编辑文件夹</button>' : ''}
      ${myFolderRole === 'owner' || ROLES[currentUser.role].canManageTeam ? '<button class="btn btn-ghost" onclick="showModal(\'folder-perm\')">⚙ 权限设置</button>' : ''}
      ${canEdit ? '<button class="btn btn-primary" onclick="enterWorkspace()">开始创作 →</button>' : ''}
    `;

    content.innerHTML = `
      ${myFolderRole === 'viewer' ? '<div style="background:#f59e0b11; border:1px solid #f59e0b33; border-radius:8px; padding:12px; margin-bottom:16px; font-size:13px; color:#f59e0b;">你在此文件夹中为只读权限，无法编辑或创建内容</div>' : ''}
      <div style="margin-bottom:12px; font-size:12px; color:#666;">成员: ${currentFolder.members.map(uid => { const u = getUserById(uid); return u ? `<span class="tag tag-role" style="margin-right:4px;">${u.name} (${ROLES[u.role].label})</span>` : ''; }).join('')}</div>
      <div class="section-title" style="margin-bottom:12px;">创作工具</div>
      <div class="workflow-cards" style="margin-bottom:28px;">
        <div class="workflow-card" onclick="enterWorkspaceSection('workflow')">
          <div class="wf-icon">⚡</div>
          <h4>工作流</h4>
          <p>管理和运行自动化工作流</p>
        </div>
        <div class="workflow-card" onclick="enterWorkspaceSection('toolbox')">
          <div class="wf-icon">🧰</div>
          <h4>工具箱</h4>
          <p>AI 工具集合</p>
        </div>
      </div>
      ${renderFolderHistory(currentFolder)}
    `;
  }
}

function openFolder(id) {
  currentFolder = currentProject.folders.find(f => f.id === id);
  updateWorkspaceNav();
  goPage('folder');
  renderSidebarProjects();
}

function enterWorkspace() {
  if (!currentFolder) { alert('请先选择一个文件夹'); return; }
  workspaceSection = 'workflow';
  updateWorkspaceNav();
  goPage('workspace');
}

function enterWorkspaceSection(section) {
  if (!currentFolder) { alert('请先选择一个文件夹'); return; }
  workspaceSection = section;
  currentToolDetail = null;
  updateWorkspaceNav();
  goPage('workspace');
}

// ===== Workspace =====
function renderWorkspace() {
  if (!currentProject || !currentFolder) return;
  updateWorkspaceNav();
  const myRole = getMyRoleInFolder(currentFolder);
  const workflowBuckets = getFolderWorkflowBuckets(currentFolder);
  const generation = getFolderGenerationRecords(currentFolder);
  const canCreateWorkflow = canCreateFolderWorkflow(currentFolder);
  const canSeeAllJobs = canSeeAllFolderGeneration(currentFolder);
  document.getElementById('ws-breadcrumb').innerHTML = `<a onclick="goPage('projects')">项目空间</a> / <a onclick="currentFolder=null;goPage('folder');renderSidebarProjects();">${currentProject.name}</a> / <a onclick="goPage('folder')">${currentFolder.name}</a> / <span>工作台</span>`;
  document.getElementById('ws-title').textContent = currentFolder.name + ' - 工作台';
  document.getElementById('ws-subtitle').textContent = `${currentProject.name} / ${currentFolder.name}`;

  document.getElementById('ws-perm-notice').innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; background:#16161f; border:1px solid #1e1e2e; border-radius:10px; padding:12px 16px; font-size:13px;">
      <span>${visIcon(currentFolder.visibility)}</span>
      <span>${currentFolder.visibility === 'private' ? '私有文件夹 - 仅你可见' : '共享文件夹 - 团队协作中'}</span>
      <span style="margin-left:auto;">${roleBadge(myRole)}</span>
      ${avatarStack(currentFolder.members, 5)}
    </div>
  `;
  let sectionHtml = '';
  if (workspaceSection === 'workflow') {
    sectionHtml = `
      <div class="section-title">内置工作流模板</div>
      <div class="workflow-cards">
        ${WORKFLOW_TEMPLATES.map(wt => `
          <div class="workflow-card" onclick="openWorkflowCanvas('${wt.id}')">
            <div class="wf-icon">${wt.icon}</div>
            <h4>${wt.name}</h4>
            <p style="font-size:11px;color:#888;margin-top:4px;">${wt.desc}</p>
          </div>
        `).join('')}
      </div>

      <div class="section-title" style="margin-top:22px;">
        自定义工作流
        <div style="display:flex; gap:6px;">
          ${canCreateWorkflow ? '<button class="btn btn-ghost btn-sm" onclick="showModal(\'library-pick\')">📦 从资源库添加</button>' : ''}
          ${canCreateWorkflow ? '<button class="btn btn-primary btn-sm" onclick="showModal(\'workflow\')">+ 新建工作流</button>' : ''}
        </div>
      </div>

      <div style="margin-bottom:10px; font-size:12px; color:#666;">我的工作流 (${workflowBuckets.myMounted.length})</div>
      ${workflowBuckets.myMounted.length ? `
      <div class="workflow-cards" style="margin-bottom:14px;">
        ${workflowBuckets.myMounted.map(wf => `
          <div class="workflow-card" style="position:relative;" onclick="alert('启动：${wf.name}')">
            <div class="wf-icon">${wf.icon || '🔁'}</div>
            <h4>${wf.name}</h4>
            <p>${wf.desc || '无描述'}</p>
            <div style="margin-top:8px; display:flex; justify-content:center; gap:6px;">
              <span class="tag ${wf.scope === 'team' ? 'tag-shared' : 'tag-private'}">${wf.scope === 'team' ? '🌐 共享' : '🔒 个人'}</span>
            </div>
            <div style="margin-top:8px; text-align:center;">
              <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();unmountWorkflow('${wf.id}')" style="font-size:11px;">取消挂载</button>
            </div>
          </div>
        `).join('')}
      </div>` : '<div style="color:#666; padding:12px 0 18px;">暂无已挂载的个人工作流</div>'}

      <div style="margin-bottom:10px; font-size:12px; color:#666;">他人共享 (${workflowBuckets.otherMounted.length})</div>
      ${workflowBuckets.otherMounted.length ? `
      <div class="workflow-cards">
        ${workflowBuckets.otherMounted.map(wf => {
          const creator = getUserById(wf.creator);
          return `
          <div class="workflow-card" style="position:relative;" onclick="alert('启动：${wf.name}')">
            <div class="wf-icon">${wf.icon || '🤝'}</div>
            <h4>${wf.name}</h4>
            <p>${wf.desc || '无描述'}</p>
            <div style="margin-top:8px;"><span class="tag tag-shared">创建者: ${creator ? creator.name : wf.creator}</span></div>
            ${canCreateWorkflow ? `<div style="margin-top:8px; text-align:center;"><button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();unmountWorkflow('${wf.id}')" style="font-size:11px;">取消挂载</button></div>` : ''}
          </div>`;
        }).join('')}
      </div>` : '<div style="color:#666; padding:16px 0;">当前文件夹暂无他人共享的工作流</div>'}
    `;
  } else if (workspaceSection === 'toolbox') {
    if (currentToolDetail) {
      sectionHtml = renderToolDetailPage(currentToolDetail);
    } else {
      const contentTools = TOOLBOX_TOOLS.filter(t => t.category === 'content');
      const videoTools = TOOLBOX_TOOLS.filter(t => t.category === 'video');
      sectionHtml = `
        <div class="section-title">工具箱</div>
        <div style="margin-bottom:8px; font-size:12px; color:#666;">内容工具</div>
        <div class="tools-grid-new" style="margin-bottom:20px;">
          ${contentTools.map(t => `
            <div class="tool-card" onclick="openToolDetail('${t.id}')">
              <div class="tc-icon">${t.icon}</div>
              <div class="tc-name">${t.name}</div>
              <div class="tc-en">${t.en}</div>
              <div class="tc-desc">${t.desc}</div>
            </div>`).join('')}
        </div>
        <div style="margin-bottom:8px; font-size:12px; color:#666;">视频生成工具</div>
        <div class="tools-grid-new">
          ${videoTools.map(t => `
            <div class="tool-card" onclick="openToolDetail('${t.id}')">
              <div class="tc-icon">${t.icon}</div>
              <div class="tc-name">${t.name}</div>
              <div class="tc-en">${t.en}</div>
              <div class="tc-desc">${t.desc}</div>
            </div>`).join('')}
        </div>
      `;
    }
  }
  document.getElementById('ws-tab-content').innerHTML = sectionHtml;
  renderWorkspaceNavSelection();
}

// ===== Stats Page =====
// ============ Data Center ============
const PROJECT_INDUSTRY_OPTIONS = [
  { v: 'ent', l: '互娱' },
  { v: 'earn', l: '网赚' },
  { v: 'social', l: '社交' },
  { v: 'other', l: '其他' },
];
function isKnownProjectIndustry(value) {
  return PROJECT_INDUSTRY_OPTIONS.some(option => option.v === value);
}
function normalizeProjectIndustry(value) {
  return isKnownProjectIndustry(value) ? value : 'other';
}
const DC_MEDIA = [{v:'tt',l:'TT'},{v:'kwai',l:'Kwai'}];
const DC_TIMEZONE = [{v:0,l:'UTC+0'},{v:8,l:'UTC+8'},{v:13,l:'UTC+13'}];
const DC_MANAGER_BUSINESS = [
  { v: 'all', l: '全部' },
  { v: 'a', l: 'a类' },
  { v: 'b', l: 'b类' },
];
function getBusinessLines() {
  return businessLines;
}
function getDcBusinessOptions() {
  return [
    { v: 'all', l: '全部' },
    ...getBusinessLines().map(option => ({ v: option.id, l: option.label })),
  ];
}
function getBusinessOptionById(businessId) {
  return getBusinessLines().find(option => option.id === businessId) || null;
}
function getSubgroupOptionById(subgroupKey) {
  return SUBGROUP_OPTIONS.find(option => option.id === subgroupKey) || null;
}
function getDefaultBusinessId() {
  return getBusinessLines()[0] ? getBusinessLines()[0].id : '';
}
function getUniqueBusinessLineId(label) {
  let base = (label || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!base) base = 'biz-' + Date.now();
  let id = base;
  let counter = 2;
  while (getBusinessOptionById(id)) {
    id = base + '-' + counter;
    counter += 1;
  }
  return id;
}
function createBusinessLineRecord(label, color = '#3b82f6') {
  if (!label || currentUser.role !== 'superadmin') return null;
  const business = {
    id: getUniqueBusinessLineId(label),
    label: label.trim(),
    color: color || '#3b82f6',
  };
  businessLines.push(business);
  return business;
}
function clearUserOrganizationAssignment(user) {
  if (!user) return;
  user.businessId = '';
  user.managerScopeId = '';
  user.subgroupKey = '';
  user.leaderId = '';
}
function syncAllUserOrganizations() {
  users.forEach(user => syncUserOrganization(user));
}
function getManagerScopeById(scopeId) {
  return managerScopes.find(scope => scope.id === scopeId) || null;
}
function getManagerScopeByManagerId(managerId) {
  return managerScopes.find(scope => scope.managerId === managerId) || null;
}
function getManagersForBusiness(businessId, excludeUserId = '') {
  return users.filter(user => user.role === 'manager' && user.businessId === businessId && user.id !== excludeUserId);
}
function findLeaderForScopeAndSubgroup(scopeId, subgroupKey, excludeUserId = '') {
  return users.find(user => user.role === 'leader' && user.managerScopeId === scopeId && user.subgroupKey === subgroupKey && user.id !== excludeUserId) || null;
}
function ensureManagerScopeForUser(user) {
  if (!user) return '';
  if (!user.businessId || !getBusinessOptionById(user.businessId)) {
    user.managerScopeId = '';
    return '';
  }
  let scope = getManagerScopeByManagerId(user.id);
  if (!scope) {
    scope = {
      id: 'mgr-' + user.id,
      managerId: user.id,
      businessId: user.businessId,
    };
    managerScopes.push(scope);
  } else if (user.businessId && scope.businessId !== user.businessId) {
    scope.businessId = user.businessId;
  }
  user.managerScopeId = scope.id;
  return scope.id;
}
function syncUserOrganization(user) {
  if (!user) return;
  if (user.role === 'superadmin') {
    clearUserOrganizationAssignment(user);
    return;
  }
  if (user.role === 'manager') {
    if (!user.businessId || !getBusinessOptionById(user.businessId)) {
      clearUserOrganizationAssignment(user);
      return;
    }
    user.subgroupKey = '';
    user.leaderId = '';
    ensureManagerScopeForUser(user);
    return;
  }
  const scope = getManagerScopeById(user.managerScopeId);
  if (!scope || !getBusinessOptionById(scope.businessId)) {
    clearUserOrganizationAssignment(user);
    return;
  }
  user.businessId = scope.businessId;
  user.subgroupKey = user.subgroupKey || 'a';
  if (user.role === 'leader') {
    user.leaderId = '';
  } else {
    const leader = findLeaderForScopeAndSubgroup(user.managerScopeId, user.subgroupKey, user.id);
    user.leaderId = leader ? leader.id : '';
  }
}
function assignUserToManagerScope(user, scopeId, subgroupKey) {
  if (!user) return;
  const scope = getManagerScopeById(scopeId);
  if (!scope) {
    clearUserOrganizationAssignment(user);
    return;
  }
  user.managerScopeId = scopeId;
  user.businessId = scope ? scope.businessId : user.businessId;
  user.subgroupKey = subgroupKey || user.subgroupKey || 'a';
  syncUserOrganization(user);
}
function assignUserToBusinessLine(userId, businessId, managerId = '', subgroupKey = '') {
  const user = getUserById(userId);
  const business = getBusinessOptionById(businessId);
  if (!user || !business || user.role === 'superadmin') return false;
  if (user.role === 'manager') {
    user.businessId = business.id;
    user.managerScopeId = '';
    user.subgroupKey = '';
    user.leaderId = '';
    ensureManagerScopeForUser(user);
    syncAllUserOrganizations();
    return true;
  }
  const manager = getUserById(managerId);
  if (!manager || manager.role !== 'manager' || manager.businessId !== business.id) return false;
  const scopeId = ensureManagerScopeForUser(manager);
  if (!scopeId) return false;
  assignUserToManagerScope(user, scopeId, subgroupKey || 'a');
  syncAllUserOrganizations();
  return true;
}
function removeUserFromBusinessLine(userId) {
  const user = getUserById(userId);
  if (!user || user.role === 'superadmin') return false;
  const scopeId = user.managerScopeId;
  if (user.role === 'manager' && scopeId) {
    users
      .filter(candidate => candidate.id !== user.id && candidate.managerScopeId === scopeId)
      .forEach(clearUserOrganizationAssignment);
    managerScopes = managerScopes.filter(scope => scope.id !== scopeId);
  }
  clearUserOrganizationAssignment(user);
  syncAllUserOrganizations();
  return true;
}
function deleteBusinessLineRecord(businessId) {
  if (!getBusinessOptionById(businessId) || currentUser.role !== 'superadmin') return false;
  users
    .filter(user => user.businessId === businessId)
    .forEach(clearUserOrganizationAssignment);
  managerScopes = managerScopes.filter(scope => scope.businessId !== businessId);
  businessLines = businessLines.filter(line => line.id !== businessId);
  syncAllUserOrganizations();
  return true;
}
function getUnassignedUsers() {
  return users.filter(user => user.role !== 'superadmin' && !user.businessId);
}
function getVisibleOrganizationBusinessIds(user = currentUser) {
  if (!user) return [];
  if (user.role === 'superadmin') return getBusinessLines().map(option => option.id);
  return user.businessId ? [user.businessId] : [];
}
function getBusinessDetailRows(actor = currentUser, businessId) {
  return users
    .filter(user => user.role !== 'superadmin' && user.businessId === businessId)
    .sort((a, b) => {
      const roleOrder = { manager: 0, leader: 1, member: 2 };
      return (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9);
    })
    .map(user => ({
      userId: user.id,
      name: user.name,
      role: user.role,
      roleLabel: ROLES[user.role]?.label || user.role,
      orgPath: getUserOrgPath(user),
      subgroupKey: user.subgroupKey || '',
      editable: canEditMember(actor, user) || canChangeMemberRole(actor, user),
    }));
}
function getBusinessManagers(businessId) {
  return users.filter(user => user.role === 'manager' && user.businessId === businessId);
}
function getManagerScopeMembers(scopeId) {
  return users.filter(user => user.role !== 'superadmin' && user.role !== 'manager' && user.managerScopeId === scopeId);
}
function getManagerScopeSubgroupCounts(scopeId) {
  const counts = { a: 0, b: 0 };
  getManagerScopeMembers(scopeId).forEach(user => {
    if (user.subgroupKey === 'a' || user.subgroupKey === 'b') counts[user.subgroupKey] += 1;
  });
  return counts;
}
function getDirectReportUsers(user) {
  if (!user || user.role !== 'leader') return [];
  return users.filter(candidate => candidate.leaderId === user.id);
}
function getManagedMemberIds(user = currentUser) {
  if (!user) return new Set();
  if (user.role === 'superadmin') return new Set(users.filter(candidate => candidate.id !== user.id).map(candidate => candidate.id));
  if (user.role === 'manager') return new Set(getManagerScopeMembers(user.managerScopeId).map(candidate => candidate.id));
  if (user.role === 'leader') return new Set(getDirectReportUsers(user).map(candidate => candidate.id));
  return new Set([user.id]);
}
function canEditMember(actor = currentUser, target) {
  if (!actor || !target) return false;
  if (actor.role === 'superadmin') return actor.id !== target.id;
  if (actor.role !== 'manager') return false;
  if (target.role === 'superadmin' || target.role === 'manager') return false;
  return target.managerScopeId === actor.managerScopeId;
}
function canChangeMemberRole(actor = currentUser, target) {
  return !!actor && !!target && actor.role === 'superadmin' && actor.id !== target.id;
}
function getUserOrgPath(user) {
  if (!user) return '—';
  if (user.role === 'superadmin') return '平台管理';
  if (!user.businessId) return '未分配';
  const business = getBusinessOptionById(user.businessId);
  const businessLabel = business ? business.label : '未分配';
  if (user.role === 'manager') return businessLabel + ' / 经理';
  const subgroup = getSubgroupOptionById(user.subgroupKey);
  return businessLabel + ' / ' + (subgroup ? subgroup.label : '未分类');
}
function renderUserOrgBadge(user) {
  if (!user) return '<span style="color:#555;">—</span>';
  if (user.role === 'superadmin') {
    return '<span class="tag" style="background:#f43f5e22;color:#f43f5e;">平台管理</span>';
  }
  const business = getBusinessOptionById(user.businessId);
  const color = business ? business.color : '#666';
  return `<span class="tag" style="background:${color}22;color:${color};">${getUserOrgPath(user)}</span>`;
}
function getScopedBusinessFilterOptions(user = currentUser) {
  if (!user || user.role === 'superadmin') return getDcBusinessOptions();
  if (user.role === 'manager') return DC_MANAGER_BUSINESS;
  return [];
}
function getVisibleDataCenterUserIds(user = currentUser) {
  if (!user) return new Set();
  if (user.role === 'superadmin') {
    return new Set(users.filter(candidate => candidate.role !== 'superadmin').map(candidate => candidate.id));
  }
  return getManagedMemberIds(user);
}
function getMemberActionMode(actor = currentUser, target) {
  if (canChangeMemberRole(actor, target)) return 'role-only';
  return 'readonly';
}
function getBusinessMemberActionMode(actor = currentUser, target) {
  if (canEditMember(actor, target)) return 'assignment';
  return 'readonly';
}
const DC_INDUSTRY = [{v:'all',l:'全部'}, ...PROJECT_INDUSTRY_OPTIONS];
// Data Center pulls from real `projects` → folders → video files (no hardcoded mocks).
// Business is derived from project media + product keywords.
// Industry prefers explicit project metadata and falls back to legacy keyword inference.
function dcDeriveBusiness(project) {
  const overseas = project.media === 'tt';
  const text = (project.product || '') + (project.client || '');
  const isTool = /工具|多语言|翻译|投放|市场|海外/.test(text);
  return (overseas ? 'overseas-' : 'local-') + (isTool ? 'tool' : 'ent');
}
function dcDeriveIndustry(project) {
  if (project.industry) return project.industry;
  const text = (project.product || '') + (project.client || '');
  if (/赚|earn|网赚/i.test(text)) return 'earn';
  if (/社交|社群|social/i.test(text)) return 'social';
  if (/品牌|推广|营销|marketing|春季|互娱|游戏|实验/i.test(text)) return 'ent';
  return 'other';
}
function dcDeriveLanguage(file) {
  const text = (file.name || '') + ' ' + ((file.tags||[]).join(' '));
  if (/PT|葡萄|葡语|portuguese/i.test(text)) return '巴西葡萄牙语';
  if (/ES|西班|西语|spanish/i.test(text)) return '西班牙语';
  if (/JP|日语|japanese/i.test(text)) return '日语';
  if (/EN[_-]|英语|english/i.test(text)) return '英语';
  return '简体中文';
}
function dcHashCode(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}
function dcSeededMetrics(key) {
  let h = dcHashCode(key) >>> 0;
  const next = (n) => { h = (h * 1103515245 + 12345) >>> 0; return h % n; };
  const cost = 400 + next(2800) + next(100) / 100;
  const imp = 180000 + next(1400000);
  const ctr = 0.008 + next(300) / 10000;
  const click = Math.round(imp * ctr);
  const cvr = 0.02 + next(500) / 10000;
  const conv = Math.max(1, Math.round(click * cvr));
  const roas = 1.2 + next(250) / 100;
  const value = cost * roas;
  return { cost: +cost.toFixed(2), imp, click, conv, value: +value.toFixed(2) };
}
function dcReviewTag(m) {
  const cpa = m.conv ? m.cost / m.conv : 0;
  const roas = m.cost ? m.value / m.cost : 0;
  const cpaTag = cpa < 1 ? 'CPI-0.3' : cpa < 2 ? 'CPI-0.6' : cpa < 4 ? 'CPI-1.2' : 'CPI-2.0';
  const roasPct = Math.min(99, Math.round(roas * 18)) + '%';
  return cpaTag + '/ROAS' + roasPct;
}
// File.time is a relative label (e.g. "2 小时前"); map to demo-date (2026-04-14) for stable display.
function dcResolveTime(file) {
  const base = new Date('2026-04-14T10:00:00');
  const t = file.time || '';
  const d = new Date(base);
  const hourMatch = /(\d+)\s*小时前/.exec(t);
  const minMatch = /(\d+)\s*分钟前/.exec(t);
  if (hourMatch) d.setHours(base.getHours() - parseInt(hourMatch[1], 10));
  else if (minMatch) d.setMinutes(base.getMinutes() - parseInt(minMatch[1], 10));
  else if (t === '昨天') d.setDate(base.getDate() - 1);
  else if (t === '进行中') d.setHours(base.getHours() - 1);
  else if (t === '草稿') d.setDate(base.getDate() - 2);
  else d.setDate(base.getDate() - 3);
  const p2 = n => String(n).padStart(2,'0');
  return d.getFullYear() + '-' + p2(d.getMonth()+1) + '-' + p2(d.getDate()) + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()) + ':' + p2(d.getSeconds());
}
function getAllDcVideos() {
  const list = [];
  projects.forEach(project => {
    if (!canSeeProject(project)) return;
    const industry = dcDeriveIndustry(project);
    const mediaList = project.media === 'kwai+tt' ? ['tt', 'kwai'] : [project.media];
    (project.folders || []).forEach(folder => {
      if (!canSeeFolder(folder)) return;
      (folder.files || []).forEach(file => {
        if (getFileType(file) !== 'video') return;
        const uploader = getUserById(file.creator);
        const business = uploader?.businessId || dcDeriveBusiness(project);
        const keyBase = project.id + '|' + folder.id + '|' + file.name;
        mediaList.forEach(platform => {
          const key = mediaList.length > 1 ? keyBase + '|' + platform : keyBase;
          const metrics = dcSeededMetrics(key);
          const videoId = 'V-' + Math.abs(dcHashCode(key)).toString().padStart(10, '0').slice(0, 10);
          list.push({
            id: videoId,
            name: file.name,
            language: dcDeriveLanguage(file),
            createdAt: dcResolveTime(file),
            review: dcReviewTag(metrics),
            media: platform,
            business,
            industry,
            client: project.client,
            product: project.product,
            uploader: file.creator,
            subgroup: uploader?.subgroupKey || '',
            managerScopeId: uploader?.managerScopeId || '',
            thumbHue: file.thumbHue ?? 220,
            thumbScene: file.thumbScene,
            duration: file.duration,
            status: file.status,
            tags: file.tags || [],
            taskId: file.taskId || null,
            cost: metrics.cost,
            imp: metrics.imp,
            click: metrics.click,
            conv: metrics.conv,
            value: metrics.value,
            _projectId: project.id,
            _folderId: folder.id,
          });
        });
      });
    });
  });
  return list;
}
function applyDcTimezoneVariation(video, tz) {
  if (!tz) return video;
  const seed = dcHashCode(video.id + '|tz' + tz) >>> 0;
  const r1 = ((seed * 1103515245 + 12345) >>> 0) % 1000 / 1000;
  const r2 = (((seed ^ 0xdeadbeef) * 1103515245 + 12345) >>> 0) % 1000 / 1000;
  const factor = 0.5 + r1 * 1.0;
  const valueFactor = 0.7 + r2 * 1.1;
  const cost = +(video.cost * factor).toFixed(2);
  const imp = Math.round(video.imp * factor);
  const click = Math.round(video.click * factor);
  const conv = Math.max(1, Math.round(video.conv * factor));
  const value = +(cost * valueFactor * 1.8).toFixed(2);
  return { ...video, cost, imp, click, conv, value };
}
function getDcClientOptions() {
  const seen = new Set();
  const opts = [];
  projects.forEach(p => { if (canSeeProject(p) && !seen.has(p.client)) { seen.add(p.client); opts.push({v:p.client, l:p.client}); } });
  return [{v:'all', l:'全部'}, ...opts];
}
function getDcProductOptions() {
  const seen = new Set();
  const opts = [];
  projects.forEach(p => { if (canSeeProject(p) && !seen.has(p.product)) { seen.add(p.product); opts.push({v:p.product, l:p.product}); } });
  return [{v:'all', l:'全部'}, ...opts];
}
function getDcPeopleOptions() {
  const ids = new Set();
  const visibleIds = getVisibleDataCenterUserIds(currentUser);
  getAllDcVideos().forEach(v => {
    if (v.uploader && visibleIds.has(v.uploader)) ids.add(v.uploader);
  });
  const opts = [...ids].map(uid => { const u = getUserById(uid); return { v: uid, l: u ? u.name : uid }; });
  return [{v:'all', l:'全部'}, ...opts];
}

let dataCenterFilter = {
  q:'', media:'tt', business:'all', industry:'all', client:'all', product:'all', person:'all',
  createdFrom:'', createdTo:'', publishFrom:'', publishTo:'', publishQuick:'', timezone:0
};
let dcJumpOpen = null;
const VIDEO_PLAYER_DEMO_SOURCES = [
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm',
];
function _videoPlayerIcon(paths) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}
const VIDEO_PLAYER_ICONS = {
  play: _videoPlayerIcon('<polygon points="8 6 18 12 8 18 8 6"></polygon>'),
  pause: _videoPlayerIcon('<rect x="7" y="6" width="3" height="12" rx="1"></rect><rect x="14" y="6" width="3" height="12" rx="1"></rect>'),
  volume: _videoPlayerIcon('<polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18 6a8.5 8.5 0 0 1 0 12"></path>'),
  mute: _videoPlayerIcon('<polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon><line x1="15" y1="9" x2="21" y2="15"></line><line x1="21" y1="9" x2="15" y2="15"></line>'),
  fullscreen: _videoPlayerIcon('<polyline points="9 3 3 3 3 9"></polyline><polyline points="15 3 21 3 21 9"></polyline><polyline points="21 15 21 21 15 21"></polyline><polyline points="9 21 3 21 3 15"></polyline>'),
  close: _videoPlayerIcon('<line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line>'),
};
let videoPlayerModalState = {
  videoId: null,
  triggerEl: null,
  sources: [],
  sourceIndex: 0,
  pendingPlayback: false,
  ready: false,
};
let assetPreviewModalState = {
  active: false,
  triggerEl: null,
};

function escapeSvgText(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatVideoPlayerTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function buildVideoPoster(video) {
  const hue = Number(video?.thumbHue ?? 220);
  const accent = (hue + 40) % 360;
  const glow = (hue + 88) % 360;
  const title = escapeSvgText(video?.name || '视频预览');
  const subtitle = escapeSvgText(video?.thumbScene || 'AI 视频作品预览');
  const badge = escapeSvgText(video?.duration || 'Preview');
  const tagA = escapeSvgText((video?.tags && video.tags[0]) || '视频作品');
  const tagB = escapeSvgText((video?.tags && video.tags[1]) || (video?.language || 'AI 生成'));
  const status = escapeSvgText(fileStatusText(video?.status || 'done'));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue},42%,11%)"/>
        <stop offset="55%" stop-color="hsl(${accent},38%,14%)"/>
        <stop offset="100%" stop-color="hsl(${glow},32%,10%)"/>
      </linearGradient>
      <radialGradient id="glowA" cx="0.18" cy="0.14" r="0.75">
        <stop offset="0%" stop-color="hsla(${accent},100%,72%,0.36)"/>
        <stop offset="100%" stop-color="hsla(${accent},100%,72%,0)"/>
      </radialGradient>
      <radialGradient id="glowB" cx="0.86" cy="0.22" r="0.46">
        <stop offset="0%" stop-color="hsla(${glow},100%,72%,0.30)"/>
        <stop offset="100%" stop-color="hsla(${glow},100%,72%,0)"/>
      </radialGradient>
      <linearGradient id="frame" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="rgba(255,255,255,0.16)"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0.04)"/>
      </linearGradient>
      <linearGradient id="mainCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsl(${hue},44%,18%)"/>
        <stop offset="100%" stop-color="hsl(${accent},50%,28%)"/>
      </linearGradient>
      <linearGradient id="screenGlow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsla(${accent},100%,90%,0.18)"/>
        <stop offset="100%" stop-color="hsla(${glow},100%,90%,0)"/>
      </linearGradient>
      <linearGradient id="fadeBottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(7,8,14,0)"/>
        <stop offset="100%" stop-color="rgba(7,8,14,0.92)"/>
      </linearGradient>
      <linearGradient id="sideCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="hsla(${accent},54%,34%,0.94)"/>
        <stop offset="100%" stop-color="hsla(${glow},46%,24%,0.94)"/>
      </linearGradient>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="rgba(0,0,0,0.38)"/>
      </filter>
      <clipPath id="heroClip">
        <rect x="118" y="122" width="804" height="476" rx="28"/>
      </clipPath>
    </defs>
    <rect width="1280" height="720" fill="url(#bg)"/>
    <rect width="1280" height="720" fill="url(#glowA)"/>
    <rect width="1280" height="720" fill="url(#glowB)"/>
    <g opacity="0.14">
      <path d="M0 106h1280M0 196h1280M0 286h1280M0 376h1280M0 466h1280M0 556h1280M0 646h1280" stroke="rgba(255,255,255,0.26)"/>
      <path d="M110 0v720M270 0v720M430 0v720M590 0v720M750 0v720M910 0v720M1070 0v720" stroke="rgba(255,255,255,0.16)"/>
    </g>
    <g filter="url(#softShadow)">
      <rect x="58" y="76" width="1164" height="568" rx="44" fill="rgba(8,10,18,0.56)" stroke="url(#frame)"/>
      <rect x="84" y="102" width="1112" height="516" rx="34" fill="rgba(7,8,14,0.44)" stroke="rgba(255,255,255,0.08)"/>
    </g>
    <rect x="118" y="122" width="804" height="476" rx="28" fill="url(#mainCard)" stroke="rgba(255,255,255,0.14)"/>
    <g clip-path="url(#heroClip)">
      <rect x="118" y="122" width="804" height="476" fill="url(#screenGlow)"/>
      <path d="M118 470C254 392 354 406 468 330C546 278 620 244 742 260C808 268 860 304 922 346V598H118V470Z" fill="hsla(${glow},72%,78%,0.16)"/>
      <path d="M118 526C238 482 348 468 470 410C584 356 724 370 922 454V598H118V526Z" fill="hsla(${accent},90%,82%,0.16)"/>
      <circle cx="770" cy="204" r="110" fill="hsla(${accent},100%,90%,0.16)"/>
      <circle cx="298" cy="238" r="182" fill="hsla(${glow},100%,90%,0.10)"/>
      <rect x="118" y="122" width="804" height="476" fill="url(#fadeBottom)"/>
    </g>
    <g>
      <rect x="970" y="126" width="196" height="128" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
      <rect x="988" y="144" width="160" height="74" rx="16" fill="url(#sideCard)"/>
      <rect x="988" y="228" width="104" height="8" rx="4" fill="rgba(255,255,255,0.18)"/>
      <rect x="988" y="244" width="76" height="8" rx="4" fill="rgba(255,255,255,0.10)"/>

      <rect x="970" y="274" width="196" height="128" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
      <rect x="988" y="292" width="160" height="74" rx="16" fill="url(#sideCard)" opacity="0.88"/>
      <rect x="988" y="376" width="112" height="8" rx="4" fill="rgba(255,255,255,0.18)"/>
      <rect x="988" y="392" width="92" height="8" rx="4" fill="rgba(255,255,255,0.10)"/>

      <rect x="970" y="422" width="196" height="128" rx="24" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)"/>
      <rect x="988" y="440" width="160" height="74" rx="16" fill="url(#sideCard)" opacity="0.78"/>
      <rect x="988" y="524" width="118" height="8" rx="4" fill="rgba(255,255,255,0.18)"/>
      <rect x="988" y="540" width="72" height="8" rx="4" fill="rgba(255,255,255,0.10)"/>
    </g>
    <rect x="142" y="150" width="126" height="34" rx="17" fill="rgba(7,8,14,0.62)" stroke="rgba(255,255,255,0.12)"/>
    <text x="205" y="172" text-anchor="middle" font-family="SF Pro Display,Segoe UI,Arial,sans-serif" font-size="15" fill="rgba(255,255,255,0.88)">SELVA PREVIEW</text>
    <rect x="780" y="150" width="118" height="34" rx="17" fill="rgba(7,8,14,0.62)" stroke="rgba(255,255,255,0.12)"/>
    <text x="839" y="172" text-anchor="middle" font-family="SF Pro Display,Segoe UI,Arial,sans-serif" font-size="15" fill="#ffffff">${status}</text>

    <text x="150" y="474" font-family="SF Pro Display,Segoe UI,Arial,sans-serif" font-size="46" font-weight="700" fill="#ffffff">${title}</text>
    <text x="150" y="518" font-family="SF Pro Text,Segoe UI,Arial,sans-serif" font-size="24" fill="rgba(255,255,255,0.82)">${subtitle}</text>

    <rect x="150" y="544" width="108" height="34" rx="17" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.12)"/>
    <text x="204" y="566" text-anchor="middle" font-family="SF Pro Text,Segoe UI,Arial,sans-serif" font-size="16" fill="#ffffff">${tagA}</text>
    <rect x="270" y="544" width="116" height="34" rx="17" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)"/>
    <text x="328" y="566" text-anchor="middle" font-family="SF Pro Text,Segoe UI,Arial,sans-serif" font-size="16" fill="#ffffff">${tagB}</text>

    <rect x="150" y="602" width="584" height="8" rx="4" fill="rgba(255,255,255,0.12)"/>
    <rect x="150" y="602" width="364" height="8" rx="4" fill="rgba(255,255,255,0.64)"/>
    <circle cx="514" cy="606" r="10" fill="#ffffff"/>
    <circle cx="520" cy="250" r="84" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.22)"/>
    <polygon points="490,210 570,250 490,290" fill="#ffffff"/>

    <rect x="1034" y="572" width="132" height="42" rx="21" fill="rgba(7,8,14,0.72)" stroke="rgba(255,255,255,0.12)"/>
    <text x="1100" y="599" text-anchor="middle" font-family="SF Pro Display,Segoe UI,Arial,sans-serif" font-size="22" fill="#ffffff">${badge}</text>
  </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function getVideoPlayerSourceQueue(video) {
  const start = Math.abs(dcHashCode(video?.id || video?.name || 'preview')) % VIDEO_PLAYER_DEMO_SOURCES.length;
  return VIDEO_PLAYER_DEMO_SOURCES.map((_, index) => VIDEO_PLAYER_DEMO_SOURCES[(start + index) % VIDEO_PLAYER_DEMO_SOURCES.length]);
}

function getCurrentVideoPlayerElement() {
  return document.getElementById('dc-video-player');
}

function setVideoPlayerFeedback(text = '', isError = false, visible = true) {
  const feedback = document.getElementById('video-player-feedback');
  const textEl = document.getElementById('video-player-feedback-text');
  const spinner = document.getElementById('video-player-spinner');
  if (!feedback || !textEl || !spinner) return;
  feedback.hidden = !visible;
  feedback.classList.toggle('error', !!isError);
  textEl.textContent = text;
  spinner.style.display = isError ? 'none' : '';
}

function syncVideoPlayerProgress() {
  const player = getCurrentVideoPlayerElement();
  const progress = document.getElementById('video-player-progress');
  const time = document.getElementById('video-player-time');
  if (!progress || !time) return;
  const current = player && Number.isFinite(player.currentTime) ? player.currentTime : 0;
  const duration = player && Number.isFinite(player.duration) ? player.duration : 0;
  progress.max = duration || 0;
  progress.disabled = !duration;
  progress.value = duration ? current : 0;
  time.textContent = `${formatVideoPlayerTime(current)} / ${formatVideoPlayerTime(duration)}`;
}

function syncVideoPlayerControls() {
  const player = getCurrentVideoPlayerElement();
  const playBtn = document.getElementById('video-player-toggle');
  const muteBtn = document.getElementById('video-player-mute');
  const fullscreenBtn = document.getElementById('video-player-fullscreen');
  if (!playBtn || !muteBtn || !fullscreenBtn) return;
  const hasSource = !!(player && player.currentSrc);
  const isPaused = !player || player.paused;
  const isMuted = !player || player.muted || player.volume === 0;
  playBtn.innerHTML = isPaused ? VIDEO_PLAYER_ICONS.play : VIDEO_PLAYER_ICONS.pause;
  playBtn.setAttribute('aria-label', isPaused ? '播放视频' : '暂停视频');
  muteBtn.innerHTML = isMuted ? VIDEO_PLAYER_ICONS.mute : VIDEO_PLAYER_ICONS.volume;
  muteBtn.setAttribute('aria-label', isMuted ? '取消静音' : '静音');
  playBtn.disabled = !hasSource;
  muteBtn.disabled = !hasSource;
  fullscreenBtn.disabled = !hasSource;
  syncVideoPlayerProgress();
}

function handleVideoPlayerLoaded() {
  videoPlayerModalState.ready = true;
  syncVideoPlayerControls();
  syncVideoPlayerProgress();
}

function handleVideoPlayerCanPlay() {
  videoPlayerModalState.ready = true;
  setVideoPlayerFeedback('', false, false);
  syncVideoPlayerControls();
}

function loadCurrentVideoPlayerSource(autoPlay = false) {
  const player = getCurrentVideoPlayerElement();
  if (!player || !videoPlayerModalState.sources.length) return;
  const source = videoPlayerModalState.sources[videoPlayerModalState.sourceIndex];
  videoPlayerModalState.pendingPlayback = !!autoPlay;
  videoPlayerModalState.ready = false;
  setVideoPlayerFeedback('正在载入视频预览...', false, true);
  player.src = source;
  player.load();
  syncVideoPlayerControls();
  if (autoPlay) {
    const maybePlay = player.play();
    if (maybePlay && typeof maybePlay.catch === 'function') {
      maybePlay.catch(() => {
        videoPlayerModalState.pendingPlayback = false;
        syncVideoPlayerControls();
      });
    }
  }
}

function handleVideoPlayerError() {
  if (videoPlayerModalState.sourceIndex < videoPlayerModalState.sources.length - 1) {
    videoPlayerModalState.sourceIndex += 1;
    loadCurrentVideoPlayerSource(videoPlayerModalState.pendingPlayback);
    return;
  }
  videoPlayerModalState.ready = false;
  setVideoPlayerFeedback('视频预览加载失败，请检查网络后重试。', true, true);
  syncVideoPlayerControls();
}

function toggleVideoPlayerPlayback() {
  const player = getCurrentVideoPlayerElement();
  if (!player || !player.currentSrc) return;
  if (player.paused || player.ended) {
    const maybePlay = player.play();
    if (maybePlay && typeof maybePlay.catch === 'function') {
      maybePlay.catch(() => {});
    }
  } else {
    player.pause();
  }
  syncVideoPlayerControls();
}

function seekVideoPlayer(value) {
  const player = getCurrentVideoPlayerElement();
  if (!player || !Number.isFinite(player.duration)) return;
  player.currentTime = Number(value || 0);
  syncVideoPlayerProgress();
}

function toggleVideoPlayerMute() {
  const player = getCurrentVideoPlayerElement();
  if (!player) return;
  player.muted = !player.muted;
  syncVideoPlayerControls();
}

function toggleVideoPlayerFullscreen() {
  const shell = document.getElementById('video-player-shell');
  if (!shell || !document.fullscreenEnabled) return;
  if (document.fullscreenElement === shell) {
    document.exitFullscreen().catch(() => {});
    return;
  }
  shell.requestFullscreen().catch(() => {});
}

function handleVideoPlayerDocumentKeydown(event) {
  if (!videoPlayerModalState.videoId) return;
  const tag = (event.target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  const key = event.key.toLowerCase();
  if (key === 'escape') {
    hideModal();
    return;
  }
  if (key === ' ' || key === 'k') {
    event.preventDefault();
    toggleVideoPlayerPlayback();
    return;
  }
  if (key === 'm') {
    event.preventDefault();
    toggleVideoPlayerMute();
    return;
  }
  if (key === 'f') {
    event.preventDefault();
    toggleVideoPlayerFullscreen();
  }
}

function cleanupVideoPlayerModal() {
  const shell = document.getElementById('video-player-shell');
  const player = getCurrentVideoPlayerElement();
  const triggerEl = videoPlayerModalState.triggerEl;
  document.removeEventListener('keydown', handleVideoPlayerDocumentKeydown, true);
  if (document.fullscreenElement === shell && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }
  if (player) {
    player.pause();
    player.removeAttribute('src');
    player.load();
  }
  videoPlayerModalState = {
    videoId: null,
    triggerEl: null,
    sources: [],
    sourceIndex: 0,
    pendingPlayback: false,
    ready: false,
  };
  if (triggerEl && typeof triggerEl.focus === 'function') {
    setTimeout(() => triggerEl.focus(), 0);
  }
}

function cleanupAssetPreviewModal() {
  const triggerEl = assetPreviewModalState.triggerEl;
  assetPreviewModalState = {
    active: false,
    triggerEl: null,
  };
  if (triggerEl && typeof triggerEl.focus === 'function') {
    setTimeout(() => triggerEl.focus(), 0);
  }
}

function openVideoPlayerModalById(videoId, triggerEl) {
  const video = getAllDcVideos().find(item => item.id === videoId);
  if (!video) return;
  openVideoPlayerModal(video, triggerEl);
}

function setDcFilter(k, v) {
  if (k === 'timezone') {
    dataCenterFilter.timezone = Number(v) || 0;
  } else {
    dataCenterFilter[k] = v;
    if (k === 'media' && v !== 'kwai') dataCenterFilter.timezone = 0;
  }
  dcPage = 1;
  renderDataCenterPage();
}
function setDcPublishQuick(key) {
  const now = new Date();
  const d = new Date(now); d.setHours(0,0,0,0);
  const fmt = dt => dt.toISOString().slice(0,10);
  let f='', t='';
  if (key==='today') { f=fmt(d); t=fmt(d); }
  else if (key==='yesterday') { const y=new Date(d); y.setDate(y.getDate()-1); f=fmt(y); t=fmt(y); }
  else if (key==='last7') { const s=new Date(d); s.setDate(s.getDate()-6); f=fmt(s); t=fmt(d); }
  else if (key==='thisweek') { const s=new Date(d); const day=(s.getDay()+6)%7; s.setDate(s.getDate()-day); f=fmt(s); t=fmt(d); }
  else if (key==='lastweek') { const s=new Date(d); const day=(s.getDay()+6)%7; s.setDate(s.getDate()-day-7); const e=new Date(s); e.setDate(s.getDate()+6); f=fmt(s); t=fmt(e); }
  else if (key==='thismonth') { const s=new Date(d.getFullYear(),d.getMonth(),1); f=fmt(s); t=fmt(d); }
  else if (key==='lastmonth') { const s=new Date(d.getFullYear(),d.getMonth()-1,1); const e=new Date(d.getFullYear(),d.getMonth(),0); f=fmt(s); t=fmt(e); }
  dataCenterFilter.publishFrom=f; dataCenterFilter.publishTo=t; dataCenterFilter.publishQuick=key;
  dcPage = 1;
  renderDataCenterPage();
}
function resetDcFilter() {
  dataCenterFilter = { q:'', media:'tt', business:'all', industry:'all', client:'all', product:'all', person:'all', createdFrom:'', createdTo:'', publishFrom:'', publishTo:'', publishQuick:'', timezone:0 };
  dcPage = 1;
  renderDataCenterPage();
}

function getDcFilteredVideos() {
  let list = getAllDcVideos();
  const visibleIds = getVisibleDataCenterUserIds(currentUser);
  list = list.filter(v => visibleIds.has(v.uploader));
  const f = dataCenterFilter;
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter(v => v.name.toLowerCase().includes(q) || v.id.toLowerCase().includes(q));
  }
  ['media','industry','client','product','person'].forEach(k => {
    if (f[k] !== 'all' && f[k]) {
      const field = k === 'person' ? 'uploader' : k;
      list = list.filter(v => v[field] === f[k]);
    }
  });
  if (f.business !== 'all' && f.business) {
    if (currentUser.role === 'manager') list = list.filter(v => v.subgroup === f.business);
    else if (currentUser.role === 'superadmin') list = list.filter(v => v.business === f.business);
  }
  if (f.createdFrom) list = list.filter(v => v.createdAt.slice(0,10) >= f.createdFrom);
  if (f.createdTo) list = list.filter(v => v.createdAt.slice(0,10) <= f.createdTo);
  if (f.media === 'kwai' && f.timezone) {
    list = list.map(v => applyDcTimezoneVariation(v, f.timezone));
  }
  return list;
}

function fmtMoney(n) { return '$' + n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function fmtInt(n) { return n.toLocaleString('en-US'); }
function fmtPct(n) { return (n*100).toFixed(2) + '%'; }

function openVideoPlayerModal(video, triggerEl) {
  const body = document.getElementById('modal-body');
  const overlay = document.getElementById('modal-overlay');
  if (!body || !overlay || !video) return;
  cleanupVideoPlayerModal();
  const hue = Number(video.thumbHue ?? 220);
  const accent = (hue + 40) % 360;
  const statusText = fileStatusText(video.status);
  body.className = 'modal modal-video-player';
  body.style.cssText = '';
  body.setAttribute('tabindex', '-1');
  body.innerHTML = `
    <div class="video-player-shell" id="video-player-shell" style="--player-hue:${hue}; --player-accent:${accent};">
      <div class="video-player-stage">
        <video
          id="dc-video-player"
          class="video-player-element"
          playsinline
          preload="auto"
          poster="${buildVideoPoster(video)}"
          onloadedmetadata="handleVideoPlayerLoaded()"
          oncanplay="handleVideoPlayerCanPlay()"
          ontimeupdate="syncVideoPlayerProgress()"
          onplay="syncVideoPlayerControls()"
          onpause="syncVideoPlayerControls()"
          onvolumechange="syncVideoPlayerControls()"
          onended="syncVideoPlayerControls()"
          onwaiting="setVideoPlayerFeedback('正在缓冲视频...', false, true)"
          onplaying="setVideoPlayerFeedback('', false, false)"
          onerror="handleVideoPlayerError()"
        ></video>
        <div class="video-player-scrim"></div>
        <div class="video-player-header">
          <div class="video-player-meta">
            <div class="video-player-title">${escapeHtml(video.name)}</div>
            <div class="video-player-subtitle">${escapeHtml(video.thumbScene || '视频预览')}</div>
            <div class="video-player-badges">
              <span class="video-player-badge">${escapeHtml(statusText)}</span>
              ${video.duration ? `<span class="video-player-badge">${escapeHtml(video.duration)}</span>` : ''}
              <span class="video-player-badge accent">演示预览</span>
            </div>
          </div>
          <button type="button" class="video-player-close" onclick="hideModal()" aria-label="关闭播放器">${VIDEO_PLAYER_ICONS.close}</button>
        </div>
        <div class="video-player-feedback" id="video-player-feedback" role="status" aria-live="polite">
          <span class="video-player-spinner" id="video-player-spinner"></span>
          <span id="video-player-feedback-text">正在载入视频预览...</span>
        </div>
      </div>
      <div class="video-player-controls">
        <button type="button" class="video-player-btn video-player-btn-primary" id="video-player-toggle" onclick="toggleVideoPlayerPlayback()" aria-label="播放视频">${VIDEO_PLAYER_ICONS.play}</button>
        <div class="video-player-progress-wrap">
          <input type="range" id="video-player-progress" class="video-player-progress" min="0" max="0" step="0.01" value="0" oninput="seekVideoPlayer(this.value)" aria-label="视频播放进度">
          <div class="video-player-time" id="video-player-time">00:00 / 00:00</div>
        </div>
        <button type="button" class="video-player-btn" id="video-player-mute" onclick="toggleVideoPlayerMute()" aria-label="静音">${VIDEO_PLAYER_ICONS.volume}</button>
        <button type="button" class="video-player-btn" id="video-player-fullscreen" onclick="toggleVideoPlayerFullscreen()" aria-label="全屏">${VIDEO_PLAYER_ICONS.fullscreen}</button>
      </div>
    </div>`;
  overlay.classList.add('show');
  videoPlayerModalState.videoId = video.id;
  videoPlayerModalState.triggerEl = triggerEl || document.activeElement;
  videoPlayerModalState.sources = getVideoPlayerSourceQueue(video);
  videoPlayerModalState.sourceIndex = 0;
  document.removeEventListener('keydown', handleVideoPlayerDocumentKeydown, true);
  document.addEventListener('keydown', handleVideoPlayerDocumentKeydown, true);
  body.focus();
  syncVideoPlayerControls();
  loadCurrentVideoPlayerSource(true);
}

function getAssetRecord(projectId, folderId, fileName) {
  return getAllAssetsData().find(item =>
    item.projectId === Number(projectId)
    && item.folderId === Number(folderId)
    && item.name === fileName
  ) || null;
}

function getAssetPreviewText(asset) {
  const preview = String(asset?._fileRef?.preview || '').trim();
  if (preview) return preview;
  if (asset?.fileType === 'script') {
    return '当前脚本暂无可展示的内容片段。';
  }
  return '当前素材暂无可展示的预览内容。';
}

function normalizeAssetScriptSeed(text) {
  return String(text || '')
    .replace(/(\.\.\.|…+)$/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function buildAssetFullScriptText(asset) {
  const direct = String(asset?._fileRef?.content || asset?._fileRef?.fullText || '').trim();
  if (direct) return direct;

  const preview = normalizeAssetScriptSeed(asset?._fileRef?.preview || '');
  if (!preview) return '暂无完整脚本内容。';

  const tags = Array.isArray(asset?._fileRef?.tags) ? asset._fileRef.tags.filter(Boolean) : [];
  const tagText = tags.length ? tags.join(' / ') : (asset?.projectName || '通用创意');
  const creator = getUserById(asset?.creator);

  if (/\n/.test(preview)) {
    const lines = preview.split(/\n+/).map(line => line.trim()).filter(Boolean);
    const hasEnding = /结尾|收尾|CTA|转化|立即|马上|点击|下载|了解更多/i.test(preview);
    const extras = hasEnding ? [] : [
      '分镜4: 节奏在中后段继续抬升，用字幕或画面强化核心利益点，让信息更加明确。',
      '分镜5: 收尾给出明确动作引导，突出立即点击、查看详情或进入下一步转化。',
    ];
    return [
      `【文件】${asset.name}`,
      `【项目】${asset.projectName} / ${asset.folderName}`,
      `【创意标签】${tagText}`,
      creator ? `【创建者】${creator.name}` : '',
      '',
      ...lines,
      ...extras,
    ].filter(Boolean).join('\n');
  }

  return [
    `【文件】${asset.name}`,
    `【项目】${asset.projectName} / ${asset.folderName}`,
    `【创意标签】${tagText}`,
    creator ? `【创建者】${creator.name}` : '',
    '',
    '【开场钩子】',
    preview,
    '',
    '【镜头节奏】',
    '1. 开场 0-3 秒：直接抛出强信息点或核心情绪，建立停留理由。',
    '2. 中段 3-8 秒：快速展开卖点、场景或结果感，用字幕强化重点信息。',
    '3. 后段 8-12 秒：补充对比、反馈或产品价值，让用户更容易理解收益。',
    '4. 收尾 12-15 秒：给出清晰 CTA，引导点击、下载、咨询或查看详情。',
    '',
    '【旁白 / 字幕正文】',
    preview,
    '',
    '【结尾 CTA】',
    '立即查看详情，进入下一步转化。',
  ].filter(Boolean).join('\n');
}

function openAssetScriptPreviewModal(asset, triggerEl) {
  const body = document.getElementById('modal-body');
  const overlay = document.getElementById('modal-overlay');
  if (!body || !overlay || !asset) return;
  cleanupVideoPlayerModal();
  cleanupAssetPreviewModal();
  const creator = getUserById(asset.creator);
  const previewText = buildAssetFullScriptText(asset);
  body.className = 'modal modal-asset-preview';
  body.style.cssText = '';
  body.setAttribute('tabindex', '-1');
  body.innerHTML = `
    <div class="asset-preview-shell">
      <div class="asset-preview-header">
        <div class="asset-preview-headline">
          <div class="asset-preview-icon">${_svgIcons.script}</div>
          <div style="min-width:0;">
            <div class="asset-preview-title">${escapeHtml(asset.name)}</div>
            <div class="asset-preview-meta">
              <span class="asset-preview-chip accent">完整脚本</span>
              <span class="asset-preview-chip">${escapeHtml(fileStatusText(asset.status))}</span>
              <span class="asset-preview-chip">${escapeHtml(asset.projectName)} / ${escapeHtml(asset.folderName)}</span>
              <span class="asset-preview-chip">${escapeHtml(creator ? creator.name : '未知创建者')} · ${escapeHtml(asset.time || '')}</span>
            </div>
          </div>
        </div>
        <button type="button" class="video-player-close" onclick="hideModal()" aria-label="关闭预览">${VIDEO_PLAYER_ICONS.close}</button>
      </div>
      <div class="asset-preview-body">
        <div class="asset-preview-section-label">Full Script</div>
        <div class="asset-preview-content">
          <pre>${escapeHtml(previewText)}</pre>
        </div>
      </div>
    </div>`;
  overlay.classList.add('show');
  assetPreviewModalState = {
    active: true,
    triggerEl: triggerEl || document.activeElement,
  };
  body.focus();
}

function openAssetPreview(projectId, folderId, fileName, triggerEl) {
  const asset = getAssetRecord(projectId, folderId, fileName);
  if (!asset) return;
  if (asset.fileType === 'video') {
    openVideoPlayerModal({
      ...asset._fileRef,
      name: asset.name,
      status: asset.status,
      duration: asset._fileRef.duration || asset.duration,
      thumbHue: asset._fileRef.thumbHue != null ? asset._fileRef.thumbHue : 240,
      thumbScene: asset._fileRef.thumbScene || `${asset.projectName} · ${asset.folderName}`,
      tags: asset._fileRef.tags || [asset.projectName, asset.folderName],
    }, triggerEl);
    return;
  }
  openAssetScriptPreviewModal(asset, triggerEl);
}

function handleAssetPreviewCardKey(event, projectId, folderId, fileName) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  openAssetPreview(projectId, folderId, fileName, event.currentTarget);
}

function dcJumpToTask(videoId) {
  const video = getAllDcVideos().find(v => v.id === videoId);
  dcJumpOpen = null;
  if (!video) { goPage('tasks'); return; }
  if (!video.taskId) { toast('该视频尚未关联任务'); return; }
  const task = (MOCK_TASKS || []).find(t => t.id === video.taskId);
  if (!task) { toast('关联任务已被清理'); return; }
  currentTaskDetailId = task.id;
  currentTaskDetailNodeId = null;
  currentTaskOutputScopeKey = '';
  currentTaskOutputSelection = new Set();
  if (typeof _taskWfInitialized !== 'undefined') _taskWfInitialized = false;
  goPage('tasks');
}
function dcJumpToTool(toolId) {
  dcJumpOpen = null;
  setWorkspaceSection('toolbox');
  if (toolId) setTimeout(() => openToolDetail(toolId), 0);
}
// Post-production tools that make sense as a next action on an existing video.
const DC_POST_TOOL_IDS = ['tool-understand', 'tool-extract', 'tool-voice', 'tool-translate', 'tool-disclaimer'];
function getDcJumpTools() {
  return TOOLBOX_TOOLS.filter(t => DC_POST_TOOL_IDS.includes(t.id));
}
function toggleDcJump(videoId, e) {
  if (e) e.stopPropagation();
  dcJumpOpen = (dcJumpOpen === videoId) ? null : videoId;
  renderDataCenterPage();
}

function renderDataCenterPage() {
  const container = document.getElementById('effects-content');
  if (!container) return;
  const isMember = currentUser.role === 'member';
  const list = getDcFilteredVideos();
  const dcPager = getInlinePaginationState(list.length, dcPage, DC_PAGE_SIZE);
  if (dcPage !== dcPager.page) dcPage = dcPager.page;
  const pageList = list.slice(dcPager.start, dcPager.end);
  const f = dataCenterFilter;

  const sum = list.reduce((a,v) => { a.cost+=v.cost; a.imp+=v.imp; a.click+=v.click; a.conv+=v.conv; a.value+=v.value; return a; }, {cost:0,imp:0,click:0,conv:0,value:0});
  const sumCpa = sum.conv ? (sum.cost/sum.conv) : 0;
  const sumCtr = sum.imp ? (sum.click/sum.imp) : 0;
  const sumCvr = sum.click ? (sum.conv/sum.click) : 0;
  const sumRoas = sum.cost ? (sum.value/sum.cost) : 0;

  const businessOpts = getScopedBusinessFilterOptions();
  const showBusinessFilter = businessOpts.length > 1;
  const showPersonFilter = currentUser.role === 'superadmin' || currentUser.role === 'manager';
  const peopleOpts = showPersonFilter ? getDcPeopleOptions() : [];
  const clientOpts = getDcClientOptions();
  const productOpts = getDcProductOptions();
  if (!showBusinessFilter && f.business !== 'all') f.business = 'all';
  if (showBusinessFilter && !businessOpts.some(option => option.v === f.business)) f.business = 'all';
  if (!showPersonFilter && f.person !== 'all') f.person = 'all';
  if (showPersonFilter && !peopleOpts.some(option => option.v === f.person)) f.person = 'all';
  const scopeHint = currentUser.role === 'superadmin'
    ? '当前展示全部业务数据'
    : currentUser.role === 'manager'
      ? '当前仅展示你负责业务下成员的数据'
      : currentUser.role === 'leader'
        ? '当前仅展示你下层组员的数据'
        : '当前仅展示你自己的数据';

  const selectHtml = (name, options, value) => `
    <select onchange="setDcFilter('${name}', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:7px 10px;font-size:12px;outline:none;min-width:120px;cursor:pointer;">
      ${options.map(o => `<option value="${o.v}" ${value===o.v?'selected':''}>${o.l}</option>`).join('')}
    </select>`;

  const quickOpts = [
    ['today','今天'],['yesterday','昨天'],['last7','最近七天'],['thisweek','本周'],['lastweek','上周'],['thismonth','本月'],['lastmonth','上月']
  ];

  const dateInput = (name, value) => `<input type="date" value="${value||''}" onchange="setDcFilter('${name}', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:6px 8px;font-size:12px;outline:none;">`;

  const tzValue = Number(f.timezone) || 0;
  const tzLabel = (DC_TIMEZONE.find(o => o.v === tzValue) || DC_TIMEZONE[0]).l;
  const tzSelector = f.media === 'kwai'
    ? `<select onchange="setDcFilter('timezone', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:6px;color:#e0e0e0;padding:4px 8px;font-size:12px;outline:none;cursor:pointer;">
        ${DC_TIMEZONE.map(o => `<option value="${o.v}" ${tzValue===o.v?'selected':''}>🕒 ${o.l}</option>`).join('')}
      </select>`
    : `<span style="font-size:12px; color:#888; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:6px; padding:4px 10px; cursor:not-allowed;" title="TT 默认 UTC+0，不可切换">🕒 ${tzLabel}</span>`;

  const sumRow = `
    <tr style="background:#1a1a26; font-weight:600;">
      <td style="padding:12px 10px; color:#a78bfa;">汇总</td>
      <td colspan="3" style="padding:12px 10px; color:#666;">—</td>
      <td style="padding:12px 10px;">${fmtMoney(sum.cost)}</td>
      <td style="padding:12px 10px;">${fmtInt(sum.imp)}</td>
      <td style="padding:12px 10px;">${fmtInt(sum.click)}</td>
      <td style="padding:12px 10px;">${fmtInt(sum.conv)}</td>
      <td style="padding:12px 10px;">${sum.conv?fmtMoney(sumCpa):'-'}</td>
      <td style="padding:12px 10px;">${fmtPct(sumCtr)}</td>
      <td style="padding:12px 10px;">${fmtPct(sumCvr)}</td>
      <td style="padding:12px 10px; color:#4ade80;">${sumRoas.toFixed(2)}</td>
      <td style="padding:12px 10px; color:#666;">—</td>
    </tr>`;

  const rows = pageList.map(v => {
    const cpa = v.conv ? v.cost/v.conv : 0;
    const ctr = v.imp ? v.click/v.imp : 0;
    const cvr = v.click ? v.conv/v.click : 0;
    const roas = v.cost ? v.value/v.cost : 0;
    const isJumpOpen = dcJumpOpen === v.id;
    const thumbAccent = (v.thumbHue + 40) % 360;
    return `
    <tr style="border-bottom:1px solid #1e1e2e;" onmouseenter="this.style.background='#141420'" onmouseleave="this.style.background=''">
      <td style="padding:10px;">
        <button
          type="button"
          class="dc-video-thumb"
          style="--thumb-hue:${v.thumbHue}; --thumb-accent:${thumbAccent};"
          onclick="openVideoPlayerModalById('${v.id}', this)"
          aria-label="播放视频预览：${escapeHtml(v.name)}"
        >
          <span class="dc-video-thumb__play">${VIDEO_PLAYER_ICONS.play}</span>
          ${v.duration ? `<span class="dc-video-thumb__duration">${escapeHtml(v.duration)}</span>` : ''}
        </button>
      </td>
      <td style="padding:10px; max-width:240px;">
        <div style="font-size:13px; color:#e0e0e0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${v.name}</div>
        <div style="font-size:11px; color:#666;">ID: ${v.id}</div>
      </td>
      <td style="padding:10px; font-size:12px; color:#ccc;">${v.language}</td>
      <td style="padding:10px; font-size:12px; color:#ccc; white-space:nowrap;">${v.createdAt}</td>
      <td style="padding:10px; font-size:13px;">${fmtMoney(v.cost)}</td>
      <td style="padding:10px; font-size:13px;">${fmtInt(v.imp)}</td>
      <td style="padding:10px; font-size:13px;">${fmtInt(v.click)}</td>
      <td style="padding:10px; font-size:13px;">${fmtInt(v.conv)}</td>
      <td style="padding:10px; font-size:13px;">${fmtMoney(cpa)}</td>
      <td style="padding:10px; font-size:13px;">${fmtPct(ctr)}</td>
      <td style="padding:10px; font-size:13px;">${fmtPct(cvr)}</td>
      <td style="padding:10px; font-size:13px; color:#4ade80;">${roas.toFixed(2)}</td>
      <td style="padding:10px; position:relative;">
        <button onclick="toggleDcJump('${v.id}', event)" style="background:#16161f; border:1px solid #2a2a3a; border-radius:6px; color:#a78bfa; font-size:12px; padding:5px 10px; cursor:pointer; white-space:nowrap;">跳转 ▾</button>
        ${isJumpOpen ? `<div style="position:absolute; top:calc(100% + 4px); right:10px; background:#1a1a26; border:1px solid #2a2a3a; border-radius:8px; padding:4px; z-index:30; min-width:180px; box-shadow:0 8px 24px #000a;">
          ${v.taskId ? `<div onclick="dcJumpToTask('${v.id}')" style="padding:8px 12px; cursor:pointer; border-radius:6px; font-size:12px; color:#e0e0e0;" onmouseenter="this.style.background='#2a2a3a'" onmouseleave="this.style.background=''">🎯 查看原始任务</div>` : `<div style="padding:8px 12px; font-size:11px; color:#666;">无关联任务</div>`}
        </div>` : ''}
      </td>
    </tr>`;
  }).join('');
  const paginationHtml = buildInlinePagination({
    page: dcPager.page,
    totalCount: list.length,
    pageSize: DC_PAGE_SIZE,
    onPageChange: 'setDcPage',
    unitLabel: '条',
  });

  container.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
      <div class="page-title" style="margin:0;">数据中心</div>
    </div>

    <div style="background:#11111a; border:1px solid #1e1e2e; border-radius:12px; padding:16px; margin-bottom:20px;">
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:14px;">
        <div style="position:relative; flex:1; max-width:420px;">
          <span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:#666; font-size:13px;">🔍</span>
          <input type="text" value="${f.q}" oninput="dataCenterFilter.q=this.value" onkeydown="if(event.key==='Enter'){dcPage=1;renderDataCenterPage();}" placeholder="请输入视频名称/ID" style="width:100%; background:#16161f; border:1px solid #2a2a3a; border-radius:8px; color:#e0e0e0; padding:9px 12px 9px 34px; font-size:13px; outline:none;">
        </div>
        <button class="btn btn-primary btn-sm" onclick="dcPage=1; renderDataCenterPage()">搜索</button>
        <button class="btn btn-ghost btn-sm" onclick="resetDcFilter()">重置</button>
      </div>

      <div style="display:flex; flex-wrap:wrap; gap:10px 14px; align-items:center;">
        <div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#888;">媒体</span>${selectHtml('media', DC_MEDIA, f.media)}</div>
        ${showBusinessFilter ? `<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#888;">业务</span>${selectHtml('business', businessOpts, f.business)}</div>` : ''}
        <div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#888;">行业</span>${selectHtml('industry', DC_INDUSTRY, f.industry)}</div>
        <div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#888;">客户</span>${selectHtml('client', clientOpts, f.client)}</div>
        <div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#888;">产品</span>${selectHtml('product', productOpts, f.product)}</div>
        ${showPersonFilter ? `<div style="display:flex; align-items:center; gap:6px;"><span style="font-size:12px; color:#888;">人员</span>${selectHtml('person', peopleOpts, f.person)}</div>` : ''}
      </div>
      <div style="margin-top:10px; font-size:11px; color:#666;">${scopeHint}</div>

      <div style="display:flex; flex-wrap:wrap; gap:14px; align-items:center; margin-top:12px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:12px; color:#888;">创建时间</span>
          ${dateInput('createdFrom', f.createdFrom)}
          <span style="color:#666;">—</span>
          ${dateInput('createdTo', f.createdTo)}
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:12px; color:#888;">投放时间</span>
          ${dateInput('publishFrom', f.publishFrom)}
          <span style="color:#666;">—</span>
          ${dateInput('publishTo', f.publishTo)}
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:6px;">
          ${quickOpts.map(([k,l]) => `<span onclick="setDcPublishQuick('${k}')" style="font-size:11px; padding:4px 10px; border-radius:12px; border:1px solid ${f.publishQuick===k?'#7c3aed':'#2a2a3a'}; color:${f.publishQuick===k?'#c4b5fd':'#999'}; background:${f.publishQuick===k?'#7c3aed22':'transparent'}; cursor:pointer;">${l}</span>`).join('')}
        </div>
      </div>
    </div>

    <div style="background:#11111a; border:1px solid #1e1e2e; border-radius:12px; overflow:hidden;">
      <div style="padding:12px 16px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #1e1e2e;">
        <div style="font-size:13px; color:#888;">共 <strong style="color:#e0e0e0;">${list.length}</strong> 条视频${isMember ? '（仅展示本人视频）' : currentUser.role === 'leader' ? '（仅展示下层组员视频）' : currentUser.role === 'manager' ? '（仅展示负责业务成员视频）' : ''}</div>
        ${tzSelector}
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; min-width:1500px;">
          <thead>
            <tr style="background:#0a0a0f; color:#888; font-size:12px; text-align:left;">
              <th style="padding:10px; font-weight:500;">视频</th>
              <th style="padding:10px; font-weight:500;">视频名称</th>
              <th style="padding:10px; font-weight:500;">语言</th>
              <th style="padding:10px; font-weight:500;">创建时间</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">花费 (USD)</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">曝光量</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">点击数</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">转化数</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">转化成本</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">CTR</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">CVR</th>
              <th style="padding:10px; font-weight:500; color:#4ade80;">ROAS</th>
              <th style="padding:10px; font-weight:500;">操作</th>
            </tr>
          </thead>
          <tbody>
            ${sumRow}
            ${rows || `<tr><td colspan="13" style="padding:40px; text-align:center; color:#666;">暂无符合条件的视频</td></tr>`}
          </tbody>
        </table>
      </div>
      ${paginationHtml}
    </div>
  `;
}

// ============ Production Stats ============
let statsTab = 'personal';
let statsFilter = {
  scope: 'all',          // all / personal / team
  industry: 'all',
  client: 'all',
  product: 'all',
  quick: 'all',          // all / today / week / month / custom
  dateFrom: '',
  dateTo: '',
  trendTask: true,
  trendVideo: true,
  distTool: true,
  distWorkflow: true,
  member: 'all',         // leader-level
  group: 'all',          // manager-level
  business: 'all',       // superadmin-level
};

let teamMemberOverviewCollapsed = false;
function toggleTeamMemberOverview() {
  teamMemberOverviewCollapsed = !teamMemberOverviewCollapsed;
  renderStatsPage();
}

function setStatsTab(tab) {
  statsTab = tab;
  syncStatsCascadingSelections();
  renderStatsPage();
}
function setStatsFilter(k, v) {
  statsFilter[k] = v;
  syncStatsCascadingSelections();
  renderStatsPage();
}
function toggleStatsFlag(k) { statsFilter[k] = !statsFilter[k]; renderStatsPage(); }
function setStatsQuick(q) {
  statsFilter.quick = q;
  // Use demo base date (2026-04-14) so quick filters line up with seeded MOCK_TASKS / file timestamps.
  const d = new Date('2026-04-14T00:00:00');
  const pad = n => String(n).padStart(2,'0');
  const fmt = dt => dt.getFullYear() + '-' + pad(dt.getMonth()+1) + '-' + pad(dt.getDate());
  if (q === 'all') { statsFilter.dateFrom = ''; statsFilter.dateTo = ''; }
  else if (q === 'today') { statsFilter.dateFrom = fmt(d); statsFilter.dateTo = fmt(d); }
  else if (q === 'week') { const s = new Date(d); const day = (s.getDay()+6)%7; s.setDate(s.getDate()-day); statsFilter.dateFrom = fmt(s); statsFilter.dateTo = fmt(d); }
  else if (q === 'month') { statsFilter.dateFrom = fmt(new Date(d.getFullYear(), d.getMonth(), 1)); statsFilter.dateTo = fmt(d); }
  renderStatsPage();
}

function getStatsTabsForRole() {
  const role = currentUser.role;
  if (role === 'member') return [{ id: 'personal', label: '个人统计' }];
  return [
    { id: 'personal', label: '个人统计' },
    { id: 'team', label: '团队统计' },
  ];
}

function getStatsPersonalTaskIds() {
  const taskIds = new Set(MOCK_TASKS.filter(t => getTaskCreatorIds(t.id).has(currentUser.id)).map(t => t.id));
  getAllDcVideos().filter(v => v.uploader === currentUser.id).forEach(v => { if (v.taskId) taskIds.add(v.taskId); });
  return taskIds;
}

function getStatsTeamMemberList() {
  if (currentUser.role === 'leader') {
    const allMembers = getLeaderMembers();
    return statsFilter.member === 'all' ? allMembers : allMembers.filter(user => user.id === statsFilter.member);
  }
  if (currentUser.role === 'manager') {
    let memberList = getManagerScopeMembers(currentUser.managerScopeId);
    if (statsFilter.group !== 'all') memberList = memberList.filter(user => user.subgroupKey === statsFilter.group);
    return memberList;
  }
  if (currentUser.role === 'superadmin') {
    let memberList = users.filter(user => user.role !== 'superadmin');
    if (statsFilter.business !== 'all') memberList = memberList.filter(user => user.businessId === statsFilter.business);
    return memberList;
  }
  return [];
}

function getStatsBaseTasksForCurrentTab() {
  if (statsTab === 'personal') {
    const taskIds = getStatsPersonalTaskIds();
    return MOCK_TASKS.filter(task => taskIds.has(task.id));
  }
  const memberIds = new Set(getStatsTeamMemberList().map(user => user.id));
  return filterTasksForMembers(MOCK_TASKS, memberIds);
}

function getStatsTaskProjects(task) {
  const matches = [];
  const seen = new Set();
  projects.forEach(project => {
    let matched = false;
    (project.folders || []).forEach(folder => {
      (folder.files || []).forEach(file => {
        if (!matched && file.taskId === task.id) matched = true;
      });
    });
    if (matched && !seen.has(project.id)) {
      seen.add(project.id);
      matches.push(project);
    }
  });
  if (!matches.length && task.product && task.product !== '—') {
    projects.forEach(project => {
      if (project.product === task.product && !seen.has(project.id)) {
        seen.add(project.id);
        matches.push(project);
      }
    });
  }
  return matches;
}

function getStatsTaskProjectEntries(task) {
  const entries = [];
  const seen = new Set();
  getStatsTaskProjects(task).forEach(project => {
    const entry = {
      industry: dcDeriveIndustry(project),
      client: project.client || '',
      product: project.product || task.product || '',
    };
    const key = entry.industry + '||' + entry.client + '||' + entry.product;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push(entry);
    }
  });
  if (!entries.length && task.product && task.product !== '—') {
    entries.push({
      industry: dcDeriveIndustry({ product: task.product, client: '' }),
      client: '',
      product: task.product,
    });
  }
  return entries;
}

function matchesStatsProjectEntries(entries, filter = statsFilter) {
  const list = Array.isArray(entries) ? entries : [];
  if (filter.industry && filter.industry !== 'all' && !list.some(entry => entry.industry === filter.industry)) return false;
  if (filter.client && filter.client !== 'all' && !list.some(entry => entry.client === filter.client)) return false;
  if (filter.product && filter.product !== 'all' && !list.some(entry => entry.product === filter.product)) return false;
  return true;
}

function filterStatsTasksByScope(tasks, filter = statsFilter) {
  if (!filter.scope || filter.scope === 'all') return tasks.slice();
  return tasks.filter(task => getTaskProjectScope(task.id) === filter.scope);
}

function buildStatsOptionList(values) {
  const seen = new Set();
  const opts = [];
  values.forEach(value => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    opts.push({ v: value, l: value });
  });
  return opts;
}

function getStatsCascadingOptions(filter = statsFilter) {
  const items = [];
  const seen = new Set();
  filterStatsTasksByScope(getStatsBaseTasksForCurrentTab(), filter).forEach(task => {
    getStatsTaskProjectEntries(task).forEach(entry => {
      const key = entry.industry + '||' + entry.client + '||' + entry.product;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(entry);
      }
    });
  });

  const industryOpts = [
    { v: 'all', l: '全部' },
    ...PROJECT_INDUSTRY_OPTIONS.filter(option => items.some(item => item.industry === option.v)),
  ];
  const clientPool = items.filter(item => filter.industry === 'all' || item.industry === filter.industry);
  const clientOpts = [{ v: 'all', l: '全部' }, ...buildStatsOptionList(clientPool.map(item => item.client))];
  const productPool = clientPool.filter(item => filter.client === 'all' || item.client === filter.client);
  const productOpts = [{ v: 'all', l: '全部' }, ...buildStatsOptionList(productPool.map(item => item.product))];

  return { industryOpts, clientOpts, productOpts };
}

function syncStatsCascadingSelections() {
  const normalized = {
    industry: statsFilter.industry,
    client: statsFilter.client,
    product: statsFilter.product,
  };

  let options = getStatsCascadingOptions({ ...statsFilter, ...normalized });
  if (!options.industryOpts.some(option => option.v === normalized.industry)) normalized.industry = 'all';

  options = getStatsCascadingOptions({ ...statsFilter, ...normalized });
  if (!options.clientOpts.some(option => option.v === normalized.client)) normalized.client = 'all';

  options = getStatsCascadingOptions({ ...statsFilter, ...normalized });
  if (!options.productOpts.some(option => option.v === normalized.product)) normalized.product = 'all';

  statsFilter.industry = normalized.industry;
  statsFilter.client = normalized.client;
  statsFilter.product = normalized.product;

  return getStatsCascadingOptions(statsFilter);
}

// ===== Stats aggregation helpers (all sourced from real MOCK_TASKS + projects) =====
// "生成视频" = 任务真正产出的视频文件（outputs 列表中 .mp4/.mov/.webm 且状态为 done），
// 不是素材库里被保存的视频。失败/生成中的视频输出不计入已产出数量。
function isVideoOutputName(name) {
  return /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(name || '');
}
function collectProducedVideos(tasks) {
  const list = [];
  tasks.forEach(t => {
    const projectEntries = getStatsTaskProjectEntries(t);
    const primaryEntry = projectEntries[0] || { industry: '', client: '', product: t.product || '' };
    (t.outputs || []).forEach(o => {
      if (!isVideoOutputName(o.name)) return;
      if (o.status && o.status !== 'done') return;
      list.push({
        name: o.name,
        taskId: t.id,
        task: t,
        createdAt: t.createdAt,
        industry: primaryEntry.industry,
        client: primaryEntry.client,
        product: primaryEntry.product || t.product,
        statsProjectEntries: projectEntries,
        videoModel: t.videoModel,
        source: t.source,
        toolName: t.toolName,
        status: o.status || 'done',
      });
    });
  });
  return list;
}
function filterProducedVideos(videos) {
  let list = videos.slice();
  list = list.filter(video => matchesStatsProjectEntries(video.statsProjectEntries || [], statsFilter));
  return applyStatsDateFilter(list, v => v.createdAt);
}
function applyStatsDateFilter(list, keyFn) {
  const f = statsFilter;
  let out = list;
  if (f.dateFrom) out = out.filter(x => (keyFn(x) || '').slice(0,10) >= f.dateFrom);
  if (f.dateTo) out = out.filter(x => (keyFn(x) || '').slice(0,10) <= f.dateTo);
  return out;
}
function getTaskProjectScope(taskId) {
  // Returns 'personal' if task belongs only to personal projects (specific_users), 'team' otherwise
  const scopes = [];
  projects.forEach(proj => {
    (proj.folders || []).forEach(folder => {
      (folder.files || []).forEach(file => {
        if (file.taskId === taskId) {
          scopes.push((proj.visibleTo || {}).type === 'specific_users' ? 'personal' : 'team');
        }
      });
    });
  });
  if (!scopes.length) return 'team';
  return scopes.includes('team') ? 'team' : 'personal';
}
function filterStatsTasks(tasks) {
  let list = filterStatsTasksByScope(tasks, statsFilter);
  list = list.filter(task => matchesStatsProjectEntries(getStatsTaskProjectEntries(task), statsFilter));
  return applyStatsDateFilter(list, t => t.createdAt);
}
function filterStatsVideos(videos) {
  let list = videos.slice();
  list = list.filter(video => matchesStatsProjectEntries(video.statsProjectEntries || [], statsFilter));
  return applyStatsDateFilter(list, v => v.createdAt);
}
function getTaskCreatorIds(taskId) {
  const ids = new Set();
  projects.forEach(proj => (proj.folders || []).forEach(folder => (folder.files || []).forEach(file => {
    if (file.taskId === taskId && file.creator) ids.add(file.creator);
  })));
  return ids;
}
function filterTasksForMembers(tasks, memberIds) {
  if (!memberIds || !memberIds.size) return tasks;
  return tasks.filter(t => {
    const creators = getTaskCreatorIds(t.id);
    if (!creators.size) return false;
    for (const id of creators) if (memberIds.has(id)) return true;
    return false;
  });
}

function renderStatsPage() {
  const container = document.getElementById('stats-content');
  if (!container) return;

  const tabs = getStatsTabsForRole();
  if (!tabs.find(t => t.id === statsTab)) statsTab = 'personal';
  syncStatsCascadingSelections();

  const role = currentUser.role;
  const filterBarHtml = buildStatsFilterBar();
  let contentHtml = '';

  if (statsTab === 'personal') {
    // 个人统计（所有角色）= 通过文件 creator / 视频 uploader 关联到当前用户的任务
    const myTaskIds = getStatsPersonalTaskIds();
    const myTasks = filterStatsTasks(MOCK_TASKS.filter(task => myTaskIds.has(task.id)));
    const myProducedVideos = collectProducedVideos(myTasks);
    const myVideos = filterProducedVideos(myProducedVideos);
    const data = { tasks: myTasks, videos: myVideos };
    contentHtml = buildStatsOverview(data)
      + buildStatsTrend(data)
      + buildStatsDistribution(data)
      + buildStatsModelDistribution(data);
  } else {
    if (role === 'leader') contentHtml = buildTeamStatsLeader();
    else if (role === 'manager') contentHtml = buildTeamStatsManager();
    else contentHtml = buildTeamStatsSuperadmin();
  }

  container.innerHTML = '<div class="page-title">生产统计</div>'
    + '<div class="tab-switch" style="margin-bottom:20px;">'
    + tabs.map(function(t) {
        return '<div class="tab-switch-item ' + (statsTab === t.id ? 'active' : '') + '" onclick="setStatsTab(\'' + t.id + '\')">' + t.label + '</div>';
      }).join('')
    + '</div>'
    + filterBarHtml
    + contentHtml;
}

function buildStatsFilterBar() {
  const f = statsFilter;
  const scopeChips = [
    { v:'all', l:'全部' }, { v:'personal', l:'个人项目' }, { v:'team', l:'团队项目' }
  ];
  const quickChips = [
    { v:'all', l:'全部' }, { v:'today', l:'今天' }, { v:'week', l:'本周' }, { v:'month', l:'本月' }
  ];
  const { industryOpts, clientOpts, productOpts } = syncStatsCascadingSelections();
  const selectHtml = (name, options, value) => `
    <select onchange="setStatsFilter('${name}', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:7px 10px;font-size:12px;outline:none;min-width:120px;cursor:pointer;">
      ${options.map(option => `<option value="${option.v}" ${value===option.v?'selected':''}>${option.l}</option>`).join('')}
    </select>`;

  return `
    <div style="background:#11111a; border:1px solid #1e1e2e; border-radius:12px; padding:14px 16px; margin-bottom:20px; display:flex; flex-wrap:wrap; gap:14px; align-items:center;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:12px; color:#888;">项目属性</span>
        <div style="display:flex; gap:4px;">
          ${scopeChips.map(c => `<span onclick="setStatsFilter('scope','${c.v}')" style="font-size:11px; padding:5px 12px; border-radius:14px; border:1px solid ${f.scope===c.v?'#7c3aed':'#2a2a3a'}; color:${f.scope===c.v?'#c4b5fd':'#999'}; background:${f.scope===c.v?'#7c3aed22':'transparent'}; cursor:pointer;">${c.l}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:12px; color:#888;">行业</span>
        ${selectHtml('industry', industryOpts, f.industry)}
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:12px; color:#888;">客户</span>
        ${selectHtml('client', clientOpts, f.client)}
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <span style="font-size:12px; color:#888;">产品</span>
        ${selectHtml('product', productOpts, f.product)}
      </div>
      <div style="display:flex; align-items:center; gap:4px;">
        ${quickChips.map(c => `<span onclick="setStatsQuick('${c.v}')" style="font-size:11px; padding:5px 12px; border-radius:14px; border:1px solid ${f.quick===c.v?'#7c3aed':'#2a2a3a'}; color:${f.quick===c.v?'#c4b5fd':'#999'}; background:${f.quick===c.v?'#7c3aed22':'transparent'}; cursor:pointer;">${c.l}</span>`).join('')}
      </div>
      <div style="display:flex; align-items:center; gap:6px; margin-left:auto;">
        <span style="font-size:12px; color:#888;">时间范围</span>
        <input type="date" value="${f.dateFrom||''}" onchange="statsFilter.quick='custom'; setStatsFilter('dateFrom', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:6px 8px;font-size:12px;outline:none;">
        <span style="color:#666;">—</span>
        <input type="date" value="${f.dateTo||''}" onchange="statsFilter.quick='custom'; setStatsFilter('dateTo', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:6px 8px;font-size:12px;outline:none;">
      </div>
    </div>`;
}

function buildStatsOverview({ tasks, videos }) {
  const toolN = tasks.filter(t => t.source === 'toolbox').length;
  const wfN = tasks.filter(t => t.source === 'workflow').length;
  return `
    <div class="stats-row" style="grid-template-columns:repeat(2,1fr); margin-bottom:20px;">
      <div class="stat-card">
        <div class="label">总任务数</div>
        <div class="value" style="color:#a78bfa;">${tasks.length}</div>
        <div class="trend" style="color:#888;">工具 ${toolN} · 工作流 ${wfN}</div>
      </div>
      <div class="stat-card">
        <div class="label">生成视频</div>
        <div class="value" style="color:#4ade80;">${videos.length}</div>
        <div class="trend" style="color:#888;">来源：任务中心中的视频文件</div>
      </div>
    </div>`;
}

function buildStatsTrend({ tasks, videos }) {
  const f = statsFilter;
  const base = new Date('2026-04-14T00:00:00');
  const pad = n => String(n).padStart(2,'0');

  // 根据时间范围动态确定日期区间
  let startDate, endDate, days;
  if (f.dateFrom && f.dateTo) {
    startDate = new Date(f.dateFrom + 'T00:00:00');
    endDate = new Date(f.dateTo + 'T00:00:00');
    days = Math.ceil((endDate - startDate) / (1000*60*60*24)) + 1;
  } else if (f.quick === 'today') {
    startDate = new Date(base); endDate = new Date(base); days = 1;
  } else if (f.quick === 'week') {
    endDate = new Date(base);
    startDate = new Date(base); startDate.setDate(startDate.getDate() - 6);
    days = 7;
  } else if (f.quick === 'month') {
    endDate = new Date(base);
    startDate = new Date(base); startDate.setDate(startDate.getDate() - 29);
    days = 30;
  } else {
    // 'all' 或无筛选：固定展示最近 30 天，个人/团队统计保持一致
    endDate = new Date(base);
    startDate = new Date(base); startDate.setDate(startDate.getDate() - 29);
    days = 30;
  }

  const labels = [];
  const dayKeys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate); d.setDate(d.getDate() + i);
    labels.push((d.getMonth()+1) + '/' + d.getDate());
    dayKeys.push(d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()));
  }
  const taskData = dayKeys.map(k => tasks.filter(t => (t.createdAt||'').slice(0,10) === k).length);
  const videoData = dayKeys.map(k => videos.filter(v => (v.createdAt||'').slice(0,10) === k).length);
  const maxV = Math.max(1, ...taskData, ...videoData) * 1.2;

  return `
    <div class="chart-card" style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <div class="section-title" style="margin:0;">每日生产趋势</div>
        <div style="display:flex; gap:14px; font-size:12px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="toggleStatsFlag('trendTask')">
            <span style="width:10px; height:10px; border-radius:2px; background:${f.trendTask?'#7c3aed':'#444'}; display:inline-block;"></span>
            <span style="color:${f.trendTask?'#c4b5fd':'#666'};">任务</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="toggleStatsFlag('trendVideo')">
            <span style="width:10px; height:10px; border-radius:2px; background:${f.trendVideo?'#06b6d4':'#444'}; display:inline-block;"></span>
            <span style="color:${f.trendVideo?'#67e8f9':'#666'};">视频</span>
          </label>
        </div>
      </div>
      <div style="display:flex; align-items:flex-end; gap:4px; height:200px; padding-top:10px;">
        ${labels.map((lbl,i) => {
          const tH = taskData[i] ? Math.max(4, taskData[i]/maxV*170) : 0;
          const vH = videoData[i] ? Math.max(4, videoData[i]/maxV*170) : 0;
          return `
          <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; min-width:0;">
            <div style="display:flex; gap:2px; align-items:flex-end; height:170px; width:100%;">
              ${f.trendTask?`<div style="flex:1; background:linear-gradient(to top, #6d28d9, #a78bfa); border-radius:2px 2px 0 0; height:${tH.toFixed(1)}px;" title="${lbl} · 任务 ${taskData[i]}"></div>`:''}
              ${f.trendVideo?`<div style="flex:1; background:linear-gradient(to top, #0891b2, #22d3ee); border-radius:2px 2px 0 0; height:${vH.toFixed(1)}px;" title="${lbl} · 视频 ${videoData[i]}"></div>`:''}
            </div>
            <div style="font-size:9px; color:#666; white-space:nowrap;">${lbl}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function buildStatsDistribution({ tasks }) {
  const f = statsFilter;
  const toolCount = tasks.filter(t => t.source === 'toolbox').length;
  const workflowCount = tasks.filter(t => t.source === 'workflow').length;
  const itemsMap = new Map();
  tasks.forEach(t => {
    const key = (t.toolName || '未命名') + '||' + t.source;
    const entry = itemsMap.get(key) || { name: t.toolName || '未命名', kind: t.source === 'toolbox' ? 'tool' : 'workflow', count: 0 };
    entry.count++;
    itemsMap.set(key, entry);
  });
  const items = Array.from(itemsMap.values());
  const bothSelected = f.distTool && f.distWorkflow;
  let filteredItems = items.filter(i => (f.distTool && i.kind==='tool') || (f.distWorkflow && i.kind==='workflow'));
  filteredItems.sort((a,b) => b.count - a.count);
  const selectedTotal = filteredItems.reduce((s,i)=>s+i.count, 0);
  const totalTasks = toolCount + workflowCount;
  const denom = bothSelected ? totalTasks : selectedTotal;

  return `
    <div class="chart-card" style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
        <div class="section-title" style="margin:0;">任务分布</div>
        <div style="display:flex; gap:14px; font-size:12px;">
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="toggleStatsFlag('distTool')">
            <span style="width:14px; height:14px; border-radius:3px; border:1.5px solid ${f.distTool?'#0891b2':'#444'}; background:${f.distTool?'#0891b2':'transparent'}; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:10px;">${f.distTool?'✓':''}</span>
            <span style="color:${f.distTool?'#67e8f9':'#888'};">工具（${toolCount}次）</span>
          </label>
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer;" onclick="toggleStatsFlag('distWorkflow')">
            <span style="width:14px; height:14px; border-radius:3px; border:1.5px solid ${f.distWorkflow?'#7c3aed':'#444'}; background:${f.distWorkflow?'#7c3aed':'transparent'}; display:inline-flex; align-items:center; justify-content:center; color:#fff; font-size:10px;">${f.distWorkflow?'✓':''}</span>
            <span style="color:${f.distWorkflow?'#c4b5fd':'#888'};">工作流（${workflowCount}次）</span>
          </label>
        </div>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${filteredItems.map(it => {
          const pct = denom ? (it.count/denom*100) : 0;
          return `
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="flex:0 0 160px; font-size:12px; color:#e0e0e0;">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${it.kind==='tool'?'#06b6d4':'#a78bfa'}; margin-right:6px;"></span>${it.name}
            </div>
            <div style="flex:1; height:8px; background:#1a1a26; border-radius:4px; overflow:hidden;">
              <div style="height:100%; width:${pct.toFixed(1)}%; background:linear-gradient(90deg, ${it.kind==='tool'?'#0891b2, #22d3ee':'#6d28d9, #a78bfa'}); border-radius:4px;"></div>
            </div>
            <div style="flex:0 0 120px; text-align:right; font-size:12px; color:#888;">${it.count}次 · ${pct.toFixed(1)}%</div>
          </div>`;
        }).join('') || '<div style="color:#666; padding:20px; text-align:center; font-size:13px;">当前筛选条件下暂无任务</div>'}
        <div style="display:flex; align-items:center; justify-content:space-between; padding-top:12px; margin-top:4px; border-top:1px solid #1e1e2e;">
          <span style="font-size:13px; color:#888;">总计</span>
          <span style="font-size:14px; font-weight:600; color:#a78bfa;">${selectedTotal} 次调用</span>
        </div>
      </div>
    </div>`;
}

function buildStatsModelDistribution({ tasks }) {
  const MODEL_COLORS = { 'Grok': '#a78bfa', 'Veo 3.1': '#22d3ee' };
  const counts = new Map();
  tasks.forEach(t => { if (t.videoModel) counts.set(t.videoModel, (counts.get(t.videoModel) || 0) + 1); });
  const models = Array.from(counts.entries()).map(([name, count]) => ({
    name, count, color: MODEL_COLORS[name] || '#7c3aed'
  })).sort((a,b) => b.count - a.count);
  const total = models.reduce((s,m)=>s+m.count, 0);
  return `
    <div class="chart-card">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:14px;">
        <div class="section-title" style="margin:0;">视频模型分布</div>
        <span style="font-size:11px; color:#666;">仅统计调用 Grok / Veo 3.1 的任务</span>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${models.length ? models.map(m => {
          const pct = total ? (m.count/total*100) : 0;
          return `
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="flex:0 0 160px; font-size:12px; color:#e0e0e0;">${m.name}</div>
            <div style="flex:1; height:8px; background:#1a1a26; border-radius:4px; overflow:hidden;">
              <div style="height:100%; width:${pct.toFixed(1)}%; background:${m.color}; border-radius:4px;"></div>
            </div>
            <div style="flex:0 0 120px; text-align:right; font-size:12px; color:#888;">${m.count}次 · ${pct.toFixed(1)}%</div>
          </div>`;
        }).join('') : '<div style="color:#666; padding:20px; text-align:center; font-size:13px;">当前周期内暂无视频模型调用</div>'}
        <div style="display:flex; align-items:center; justify-content:space-between; padding-top:12px; margin-top:4px; border-top:1px solid #1e1e2e;">
          <span style="font-size:13px; color:#888;">总计</span>
          <span style="font-size:14px; font-weight:600; color:#a78bfa;">${total} 次调用</span>
        </div>
      </div>
    </div>`;
}

function getLeaderMembers() {
  return getDirectReportUsers(currentUser);
}
function getUserBusinessLabel(u) {
  if (!u?.businessId) return '—';
  return getBusinessOptionById(u.businessId)?.label || u.businessId;
}
function getGroupForUser(u) {
  return getUserOrgPath(u);
}

function computeMemberCounts(userList, filteredTasks) {
  const allVideos = getAllDcVideos();
  const filteredTaskIdSet = filteredTasks ? new Set(filteredTasks.map(t => t.id)) : null;
  return userList.map(u => {
    const uid = u.id;
    const videoCount = allVideos.filter(v => v.uploader === uid).length;
    const taskIds = new Set();
    projects.forEach(proj => (proj.folders || []).forEach(folder => (folder.files || []).forEach(f => {
      if (f.creator === uid && f.taskId) {
        if (!filteredTaskIdSet || filteredTaskIdSet.has(f.taskId)) taskIds.add(f.taskId);
      }
    })));
    return { user: u, taskCount: taskIds.size, videoCount };
  });
}

function buildTeamMemberOverview(memberList, filteredTasks, filterHtml = '') {
  const counts = computeMemberCounts(memberList, filteredTasks);
  const total = counts.length;
  const collapsed = teamMemberOverviewCollapsed;
  const cards = counts.map(({user: u, taskCount, videoCount}) => {
    const grp = getGroupForUser(u);
    return `
      <div style="background:#0f0f17; border:1px solid #1e1e2e; border-radius:8px; padding:8px 10px; display:flex; align-items:center; gap:8px; min-width:0;">
        <div style="width:24px; height:24px; border-radius:50%; background:${u.color}; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:600; flex-shrink:0;">${u.short}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:12px; color:#e0e0e0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.name}</div>
          <div style="font-size:10px; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${grp}">${grp || '—'}</div>
        </div>
        <div style="display:flex; gap:8px; flex-shrink:0;">
          <div title="任务数" style="font-size:11px; color:#a78bfa;">📋${taskCount}</div>
          <div title="视频数" style="font-size:11px; color:#4ade80;">🎬${videoCount}</div>
        </div>
      </div>`;
  }).join('');
  const body = total === 0
    ? `<div style="padding:20px; text-align:center; color:#666; font-size:12px;">暂无成员</div>`
    : `<div style="max-height:180px; overflow-y:auto; display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:8px; padding-right:4px;">${cards}</div>`;
  return `
    <div class="chart-card" style="margin-bottom:20px; padding:${collapsed ? '10px 16px' : '14px 16px'}; min-height:auto;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:${collapsed ? '0' : '10px'};">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <div class="section-title" style="margin:0;">成员概览</div>
          <span style="font-size:11px; color:#666;">共 ${total} 人</span>
          ${filterHtml}
        </div>
        <button onclick="toggleTeamMemberOverview()" style="background:#16161f; border:1px solid #2a2a3a; border-radius:6px; color:#a78bfa; font-size:11px; padding:4px 10px; cursor:pointer; flex-shrink:0;">${collapsed ? '展开 ▾' : '收起 ▴'}</button>
      </div>
      ${collapsed ? '' : body}
    </div>`;
}

function getTeamScopedData(memberList) {
  const memberIds = new Set(memberList.map(u => u.id));
  const tasks = filterStatsTasks(filterTasksForMembers(MOCK_TASKS, memberIds));
  const videos = filterProducedVideos(collectProducedVideos(tasks));
  return { tasks, videos };
}

function buildTeamStatsLeader() {
  const f = statsFilter;
  const allMembers = getLeaderMembers();
  const memberOpts = [{v:'all',l:'全员'}, ...allMembers.map(u=>({v:u.id,l:u.name}))];
  const selected = f.member === 'all' ? allMembers : allMembers.filter(u => u.id === f.member);
  const data = getTeamScopedData(selected);

  return `
    <div style="background:#11111a; border:1px solid #1e1e2e; border-radius:12px; padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
      <span style="font-size:12px; color:#888;">成员</span>
      <select onchange="setStatsFilter('member', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:6px 10px;font-size:12px;outline:none;min-width:180px;cursor:pointer;">
        ${memberOpts.map(o => `<option value="${o.v}" ${f.member===o.v?'selected':''}>${o.l}</option>`).join('')}
      </select>
      <span style="font-size:11px; color:#666; margin-left:8px;">默认全员，可按单个成员筛选</span>
    </div>
    ${buildTeamMemberOverview(selected, data.tasks)}
    ${buildStatsOverview(data)}
    ${buildStatsTrend(data)}
    ${buildStatsDistribution(data)}
    ${buildStatsModelDistribution(data)}
  `;
}

function buildTeamStatsManager() {
  const f = statsFilter;
  const groupOpts = [{v:'all',l:'全部分类'}, ...SUBGROUP_OPTIONS.map(option => ({ v: option.id, l: option.label }))];
  let memberList = getManagerScopeMembers(currentUser.managerScopeId);
  if (f.group !== 'all') memberList = memberList.filter(user => user.subgroupKey === f.group);
  const data = getTeamScopedData(memberList);

  return `
    <div style="background:#11111a; border:1px solid #1e1e2e; border-radius:12px; padding:14px 16px; margin-bottom:20px; display:flex; align-items:center; gap:8px;">
      <span style="font-size:12px; color:#888;">分类</span>
      <select onchange="setStatsFilter('group', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:6px 10px;font-size:12px;outline:none;min-width:200px;cursor:pointer;">
        ${groupOpts.map(o => `<option value="${o.v}" ${f.group===o.v?'selected':''}>${o.l}</option>`).join('')}
      </select>
      <span style="font-size:11px; color:#666; margin-left:8px;">默认显示当前业务下全部 a类 / b类</span>
    </div>
    ${buildTeamMemberOverview(memberList, data.tasks)}
    ${buildStatsOverview(data)}
    ${buildStatsTrend(data)}
    ${buildStatsDistribution(data)}
    ${buildStatsModelDistribution(data)}
  `;
}

function buildTeamStatsSuperadmin() {
  const f = statsFilter;
  const bizOpts = getDcBusinessOptions().map(b => ({ v: b.v, l: b.v === 'all' ? '全部业务' : b.l }));
  let memberList = users.filter(u => u.role !== 'superadmin');
  if (f.business && f.business !== 'all') memberList = memberList.filter(user => user.businessId === f.business);
  const data = getTeamScopedData(memberList);
  const bizFilterHtml = `
    <span style="display:flex; align-items:center; gap:4px; margin-left:4px;">
      <span style="font-size:11px; color:#888;">业务</span>
      <select onchange="setStatsFilter('business', this.value)" style="background:#16161f;border:1px solid #2a2a3a;border-radius:8px;color:#e0e0e0;padding:4px 8px;font-size:11px;outline:none;cursor:pointer;">
        ${bizOpts.map(o => `<option value="${o.v}" ${f.business===o.v?'selected':''}>${o.l}</option>`).join('')}
      </select>
    </span>`;

  return `
    ${buildTeamMemberOverview(memberList, data.tasks, bizFilterHtml)}
    ${buildStatsOverview(data)}
    ${buildStatsTrend(data)}
    ${buildStatsDistribution(data)}
    ${buildStatsModelDistribution(data)}
  `;
}

// ===== Assets Center =====
function getAssetFilterKeys() {
  return ['industry', 'business', 'client', 'product', 'folder'];
}
function normalizeAssetFilterArray(value) {
  if (Array.isArray(value)) return value.map(item => String(item)).filter(Boolean);
  if (value == null || value === '' || value === 'all') return [];
  return [String(value)];
}
function createAssetFilterState(type = 'all') {
  return {
    type,
    industry: [],
    business: [],
    client: [],
    product: [],
    folder: [],
  };
}
function normalizeAssetFilterState(filters) {
  const source = filters || {};
  return {
    type: source.type || 'all',
    industry: normalizeAssetFilterArray(source.industry),
    business: normalizeAssetFilterArray(source.business),
    client: normalizeAssetFilterArray(source.client),
    product: normalizeAssetFilterArray(source.product),
    folder: normalizeAssetFilterArray(source.folder),
  };
}
function cloneAssetFilterState(filters) {
  const normalized = normalizeAssetFilterState(filters);
  return {
    type: normalized.type,
    industry: [...normalized.industry],
    business: [...normalized.business],
    client: [...normalized.client],
    product: [...normalized.product],
    folder: [...normalized.folder],
  };
}
function matchesAssetMultiSelect(values, candidate) {
  return !values.length || values.includes(String(candidate));
}
let assetsCenterFilter = createAssetFilterState();

function clearAssetSelections(shouldRender = true, event) {
  if (event) event.stopPropagation();
  currentAssetSelection = new Set();
  if (shouldRender) renderAssetsCenter();
}
function setAssetsCenterFilter(key, value) {
  assetsCenterFilter[key] = value;
  if (key === 'type') clearAssetSelections(false);
  assetsCenterPage = 1;
  renderAssetsCenter();
}
function resetAssetsCenterFilters() {
  assetsCenterFilter = createAssetFilterState(assetsCenterFilter.type);
  clearAssetSelections(false);
  assetsCenterPage = 1;
  renderAssetsCenter();
}

// ===== Asset Filter Modal =====
let _assetFilterDraft = createAssetFilterState();
function openAssetFilterModal() {
  _assetFilterDraft = cloneAssetFilterState(assetsCenterFilter);
  showModal('asset-filters');
}
function getAssetFilterCascadingOptions() {
  const allItems = getAllAssetsData();
  const draft = normalizeAssetFilterState(_assetFilterDraft);

  const industryOpts = PROJECT_INDUSTRY_OPTIONS.filter(option => allItems.some(item => item.projectIndustry === option.v));
  const businessPool = allItems.filter(item => matchesAssetMultiSelect(draft.industry, item.projectIndustry));
  const businessOpts = getBusinessLines().filter(line => businessPool.some(item => item.projectBusiness === line.id));
  const clientPool = businessPool.filter(item => matchesAssetMultiSelect(draft.business, item.projectBusiness));
  const clientOpts = [...new Set(clientPool.map(item => item.projectClient).filter(Boolean))].sort();
  const productPool = clientPool.filter(item => matchesAssetMultiSelect(draft.client, item.projectClient));
  const productOpts = [...new Set(productPool.map(item => item.projectProduct).filter(Boolean))].sort();
  const folderPool = draft.product.length
    ? productPool.filter(item => matchesAssetMultiSelect(draft.product, item.projectProduct))
    : [];
  const folderMap = new Map();
  folderPool.forEach(item => {
    const key = String(item.folderId);
    if (!folderMap.has(key)) folderMap.set(key, { id: key, name: item.folderName });
  });
  const folderOpts = [...folderMap.values()];

  return { industryOpts, businessOpts, clientOpts, productOpts, folderOpts };
}
function pruneAssetFilterDraftSelections() {
  const opts = getAssetFilterCascadingOptions();
  const validValues = {
    industry: new Set(opts.industryOpts.map(option => option.v)),
    business: new Set(opts.businessOpts.map(option => option.id)),
    client: new Set(opts.clientOpts),
    product: new Set(opts.productOpts),
    folder: new Set(opts.folderOpts.map(option => String(option.id))),
  };
  getAssetFilterKeys().forEach(key => {
    _assetFilterDraft[key] = normalizeAssetFilterArray(_assetFilterDraft[key]).filter(value => validValues[key].has(String(value)));
  });
}
function getAssetFilterFields() {
  const opts = getAssetFilterCascadingOptions();
  return [
    { id: 'asset-filter-industry', key: 'industry', label: '行业', options: opts.industryOpts.map(option => ({ value: option.v, label: option.l })) },
    { id: 'asset-filter-business', key: 'business', label: '业务', options: opts.businessOpts.map(option => ({ value: option.id, label: option.label })) },
    { id: 'asset-filter-client', key: 'client', label: '客户', options: opts.clientOpts.map(option => ({ value: option, label: option })) },
    { id: 'asset-filter-product', key: 'product', label: '产品', options: opts.productOpts.map(option => ({ value: option, label: option })) },
    { id: 'asset-filter-folder', key: 'folder', label: '文件夹', options: opts.folderOpts.map(option => ({ value: String(option.id), label: option.name })) },
  ];
}
function renderAssetFilterModalBody() {
  const body = document.getElementById('modal-body');
  if (!body) return;
  const fields = getAssetFilterFields();

  body.innerHTML = `
    <h3>筛选条件</h3>
    <div class="task-filter-modal-note">支持在行业、业务、客户、产品和文件夹中多选组合筛选；筛完后可直接跨文件夹勾选视频并批量同步。</div>
    <div class="task-filter-modal-grid">
      ${fields.map(field => {
        const draft = _assetFilterDraft[field.key] || [];
        const isDisabled = field.key === 'folder' && !(_assetFilterDraft.product || []).length;
        const fieldLabel = field.key === 'folder' && isDisabled
          ? `${field.label} <span style="font-size:11px; color:#555; font-weight:normal;">（请先选择产品）</span>`
          : field.label;
        return `
        <div class="task-filter-modal-field${isDisabled ? ' disabled' : ''}">
          <label>${fieldLabel}</label>
          <div class="ms-combo${isDisabled ? ' disabled' : ''}" id="${field.id}" data-mode="asset" data-key="${field.key}" data-disabled="${isDisabled ? 'true' : 'false'}" data-options='${JSON.stringify(field.options)}'>
            <div class="ms-combo-box" ${isDisabled ? '' : `onclick="this.querySelector('.ms-combo-input').focus()"`}>
              ${draft.map(val => {
                const opt = field.options.find(option => option.value === val);
                return opt ? `<span class="ms-combo-tag">${opt.label}<span class="ms-tag-x" onmousedown="event.stopPropagation();msComboRemoveTag('${field.id}','${val}')">&times;</span></span>` : '';
              }).join('')}
              <input class="ms-combo-input" placeholder="${draft.length ? '' : '点击选择...'}"
                ${isDisabled ? 'disabled' : ''}
                onfocus="msComboFocus('${field.id}')"
                onblur="msComboBlur('${field.id}')"
                oninput="msComboFilter('${field.id}', this.value)">
            </div>
            <span class="ms-combo-chevron">▾</span>
            <div class="ms-combo-dropdown">
              ${field.options.map(option => `
                <div class="ms-combo-option ${draft.includes(option.value) ? 'selected' : ''}"
                     data-value="${option.value}" data-label="${option.label}"
                     onmousedown="event.preventDefault();msComboToggle('${field.id}','${option.value}')">
                  <span class="ms-check">${draft.includes(option.value) ? '✓' : ''}</span>
                  ${option.label}
                </div>
              `).join('')}
              <div class="ms-combo-empty" style="display:none;">无匹配项</div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="hideModal()">取消</button>
      <button class="btn btn-ghost" onclick="clearAssetFilterSelections()">清空筛选</button>
      <button class="btn btn-primary" onclick="applyAssetFilterForm()">应用筛选</button>
    </div>
  `;
}
function clearAssetFilterSelections() {
  _assetFilterDraft = createAssetFilterState();
  renderAssetFilterModalBody();
}
function applyAssetFilterForm() {
  assetsCenterFilter = {
    ...cloneAssetFilterState(_assetFilterDraft),
    type: assetsCenterFilter.type,
  };
  clearAssetSelections(false);
  assetsCenterPage = 1;
  hideModal();
  renderAssetsCenter();
}

function getProjectSyncTarget(proj) {
  const projectName = (proj && proj.client) || '品牌';
  if (proj && proj.media === 'tt') return 'TT-' + projectName + '官方号';
  if (proj && proj.media === 'kwai+tt') return 'Kwai+TT-' + projectName + '官方号';
  return 'Kwai-' + projectName + '官方号';
}

function getAllAssetsData() {
  const items = [];
  projects.filter(p => canSeeProject(p)).forEach(proj => {
    const projIndustry = dcDeriveIndustry(proj);
    const projBusiness = dcDeriveBusiness(proj);
    proj.folders.filter(f => canSeeFolder(f)).forEach(folder => {
      folder.files.forEach(file => {
        if (!file.hasOwnProperty('synced')) {
          const isVideo = getFileType(file) === 'video';
          file.synced = isVideo && file.status === 'done' && Math.random() > 0.4;
          if (file.synced) {
            file.syncedAt = '2026-03-' + (25 + Math.floor(Math.random() * 5)) + ' ' + Math.floor(10 + Math.random() * 12) + ':' + String(Math.floor(Math.random() * 60)).padStart(2, '0');
            file.syncedTo = getProjectSyncTarget(proj);
          }
        }
        items.push({
          ...file,
          _fileRef: file,
          fileType: getFileType(file),
          projectId: proj.id,
          projectName: proj.name,
          projectColor: proj.color,
          projectClient: proj.client || '',
          projectProduct: proj.product || '',
          projectIndustry: projIndustry,
          projectBusiness: projBusiness,
          folderId: folder.id,
          folderName: folder.name,
          folderVisibility: folder.visibility,
        });
      });
    });
  });
  return items;
}
function getFilteredAssetsItems(filters = assetsCenterFilter) {
  const normalized = normalizeAssetFilterState(filters);
  return getAllAssetsData().filter(item => {
    if (normalized.type !== 'all' && item.fileType !== normalized.type) return false;
    if (!matchesAssetMultiSelect(normalized.industry, item.projectIndustry)) return false;
    if (!matchesAssetMultiSelect(normalized.business, item.projectBusiness)) return false;
    if (!matchesAssetMultiSelect(normalized.client, item.projectClient)) return false;
    if (!matchesAssetMultiSelect(normalized.product, item.projectProduct)) return false;
    if (!matchesAssetMultiSelect(normalized.folder, item.folderId)) return false;
    return true;
  });
}
function getAssetSelectionKey(assetOrProjectId, folderId, fileName) {
  if (assetOrProjectId && typeof assetOrProjectId === 'object') {
    return `${assetOrProjectId.projectId}:${assetOrProjectId.folderId}:${assetOrProjectId.name}`;
  }
  return `${assetOrProjectId}:${folderId}:${fileName}`;
}
function pruneAssetSelections(items) {
  const validKeys = new Set(items.filter(item => item.fileType === 'video').map(item => getAssetSelectionKey(item)));
  currentAssetSelection.forEach(key => {
    if (!validKeys.has(key)) currentAssetSelection.delete(key);
  });
}
function toggleAssetSelection(projectId, folderId, fileName, checked, event) {
  if (event) event.stopPropagation();
  const key = getAssetSelectionKey(projectId, folderId, fileName);
  if (checked) currentAssetSelection.add(key);
  else currentAssetSelection.delete(key);
  renderAssetsCenter();
}
function selectAllFilteredAssetVideos(event) {
  if (event) event.stopPropagation();
  currentAssetSelection = new Set(getFilteredAssetsItems(assetsCenterFilter)
    .filter(item => item.fileType === 'video')
    .map(item => getAssetSelectionKey(item)));
  renderAssetsCenter();
}
function syncSelectedAssets(event) {
  if (event) event.stopPropagation();
  const selectedItems = getAllAssetsData().filter(item =>
    item.fileType === 'video' && currentAssetSelection.has(getAssetSelectionKey(item)));
  if (!selectedItems.length) {
    toast('请先勾选要同步的视频素材');
    return;
  }
  const now = new Date();
  const ts = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  let syncedCount = 0;
  selectedItems.forEach(item => {
    if (!item._fileRef.synced) syncedCount++;
    item._fileRef.synced = true;
    item._fileRef.syncedAt = ts;
    item._fileRef.syncedTo = getProjectSyncTarget(projects.find(project => project.id === item.projectId));
  });
  currentAssetSelection = new Set();
  renderAssetsCenter();
  if (syncedCount > 0) {
    toast(`${syncedCount} 个视频已批量同步`);
  } else {
    toast('选中的视频均已同步');
  }
}

function goToTaskFromAsset(taskId) {
  currentTaskDetailId = taskId;
  currentTaskDetailNodeId = null;
  currentTaskOutputScopeKey = '';
  currentTaskOutputSelection = new Set();
  _taskWfInitialized = false;
  goPage('tasks');
}

function syncAsset(projectId, folderId, fileName, event) {
  if (event) event.stopPropagation();
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;
  const folder = proj.folders.find(f => f.id === folderId);
  if (!folder) return;
  const file = folder.files.find(f => f.name === fileName);
  if (!file) return;
  const now = new Date();
  const ts = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  file.synced = true;
  file.syncedAt = ts;
  file.syncedTo = getProjectSyncTarget(proj);
  renderAssetsCenter();
  toast(file.synced ? '"' + fileName + '" 已同步到 ' + file.syncedTo : '"' + fileName + '" 同步失败');
}

function syncFolderAssets(projectId, folderId, event) {
  if (event) event.stopPropagation();
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;
  const folder = proj.folders.find(f => f.id === folderId);
  if (!folder) return;
  const now = new Date();
  const ts = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0') + ' ' + String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const target = getProjectSyncTarget(proj);
  let count = 0;
  folder.files.forEach(file => {
    if (getFileType(file) === 'video' && !file.synced) {
      file.synced = true;
      file.syncedAt = ts;
      file.syncedTo = target;
      count++;
    }
  });
  renderAssetsCenter();
  if (count > 0) {
    toast('文件夹「' + folder.name + '」中 ' + count + ' 个视频已批量同步到 ' + target);
  } else {
    toast('文件夹「' + folder.name + '」中所有视频均已同步');
  }
}

function renderAssetsCenter() {
  const container = document.getElementById('assets-center-content');
  if (!container) return;

  const f = normalizeAssetFilterState(assetsCenterFilter);
  const allItems = getAllAssetsData();
  let filtered = getFilteredAssetsItems(f);
  pruneAssetSelections(allItems);

  const assetsPager = getInlinePaginationState(filtered.length, assetsCenterPage, ASSETS_CENTER_PAGE_SIZE);
  if (assetsCenterPage !== assetsPager.page) assetsCenterPage = assetsPager.page;
  const pageItems = filtered.slice(assetsPager.start, assetsPager.end);

  const scriptCount = allItems.filter(i => i.fileType === 'script').length;
  const videoCount = allItems.filter(i => i.fileType === 'video').length;
  const syncedCount = allItems.filter(i => i.fileType === 'video' && i._fileRef.synced).length;
  const filteredVideoItems = filtered.filter(item => item.fileType === 'video');
  const selectedVideoItems = filteredVideoItems.filter(item => currentAssetSelection.has(getAssetSelectionKey(item)));
  const selectedUnsyncedVideoItems = selectedVideoItems.filter(item => !item._fileRef.synced);

  // Batch sync: keep folder-level shortcut when a single folder is selected
  let batchSyncHtml = '';
  if (f.folder.length === 1) {
    const selectedFolderId = Number(f.folder[0]);
    const folderVideos = filtered.filter(i => i.fileType === 'video');
    const folderUnsyncedVideos = folderVideos.filter(i => !i._fileRef.synced);
    const folderItem = filtered.find(i => i.folderId === selectedFolderId);
    if (folderVideos.length > 0 && folderItem) {
      batchSyncHtml = '<div style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:#1a1a2e; border:1px solid #2a2a3a; border-radius:10px; margin-bottom:16px;">'
        + '<span style="font-size:13px; color:#ccc;">📁 ' + folderItem.folderName + '</span>'
        + '<span style="font-size:12px; color:#888;">共 ' + folderVideos.length + ' 个视频，' + folderUnsyncedVideos.length + ' 个未同步</span>'
        + '<button onclick="syncFolderAssets(' + folderItem.projectId + ', ' + folderItem.folderId + ', event)" style="margin-left:auto; background:' + (folderUnsyncedVideos.length > 0 ? '#7c3aed' : '#333') + '; color:#fff; border:none; border-radius:8px; padding:8px 18px; font-size:13px; cursor:' + (folderUnsyncedVideos.length > 0 ? 'pointer' : 'default') + '; transition:background .15s;"' + (folderUnsyncedVideos.length === 0 ? ' disabled' : '') + '>↗ 批量同步全部视频' + (folderUnsyncedVideos.length > 0 ? ' (' + folderUnsyncedVideos.length + ')' : '') + '</button>'
        + '</div>';
    }
  }
  let batchSelectionHtml = '';
  if (filteredVideoItems.length > 0) {
    batchSelectionHtml = '<div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:12px 16px; background:#141421; border:1px solid #2a2a3a; border-radius:10px; margin-bottom:16px;">'
      + '<span style="font-size:13px; color:#ccc;">当前筛选结果共 ' + filteredVideoItems.length + ' 个视频</span>'
      + '<span style="font-size:12px; color:#888;">已选 ' + selectedVideoItems.length + ' 个视频，' + selectedUnsyncedVideoItems.length + ' 个待同步</span>'
      + '<button class="btn btn-ghost btn-sm" onclick="selectAllFilteredAssetVideos(event)">全选当前结果</button>'
      + '<button class="btn btn-ghost btn-sm" onclick="clearAssetSelections(true, event)"' + (selectedVideoItems.length ? '' : ' disabled') + '>清空已选</button>'
      + '<button class="btn btn-primary btn-sm" onclick="syncSelectedAssets(event)"' + (selectedVideoItems.length ? '' : ' disabled') + '>↗ 批量同步选中视频' + (selectedUnsyncedVideoItems.length ? ' (' + selectedUnsyncedVideoItems.length + ')' : '') + '</button>'
      + '</div>';
  }

  // Count active filters
  const activeAssetFilterCount = getAssetFilterKeys().filter(key => f[key].length > 0).length;
  // Build active filter summary tags
  let filterTagsHtml = '';
  if (activeAssetFilterCount > 0) {
    const labels = [];
    f.industry.forEach(value => {
      const option = PROJECT_INDUSTRY_OPTIONS.find(item => item.v === value);
      labels.push(option ? option.l : value);
    });
    f.business.forEach(value => {
      const option = getBusinessLines().find(item => item.id === value);
      labels.push(option ? option.label : value);
    });
    f.client.forEach(value => labels.push(value));
    f.product.forEach(value => labels.push(value));
    f.folder.forEach(value => {
      const item = allItems.find(asset => String(asset.folderId) === String(value));
      labels.push(item ? item.folderName : '文件夹');
    });
    filterTagsHtml = labels.map(label => `<span style="font-size:11px; padding:3px 10px; border-radius:6px; background:#7c3aed22; border:1px solid #7c3aed44; color:#c4b5fd;">${label}</span>`).join('');
  }

  const paginationHtml = buildInlinePagination({
    page: assetsPager.page,
    totalCount: filtered.length,
    pageSize: ASSETS_CENTER_PAGE_SIZE,
    onPageChange: 'setAssetsCenterPage',
    unitLabel: '项',
  });

  container.innerHTML = `
    <div class="page-title">素材中心</div>
    <div class="stats-row">
      <div class="stat-card"><div class="label">脚本总数</div><div class="value">${scriptCount}</div></div>
      <div class="stat-card"><div class="label">视频素材</div><div class="value">${videoCount}</div></div>
      <div class="stat-card"><div class="label">视频已同步</div><div class="value" style="color:#4ade80;">${syncedCount} <span>/ ${videoCount}</span></div></div>
    </div>

    <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
      <div class="tab-switch">
        <div class="tab-switch-item ${f.type === 'all' ? 'active' : ''}" onclick="setAssetsCenterFilter('type','all')">全部 <span style="font-size:11px; opacity:0.6; margin-left:4px;">${allItems.length}</span></div>
        <div class="tab-switch-item ${f.type === 'script' ? 'active' : ''}" onclick="setAssetsCenterFilter('type','script')">📝 脚本 <span style="font-size:11px; opacity:0.6; margin-left:4px;">${scriptCount}</span></div>
        <div class="tab-switch-item ${f.type === 'video' ? 'active' : ''}" onclick="setAssetsCenterFilter('type','video')">🎬 视频 <span style="font-size:11px; opacity:0.6; margin-left:4px;">${videoCount}</span></div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        ${filterTagsHtml}
        <button class="btn btn-ghost task-filter-trigger" onclick="openAssetFilterModal()">
          筛选${activeAssetFilterCount ? `<span class="task-filter-count">${activeAssetFilterCount}</span>` : ''}
        </button>
      </div>
    </div>

    <div style="font-size:13px; color:#888; margin-bottom:12px;">共 ${filtered.length} 项</div>

    ${batchSelectionHtml}
    ${batchSyncHtml}

    <div class="file-list">
      ${pageItems.length ? pageItems.map(item => {
        const creator = getUserById(item.creator);
        const isVideo = item.fileType === 'video';
        const isSynced = isVideo && item._fileRef.synced;
        const isPrivate = item.folderVisibility === 'private';
        const syncedAt = item._fileRef.syncedAt || '';
        const syncedTo = item._fileRef.syncedTo || '';
        const thumbHue = item._fileRef.thumbHue != null ? item._fileRef.thumbHue : 240;
        const duration = item._fileRef.duration || '';
        const previewText = item._fileRef.preview || '';
        const escapedName = item.name.replace(/'/g, "\\'");
        const assetKey = getAssetSelectionKey(item);
        const isSelected = isVideo && currentAssetSelection.has(assetKey);

        // Thumbnail
        const thumbHtml = isVideo
          ? '<div style="width:160px; flex-shrink:0; background:linear-gradient(135deg, hsl(' + thumbHue + ',35%,15%), hsl(' + ((thumbHue+40)%360) + ',45%,25%)); display:flex; align-items:center; justify-content:center; position:relative; min-height:100px; border-radius:12px 0 0 12px; overflow:hidden;">'
            + '<span style="font-size:28px; opacity:.5;">▶</span>'
            + (duration ? '<span style="position:absolute; bottom:8px; left:50%; transform:translateX(-50%); font-size:11px; color:#fffd; background:#0008; padding:2px 8px; border-radius:4px;">' + duration + '</span>' : '')
            + '</div>'
          : '<div style="width:160px; flex-shrink:0; background:#12121a; display:flex; align-items:flex-start; padding:14px 12px; min-height:100px; border-radius:12px 0 0 12px; overflow:hidden;">'
            + '<span style="font-size:11px; color:#777; line-height:1.6; overflow:hidden; display:-webkit-box; -webkit-line-clamp:5; -webkit-box-orient:vertical;">' + (previewText ? previewText.substring(0, 100) : '暂无预览内容') + '</span>'
            + '</div>';

        // Right side: sync area for video only
        const rightHtml = isVideo
          ? '<div style="display:flex; align-items:center; gap:12px; padding:16px 20px; flex-shrink:0;">'
            + '<label style="display:flex; align-items:center; gap:6px; font-size:12px; color:' + (isSelected ? '#c4b5fd' : '#888') + '; cursor:pointer; white-space:nowrap;" onclick="event.stopPropagation()">'
              + '<input type="checkbox" ' + (isSelected ? 'checked ' : '') + 'onchange="toggleAssetSelection(' + item.projectId + ', ' + item.folderId + ', \'' + escapedName + '\', this.checked, event)">'
              + '<span>选中</span>'
            + '</label>'
            + (isSynced
              ? '<span style="font-size:12px; color:#4ade80; cursor:default; position:relative; white-space:nowrap;" onmouseenter="this.querySelector(\'.sync-tooltip\').style.display=\'block\'" onmouseleave="this.querySelector(\'.sync-tooltip\').style.display=\'none\'">◉ 已同步<span class="sync-tooltip" style="display:none; position:absolute; bottom:calc(100% + 8px); right:0; background:#1e1e2e; border:1px solid #2a2a3a; border-radius:8px; padding:10px 14px; font-size:11px; color:#ccc; white-space:nowrap; z-index:50; box-shadow:0 4px 16px #0008; line-height:1.8; text-align:left; min-width:180px;">同步时间：' + syncedAt + '<br>同步账号：' + syncedTo + '</span></span>'
                + '<span style="font-size:12px; color:#a78bfa; cursor:pointer; white-space:nowrap;" onclick="syncAsset(' + item.projectId + ', ' + item.folderId + ', \'' + escapedName + '\', event)">↗ 同步素材</span>'
              : '<span style="font-size:12px; color:#888; white-space:nowrap;">◎ 未同步</span>'
                + '<span style="font-size:12px; color:#a78bfa; cursor:pointer; white-space:nowrap;" onclick="syncAsset(' + item.projectId + ', ' + item.folderId + ', \'' + escapedName + '\', event)">↗ 同步素材</span>'
            )
            + '</div>'
          : '';

        const fileTaskId = item._fileRef.taskId || '';
        const fileTask = fileTaskId ? MOCK_TASKS.find(function(t) { return t.id === fileTaskId; }) : null;
        const taskLabel = fileTask ? fileTaskId + ' · ' + fileTask.name : fileTaskId;

        return '<div style="background:#16161f; border:1px solid ' + (isSelected ? '#7c3aed' : '#1e1e2e') + '; border-radius:12px; display:flex; align-items:stretch; margin-bottom:10px; transition:border-color .15s; position:relative;" tabindex="0" role="button" aria-label="预览素材：' + escapeHtml(item.name) + '" onclick="openAssetPreview(' + item.projectId + ', ' + item.folderId + ', \'' + escapedName + '\', this)" onkeydown="handleAssetPreviewCardKey(event, ' + item.projectId + ', ' + item.folderId + ', \'' + escapedName + '\')" onmouseenter="this.style.borderColor=\'#7c3aed\'" onmouseleave="this.style.borderColor=\'' + (isSelected ? '#7c3aed' : '#1e1e2e') + '\'">'
          + thumbHtml
          + '<div style="flex:1; padding:16px 20px; display:flex; flex-direction:column; justify-content:center; gap:4px; min-width:0;">'
          + '<div style="font-size:14px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + item.name + '</div>'
          + '<div style="font-size:11px; color:#666;">'
          + '<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:' + item.projectColor + '; margin-right:4px;"></span>'
          + item.projectName + ' / ' + item.folderName
          + (isPrivate ? ' <span class="tag tag-private" style="font-size:10px; padding:1px 6px; margin-left:6px;">🔒 私密</span>' : '')
          + '</div>'
          + '<div style="font-size:11px; color:#555;">创建者: ' + (creator ? creator.name : '未知') + ' · ' + item.time + '</div>'
          + (fileTaskId ? '<div style="font-size:11px; margin-top:2px;"><span style="color:#666;">任务: </span><span style="color:#a78bfa; cursor:pointer; text-decoration:underline dotted; text-underline-offset:2px;" onclick="event.stopPropagation(); goToTaskFromAsset(\'' + fileTaskId + '\')">' + taskLabel + '</span></div>' : '')
          + '</div>'
          + rightHtml
          + '</div>';
      }).join('') : '<div style="color:#666; padding:40px; text-align:center;">暂无素材</div>'}
    </div>
    ${paginationHtml}
  `;
}

// ===== Settings Page =====
let settingsSection = 'profile';

function getSettingsNavItems(user = currentUser) {
  return [
    { id: 'profile', icon: '👤', label: '个人信息' },
    { id: 'subscription', icon: '💳', label: '订阅计划' },
    { id: 'team', icon: '👥', label: '团队管理' },
    { id: 'apikeys', icon: '🔑', label: 'API Keys' },
    { id: 'notifications', icon: '🔔', label: '通知设置' },
  ];
}
function getSettingsTeamTabs() {
  return [
    { id: 'members', label: '成员' },
    { id: 'groups', label: '业务' },
  ];
}

function renderSettingsPage() {
  const navItems = getSettingsNavItems(currentUser);

  document.getElementById('settings-nav').innerHTML = `
    <div style="padding:20px 20px 16px; font-size:20px; font-weight:700;">设置</div>
    ${navItems.map(item => `
      <div class="settings-nav-item ${settingsSection === item.id ? 'active' : ''}" onclick="setSettingsSection('${item.id}')">
        <span class="sn-icon">${item.icon}</span> ${item.label}
      </div>
    `).join('')}
  `;

  const panel = document.getElementById('settings-panel');
  if (settingsSection === 'profile') renderSettingsProfile(panel);
  else if (settingsSection === 'subscription') renderSettingsSubscription(panel);
  else if (settingsSection === 'team') renderSettingsTeam(panel);
  else if (settingsSection === 'apikeys') renderSettingsApiKeys(panel);
  else if (settingsSection === 'notifications') renderSettingsNotifications(panel);
}

function setSettingsSection(section) {
  settingsSection = section;
  renderSettingsPage();
}

function renderSettingsProfile(panel) {
  panel.innerHTML = `
    <div class="settings-panel-title">个人信息</div>
    <div style="display:flex; align-items:center; gap:20px; margin-bottom:28px;">
      <div class="avatar" style="background:${currentUser.color}; width:64px; height:64px; font-size:26px; flex-shrink:0; cursor:pointer;" onclick="toast('头像上传（原型演示）')">${currentUser.short}</div>
      <div>
        <div style="font-size:14px; font-weight:500; cursor:pointer; color:#a78bfa;" onclick="toast('头像上传（原型演示）')">点击更换头像</div>
        <div style="font-size:12px; color:#666; margin-top:4px;">支持 JPG, PNG，最大 2MB</div>
      </div>
    </div>

    <div class="settings-form-row">
      <div class="settings-form-group">
        <label>姓名</label>
        <input type="text" id="s-profile-name" value="${currentUser.name}">
      </div>
      <div class="settings-form-group">
        <label>邮箱</label>
        <input type="email" id="s-profile-email" value="${currentUser.email || ''}">
      </div>
    </div>

    <div class="settings-form-row" style="margin-bottom:20px;">
      <div class="settings-form-group" style="margin-bottom:0;">
        <label>角色</label>
        <div style="padding:10px 0;"><span class="tag tag-${currentUser.role}">${ROLES[currentUser.role].label}</span></div>
      </div>
      <div class="settings-form-group" style="margin-bottom:0;">
        <label>所属业务</label>
        <div style="padding:10px 0;">${renderUserOrgBadge(currentUser)}</div>
      </div>
    </div>

    <hr class="settings-divider">

    <div class="settings-section-title">修改密码</div>
    <div class="settings-form-group">
      <label>当前密码</label>
      <input type="password" placeholder="请输入当前密码">
    </div>
    <div class="settings-form-group">
      <label>新密码</label>
      <input type="password" placeholder="请输入新密码">
    </div>
    <div class="settings-form-group">
      <label>确认新密码</label>
      <input type="password" placeholder="请再次输入新密码">
    </div>

    <button class="btn btn-primary" onclick="toast('个人信息已保存')">保存更改</button>
  `;
}

function renderSettingsSubscription(panel) {
  panel.innerHTML = `
    <div class="settings-panel-title">订阅计划</div>

    <div style="background:#16161f; border:1px solid #1e1e2e; border-radius:12px; padding:20px; margin-bottom:24px;">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
        <div>
          <div style="font-size:14px; font-weight:600;">当前计划: <span style="color:#a78bfa;">专业版</span></div>
          <div style="font-size:12px; color:#888; margin-top:4px;">下次续费: 2026-04-30 · 自动续订</div>
        </div>
        <span class="tag tag-shared" style="font-size:12px; padding:4px 12px;">生效中</span>
      </div>
      <div style="display:flex; gap:20px; font-size:13px; color:#888;">
        <span>本月已用: <strong style="color:#e0e0e0;">156</strong> / 500 Credits</span>
        <span>团队成员: <strong style="color:#e0e0e0;">4</strong> / 10 人</span>
        <span>存储: <strong style="color:#e0e0e0;">2.3 GB</strong> / 50 GB</span>
      </div>
      <div style="margin-top:12px; background:#333; height:6px; border-radius:3px; overflow:hidden; max-width:400px;">
        <div style="width:31%; height:100%; background:linear-gradient(90deg, #7c3aed, #a78bfa); border-radius:3px;"></div>
      </div>
    </div>

    <div class="settings-section-title">选择计划</div>
    <div class="plan-cards">
      <div class="plan-card">
        <div class="plan-name">免费版</div>
        <div style="font-size:12px; color:#888;">适合个人尝试</div>
        <div class="plan-price">¥0 <span>/ 月</span></div>
        <ul class="plan-features">
          <li>50 Credits / 月</li>
          <li>1 个项目</li>
          <li>基础工具箱</li>
          <li>5 GB 存储</li>
        </ul>
        <button class="btn btn-ghost" style="width:100%;" onclick="toast('已是更高级别计划')">降级</button>
      </div>
      <div class="plan-card current">
        <div class="plan-name" style="color:#a78bfa;">专业版 <span class="tag tag-shared" style="font-size:10px;">当前</span></div>
        <div style="font-size:12px; color:#888;">适合小型团队</div>
        <div class="plan-price">¥299 <span>/ 月</span></div>
        <ul class="plan-features">
          <li>500 Credits / 月</li>
          <li>10 个项目</li>
          <li>全部工具箱 + 工作流</li>
          <li>50 GB 存储</li>
          <li>最多 10 名成员</li>
        </ul>
        <button class="btn btn-primary" style="width:100%; opacity:.5; cursor:default;">当前计划</button>
      </div>
      <div class="plan-card">
        <div class="plan-name">企业版</div>
        <div style="font-size:12px; color:#888;">适合大型团队</div>
        <div class="plan-price">¥999 <span>/ 月</span></div>
        <ul class="plan-features">
          <li>2000 Credits / 月</li>
          <li>无限项目</li>
          <li>全部工具箱 + 自定义工作流</li>
          <li>500 GB 存储</li>
          <li>无限成员</li>
          <li>优先技术支持</li>
        </ul>
        <button class="btn btn-primary" style="width:100%;" onclick="toast('升级请求已提交')">升级</button>
      </div>
    </div>

    <hr class="settings-divider">

    <div class="settings-section-title">账单历史</div>
    <div style="background:#16161f; border:1px solid #1e1e2e; border-radius:12px; overflow:hidden;">
      <table class="team-table">
        <thead><tr><th>日期</th><th>描述</th><th>金额</th><th>状态</th></tr></thead>
        <tbody>
          <tr><td style="color:#888;">2026-03-01</td><td>专业版 - 3月</td><td>¥299.00</td><td><span class="tag" style="background:#4ade8022;color:#4ade80;">已支付</span></td></tr>
          <tr><td style="color:#888;">2026-02-01</td><td>专业版 - 2月</td><td>¥299.00</td><td><span class="tag" style="background:#4ade8022;color:#4ade80;">已支付</span></td></tr>
          <tr><td style="color:#888;">2026-01-01</td><td>专业版 - 1月</td><td>¥299.00</td><td><span class="tag" style="background:#4ade8022;color:#4ade80;">已支付</span></td></tr>
        </tbody>
      </table>
    </div>
  `;
}

function renderSettingsTeam(panel) {
  const tabs = getSettingsTeamTabs();
  panel.innerHTML = `
    <div class="settings-panel-title">团队管理</div>
    <div class="tab-switch" style="margin-bottom:20px; display:inline-flex;">
      ${tabs.map(tab => `<div class="tab-switch-item ${settingsTeamTab === tab.id ? 'active' : ''}" onclick="settingsTeamTab='${tab.id}'; renderSettingsPage();">${tab.label}</div>`).join('')}
    </div>
    <div id="settings-team-panel"></div>
  `;
  if (settingsTeamTab === 'members') {
    renderTeam('settings-team-panel');
  } else {
    renderGroups('settings-team-panel');
  }
}

function renderSettingsApiKeys(panel) {
  panel.innerHTML = `
    <div class="settings-panel-title">API Keys</div>
    <div style="font-size:13px; color:#888; margin-bottom:20px; line-height:1.7;">
      使用 API Key 将 SELVA 的能力集成到你自己的应用中。请妥善保管密钥，不要泄露给他人。
    </div>

    <div class="api-key-row">
      <div class="key-name">Production</div>
      <div class="key-value">sk-selva-prod-xxxx...xxxx7f3a</div>
      <button class="btn btn-ghost btn-sm" onclick="toast('密钥已复制到剪贴板')">复制</button>
      <button class="btn btn-danger btn-sm" onclick="toast('密钥已重置')">重置</button>
    </div>
    <div class="api-key-row">
      <div class="key-name">Development</div>
      <div class="key-value">sk-selva-dev-xxxx...xxxx2b1c</div>
      <button class="btn btn-ghost btn-sm" onclick="toast('密钥已复制到剪贴板')">复制</button>
      <button class="btn btn-danger btn-sm" onclick="toast('密钥已重置')">重置</button>
    </div>

    <button class="btn btn-primary" style="margin-top:16px;" onclick="toast('新 API Key 已创建')">+ 创建新密钥</button>

    <hr class="settings-divider">

    <div class="settings-section-title">Webhook 配置</div>
    <div class="settings-form-group">
      <label>Webhook URL</label>
      <input type="text" placeholder="https://your-server.com/webhook" value="">
    </div>
    <div class="settings-form-group">
      <label>Secret Token</label>
      <input type="text" placeholder="用于验证请求签名" value="">
    </div>
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <label class="notif-toggle" style="margin:0;">
        <input type="checkbox">
        <span class="slider"></span>
      </label>
      <span style="font-size:13px;">启用 Webhook 通知</span>
    </div>
    <button class="btn btn-primary" onclick="toast('Webhook 配置已保存')">保存配置</button>
  `;
}

function renderSettingsNotifications(panel) {
  const notifs = [
    { id: 'task_complete', title: '任务完成通知', desc: '当视频生成或脚本生成任务完成时通知', checked: true },
    { id: 'task_fail', title: '任务失败通知', desc: '当任务执行失败或部分失败时通知', checked: true },
    { id: 'team_invite', title: '团队邀请', desc: '有新成员加入团队或被邀请时通知', checked: true },
    { id: 'credit_low', title: 'Credits 余量提醒', desc: '当月可用 Credits 低于 20% 时提醒', checked: false },
    { id: 'weekly_report', title: '周报汇总', desc: '每周一发送上周生产数据和素材效果汇总', checked: false },
    { id: 'workflow_shared', title: '工作流分享', desc: '有人分享新的工作流到团队资源库时通知', checked: true },
    { id: 'comment_mention', title: '评论和提及', desc: '在项目中被 @ 提及或收到评论时通知', checked: true },
    { id: 'system_update', title: '系统更新', desc: '平台功能更新、维护公告', checked: false },
  ];

  panel.innerHTML = `
    <div class="settings-panel-title">通知设置</div>

    <div class="settings-section-title">通知方式</div>
    <div style="display:flex; gap:20px; margin-bottom:28px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <label class="notif-toggle"><input type="checkbox" checked><span class="slider"></span></label>
        <span style="font-size:13px;">站内通知</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <label class="notif-toggle"><input type="checkbox" checked><span class="slider"></span></label>
        <span style="font-size:13px;">邮件通知</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <label class="notif-toggle"><input type="checkbox"><span class="slider"></span></label>
        <span style="font-size:13px;">浏览器推送</span>
      </div>
    </div>

    <div class="settings-section-title">通知类型</div>
    <div style="background:#16161f; border:1px solid #1e1e2e; border-radius:12px; padding:4px 20px;">
      ${notifs.map(n => `
        <div class="notif-row">
          <div class="notif-info">
            <div class="notif-title">${n.title}</div>
            <div class="notif-desc">${n.desc}</div>
          </div>
          <label class="notif-toggle">
            <input type="checkbox" ${n.checked ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      `).join('')}
    </div>

    <button class="btn btn-primary" style="margin-top:20px;" onclick="toast('通知设置已保存')">保存设置</button>
  `;
}

let settingsTeamTab = 'members';

// ===== Global Task Center =====
function getTaskStatusLabel(s) {
  const m = { completed:'已完成', generating:'生成中', failed:'失败', partial:'部分完成', waiting:'等待中', running:'执行中', pending_confirm:'待确认' };
  return m[s] || s;
}
function getTaskStatusClass(s) {
  const m = { completed:'completed', generating:'generating', failed:'failed', partial:'partial', waiting:'draft', running:'generating', pending_confirm:'pending-confirm' };
  return m[s] || '';
}
function getTaskSourceLabel(source) {
  const m = { toolbox: '工具箱', workflow: '工作流', scheduled: '定时任务' };
  return m[source] || source;
}
function getTaskSourceIcon(source) {
  const m = { toolbox: '🛠', workflow: '🔀', scheduled: '⏰' };
  return m[source] || '•';
}
function getTaskOutputTypeLabel(type) {
  const m = { script: '脚本', video: '视频', translation: '翻译', voice: '配音' };
  return m[type] || type;
}
function getTaskIndustryValues(task) {
  const industries = new Set();
  projects.forEach(project => {
    (project.folders || []).forEach(folder => {
      (folder.files || []).forEach(file => {
        if (file.taskId === task.id) industries.add(dcDeriveIndustry(project));
      });
    });
  });
  if (!industries.size && task.product && task.product !== '—') {
    projects
      .filter(project => project.product === task.product)
      .forEach(project => industries.add(dcDeriveIndustry(project)));
  }
  if (!industries.size) {
    industries.add(dcDeriveIndustry({ product: task.product || '', client: '' }));
  }
  return [...industries];
}
function getTaskBusinessValues(task) {
  const businesses = new Set();
  projects.forEach(project => {
    (project.folders || []).forEach(folder => {
      (folder.files || []).forEach(file => {
        if (file.taskId === task.id) businesses.add(dcDeriveBusiness(project));
      });
    });
  });
  if (!businesses.size && task.product && task.product !== '—') {
    projects
      .filter(project => project.product === task.product)
      .forEach(project => businesses.add(dcDeriveBusiness(project)));
  }
  if (!businesses.size) {
    businesses.add(dcDeriveBusiness({ product: task.product || '', client: '', media: '' }));
  }
  return [...businesses];
}
function getTaskFilterFields() {
  return [
    {
      key: 'status',
      id: 'task-filter-status',
      label: '任务状态',
      options: [
        { value: 'generating', label: getTaskStatusLabel('generating') },
        { value: 'pending_confirm', label: getTaskStatusLabel('pending_confirm') },
        { value: 'completed', label: getTaskStatusLabel('completed') },
        { value: 'partial', label: getTaskStatusLabel('partial') },
        { value: 'failed', label: getTaskStatusLabel('failed') },
      ],
    },
    {
      key: 'source',
      id: 'task-filter-source',
      label: '执行来源',
      options: [
        { value: 'toolbox', label: getTaskSourceLabel('toolbox') },
        { value: 'workflow', label: getTaskSourceLabel('workflow') },
        { value: 'scheduled', label: getTaskSourceLabel('scheduled') },
      ],
    },
    {
      key: 'business',
      id: 'task-filter-business',
      label: '业务',
      options: getBusinessLines().map(line => ({ value: line.id, label: line.label })),
    },
    {
      key: 'industry',
      id: 'task-filter-industry',
      label: '行业',
      options: PROJECT_INDUSTRY_OPTIONS.map(option => ({ value: option.v, label: option.l })),
    },
    {
      key: 'outputType',
      id: 'task-filter-output-type',
      label: '主要产出',
      options: [
        { value: 'script', label: getTaskOutputTypeLabel('script') },
        { value: 'video', label: getTaskOutputTypeLabel('video') },
        { value: 'translation', label: getTaskOutputTypeLabel('translation') },
        { value: 'voice', label: getTaskOutputTypeLabel('voice') },
      ],
    },
    {
      key: 'videoModel',
      id: 'task-filter-video-model',
      label: '生成模型',
      options: [
        { value: 'Grok', label: 'Grok' },
        { value: 'Veo 3.1', label: 'Veo 3.1' },
      ],
    },
  ];
}
function getTaskFilterActiveCount() {
  return getTaskFilterFields().filter(field => taskFilters[field.key].length > 0).length;
}
function openTaskFilterModal() {
  _taskFilterDraft = {};
  getTaskFilterFields().forEach(field => {
    _taskFilterDraft[field.key] = [...taskFilters[field.key]];
  });
  showModal('task-filters');
}
let _taskFilterDraft = {};
function toggleTaskFilterTag(el) {
  el.classList.toggle('selected');
}
function getMsComboDraftStore(mode) {
  return mode === 'asset' ? _assetFilterDraft : _taskFilterDraft;
}
function msComboToggle(fieldId, value) {
  const container = document.getElementById(fieldId);
  if (!container) return;
  if (container.dataset.disabled === 'true') return;
  const key = container.dataset.key;
  const mode = container.dataset.mode || 'task';
  const arr = getMsComboDraftStore(mode)[key];
  if (!arr) return;
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1); else arr.push(value);
  if (mode === 'asset') {
    pruneAssetFilterDraftSelections();
    renderAssetFilterModalBody();
    return;
  }
  msComboRender(fieldId);
}
function msComboRemoveTag(fieldId, value) {
  const container = document.getElementById(fieldId);
  if (!container) return;
  if (container.dataset.disabled === 'true') return;
  const key = container.dataset.key;
  const mode = container.dataset.mode || 'task';
  const arr = getMsComboDraftStore(mode)[key];
  if (!arr) return;
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  if (mode === 'asset') {
    pruneAssetFilterDraftSelections();
    renderAssetFilterModalBody();
    return;
  }
  msComboRender(fieldId);
}
function msComboFilter(fieldId, query) {
  const container = document.getElementById(fieldId);
  if (!container || container.dataset.disabled === 'true') return;
  const dropdown = document.querySelector(`#${fieldId} .ms-combo-dropdown`);
  if (!dropdown) return;
  const options = dropdown.querySelectorAll('.ms-combo-option');
  const q = query.toLowerCase();
  let visible = 0;
  options.forEach(opt => {
    const match = opt.dataset.label.toLowerCase().includes(q);
    opt.style.display = match ? '' : 'none';
    if (match) visible++;
  });
  const empty = dropdown.querySelector('.ms-combo-empty');
  if (empty) empty.style.display = visible ? 'none' : '';
}
function msComboFocus(fieldId) {
  const container = document.getElementById(fieldId);
  if (!container || container.dataset.disabled === 'true') return;
  container.classList.add('open');
}
function msComboBlur(fieldId) {
  setTimeout(() => { document.getElementById(fieldId)?.classList.remove('open'); }, 150);
}
function msComboRender(fieldId) {
  const container = document.getElementById(fieldId);
  if (!container) return;
  const key = container.dataset.key;
  const mode = container.dataset.mode || 'task';
  const allOptions = JSON.parse(container.dataset.options);
  const selected = getMsComboDraftStore(mode)[key] || [];
  const tagBox = container.querySelector('.ms-combo-box');
  const input = tagBox.querySelector('.ms-combo-input');
  const existingTags = tagBox.querySelectorAll('.ms-combo-tag');
  existingTags.forEach(t => t.remove());
  selected.forEach(val => {
    const opt = allOptions.find(o => o.value === val);
    if (!opt) return;
    const tag = document.createElement('span');
    tag.className = 'ms-combo-tag';
    tag.innerHTML = `${opt.label}<span class="ms-tag-x" onmousedown="event.stopPropagation();msComboRemoveTag('${fieldId}','${val}')">&times;</span>`;
    tagBox.insertBefore(tag, input);
  });
  input.placeholder = selected.length ? '' : '点击选择...';
  const options = container.querySelectorAll('.ms-combo-option');
  options.forEach(opt => {
    opt.classList.toggle('selected', selected.includes(opt.dataset.value));
    const check = opt.querySelector('.ms-check');
    if (check) check.textContent = selected.includes(opt.dataset.value) ? '✓' : '';
  });
}
function cancelTaskFilterModal() {
  hideModal();
}
function clearTaskFilterSelections() {
  getTaskFilterFields().forEach(field => {
    _taskFilterDraft[field.key] = [];
    msComboRender(field.id);
  });
}
function applyTaskFilterForm() {
  getTaskFilterFields().forEach(field => {
    taskFilters[field.key] = [...(_taskFilterDraft[field.key] || [])];
  });
  taskPage = 1;
  hideModal();
  renderTaskCenter();
}
function parseTaskDate(dateText) {
  if (!dateText || dateText === '—') return null;
  return new Date(dateText.replace(' ', 'T') + ':00+08:00');
}
function parseTaskDuration(durationText) {
  if (!durationText || durationText === '—') return Number.POSITIVE_INFINITY;
  let total = 0;
  const minMatch = durationText.match(/(\d+)\s*分/);
  const secMatch = durationText.match(/(\d+)\s*秒/);
  if (minMatch) total += Number(minMatch[1]) * 60;
  if (secMatch) total += Number(secMatch[1]);
  if (!minMatch && !secMatch) {
    const num = Number(durationText);
    return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
  }
  return total;
}
function getTaskOutputStatus(status) {
  if (status === 'processing') return { cls: 'generating', label: '生成中' };
  if (status === 'done') return { cls: 'completed', label: '已完成' };
  if (status === 'failed') return { cls: 'failed', label: '失败' };
  return { cls: 'draft', label: status || '草稿' };
}
function setTaskFilterValue(key, value) {
  taskFilters[key] = value || 'all';
  taskPage = 1;
  if (key !== 'product') {
    renderTaskCenter();
  }
}
function setTaskDateField(key, value) {
  taskFilters[key] = value || '';
  taskPage = 1;
  renderTaskCenter();
}
let _taskWfInitialized = false;

function selectTaskDetailNode(nodeId) {
  currentTaskDetailNodeId = currentTaskDetailNodeId === nodeId ? null : nodeId;
  const task = getCurrentTaskDetailTask();
  if (task) syncTaskOutputScope(task, currentTaskDetailNodeId);
  _taskWfInitialized = true; // preserve zoom/pan on node switch
  renderTaskDetail();
}
function clearTaskDetailNodeSelection() {
  currentTaskDetailNodeId = null;
  const task = getCurrentTaskDetailTask();
  if (task) syncTaskOutputScope(task, null);
  _taskWfInitialized = true;
  renderTaskDetail();
}
function taskInTimeRange(task) {
  const taskDate = parseTaskDate(task.createdAt);
  if (!taskDate) return true;
  const now = new Date('2026-04-03T12:00:00+08:00');
  const diffMs = now - taskDate;
  if (taskFilters.timeRange === 'today') return diffMs <= 24 * 60 * 60 * 1000;
  if (taskFilters.timeRange === '7d') return diffMs <= 7 * 24 * 60 * 60 * 1000;
  if (taskFilters.timeRange === '30d') return diffMs <= 30 * 24 * 60 * 60 * 1000;
  if (taskFilters.timeRange === 'custom') {
    if (!taskFilters.dateFrom && !taskFilters.dateTo) return true;
    const from = taskFilters.dateFrom ? new Date(taskFilters.dateFrom + 'T00:00:00+08:00') : null;
    const to = taskFilters.dateTo ? new Date(taskFilters.dateTo + 'T23:59:59+08:00') : null;
    if (from && taskDate < from) return false;
    if (to && taskDate > to) return false;
  }
  return true;
}
function renderReadonlyValue(field) {
  if (field.kind === 'tags') {
    const values = Array.isArray(field.value) ? field.value : [field.value];
    return `<div class="readonly-tag-list">${values.map(value => `<span class="readonly-tag">${value}</span>`).join('')}</div>`;
  }
  if (field.kind === 'toggle') {
    return `<span class="readonly-toggle on">已开启</span>`;
  }
  if (field.kind === 'toggle-off') {
    return `<span class="readonly-toggle">已关闭</span>`;
  }
  return `<div class="value">${field.value}</div>`;
}
function renderReadonlySection(section) {
  const single = section.fields.length <= 2 ? ' single' : '';
  return `
    <div class="readonly-form-section">
      <h4>${section.title}</h4>
      <div class="readonly-form-fields${single}">
        ${section.fields.map(field => `
          <div class="readonly-field">
            <div class="label">${field.label}</div>
            ${renderReadonlyValue(field)}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}
// ===== Unified Output Rendering =====
// SVG icon library (Lucide-style, 16x16, stroke 1.5)
const _svgBack = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
function _backBtn(onclick, tip) {
  return `<button class="back-icon-btn" onclick="${onclick}" aria-label="${tip}"><span class="back-tip">${tip}</span>${_svgBack}</button>`;
}
const _svgIcons = {
  video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m10 9 5 3-5 3V9z"/></svg>',
  audio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  script: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>',
  downloadAll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
  saveAll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
};

function _isVideoFile(name) {
  return /\.(mp4|mov|avi|webm)$/i.test(name);
}
function _isAudioFile(name) {
  return /\.(mp3|wav|aac|ogg)$/i.test(name);
}
function _isScriptFile(name) {
  return /\.(md|txt|doc|docx)$/i.test(name);
}
function _outputFileIcon(name) {
  if (_isVideoFile(name)) return `<div class="tool-output-file-icon video">${_svgIcons.video}</div>`;
  if (_isAudioFile(name)) return `<div class="tool-output-file-icon audio">${_svgIcons.audio}</div>`;
  return `<div class="tool-output-file-icon script">${_svgIcons.script}</div>`;
}
function _outputActionBtn(svgKey, tip, opts) {
  const disabled = opts && opts.disabled ? ' disabled' : '';
  const extraCls = opts && opts.cls ? ' ' + opts.cls : '';
  const onclick = ` onclick="toast('${tip}（原型演示）')"`;
  return `<button class="out-action-btn${disabled}${extraCls}"${onclick}><span class="out-tip">${tip}</span>${_svgIcons[svgKey]}</button>`;
}
function getCurrentTaskDetailTask() {
  return MOCK_TASKS.find(t => t.id === currentTaskDetailId) || null;
}
function getTaskOutputId(output, index) {
  return `${output?.name || 'output'}::${output?.status || 'unknown'}::${output?.duration || '—'}::${index}`;
}
function getTaskOutputScopeMode(task, nodeId = null) {
  if (!task || task.source !== 'workflow') return 'all';
  if (!nodeId) return 'all';
  const wt = task.workflowTemplate ? WORKFLOW_TEMPLATES.find(w => w.id === task.workflowTemplate) : null;
  const node = wt ? wt.nodes.find(item => item.id === nodeId) : null;
  if (!node) return 'all';
  return node.type === 'output' ? 'node' : 'none';
}
function getTaskOutputScopedNodeId(task, nodeId = null) {
  return getTaskOutputScopeMode(task, nodeId) === 'node' ? nodeId : null;
}
function getTaskOutputScopeKey(task, nodeId = null) {
  const scopeMode = getTaskOutputScopeMode(task, nodeId);
  const scopedNodeId = getTaskOutputScopedNodeId(task, nodeId);
  return `${task.id}::${task.source === 'workflow' ? (scopeMode === 'node' ? scopedNodeId : scopeMode) : 'all'}`;
}
function syncTaskOutputScope(task, nodeId = null) {
  const scopeKey = getTaskOutputScopeKey(task, nodeId);
  if (currentTaskOutputScopeKey !== scopeKey) {
    currentTaskOutputScopeKey = scopeKey;
    currentTaskOutputSelection = new Set();
  }
  return scopeKey;
}
function getWorkflowNodeOutputs(task, nodeId) {
  const detail = task && task.workflowNodeDetails ? task.workflowNodeDetails[nodeId] : null;
  return Array.isArray(detail && detail.outputs) ? detail.outputs : [];
}
function getAllWorkflowOutputNodeOutputs(task) {
  if (!task || task.source !== 'workflow') {
    return Array.isArray(task && task.outputs) ? task.outputs : [];
  }
  const wt = task.workflowTemplate ? WORKFLOW_TEMPLATES.find(w => w.id === task.workflowTemplate) : null;
  if (!wt) {
    return Array.isArray(task.outputs) ? task.outputs : [];
  }
  const aggregatedOutputs = wt.nodes.reduce((all, node) => {
    if (node.type !== 'output') return all;
    return all.concat(getWorkflowNodeOutputs(task, node.id));
  }, []);
  return aggregatedOutputs.length ? aggregatedOutputs : (Array.isArray(task.outputs) ? task.outputs : []);
}
function getDisplayedTaskOutputs(task, nodeId = null) {
  if (!task) return [];
  const scopeMode = getTaskOutputScopeMode(task, nodeId);
  const scopedNodeId = getTaskOutputScopedNodeId(task, nodeId);
  if (task.source === 'workflow' && scopeMode === 'none') {
    return [];
  }
  if (task.source === 'workflow' && scopedNodeId) {
    return getWorkflowNodeOutputs(task, scopedNodeId);
  }
  if (task.source === 'workflow') {
    return getAllWorkflowOutputNodeOutputs(task);
  }
  return Array.isArray(task.outputs) ? task.outputs : [];
}
function toggleTaskOutputSelection(outputId, checked) {
  const task = getCurrentTaskDetailTask();
  if (task) syncTaskOutputScope(task, currentTaskDetailNodeId);
  if (checked) currentTaskOutputSelection.add(outputId);
  else currentTaskOutputSelection.delete(outputId);
  renderTaskDetail();
}
function setTaskOutputSelection(mode) {
  const task = getCurrentTaskDetailTask();
  if (!task) return;
  const scopedNodeId = getTaskOutputScopedNodeId(task, currentTaskDetailNodeId);
  syncTaskOutputScope(task, scopedNodeId);
  const outputs = getDisplayedTaskOutputs(task, scopedNodeId);
  if (mode === 'all') {
    currentTaskOutputSelection = new Set(outputs.map((output, index) => getTaskOutputId(output, index)));
  } else {
    currentTaskOutputSelection = new Set();
  }
  renderTaskDetail();
}
function runTaskOutputBulkAction(action) {
  const task = getCurrentTaskDetailTask();
  if (!task) return;
  const scopedNodeId = getTaskOutputScopedNodeId(task, currentTaskDetailNodeId);
  syncTaskOutputScope(task, scopedNodeId);
  const outputs = getDisplayedTaskOutputs(task, scopedNodeId);
  const selectedOutputs = outputs.filter((output, index) => currentTaskOutputSelection.has(getTaskOutputId(output, index)));
  if (!selectedOutputs.length) {
    toast('请先选择产出物');
    return;
  }
  if (action === 'download') {
    toast(`已开始下载 ${selectedOutputs.length} 个产出物（原型演示）`);
    return;
  }
  if (action === 'save') {
    toast(`已将 ${selectedOutputs.length} 个产出物保存到素材中心（原型演示）`);
  }
}
function renderUnifiedOutputItem(output, durationLabel, selectionId, isSelected) {
  const outputStatus = getTaskOutputStatus(output.status);
  const name = output.name || '';
  const isVideo = _isVideoFile(name) || _isAudioFile(name);
  const isScript = _isScriptFile(name);
  const isFailed = output.status === 'failed';
  const durLabel = durationLabel || '耗时';

  let actions = '';
  if (isVideo) {
    actions += _outputActionBtn('play', '播放');
  }
  if (isScript) {
    actions += _outputActionBtn('eye', '预览');
    actions += _outputActionBtn('copy', '复制');
  }
  actions += _outputActionBtn('download', '下载');
  actions += _outputActionBtn('save', '保存到素材中心');
  actions += _outputActionBtn('retry', '重新生成', { disabled: !isFailed, cls: isFailed ? 'retry-enabled' : '' });

  return `
    <div class="tool-output-item">
      <label class="tool-output-select" title="选择产出物">
        <input type="checkbox" ${isSelected ? 'checked' : ''} onchange='toggleTaskOutputSelection(${JSON.stringify(selectionId)}, this.checked)'>
      </label>
      ${_outputFileIcon(name)}
      <div class="tool-output-meta">
        <strong>${name}</strong>
        <small>${outputStatus.label} · ${durLabel}：${output.duration}</small>
      </div>
      <span class="task-status ${outputStatus.cls}">${outputStatus.label}</span>
      <div class="tool-output-actions-row">${actions}</div>
    </div>
  `;
}
function renderUnifiedOutputSection(task, titleText, durationLabel, outputs, options = {}) {
  const hasPartialOrFailed = task.status === 'failed' || task.status === 'partial';
  const scopedOutputs = Array.isArray(outputs) ? outputs : [];
  const selectedCount = scopedOutputs.reduce((count, output, index) => count + (currentTaskOutputSelection.has(getTaskOutputId(output, index)) ? 1 : 0), 0);
  const allSelected = !!scopedOutputs.length && selectedCount === scopedOutputs.length;
  const scopeText = options.scopeText || '';
  const emptyText = options.emptyText || '暂无产出物';

  return `
    <div class="readonly-form-section">
      <h4>${titleText}</h4>
      ${scopeText ? `<div class="output-scope-meta">${scopeText}</div>` : ''}
      <div class="output-bulk-bar">
        <div class="bulk-summary">当前范围 <strong>${scopedOutputs.length}</strong> 项${selectedCount ? ` · 已选 <strong>${selectedCount}</strong> 项` : ''}</div>
        <div class="bulk-actions">
          <button class="btn btn-ghost btn-sm" ${scopedOutputs.length ? '' : 'disabled'} onclick="setTaskOutputSelection('all')">${allSelected ? '已全选' : '全选当前'}</button>
          <button class="btn btn-ghost btn-sm" ${selectedCount ? '' : 'disabled'} onclick="setTaskOutputSelection('none')">清空选择</button>
          <button class="btn btn-ghost btn-sm" ${selectedCount ? '' : 'disabled'} onclick="runTaskOutputBulkAction('download')">${_svgIcons.downloadAll} 下载选中</button>
          <button class="btn btn-primary btn-sm" ${selectedCount ? '' : 'disabled'} onclick="runTaskOutputBulkAction('save')">${_svgIcons.saveAll} 保存选中到素材中心</button>
          ${hasPartialOrFailed ? `<button class="btn btn-danger btn-sm" onclick="toast('重新生成失败项（原型演示）')">${_svgIcons.retry} 重新生成失败项</button>` : ''}
        </div>
      </div>
      <div class="tool-output-list">
        ${scopedOutputs.length
          ? scopedOutputs.map((output, index) => renderUnifiedOutputItem(output, durationLabel, getTaskOutputId(output, index), currentTaskOutputSelection.has(getTaskOutputId(output, index)))).join('')
          : `<div style="color:#666; padding:16px 0;">${emptyText}</div>`}
      </div>
    </div>
  `;
}
function renderToolboxTaskDetail(task) {
  syncTaskOutputScope(task, null);
  const displayedOutputs = getDisplayedTaskOutputs(task);
  return `
    <div class="task-detail-layout">
      <div class="detail-topbar">
        <div class="detail-topbar-left">
          ${_backBtn("closeTaskDetail()", '返回任务列表')}
          <div class="page-title" style="margin-bottom:0; font-size:20px;">${task.name}</div>
          <span class="task-status ${getTaskStatusClass(task.status)}">${getTaskStatusLabel(task.status)}</span>
        </div>
      </div>

      <div class="detail-info-bar">
        <div class="detail-info-item"><span class="dii-label">任务 ID</span> ${task.id}</div>
        <div class="detail-info-item"><span class="dii-label">状态</span> <span class="task-status ${getTaskStatusClass(task.status)}">${getTaskStatusLabel(task.status)}</span></div>
        <div class="detail-info-item"><span class="dii-label">来源</span> <span class="source-badge toolbox">${getTaskSourceIcon(task.source)} ${getTaskSourceLabel(task.source)}</span></div>
        <div class="detail-info-item"><span class="dii-label">工具名称</span> ${task.toolName}</div>
        <div class="detail-info-item"><span class="dii-label">关联产品</span> ${task.product}</div>
        <div class="detail-info-item"><span class="dii-label">创建时间</span> ${task.createdAt}</div>
        <div class="detail-info-item"><span class="dii-label">耗时</span> ${task.duration}</div>
      </div>

      <div class="readonly-form-layout">
        ${(task.detailSections || []).map(renderReadonlySection).join('')}
      </div>

      ${renderUnifiedOutputSection(task, '产出物列表', '单项耗时', displayedOutputs, {
        scopeText: '当前范围：任务全部产出物',
        emptyText: '当前任务暂无产出物'
      })}
    </div>
  `;
}
// ===== Read-only Task Workflow Canvas =====
let _taskWfZoom = 1, _taskWfPanX = 0, _taskWfPanY = 0;
const TASK_WF_NODE_W = 220;
const TASK_WF_NODE_H = 90;
const TASK_WF_GAP_X = 100;

function _taskWfSubLabel(node, wt = null) {
  if (node.type === 'start') return '起始节点';
  if (node.type === 'input' || node.type === 'agent') {
    const meta = getWfVariantMeta(node);
    return meta ? meta.subLabel : '';
  }
  if (node.type === 'output') {
    const outputType = wt ? inferTemplateWfOutputType(wt, node.id) : getWfNodeOutputType(node);
    return outputType === '未指定' ? '产出物 · 未指定' : `产出物 · ${outputType}`;
  }
  return '';
}

function _taskWfApplyTransform() {
  const el = document.getElementById('task-wf-canvas-transform');
  if (el) el.style.transform = `translate(${_taskWfPanX}px,${_taskWfPanY}px) scale(${_taskWfZoom})`;
}

function taskWfSetZoom(delta) {
  _taskWfZoom = Math.max(0.3, Math.min(2, _taskWfZoom + delta));
  _taskWfApplyTransform();
  const label = document.getElementById('task-wf-zoom-label');
  if (label) label.textContent = Math.round(_taskWfZoom * 100) + '%';
}

function taskWfFitView() {
  const area = document.getElementById('task-wf-canvas-area');
  if (!area) return;
  const rect = area.getBoundingClientRect();
  const nodeEls = area.querySelectorAll('.task-wf-node');
  if (!nodeEls.length) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  nodeEls.forEach(el => {
    const x = parseFloat(el.style.left);
    const y = parseFloat(el.style.top);
    const w = el.offsetWidth || TASK_WF_NODE_W;
    const h = el.offsetHeight || TASK_WF_NODE_H;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + w > maxX) maxX = x + w;
    if (y + h > maxY) maxY = y + h;
  });
  minX -= 60; minY -= 60; maxX += 60; maxY += 60;
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const availW = rect.width - 40;
  const availH = rect.height - 40;
  _taskWfZoom = Math.max(0.3, Math.min(1.2, Math.min(availW / contentW, availH / contentH)));
  _taskWfPanX = (availW - contentW * _taskWfZoom) / 2 - minX * _taskWfZoom + 20;
  _taskWfPanY = (availH - contentH * _taskWfZoom) / 2 - minY * _taskWfZoom + 20;
  _taskWfApplyTransform();
  const label = document.getElementById('task-wf-zoom-label');
  if (label) label.textContent = Math.round(_taskWfZoom * 100) + '%';
}

function _taskWfUpdateEdges(wt) {
  const svg = document.getElementById('task-wf-canvas-svg');
  if (!svg) return;
  let edgeSvg = '';
  const edges = getWorkflowTemplateEdges(wt);
  for (const edge of edges) {
    const fromEl = document.getElementById('task-wf-node-' + edge.from);
    const toEl = document.getElementById('task-wf-node-' + edge.to);
    if (!fromEl || !toEl) continue;
    const fx = parseFloat(fromEl.style.left);
    const fy = parseFloat(fromEl.style.top);
    const fw = fromEl.offsetWidth || TASK_WF_NODE_W;
    const fh = fromEl.offsetHeight || TASK_WF_NODE_H;
    const tx = parseFloat(toEl.style.left);
    const ty = parseFloat(toEl.style.top);
    const th = toEl.offsetHeight || TASK_WF_NODE_H;
    const x1 = fx + fw + 5;
    const y1 = fy + fh / 2;
    const x2 = tx - 5;
    const y2 = ty + th / 2;
    const dist = Math.abs(x2 - x1);
    const cx1 = x1 + dist * 0.35;
    const cx2 = x2 - dist * 0.35;
    edgeSvg += `<path d="M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}"/>`;
    edgeSvg += `<circle class="edge-dot" cx="${x1}" cy="${y1}" r="5"/>`;
    edgeSvg += `<circle class="edge-dot" cx="${x2}" cy="${y2}" r="5"/>`;
  }
  svg.innerHTML = edgeSvg;
}

function _taskWfMeasureAndFit(wt) {
  _taskWfRelayout(wt);
  _taskWfUpdateEdges(wt);
  taskWfFitView();
}

function _taskWfRelayout(wt) {
  if (!wt) return;
  if (hasWorkflowTemplateLayout(wt)) {
    const positions = getWorkflowTemplatePositions(wt, { baseX: 80, baseY: 120, gapX: TASK_WF_GAP_X, nodeW: TASK_WF_NODE_W });
    wt.nodes.forEach(node => {
      const el = document.getElementById('task-wf-node-' + node.id);
      const pos = positions[node.id];
      if (el && pos) {
        el.style.left = pos.x + 'px';
        el.style.top = pos.y + 'px';
      }
    });
    return;
  }

  const nodes = wt.nodes || [];
  let maxH = 0;
  nodes.forEach(node => {
    const el = document.getElementById('task-wf-node-' + node.id);
    const h = el ? el.offsetHeight : TASK_WF_NODE_H;
    if (h > maxH) maxH = h;
  });
  let curX = 80;
  const centerY = 160;
  nodes.forEach(node => {
    const el = document.getElementById('task-wf-node-' + node.id);
    const w = el ? el.offsetWidth : TASK_WF_NODE_W;
    const h = el ? el.offsetHeight : TASK_WF_NODE_H;
    const y = centerY - h / 2;
    if (el) { el.style.left = curX + 'px'; el.style.top = y + 'px'; }
    curX += w + TASK_WF_GAP_X;
  });
}

function _initTaskWfCanvasPan() {
  const area = document.getElementById('task-wf-canvas-area');
  if (!area || area._panInit) return;
  area._panInit = true;
  let isPanning = false, startX = 0, startY = 0;
  area.addEventListener('mousedown', e => {
    if (e.target.closest('.task-wf-node') || e.target.closest('.task-wf-canvas-zoom')) return;
    isPanning = true;
    startX = e.clientX - _taskWfPanX;
    startY = e.clientY - _taskWfPanY;
    area.classList.add('grabbing');
  });
  document.addEventListener('mousemove', e => {
    if (!isPanning) return;
    _taskWfPanX = e.clientX - startX;
    _taskWfPanY = e.clientY - startY;
    _taskWfApplyTransform();
  });
  document.addEventListener('mouseup', () => {
    if (isPanning) { isPanning = false; area.classList.remove('grabbing'); }
  });
  area.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = area.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZ = _taskWfZoom;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    const newZ = Math.max(0.3, Math.min(2, oldZ + delta));
    _taskWfPanX = mx - (mx - _taskWfPanX) * (newZ / oldZ);
    _taskWfPanY = my - (my - _taskWfPanY) * (newZ / oldZ);
    _taskWfZoom = newZ;
    _taskWfApplyTransform();
    const label = document.getElementById('task-wf-zoom-label');
    if (label) label.textContent = Math.round(_taskWfZoom * 100) + '%';
  }, { passive: false });
}

function _buildTaskWfCanvasHtml(task, wt) {
  if (!_taskWfInitialized) { _taskWfZoom = 1; _taskWfPanX = 0; _taskWfPanY = 0; }

  const nodePositions = getWorkflowTemplatePositions(wt, { baseX: 80, baseY: 120, gapX: TASK_WF_GAP_X, nodeW: TASK_WF_NODE_W });
  let nodesHtml = '';
  wt.nodes.forEach(node => {
    const pos = nodePositions[node.id] || { x: 80, y: 120 };
    const detail = task.workflowNodeDetails[node.id] || { status: 'waiting', duration: '—' };
    const isActive = currentTaskDetailNodeId === node.id;
    const subLabel = _taskWfSubLabel(node, wt);
    const bottomHtml = node.type === 'output'
      ? (detail.status === 'pending_confirm'
          ? `
            <div class="wf-node-bottom">
              <span class="wf-node-status-badge pending_confirm">⏸ 待确认</span>
            </div>
          `
          : '')
      : `
        <div class="wf-node-bottom">
          <span class="wf-node-status-badge ${detail.status}">${getTaskStatusLabel(detail.status)}</span>
          <span class="wf-node-duration">${detail.duration}</span>
        </div>
      `;

    const isPendingConfirm = detail.status === 'pending_confirm';
    nodesHtml += `
      <div class="task-wf-node wf-type-${node.type} ${isActive ? 'active' : ''} ${isPendingConfirm ? 'awaiting-confirm' : ''}"
           id="task-wf-node-${node.id}"
           style="left:${pos.x}px; top:${pos.y}px;"
           onclick="selectTaskDetailNode('${node.id}')">
        <div class="wf-node-top">
          <div class="wf-node-icon">${node.icon}</div>
          <div class="wf-node-text">
            <div class="wf-node-name">${node.label}</div>
            <div class="wf-node-sub">${subLabel}</div>
          </div>
        </div>
        ${bottomHtml}
        <div class="task-wf-port port-out"></div>
        <div class="task-wf-port port-in"></div>
      </div>
    `;
  });

  return `
    <div class="task-wf-canvas-wrap">
      <div style="padding:14px 18px 10px; font-size:13px; font-weight:600; border-bottom:1px solid #1e1e2e;">节点画布</div>
      <div class="task-wf-canvas-area" id="task-wf-canvas-area">
        <div class="task-wf-canvas-grid"></div>
        <div class="task-wf-canvas-transform" id="task-wf-canvas-transform">
          <svg class="task-wf-canvas-svg" id="task-wf-canvas-svg" width="4000" height="1000"></svg>
          ${nodesHtml}
        </div>
        <div class="task-wf-canvas-zoom">
          <button onclick="taskWfSetZoom(0.15)">+</button>
          <button onclick="taskWfSetZoom(-0.15)">−</button>
          <div class="zoom-label" id="task-wf-zoom-label">100%</div>
          <button onclick="taskWfFitView()" style="font-size:10px;" title="适应画布">⊞</button>
        </div>
      </div>
    </div>
  `;
}

function getPendingConfirmNode(task) {
  if (!task || !task.workflowNodeDetails) return null;
  const entry = Object.entries(task.workflowNodeDetails).find(([, d]) => d && d.status === 'pending_confirm');
  return entry ? entry[0] : null;
}

function renderWorkflowTaskDetail(task) {
  const wt = task.workflowTemplate ? WORKFLOW_TEMPLATES.find(w => w.id === task.workflowTemplate) : null;
  if (!wt) return '';
  const selectedNodeId = currentTaskDetailNodeId;
  const selectedNode = selectedNodeId ? wt.nodes.find(node => node.id === selectedNodeId) : null;
  const selectedOutputScopeMode = getTaskOutputScopeMode(task, selectedNodeId);
  const outputScopedNode = selectedNode && selectedNode.type === 'output' ? selectedNode : null;
  const selectedNodeDetail = selectedNode ? (task.workflowNodeDetails[selectedNode.id] || { status: 'waiting', duration: '—', params: [], outputSummary: '暂无输出摘要' }) : null;
  syncTaskOutputScope(task, selectedNodeId);
  const displayedOutputs = getDisplayedTaskOutputs(task, selectedNodeId);

  const pendingNodeId = getPendingConfirmNode(task);
  const pendingNode = pendingNodeId ? wt.nodes.find(n => n.id === pendingNodeId) : null;
  const pendingNodeDetail = pendingNodeId ? task.workflowNodeDetails[pendingNodeId] : null;
  const isViewingPending = selectedNodeId && selectedNodeId === pendingNodeId;

  const bannerHtml = (pendingNode && !isViewingPending) ? `
    <div class="pending-confirm-banner">
      <div class="pcb-icon">⏸</div>
      <div class="pcb-text">
        <div class="pcb-title">工作流已暂停，等待你确认「${pendingNode.label}」的产出物</div>
        <div class="pcb-sub">${pendingNodeDetail && pendingNodeDetail.confirmNote ? pendingNodeDetail.confirmNote : '请前往该节点检查产出物是否符合预期，确认后工作流将继续执行下游节点。'}</div>
      </div>
      <button class="btn-confirm-jump" onclick="selectTaskDetailNode('${pendingNodeId}')">立即前往确认 →</button>
    </div>
  ` : '';

  return `
    <div class="workflow-detail-layout">
      <div class="detail-topbar">
        <div class="detail-topbar-left">
          ${_backBtn("closeTaskDetail()", '返回任务列表')}
          <div class="page-title" style="margin-bottom:0; font-size:20px;">${task.name}</div>
          <span class="task-status ${getTaskStatusClass(task.status)}">${getTaskStatusLabel(task.status)}</span>
        </div>
      </div>

      ${bannerHtml}

      <div class="detail-info-bar">
        <div class="detail-info-item"><span class="dii-label">任务 ID</span> ${task.id}</div>
        <div class="detail-info-item"><span class="dii-label">状态</span> <span class="task-status ${getTaskStatusClass(task.status)}">${getTaskStatusLabel(task.status)}</span></div>
        <div class="detail-info-item"><span class="dii-label">来源</span> <span class="source-badge workflow">${getTaskSourceIcon(task.source)} ${getTaskSourceLabel(task.source)}</span></div>
        <div class="detail-info-item"><span class="dii-label">工作流模板名</span> ${task.toolName}</div>
        <div class="detail-info-item"><span class="dii-label">关联产品</span> ${task.product}</div>
        <div class="detail-info-item"><span class="dii-label">创建时间</span> ${task.createdAt}</div>
        <div class="detail-info-item"><span class="dii-label">总耗时</span> ${task.duration}</div>
      </div>

      <div class="workflow-detail-main">
        ${_buildTaskWfCanvasHtml(task, wt)}

        ${selectedNode ? (isViewingPending ? `
          <div class="workflow-node-detail confirm-node-panel">
            <div class="cnp-head">
              <span class="cnp-dot"></span>
              <h4>⏸ 中断确认 · ${selectedNode.label}</h4>
            </div>
            <div class="subtle" style="margin-bottom:0;">节点耗时 ${selectedNodeDetail.duration} · 产出物 ${(selectedNodeDetail.outputs || []).length} 项等待审核</div>
            <div class="cnp-note">${pendingNodeDetail && pendingNodeDetail.confirmNote ? pendingNodeDetail.confirmNote : '请检查本节点产出物是否符合预期。'}</div>
            <div class="confirm-outputs-header">
              <span class="coh-label">候选产出物（取消勾选不合适的项，默认全部通过）</span>
              <span class="coh-counter" id="cnp-check-counter">已选 ${(selectedNodeDetail.outputs || []).length} / ${(selectedNodeDetail.outputs || []).length}</span>
            </div>
            <div class="confirm-outputs-list">
              ${(selectedNodeDetail.outputs || []).map((out, i) => `
                <label class="confirm-output-item">
                  <input type="checkbox" id="regen-pick-${i}" data-regen-pick="${escapeHtml(out.name)}" checked onchange="updateConfirmCheckCounter()">
                  <span class="coi-check"><svg viewBox="0 0 12 12" fill="none" stroke="#0d0d14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 6 5 8.5 9.5 3.5"/></svg></span>
                  <span class="coi-name">${out.name}</span>
                  <span class="coi-meta">${out.duration || ''}</span>
                  <a class="coi-preview" onclick="event.preventDefault();toast('预览 ${out.name}（原型演示）')">预览</a>
                </label>
              `).join('')}
            </div>
            <div class="confirm-actions">
              <button class="btn-confirm-approve" id="cnp-approve-btn" onclick="approvePendingNode('${task.id}','${selectedNode.id}')">✓ 确认通过 · 继续执行 <span class="btn-counter">${(selectedNodeDetail.outputs || []).length} 项</span></button>
              <button class="btn-confirm-regen" id="cnp-regen-btn" onclick="regenPendingNode('${task.id}','${selectedNode.id}')">⟳ 不合适 · 重新生成</button>
            </div>
          </div>
        ` : `
          <div class="workflow-node-detail">
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px;">
              <div>
                <h4 style="margin-bottom:6px;">节点详情面板</h4>
                <div class="subtle" style="margin-bottom:0;">${selectedNode.label} · ${getTaskStatusLabel(selectedNodeDetail.status)} · 节点耗时 ${selectedNodeDetail.duration}</div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="clearTaskDetailNodeSelection()">查看全部产出物</button>
            </div>
            <div class="readonly-form-fields single">
              ${selectedNodeDetail.params.map(field => `
                <div class="readonly-field">
                  <div class="label">${field.label}</div>
                  ${renderReadonlyValue(field)}
                </div>
              `).join('')}
              <div class="readonly-field">
                <div class="label">输出摘要</div>
                <div class="value">${selectedNodeDetail.outputSummary}</div>
              </div>
            </div>
          </div>
        `) : `
          <div class="workflow-node-empty">
            <strong>节点详情面板</strong>
            <p>当前未选中节点。点击左侧只读画布中的任意节点后，这里会展示该节点的运行状态、输入参数和输出摘要；只有点击产出物节点时，下方产出物区才会聚焦到该节点的产出物。</p>
          </div>
        `}
      </div>

      ${renderUnifiedOutputSection(task, '产出物汇总区', '节点产出耗时', displayedOutputs, {
        scopeText: selectedOutputScopeMode === 'node'
          ? `当前范围：${outputScopedNode.label} 的产出物`
          : selectedOutputScopeMode === 'none'
            ? '当前范围：未聚焦产出物节点'
            : '当前范围：任务全部产出物',
        emptyText: selectedOutputScopeMode === 'node'
          ? '当前产出物节点暂无产出物，可切换其他产出物节点继续查看。'
          : selectedOutputScopeMode === 'none'
            ? '当前选中的是非产出物节点。请点击产出物节点查看对应产出物，或点击“查看全部产出物”恢复总览。'
            : '当前任务暂无产出物'
      })}
    </div>
  `;
}
function renderTaskCenter() {
  const container = document.getElementById('tasks-content');
  if (!container) return;

  const badge = document.getElementById('global-task-badge');
  if (badge) badge.textContent = String(MOCK_TASKS.filter(t => t.status === 'generating' || t.status === 'pending_confirm').length);

  if (currentTaskDetailId) {
    renderTaskDetail();
    return;
  }

  const stats = {
    generating: MOCK_TASKS.filter(t => t.status === 'generating').length,
    pending_confirm: MOCK_TASKS.filter(t => t.status === 'pending_confirm').length,
    completed: MOCK_TASKS.filter(t => t.status === 'completed').length,
    failed: MOCK_TASKS.filter(t => t.status === 'failed').length,
  };

  let filtered = [...MOCK_TASKS];
  if (taskFilters.status.length) filtered = filtered.filter(t => taskFilters.status.includes(t.status));
  if (taskFilters.source.length) filtered = filtered.filter(t => taskFilters.source.includes(t.source));
  if (taskFilters.business.length) filtered = filtered.filter(t => getTaskBusinessValues(t).some(biz => taskFilters.business.includes(biz)));
  if (taskFilters.industry.length) filtered = filtered.filter(t => getTaskIndustryValues(t).some(industry => taskFilters.industry.includes(industry)));
  if (taskFilters.outputType.length) filtered = filtered.filter(t => (t.outputTypes || []).some(ot => taskFilters.outputType.includes(ot)));
  if (taskFilters.videoModel.length) filtered = filtered.filter(t => taskFilters.videoModel.includes(t.videoModel));
  if (taskFilters.product && taskFilters.product !== 'all') filtered = filtered.filter(t => t.product === taskFilters.product);
  filtered = filtered.filter(taskInTimeRange);

  filtered.sort((a, b) => {
    if (taskFilters.sort === 'created-asc') return (parseTaskDate(a.createdAt) || 0) - (parseTaskDate(b.createdAt) || 0);
    if (taskFilters.sort === 'duration-asc') return parseTaskDuration(a.duration) - parseTaskDuration(b.duration);
    return (parseTaskDate(b.createdAt) || 0) - (parseTaskDate(a.createdAt) || 0);
  });

  const products = [...new Set(MOCK_TASKS.map(t => t.product).filter(Boolean).filter(p => p !== '—'))];
  const activeFilterCount = getTaskFilterActiveCount();
  const showOwnership = shouldShowTaskOwnership();

  const totalCount = filtered.length;
  const taskPager = getInlinePaginationState(totalCount, taskPage, TASK_PAGE_SIZE);
  if (taskPage !== taskPager.page) taskPage = taskPager.page;
  const pageRows = filtered.slice(taskPager.start, taskPager.end);
  const paginationHtml = buildInlinePagination({
    page: taskPager.page,
    totalCount,
    pageSize: TASK_PAGE_SIZE,
    onPageChange: 'setTaskPage',
    unitLabel: '条',
  });

  container.innerHTML = `
    <div class="page-title">任务中心</div>
    <div class="stats-row" style="grid-template-columns: repeat(4, 1fr);">
      <div class="stat-card"><div class="label">生成中</div><div class="value" style="color:#60a5fa;">${stats.generating}</div></div>
      <div class="stat-card"><div class="label">待确认 ${stats.pending_confirm ? '<span style=\'color:#fbbf24;font-size:10px;margin-left:4px;\'>● 需要操作</span>' : ''}</div><div class="value" style="color:#fbbf24;">${stats.pending_confirm}</div></div>
      <div class="stat-card"><div class="label">已完成</div><div class="value" style="color:#4ade80;">${stats.completed}</div></div>
      <div class="stat-card"><div class="label">失败</div><div class="value" style="color:#f87171;">${stats.failed}</div></div>
    </div>
    <div class="task-filter-wrap">
      <div class="task-filter-toolbar">
        <div class="task-filter-primary">
          <div class="task-filter-control">
            <span class="filter-label">关联产品</span>
            <input class="task-filter-input" list="task-product-list" value="${taskFilters.product === 'all' ? '' : taskFilters.product}" placeholder="从产品库动态加载" oninput="setTaskFilterValue('product', this.value || 'all')" onchange="renderTaskCenter()">
            <datalist id="task-product-list">
              ${products.map(product => `<option value="${product}"></option>`).join('')}
            </datalist>
          </div>
          <div class="task-filter-control">
            <span class="filter-label">时间范围</span>
            <select class="task-filter-select" onchange="setTaskFilterValue('timeRange', this.value)">
              <option value="all" ${taskFilters.timeRange === 'all' ? 'selected' : ''}>全部时间</option>
              <option value="today" ${taskFilters.timeRange === 'today' ? 'selected' : ''}>今天</option>
              <option value="7d" ${taskFilters.timeRange === '7d' ? 'selected' : ''}>最近 7 天</option>
              <option value="30d" ${taskFilters.timeRange === '30d' ? 'selected' : ''}>最近 30 天</option>
              <option value="custom" ${taskFilters.timeRange === 'custom' ? 'selected' : ''}>自定义</option>
            </select>
            ${taskFilters.timeRange === 'custom' ? `
              <div class="task-filter-date-wrap">
                <input class="task-filter-date" type="date" value="${taskFilters.dateFrom || ''}" onchange="setTaskDateField('dateFrom', this.value)">
                <span style="font-size:12px;color:#666;">至</span>
                <input class="task-filter-date" type="date" value="${taskFilters.dateTo || ''}" onchange="setTaskDateField('dateTo', this.value)">
              </div>
            ` : ''}
          </div>
          <div class="task-filter-control">
            <span class="filter-label">排序方式</span>
            <select class="task-filter-select" onchange="setTaskFilterValue('sort', this.value)">
              <option value="created-desc" ${taskFilters.sort === 'created-desc' ? 'selected' : ''}>创建时间倒序（默认）</option>
              <option value="created-asc" ${taskFilters.sort === 'created-asc' ? 'selected' : ''}>创建时间正序</option>
              <option value="duration-asc" ${taskFilters.sort === 'duration-asc' ? 'selected' : ''}>耗时最短</option>
            </select>
          </div>
        </div>
        <div class="task-filter-actions">
          <button class="btn btn-ghost task-filter-trigger" onclick="openTaskFilterModal()">
            筛选
            ${activeFilterCount ? `<span class="task-filter-count">${activeFilterCount}</span>` : ''}
          </button>
        </div>
      </div>
    </div>
    <div class="task-table-wrap">
      <table class="task-table">
        <thead><tr><th>任务 ID</th><th>任务名称</th><th>状态</th><th>来源</th><th>工具 / 工作流名称</th>${showOwnership ? '<th>归属成员</th>' : ''}<th>关联产品</th><th>产出物摘要</th><th>创建时间</th><th>耗时</th></tr></thead>
        <tbody>
          ${pageRows.length ? pageRows.map(t => `
            <tr onclick="openTaskDetail('${t.id}')" ${t.status === 'pending_confirm' ? 'style="background:#fbbf2408;"' : ''}>
              <td style="color:#888; font-size:12px;">${t.id}</td>
              <td style="font-weight:500;">${t.name}${t.status === 'pending_confirm' ? ' <span style="font-size:10px; color:#fbbf24; margin-left:6px;">⏸ 等待你确认</span>' : ''}</td>
              <td><span class="task-status ${getTaskStatusClass(t.status)}">${getTaskStatusLabel(t.status)}</span></td>
              <td><span class="source-badge ${t.source}">${getTaskSourceIcon(t.source)} ${getTaskSourceLabel(t.source)}</span></td>
              <td style="color:#ddd;">${t.toolName}</td>
              ${showOwnership ? `<td style="color:#888; font-size:12px;">${renderTaskOwnerList(t, { fontSize: 11 })}</td>` : ''}
              <td style="color:#888;">${t.product}</td>
              <td style="color:#888; font-size:12px;">${t.outputSummary}</td>
              <td style="color:#888; font-size:12px;">${t.createdAt}</td>
              <td style="color:#888; font-size:12px;">${t.duration}</td>
            </tr>
          `).join('') : `<tr><td colspan="${showOwnership ? 10 : 9}" style="text-align:center; color:#666; padding:32px;">暂无匹配的任务</td></tr>`}
        </tbody>
      </table>
      ${paginationHtml}
    </div>
  `;
}

function openTaskDetail(taskId) {
  currentTaskDetailId = taskId;
  _taskWfInitialized = false; // reset canvas state for new task
  const task = MOCK_TASKS.find(t => t.id === taskId);
  currentTaskDetailNodeId = null;
  // Auto-focus pending-confirm node so user lands directly on the confirmation panel
  if (task && task.source === 'workflow' && task.workflowTemplate) {
    const pendingNodeId = getPendingConfirmNode(task);
    if (pendingNodeId) currentTaskDetailNodeId = pendingNodeId;
  }
  currentTaskOutputScopeKey = '';
  currentTaskOutputSelection = new Set();
  renderTaskCenter();
}

function updateConfirmCheckCounter() {
  const all = document.querySelectorAll('[data-regen-pick]');
  const checked = document.querySelectorAll('[data-regen-pick]:checked');
  const total = all.length;
  const checkedCount = checked.length;
  const uncheckedCount = total - checkedCount;
  const counter = document.getElementById('cnp-check-counter');
  if (counter) counter.textContent = '已选 ' + checkedCount + ' / ' + total;
  const approveBtn = document.getElementById('cnp-approve-btn');
  if (approveBtn) {
    const btnCounter = approveBtn.querySelector('.btn-counter');
    if (btnCounter) btnCounter.textContent = checkedCount + ' 项';
  }
}

function approvePendingNode(taskId, nodeId) {
  const task = MOCK_TASKS.find(t => t.id === taskId);
  if (!task || !task.workflowNodeDetails || !task.workflowNodeDetails[nodeId]) return;
  const checkedItems = document.querySelectorAll('[data-regen-pick]:checked');
  const allItems = document.querySelectorAll('[data-regen-pick]');
  const checkedCount = checkedItems.length;
  if (checkedCount === 0) {
    toast('请至少勾选 1 项满意的产出物后再确认通过');
    return;
  }
  task.workflowNodeDetails[nodeId].status = 'completed';
  task.workflowNodeDetails[nodeId].outputSummary = '已确认通过（' + checkedCount + ' / ' + allItems.length + ' 项），工作流继续执行';
  // Advance: set all waiting downstream nodes to running (visual demo)
  const wt = WORKFLOW_TEMPLATES.find(w => w.id === task.workflowTemplate);
  if (wt) {
    wt.nodes.forEach(n => {
      const d = task.workflowNodeDetails[n.id];
      if (d && d.status === 'waiting') {
        d.status = 'running';
        d.duration = '进行中';
      }
    });
  }
  task.status = 'generating';
  task.outputSummary = '脚本 ' + checkedCount + ' 条已确认 · 视频生成中';
  task.duration = '生成中';
  delete task.pendingConfirmNodeId;
  currentTaskDetailNodeId = null;
  renderTaskCenter();
  toast('✓ 已确认 ' + checkedCount + ' 项，工作流继续执行下游节点');
}

function regenPendingNode(taskId, nodeId) {
  const task = MOCK_TASKS.find(t => t.id === taskId);
  if (!task) return;
  const detail = task.workflowNodeDetails[nodeId];
  if (!detail) return;
  // Gather UNchecked items (unchecked = not approved = need regen)
  const uncheckedPicks = Array.from(document.querySelectorAll('[data-regen-pick]'))
    .filter(el => !el.checked)
    .map(el => el.getAttribute('data-regen-pick'));
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  const allOutputs = detail.outputs || [];
  const defaultMode = uncheckedPicks.length > 0 ? 'partial' : 'all';
  const uncheckedSet = new Set(uncheckedPicks);
  body.innerHTML = `
    <div class="regen-modal-header">
      <h3>重新生成 · ${task.name}</h3>
      <p>选择重新生成方式与范围，任务会回到「生成中」状态，完成后再次进入「待确认」。</p>
    </div>

    <div class="regen-modal-section">
      <div class="rms-label">重新生成方式</div>
      <div class="regen-mode-switch" id="regen-mode-switch">
        <label class="${defaultMode === 'all' ? 'active' : ''}" onclick="_setRegenMode('all')">
          <input type="radio" name="regen-mode" value="all" ${defaultMode === 'all' ? 'checked' : ''}>
          全部重新生成（${allOutputs.length} 项）
        </label>
        <label class="${defaultMode === 'partial' ? 'active' : ''}" onclick="_setRegenMode('partial')">
          <input type="radio" name="regen-mode" value="partial" ${defaultMode === 'partial' ? 'checked' : ''}>
          部分重新生成
        </label>
      </div>
    </div>

    <div class="regen-modal-section regen-items-section ${defaultMode === 'all' ? 'disabled' : ''}" id="regen-items-section">
      <div class="regen-items-header">
        <span class="rih-label">选择需要重新生成的项</span>
        <span class="rih-counter" id="regen-modal-counter">已选 ${uncheckedPicks.length} / ${allOutputs.length}</span>
      </div>
      <div class="confirm-outputs-list regen-modal-list" style="margin:0;">
        ${allOutputs.map((out, i) => `
          <label class="confirm-output-item">
            <input type="checkbox" id="regen-modal-pick-${i}" data-regen-modal-pick="${escapeHtml(out.name)}" ${uncheckedSet.has(out.name) ? 'checked' : ''} onchange="updateRegenModalCounter()">
            <span class="coi-check"><svg viewBox="0 0 12 12" fill="none" stroke="#0d0d14" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 6 5 8.5 9.5 3.5"/></svg></span>
            <span class="coi-name">${out.name}</span>
            <span class="coi-meta">${out.duration || ''}</span>
          </label>
        `).join('')}
      </div>
    </div>

    <div class="regen-modal-section">
      <div class="rms-label">新的生成要求（可选）</div>
      <textarea id="regen-feedback" placeholder="例如：节奏再紧凑一些；第 2 条强调限时福利..." style="min-height:70px;"></textarea>
    </div>

    <div class="regen-modal-actions">
      <button class="btn btn-ghost" onclick="hideModal()">取消</button>
      <button class="btn btn-regen-submit" onclick="submitRegenPendingNode('${taskId}','${nodeId}')">确认重新生成</button>
    </div>
  `;
  overlay.classList.add('show');
}

function _setRegenMode(mode) {
  const container = document.getElementById('regen-mode-switch');
  if (!container) return;
  container.querySelectorAll('label').forEach(l => l.classList.remove('active'));
  const radios = container.querySelectorAll('input[type="radio"]');
  radios.forEach(r => {
    if (r.value === mode) {
      r.checked = true;
      r.parentElement.classList.add('active');
    }
  });
  const itemsSection = document.getElementById('regen-items-section');
  if (itemsSection) {
    if (mode === 'all') itemsSection.classList.add('disabled');
    else itemsSection.classList.remove('disabled');
  }
}

function updateRegenModalCounter() {
  const all = document.querySelectorAll('[data-regen-modal-pick]');
  const checked = document.querySelectorAll('[data-regen-modal-pick]:checked');
  const counter = document.getElementById('regen-modal-counter');
  if (counter) counter.textContent = '已选 ' + checked.length + ' / ' + all.length;
}

function submitRegenPendingNode(taskId, nodeId) {
  const task = MOCK_TASKS.find(t => t.id === taskId);
  if (!task) return;
  const detail = task.workflowNodeDetails[nodeId];
  if (!detail) return;
  const modeRadio = document.querySelector('input[name="regen-mode"]:checked');
  const mode = modeRadio ? modeRadio.value : 'all';
  const picks = Array.from(document.querySelectorAll('[data-regen-modal-pick]'))
    .filter(el => el.checked)
    .map(el => el.getAttribute('data-regen-modal-pick'));
  if (mode === 'partial' && !picks.length) {
    toast('请至少勾选一个需要重新生成的项');
    return;
  }
  const feedback = (document.getElementById('regen-feedback') || {}).value || '';
  hideModal();
  // Update node to "running" state for visual demo
  detail.status = 'running';
  detail.outputSummary = mode === 'all'
    ? '正在全部重新生成 ' + (detail.outputs || []).length + ' 项'
    : '正在重新生成 ' + picks.length + ' 项：' + picks.join('、');
  if (feedback) detail.outputSummary += ' · 新要求：' + feedback;
  task.status = 'generating';
  delete task.pendingConfirmNodeId;
  currentTaskDetailNodeId = null;
  renderTaskCenter();
  toast(mode === 'all'
    ? '已提交全部重新生成，完成后将再次进入待确认'
    : '已提交 ' + picks.length + ' 项重新生成，完成后将再次进入待确认');
}

function closeTaskDetail() {
  currentTaskDetailId = null;
  currentTaskDetailNodeId = null;
  currentTaskOutputScopeKey = '';
  currentTaskOutputSelection = new Set();
  _taskWfInitialized = false;
  renderTaskCenter();
}

function renderTaskDetail() {
  const container = document.getElementById('tasks-content');
  const task = MOCK_TASKS.find(t => t.id === currentTaskDetailId);
  if (!container || !task) { closeTaskDetail(); return; }
  container.innerHTML = task.source === 'workflow'
    ? renderWorkflowTaskDetail(task)
    : renderToolboxTaskDetail(task);

  // Initialize read-only canvas for workflow tasks
  if (task.source === 'workflow' && task.workflowTemplate) {
    const wt = WORKFLOW_TEMPLATES.find(w => w.id === task.workflowTemplate);
    if (wt) {
      const shouldFit = !_taskWfInitialized;
      requestAnimationFrame(() => {
        if (shouldFit) {
          _taskWfMeasureAndFit(wt);
        } else {
          // Just re-draw edges and apply existing transform (node switch)
          _taskWfRelayout(wt);
          _taskWfUpdateEdges(wt);
          _taskWfApplyTransform();
        }
        _initTaskWfCanvasPan();
      });
    }
  }
}

// ===== Team (rendered inside settings page) =====
let _teamContainerId = 'settings-team-panel';
function renderTeamMemberActions(user) {
  const mode = getMemberActionMode(currentUser, user);
  if (user.id === currentUser.id) return '<span style="color:#666;">本人</span>';
  if (mode === 'role-only') {
    return `
      <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
        <select onchange="changeUserRole('${user.id}', this.value)" style="width:auto; margin:0; padding:4px 8px; font-size:12px;">
          <option value="superadmin" ${user.role==='superadmin'?'selected':''}>超级管理员</option>
          <option value="manager" ${user.role==='manager'?'selected':''}>经理</option>
          <option value="leader" ${user.role==='leader'?'selected':''}>组长</option>
          <option value="member" ${user.role==='member'?'selected':''}>成员</option>
        </select>
        <button class="btn btn-danger btn-sm" onclick="removeMember('${user.id}')">移除</button>
      </div>
    `;
  }
  return '<span style="color:#666;">只读</span>';
}
function renderTeam(containerId) {
  if (containerId) _teamContainerId = containerId;
  const container = document.getElementById(_teamContainerId);
  if (!container) return;
  const q = (document.getElementById('settings-team-search')?.value || '').toLowerCase();
  const roleOrder = { superadmin: 0, manager: 1, leader: 2, member: 3 };
  const filtered = users.filter(u => !q || u.name.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q))
    .sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
  const canInvite = currentUser.role === 'superadmin' || currentUser.role === 'manager';
  const showActions = currentUser.role === 'superadmin' || currentUser.role === 'manager';
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div style="font-size:14px; font-weight:600;">团队成员 (${users.length})</div>
      <div style="display:flex;gap:8px;">
        ${canInvite ? '<button class="btn btn-ghost btn-sm" onclick="showModal(\'invite-link\')">🔗 邀请链接</button>' : ''}
        ${canInvite ? '<button class="btn btn-primary btn-sm" onclick="showModal(\'invite\')">+ 邀请成员</button>' : ''}
      </div>
    </div>
    <div class="search-bar" style="margin-bottom:12px;">
      <input type="text" id="settings-team-search" placeholder="搜索成员姓名或邮箱..." oninput="renderTeam()" value="${q}">
    </div>
    <div style="background:#0d0d14; border:1px solid #1e1e2e; border-radius:12px; overflow:hidden; max-height:400px; overflow-y:auto;">
      <table class="team-table">
        <thead><tr><th>成员</th><th>邮箱</th><th>角色</th><th>业务</th><th>加入时间</th><th>状态</th>${showActions ? '<th>操作</th>' : ''}</tr></thead>
        <tbody>${filtered.map(u => {
          return `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="avatar" style="background:${u.color};width:32px;height:32px;font-size:12px;">${u.short}</div>
                <div><div style="font-weight:500;">${u.name}</div></div>
              </div>
            </td>
            <td style="color:#888;font-size:12px;">${u.email || '<span style="color:#444;">未填写</span>'}</td>
            <td><span class="tag tag-${u.role}">${ROLES[u.role].label}</span></td>
            <td>${renderUserOrgBadge(u)}</td>
            <td style="color:#888;">${u.joined}</td>
            <td><span class="tag" style="background:${u.status === 'pending' ? '#f59e0b22' : '#4ade8022'};color:${u.status === 'pending' ? '#f59e0b' : '#4ade80'}">${u.status === 'pending' ? '待接受' : '已激活'}</span></td>
            ${showActions ? `<td>${renderTeamMemberActions(u)}</td>` : ''}
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>
  `;
}

function changeUserRole(userId, newRole) {
  const u = users.find(u => u.id === userId);
  if (!u || !canChangeMemberRole(currentUser, u)) return;
  u.role = newRole;
  syncUserOrganization(u);
  renderTeam();
  renderGroups();
  toast(`已将 ${u.name} 的角色更改为 ${ROLES[newRole].label}`);
}

// ===== Groups (rendered inside settings page) =====
let _groupsContainerId = 'settings-team-panel';
function renderGroups(containerId) {
  if (containerId) _groupsContainerId = containerId;
  const container = document.getElementById(_groupsContainerId);
  if (!container) return;
  const businessIds = getVisibleOrganizationBusinessIds(currentUser);
  const unassignedCount = getUnassignedUsers().length;
  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
      <div>
        <div style="font-size:14px; font-weight:600;">业务管理 (${businessIds.length})</div>
        <div style="font-size:12px; color:#666; margin-top:4px;">按一级业务展示经理及 a类 / b类 人员分布${currentUser.role === 'superadmin' ? ` · 当前有 ${unassignedCount} 人待分配` : ''}</div>
      </div>
      ${currentUser.role === 'superadmin' ? `<button class="btn btn-primary btn-sm" onclick="showModal('business-line')">+ 新增业务线</button>` : ''}
    </div>
    <div class="projects-grid">
      ${businessIds.map(businessId => {
        const business = getBusinessOptionById(businessId);
        const managers = getBusinessManagers(businessId);
        const totalMembers = users.filter(user => user.role !== 'superadmin' && user.businessId === businessId).length;
        const subgroupACount = users.filter(user => user.role !== 'superadmin' && user.role !== 'manager' && user.businessId === businessId && user.subgroupKey === 'a').length;
        const subgroupBCount = users.filter(user => user.role !== 'superadmin' && user.role !== 'manager' && user.businessId === businessId && user.subgroupKey === 'b').length;
        return `
        <div class="project-card" style="cursor:pointer;" onclick="showModal('business-detail', '${businessId}')" oncontextmenu="showBusinessContextMenu(event, '${businessId}')">
          <div class="color-bar" style="background:${business ? business.color : '#666'};"></div>
          <h3>${business ? business.label : businessId}</h3>
          <p>${totalMembers} 名成员 · ${managers.length} 位经理</p>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-top:10px;">
            <span class="tag" style="background:#3b82f622;color:#93c5fd;">a类 ${subgroupACount}</span>
            <span class="tag" style="background:#10b98122;color:#6ee7b7;">b类 ${subgroupBCount}</span>
          </div>
          <div style="margin-top:12px; font-size:12px; color:#888; line-height:1.7;">
            ${managers.length ? managers.map(manager => {
              const counts = getManagerScopeSubgroupCounts(manager.managerScopeId);
              return `<div>${manager.name} · a类 ${counts.a} / b类 ${counts.b}</div>`;
            }).join('') : '<div>当前暂无经理</div>'}
          </div>
        </div>`;
      }).join('')}
    </div>
    ${!businessIds.length ? '<div class="member-picker-empty" style="margin-top:12px;">当前还没有可见业务线</div>' : ''}
  `;
}

function unmountWorkflow(wfId) {
  if (!currentFolder) return;
  const refs = ensureFolderWorkflowRefs(currentFolder);
  currentFolder.workflowRefs = refs.filter(r => r.workflowId !== wfId);
  renderWorkspace();
  updateWorkspaceNav();
  const wf = getWorkflowById(wfId);
  toast(`已从当前文件夹取消挂载 "${wf ? wf.name : wfId}"`);
}

// ===== Library =====
let libraryTab = 'scripts';
let libFilter = 'mine';

function setLibraryTab(tab) {
  libraryTab = tab;
  libFilter = 'mine';
  renderLibrary();
}

function setLibFilter(f) {
  libFilter = f;
  renderLibrary();
}

function renderLibrary() {
  const container = document.getElementById('library-content');
  if (!container) return;

  const tabs = [
    { id: 'scripts', label: '📝 脚本', count: libraryScripts.length },
    { id: 'assets', label: '🎞 素材', count: libraryAssets.length },
    { id: 'workflows', label: '🔁 工作流', count: globalWorkflows.length },
  ];

  const actionBtn = libraryTab === 'scripts'
    ? '<button class="btn btn-primary" onclick="showModal(\'import-script\')">+ 导入脚本</button>'
    : libraryTab === 'assets'
    ? '<button class="btn btn-primary" onclick="showModal(\'import-asset\')">+ 导入素材</button>'
    : '<button class="btn btn-primary" onclick="showModal(\'library-workflow\')">+ 新建工作流</button>';

  let contentHtml = '';
  if (libraryTab === 'scripts') {
    contentHtml = renderLibraryItems(libraryScripts, '脚本', '📝');
  } else if (libraryTab === 'assets') {
    contentHtml = renderLibraryItems(libraryAssets, '素材', '🎞');
  } else {
    contentHtml = renderLibraryWorkflows();
  }

  container.innerHTML = `
    <div class="projects-header">
      <div class="page-title" style="margin-bottom:0;">我的资源库</div>
      ${actionBtn}
    </div>
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;">
      <div class="tab-switch">
        ${tabs.map(t => `
          <div class="tab-switch-item ${libraryTab === t.id ? 'active' : ''}" onclick="setLibraryTab('${t.id}')">${t.label} <span style="font-size:11px; opacity:0.6; margin-left:4px;">${t.count}</span></div>
        `).join('')}
      </div>
      <select onchange="setLibFilter(this.value)" style="background:#16161f; border:1px solid #2a2a3a; border-radius:8px; color:#e0e0e0; padding:8px 12px; font-size:13px; outline:none; min-width:100px; cursor:pointer;">
        <option value="mine" ${libFilter === 'mine' ? 'selected' : ''}>我的</option>
        <option value="team" ${libFilter === 'team' ? 'selected' : ''}>共享</option>
        <option value="all" ${libFilter === 'all' ? 'selected' : ''}>全部</option>
      </select>
    </div>
    <div class="search-bar" style="margin-bottom:16px;">
      <input type="text" placeholder="搜索..." id="lib-search" oninput="renderLibrary()">
    </div>
    <div id="library-list">${contentHtml}</div>
  `;
}

function renderLibraryItems(dataList, typeName, icon) {
  const q = (document.getElementById('lib-search')?.value || '').toLowerCase();
  let list;
  if (libFilter === 'mine') {
    list = dataList.filter(item => item.creator === currentUser.id);
  } else if (libFilter === 'team') {
    list = dataList.filter(item => item.scope === 'team');
  } else {
    list = dataList.filter(item => item.creator === currentUser.id || item.scope === 'team');
  }
  if (q) list = list.filter(item => item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q));

  if (!list.length) return `<div style="color:#666; padding:40px; text-align:center;">暂无${typeName}</div>`;

  return `<div class="workflow-cards">${list.map(item => {
    const creator = getUserById(item.creator);
    const isMine = item.creator === currentUser.id;
    return `
      <div class="workflow-card" style="text-align:left; position:relative;">
        <div class="perm-badge">
          <span class="tag ${item.scope === 'team' ? 'tag-shared' : 'tag-private'}">${item.scope === 'team' ? '🌐 共享' : '🔒 个人'}</span>
        </div>
        <div class="wf-icon" style="text-align:center;">${icon}</div>
        <h4 style="text-align:center;">${item.name}</h4>
        <p style="text-align:center;">${item.desc}</p>
        <div style="margin-top:6px; text-align:center;">
          ${(item.tags || []).map(tag => `<span class="tag" style="background:#7c3aed11; color:#a78bfa; margin:2px;">${tag}</span>`).join('')}
        </div>
        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#888;">
          <span>${creator ? creator.name : '未知'}</span>
          <span>${item.fileCount} 个文件 · ${item.createdAt}</span>
        </div>
        ${isMine ? `
        <div style="margin-top:10px; display:flex; gap:6px; justify-content:center;">
          ${item.scope === 'personal' ? `<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();toggleLibItemScope('${item.id}','team')">发布共享</button>` : `<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();toggleLibItemScope('${item.id}','personal')">取消发布</button>`}
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteLibItem('${item.id}')">删除</button>
        </div>` : ''}
      </div>`;
  }).join('')}</div>`;
}

function renderLibraryWorkflows() {
  const q = (document.getElementById('lib-search')?.value || '').toLowerCase();
  let list;
  if (libFilter === 'mine') {
    list = globalWorkflows.filter(wf => wf.creator === currentUser.id);
  } else if (libFilter === 'team') {
    list = globalWorkflows.filter(wf => wf.scope === 'team');
  } else {
    list = globalWorkflows.filter(wf => wf.creator === currentUser.id || wf.scope === 'team');
  }
  if (q) list = list.filter(wf => wf.name.toLowerCase().includes(q) || wf.desc.toLowerCase().includes(q));

  // Sort by reference count descending (most used first)
  list.sort(function(a, b) { return getWorkflowRefCount(b.id) - getWorkflowRefCount(a.id); });

  if (!list.length) return '<div style="color:#666; padding:40px; text-align:center;">暂无工作流</div>';

  return `<div class="workflow-cards">${list.map(wf => {
    const creator = getUserById(wf.creator);
    const refCount = getWorkflowRefCount(wf.id);
    const isMine = wf.creator === currentUser.id;
    return `
      <div class="workflow-card" style="text-align:left; position:relative;">
        <div class="perm-badge">
          <span class="tag ${wf.scope === 'team' ? 'tag-shared' : 'tag-private'}">${wf.scope === 'team' ? '🌐 共享' : '🔒 个人'}</span>
        </div>
        <div class="wf-icon" style="text-align:center;">${wf.icon || '🔁'}</div>
        <h4 style="text-align:center;">${wf.name}</h4>
        <p style="text-align:center;">${wf.desc}</p>
        <div style="margin-top:10px; display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#888;">
          <span>${creator ? creator.name : '未知'}</span>
          <span>引用 ${refCount} 处</span>
        </div>
        ${isMine ? `
        <div style="margin-top:10px; display:flex; gap:6px; justify-content:center;">
          ${wf.scope === 'personal' ? `<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();publishWorkflow('${wf.id}')">发布共享</button>` : `<button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();unpublishWorkflow('${wf.id}')">取消发布</button>`}
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteGlobalWorkflow('${wf.id}')">删除</button>
        </div>` : ''}
      </div>`;
  }).join('')}</div>`;
}

function toggleLibItemScope(itemId, newScope) {
  let item = libraryScripts.find(s => s.id === itemId) || libraryAssets.find(a => a.id === itemId);
  if (item && item.creator === currentUser.id) {
    item.scope = newScope;
    renderLibrary();
    toast(`"${item.name}" 已${newScope === 'team' ? '发布共享' : '取消发布'}`);
  }
}

function deleteLibItem(itemId) {
  let idx = libraryScripts.findIndex(s => s.id === itemId);
  if (idx >= 0) {
    const item = libraryScripts[idx];
    libraryScripts.splice(idx, 1);
    renderLibrary();
    toast(`"${item.name}" 已删除`);
    return;
  }
  idx = libraryAssets.findIndex(a => a.id === itemId);
  if (idx >= 0) {
    const item = libraryAssets[idx];
    libraryAssets.splice(idx, 1);
    renderLibrary();
    toast(`"${item.name}" 已删除`);
  }
}

function publishWorkflow(wfId) {
  const wf = getWorkflowById(wfId);
  if (wf && wf.creator === currentUser.id) { wf.scope = 'team'; renderLibrary(); toast(`"${wf.name}" 已发布共享`); }
}
function unpublishWorkflow(wfId) {
  const wf = getWorkflowById(wfId);
  if (wf && wf.creator === currentUser.id) { wf.scope = 'personal'; renderLibrary(); toast(`"${wf.name}" 已取消发布`); }
}
function deleteGlobalWorkflow(wfId) {
  const wf = getWorkflowById(wfId);
  if (!wf || wf.creator !== currentUser.id) return;
  globalWorkflows = globalWorkflows.filter(w => w.id !== wfId);
  projects.forEach(p => p.folders.forEach(f => {
    if (Array.isArray(f.workflowRefs)) {
      f.workflowRefs = f.workflowRefs.filter(r => r.workflowId !== wfId);
    }
  }));
  renderLibrary();
  toast(`"${wf.name}" 已删除`);
}

// ===== Sidebar =====
// Sidebar project expand state — only show starred folders when project is expanded
let expandedSidebarProjects = new Set();

function toggleSidebarProject(projectId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  if (expandedSidebarProjects.has(projectId)) {
    expandedSidebarProjects.delete(projectId);
  } else {
    expandedSidebarProjects.add(projectId);
  }
  renderSidebarProjects();
}

function collapseSidebarProjects() {
  expandedSidebarProjects.clear();
}

function renderSidebarProjects() {
  const visible = projects.filter(p => canSeeProject(p));
  const showSidebarSelection = currentPage === 'folder' || currentPage === 'workspace';
  // Only show projects explicitly starred by the user.
  const sidebarProjects = visible.filter(p => isProjectStarred(p.id));
  document.getElementById('sidebar-project-list').innerHTML = sidebarProjects.map(p => {
    const visibleFolders = p.folders.filter(f => canSeeFolder(f));
    const isExpanded = expandedSidebarProjects.has(p.id);
    const sidebarFolders = isExpanded ? visibleFolders : [];
    const isActive = showSidebarSelection && currentProject && currentProject.id === p.id && !currentFolder;
    const starred = isProjectStarred(p.id);
    return `
      <div class="nav-item ${isActive ? 'active' : ''}" style="font-size:13px; padding:6px 12px;" onclick="toggleSidebarProject(${p.id}); openProject(${p.id})">
        <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block;flex-shrink:0;"></span>
        <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</span>
        <span class="sidebar-star-action ${starred ? 'starred' : ''}" onclick="toggleProjectStar(${p.id}, event)" title="${starred ? '取消固定' : '固定到侧栏'}">${starred ? '★' : '☆'}</span>
      </div>
      ${sidebarFolders.length ? `
        <div style="margin:2px 0 2px 14px;">
          ${sidebarFolders.map(f => `
            <div class="nav-item ${showSidebarSelection && currentFolder && currentFolder.id === f.id ? 'active' : ''}" style="font-size:12px; padding:6px 10px;" onclick="selectSidebarFolder(${p.id}, ${f.id})">
              <span>${f.visibility === 'private' ? '🔒' : '📂'}</span>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.name}</span>
            </div>`).join('')}
        </div>
      ` : ''}
    `;
  }).join('');
}

function selectSidebarFolder(projectId, folderId) {
  currentProject = projects.find(p => p.id === projectId);
  if (!currentProject) return;
  currentFolder = currentProject.folders.find(f => f.id === folderId) || null;
  workspaceSection = 'workflow';
  updateWorkspaceNav();
  goPage('folder');
  renderSidebarProjects();
}

// ===== User Switcher removed — system settings modal used instead =====

function renderMemberPicker(id, memberList, selectedIds = [], emptyText = '暂无可选成员') {
  const selectedSet = new Set(selectedIds);
  const initials = [...new Set(memberList.map(getUserInitial))].sort((a, b) => a.localeCompare(b));
  if (!memberList.length) return `<div class="member-picker-empty">${emptyText}</div>`;
  const sections = initials.map(initial => {
    const members = memberList.filter(u => getUserInitial(u) === initial);
    return `
      <div class="member-alpha-section" data-initial="${initial}">
        <div class="member-alpha-title">${initial}</div>
        ${members.map(u => `
          <label class="member-check-row" data-name="${u.name.toLowerCase()}" data-email="${(u.email || '').toLowerCase()}" data-initial="${getUserInitial(u)}">
            <input type="checkbox" value="${u.id}" ${selectedSet.has(u.id) ? 'checked' : ''} onchange="updateMemberPickerCount('${id}')">
            <div class="mini-avatar" style="background:${u.color}">${u.short}</div>
            <div class="member-check-meta">
              <strong>${u.name}</strong>
              <small>${getUserInitial(u)} · ${ROLES[u.role].label}${u.email ? ' · ' + u.email : ''}</small>
            </div>
          </label>
        `).join('')}
      </div>
    `;
  }).join('');
  return `
    <div class="member-picker" id="${id}">
      <div class="member-picker-toolbar">
        <span class="member-picker-count" id="${id}-count">已选 ${selectedIds.length} / ${memberList.length}</span>
        <div class="member-picker-actions">
          <button class="btn btn-ghost btn-sm" type="button" onclick="setAllMemberChecks('${id}', true)">全选当前</button>
          <button class="btn btn-ghost btn-sm" type="button" onclick="setAllMemberChecks('${id}', false)">清空当前</button>
        </div>
      </div>
      <div class="member-picker-search">
        <input type="text" id="${id}-search" placeholder="搜索姓名、邮箱或首字母..." oninput="filterMemberPicker('${id}', this.value)">
      </div>
      <div class="member-picker-main">
        <div class="member-picker-list-wrap">
          <div class="member-picker-list">
            ${sections}
          </div>
        </div>
        <div class="member-picker-side-index">
          ${initials.map(initial => `<button class="member-index-anchor" type="button" data-initial="${initial}" onclick="jumpMemberPickerToInitial('${id}', '${initial}')">${initial}</button>`).join('')}
        </div>
      </div>
      <div class="member-picker-empty" id="${id}-no-results" style="display:none;">没有匹配的成员</div>
    </div>
  `;
}
