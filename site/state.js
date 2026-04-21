let currentProject = null;
let currentFolder = null;
let projectFilter = 'all';
let workspaceSection = 'workflow';
let currentPage = 'dashboard';

// Starred projects — project IDs pinned to sidebar
let starredProjects = new Set([1, 2]); // default: first two projects starred

function isProjectStarred(projectId) {
  return starredProjects.has(projectId);
}
function toggleProjectStar(projectId, event) {
  if (event) { event.stopPropagation(); event.preventDefault(); }
  if (starredProjects.has(projectId)) {
    starredProjects.delete(projectId);
    toast('已取消固定');
  } else {
    starredProjects.add(projectId);
    toast('已固定到左侧导航');
  }
  renderSidebarProjects();
  if (currentPage === 'projects') renderProjects();
  if (currentPage === 'folder') renderFolder();
}
let currentToolDetail = null; // track which tool detail is open
let currentVideoToolModel = 'Grok';
let currentWorkflowTemplateId = null;
let currentWorkflowNodeId = null;
let currentTaskDetailId = null;
let currentTaskDetailNodeId = null;
let currentTaskOutputScopeKey = '';
let currentTaskOutputSelection = new Set();
let currentAssetSelection = new Set();
let taskFilters = { status: [], source: [], industry: [], business: [], outputType: [], videoModel: [], product: 'all', timeRange: 'all', dateFrom: '', dateTo: '', sort: 'created-desc' };
let taskPage = 1;
const TASK_PAGE_SIZE = 10;
let dcPage = 1;
const DC_PAGE_SIZE = 8;
let assetsCenterPage = 1;
const ASSETS_CENTER_PAGE_SIZE = 8;
function setTaskPage(p) {
  const n = Number(p);
  if (!Number.isFinite(n) || n < 1) return;
  taskPage = n;
  renderTaskCenter();
}
function setDcPage(page) {
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) return;
  dcPage = n;
  renderDataCenterPage();
}
function setAssetsCenterPage(page) {
  const n = Number(page);
  if (!Number.isFinite(n) || n < 1) return;
  assetsCenterPage = n;
  renderAssetsCenter();
}
function buildInlinePageList(cur, total) {
  const set = new Set([1, total, cur, cur - 1, cur + 1, cur - 2, cur + 2]);
  const list = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < list.length; i++) {
    if (i > 0 && list[i] - list[i - 1] > 1) out.push('…');
    out.push(list[i]);
  }
  return out;
}
function getInlinePaginationState(totalCount, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const current = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (current - 1) * pageSize;
  return {
    page: current,
    totalPages,
    start,
    end: start + pageSize,
    rangeFrom: totalCount === 0 ? 0 : start + 1,
    rangeTo: Math.min(start + pageSize, totalCount),
  };
}
function buildInlinePagination({ page, totalCount, pageSize, onPageChange, unitLabel = '条' }) {
  if (!totalCount) return '';
  const pager = getInlinePaginationState(totalCount, page, pageSize);
  const pageList = buildInlinePageList(pager.page, pager.totalPages);
  const pagerBtnBase = 'min-width:30px; height:30px; padding:0 10px; border-radius:6px; border:1px solid #2a2a3a; background:#16161f; color:#e0e0e0; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; justify-content:center;';
  const pagerBtnDisabled = 'min-width:30px; height:30px; padding:0 10px; border-radius:6px; border:1px solid #1e1e2e; background:#0f0f17; color:#555; font-size:12px; cursor:not-allowed; display:inline-flex; align-items:center; justify-content:center;';
  const pagerBtnActive = 'min-width:30px; height:30px; padding:0 10px; border-radius:6px; border:1px solid #7c3aed; background:#7c3aed22; color:#c4b5fd; font-size:12px; font-weight:600; cursor:default; display:inline-flex; align-items:center; justify-content:center;';
  return `
    <div style="display:flex; align-items:center; justify-content:space-between; padding:14px 4px 4px; gap:12px; flex-wrap:wrap;">
      <div style="font-size:12px; color:#888;">共 ${totalCount} ${unitLabel} · 显示第 ${pager.rangeFrom}-${pager.rangeTo} ${unitLabel}</div>
      <div style="display:flex; align-items:center; gap:6px;">
        <button style="${pager.page <= 1 ? pagerBtnDisabled : pagerBtnBase}" ${pager.page <= 1 ? 'disabled' : `onclick="${onPageChange}(${pager.page - 1})"`}>上一页</button>
        ${pageList.map(p => p === '…'
          ? `<span style="min-width:24px; text-align:center; color:#555; font-size:12px;">…</span>`
          : (p === pager.page
            ? `<span style="${pagerBtnActive}">${p}</span>`
            : `<button style="${pagerBtnBase}" onclick="${onPageChange}(${p})">${p}</button>`)
        ).join('')}
        <button style="${pager.page >= pager.totalPages ? pagerBtnDisabled : pagerBtnBase}" ${pager.page >= pager.totalPages ? 'disabled' : `onclick="${onPageChange}(${pager.page + 1})"`}>下一页</button>
      </div>
    </div>
  `;
}
