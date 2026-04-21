// ===== Modal System =====
function showModal(type, extra) {
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  overlay.classList.add('show');

  if (type === 'task-filters') {
    const fields = getTaskFilterFields();
    body.innerHTML = `
      <h3>筛选条件</h3>
      <div class="task-filter-modal-note">按任务状态、执行来源、业务线、行业、主要产出和生成模型快速缩小范围，便于集中查看不同任务批次。</div>
      <div class="task-filter-modal-grid">
        ${fields.map(field => {
          const draft = _taskFilterDraft[field.key] || [];
          return `
          <div class="task-filter-modal-field">
            <label>${field.label}</label>
            <div class="ms-combo" id="${field.id}" data-key="${field.key}" data-options='${JSON.stringify(field.options)}'>
              <div class="ms-combo-box" onclick="this.querySelector('.ms-combo-input').focus()">
                ${draft.map(val => {
                  const opt = field.options.find(o => o.value === val);
                  return opt ? `<span class="ms-combo-tag">${opt.label}<span class="ms-tag-x" onmousedown="event.stopPropagation();msComboRemoveTag('${field.id}','${val}')">&times;</span></span>` : '';
                }).join('')}
                <input class="ms-combo-input" placeholder="${draft.length ? '' : '点击选择...'}"
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
        <button class="btn btn-ghost" onclick="cancelTaskFilterModal()">取消</button>
        <button class="btn btn-ghost" onclick="clearTaskFilterSelections()">清空筛选</button>
        <button class="btn btn-primary" onclick="applyTaskFilterForm()">应用筛选</button>
      </div>
    `;
  } else if (type === 'asset-filters') {
    renderAssetFilterModalBody();
  } else if (type === 'project') {
    body.innerHTML = `
      <h3>新建项目</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div><label>客户</label><input type="text" id="m-client" placeholder="输入客户名称..."></div>
        <div><label>产品</label><input type="text" id="m-product" placeholder="输入产品名称..."></div>
      </div>
      <label>媒体</label>
      <select id="m-media" style="width:100%; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:8px; padding:10px 12px; color:#e0e0e0; font-size:13px; margin-bottom:16px; outline:none;">
        <option value="kwai">Kwai</option>
        <option value="tt">TT</option>
        <option value="kwai+tt">Kwai+TT</option>
      </select>
      <label>行业</label>
      <select id="m-industry" style="width:100%; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:8px; padding:10px 12px; color:#e0e0e0; font-size:13px; margin-bottom:16px; outline:none;">
        ${PROJECT_INDUSTRY_OPTIONS.map(option => `<option value="${option.v}">${option.l}</option>`).join('')}
      </select>
      <label>描述</label><input type="text" id="m-desc" placeholder="简短描述...">
      <label>颜色标签</label>
      <div class="color-pick">
        <div class="color-dot active" style="background:#7c3aed;" data-color="#7c3aed" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#f43f5e;" data-color="#f43f5e" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#3b82f6;" data-color="#3b82f6" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#10b981;" data-color="#10b981" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#f59e0b;" data-color="#f59e0b" onclick="pickColor(this)"></div>
      </div>
      <label>可见性</label>
      <div class="radio-group">
        <div class="radio-option selected" onclick="selectRadio(this, 'proj-vis')" data-value="private"><div class="dot"></div>🔒 私有</div>
        <div class="radio-option" onclick="selectRadio(this, 'proj-vis')" data-value="shared"><div class="dot"></div>🌐 共享</div>
      </div>
      <div id="proj-share-options" style="display:none;">
        <label>共享给</label>
        <div class="group-chips" id="proj-group-chips">
          ${groups.map(g => `<div class="group-chip" data-gid="${g.id}" onclick="toggleChip(this)">${g.name}</div>`).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="createProject()">创建项目</button>
      </div>
    `;
  } else if (type === 'folder') {
    body.innerHTML = `
      <h3>新建文件夹</h3>
      <label>文件夹名称</label><input type="text" id="m-fname" placeholder="输入文件夹名称...">
      <label>可见性</label>
      <div class="radio-group">
        <div class="radio-option selected" onclick="selectRadio(this, 'fold-vis')" data-value="private"><div class="dot"></div>🔒 私有草稿</div>
        <div class="radio-option" onclick="selectRadio(this, 'fold-vis')" data-value="shared"><div class="dot"></div>🌐 共享协作</div>
      </div>
      <div id="fold-share-options" style="display:none;">
        <label>添加协作成员</label>
        <div id="fold-member-list">
          ${currentProject ? currentProject.members.filter(uid => uid !== currentUser.id).map(uid => {
            const u = getUserById(uid);
            return u ? `
            <div class="perm-row">
              <div class="p-user">
                <div class="mini-avatar" style="background:${u.color}">${u.short}</div>
                <div class="p-name">${u.name}</div>
              </div>
              <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" data-uid="${u.id}" class="fold-member-check"> 添加
              </label>
            </div>` : '';
          }).join('') : ''}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="createFolder()">创建文件夹</button>
      </div>
    `;
  } else if (type === 'project-perm') {
    body.innerHTML = `
      <h3>项目权限设置 — ${currentProject.name}</h3>
      <div class="perm-section">
        <h4>📋 基本信息</h4>
        <label>可见性</label>
        <div class="radio-group">
          <div class="radio-option ${currentProject.visibility==='private'?'selected':''}" onclick="selectRadio(this,'pp-vis')" data-value="private"><div class="dot"></div>🔒 私有</div>
          <div class="radio-option ${currentProject.visibility==='shared'?'selected':''}" onclick="selectRadio(this,'pp-vis')" data-value="shared"><div class="dot"></div>🌐 共享</div>
        </div>
        <label>可见分组</label>
        <div class="group-chips">
          ${groups.map(g => `<div class="group-chip ${(currentProject.visibleTo.groups||[]).includes(g.id)?'selected':''}" data-gid="${g.id}" onclick="toggleChip(this)">${g.name}</div>`).join('')}
        </div>
      </div>
      <div class="perm-section">
        <h4>👥 项目成员</h4>
        ${currentProject.members.map(uid => {
          const u = getUserById(uid);
          if (!u) return '';
          const isOwner = currentProject.owner === uid;
          return `
          <div class="perm-row">
            <div class="p-user">
              <div class="mini-avatar" style="background:${u.color}">${u.short}</div>
              <div class="p-name">${u.name}<small>${ROLES[u.role].label}</small></div>
            </div>
            ${isOwner ? '<span class="tag tag-owner">创建者</span>' : `
              <span class="tag tag-${u.role}">${ROLES[u.role].label}</span>
              <button class="btn btn-danger btn-sm" onclick="removeProjMember('${u.id}')">移除</button>
            `}
          </div>`;
        }).join('')}
        <div style="margin-top:12px;">
          <label>添加成员</label>
          <select id="pp-add-user" style="width:auto;display:inline-block;">
            <option value="">选择成员...</option>
            ${users.filter(u => !currentProject.members.includes(u.id)).map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
          </select>
          <button class="btn btn-sm btn-primary" onclick="addProjMember()" style="margin-left:8px;">添加</button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">关闭</button>
        <button class="btn btn-primary" onclick="saveProjPerm()">保存</button>
      </div>
    `;
  } else if (type === 'folder-perm') {
    body.innerHTML = `
      <h3>文件夹权限设置 — ${currentFolder.name}</h3>
      <div class="perm-section">
        <h4>📋 可见性</h4>
        <div class="radio-group">
          <div class="radio-option ${currentFolder.visibility==='private'?'selected':''}" onclick="selectRadio(this,'fp-vis')" data-value="private"><div class="dot"></div>🔒 私有</div>
          <div class="radio-option ${currentFolder.visibility==='shared'?'selected':''}" onclick="selectRadio(this,'fp-vis')" data-value="shared"><div class="dot"></div>🌐 共享</div>
        </div>
        <div id="fp-share-options" style="${currentFolder.visibility==='shared' ? '' : 'display:none;'}">
          <label>共享分组</label>
          <div class="group-chips" id="fp-group-chips">
            ${groups.map(g => `<div class="group-chip ${(currentFolder.visibleGroups||[]).includes(g.id)?'selected':''}" data-gid="${g.id}" onclick="toggleChip(this)">${g.name}</div>`).join('')}
          </div>
        </div>
      </div>
      <div class="perm-section">
        <h4>👥 文件夹成员</h4>
        ${currentFolder.members.map(uid => {
          const u = getUserById(uid);
          if (!u) return '';
          const isOwner = currentFolder.owner === uid;
          return `
          <div class="perm-row">
            <div class="p-user">
              <div class="mini-avatar" style="background:${u.color}">${u.short}</div>
              <div class="p-name">${u.name}<small>${ROLES[u.role].label}</small></div>
            </div>
            ${isOwner ? '<span class="tag tag-owner">创建者</span>' : `
              <span class="tag tag-${u.role}">${ROLES[u.role].label}</span>
              <button class="btn btn-danger btn-sm" onclick="removeFolderMember('${u.id}')">移除</button>
            `}
          </div>`;
        }).join('')}
        <div style="margin-top:12px;">
          <label>从项目成员中添加</label>
          <select id="fp-add-user" style="width:auto;display:inline-block;">
            <option value="">选择成员...</option>
            ${currentProject.members.filter(uid => !currentFolder.members.includes(uid)).map(uid => { const u = getUserById(uid); return u ? `<option value="${u.id}">${u.name}</option>` : ''; }).join('')}
          </select>
          <button class="btn btn-sm btn-primary" onclick="addFolderMember()" style="margin-left:8px;">添加</button>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">关闭</button>
        <button class="btn btn-primary" onclick="saveFolderPerm()">保存</button>
      </div>
    `;
  } else if (type === 'edit-project') {
    const proj = currentProject;
    if (!proj) return;
    selectedColor = proj.color;
    body.innerHTML = `
      <h3>编辑项目</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
        <div><label>客户</label><input type="text" id="m-client" value="${proj.client || ''}" placeholder="输入客户名称..."></div>
        <div><label>产品</label><input type="text" id="m-product" value="${proj.product || ''}" placeholder="输入产品名称..."></div>
      </div>
      <label>媒体</label>
      <select id="m-media" style="width:100%; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:8px; padding:10px 12px; color:#e0e0e0; font-size:13px; margin-bottom:16px; outline:none;">
        <option value="kwai" ${proj.media === 'kwai' ? 'selected' : ''}>Kwai</option>
        <option value="tt" ${proj.media === 'tt' ? 'selected' : ''}>TT</option>
        <option value="kwai+tt" ${proj.media === 'kwai+tt' ? 'selected' : ''}>Kwai+TT</option>
      </select>
      <label>行业</label>
      <select id="m-industry" style="width:100%; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:8px; padding:10px 12px; color:#e0e0e0; font-size:13px; margin-bottom:16px; outline:none;">
        ${PROJECT_INDUSTRY_OPTIONS.map(option => `<option value="${option.v}" ${(proj.industry || dcDeriveIndustry(proj)) === option.v ? 'selected' : ''}>${option.l}</option>`).join('')}
      </select>
      <label>描述</label><input type="text" id="m-desc" value="${proj.desc || ''}" placeholder="简短描述...">
      <label>颜色标签</label>
      <div class="color-pick">
        ${['#7c3aed','#f43f5e','#3b82f6','#10b981','#f59e0b'].map(c => `<div class="color-dot ${proj.color === c ? 'active' : ''}" style="background:${c};" data-color="${c}" onclick="pickColor(this)"></div>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="saveEditProject()">保存</button>
      </div>
    `;
  } else if (type === 'edit-folder') {
    const folder = currentFolder;
    if (!folder) return;
    body.innerHTML = `
      <h3>编辑文件夹</h3>
      <label>文件夹名称</label><input type="text" id="m-fname" value="${folder.name}" placeholder="输入文件夹名称...">
      <label>可见性</label>
      <div class="radio-group">
        <div class="radio-option ${folder.visibility === 'private' ? 'selected' : ''}" onclick="selectRadio(this, 'fold-vis')" data-value="private"><div class="dot"></div>🔒 私有草稿</div>
        <div class="radio-option ${folder.visibility === 'shared' ? 'selected' : ''}" onclick="selectRadio(this, 'fold-vis')" data-value="shared"><div class="dot"></div>🌐 共享协作</div>
      </div>
      <div id="fold-share-options" style="${folder.visibility === 'shared' ? '' : 'display:none;'}">
        <label>协作成员</label>
        <div id="fold-member-list">
          ${currentProject ? currentProject.members.filter(uid => uid !== currentUser.id).map(uid => {
            const u = getUserById(uid);
            const isMember = folder.members.includes(uid);
            return u ? `
            <div class="perm-row">
              <div class="p-user">
                <div class="mini-avatar" style="background:${u.color}">${u.short}</div>
                <div class="p-name">${u.name}</div>
              </div>
              <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;">
                <input type="checkbox" data-uid="${u.id}" class="fold-member-check" ${isMember ? 'checked' : ''}> ${isMember ? '已添加' : '添加'}
              </label>
            </div>` : '';
          }).join('') : ''}
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="saveEditFolder()">保存</button>
      </div>
    `;
  } else if (type === 'invite') {
    const roleOptions = currentUser.role === 'superadmin'
      ? [
          ['member', '成员'],
          ['leader', '组长'],
          ['manager', '经理'],
          ['superadmin', '超级管理员'],
        ]
      : [
          ['member', '成员'],
          ['leader', '组长'],
        ];
    body.innerHTML = `
      <h3>邀请新成员</h3>
      <label>邮箱地址</label><input type="email" id="m-iemail" placeholder="输入邮箱地址...">
      <label>姓名</label><input type="text" id="m-iname" placeholder="输入姓名...">
      <label>角色</label>
      <select id="m-irole" onchange="refreshInviteOrgFields()">${roleOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select>
      <div id="invite-org-fields">${renderInviteOrgFields()}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="inviteMember()">发送邀请</button>
      </div>
    `;
  } else if (type === 'invite-link') {
    const link = 'https://selva.app/invite/team?token=DEMO-XXXX-1234';
    body.innerHTML = `
      <h3>邀请链接</h3>
      <p style="font-size:13px;color:#888;margin-bottom:16px;">分享以下链接，任何人可通过链接申请加入团队（需管理员审批）</p>
      <div style="display:flex;gap:8px;align-items:center;background:#0a0a0f;border:1px solid #2a2a3a;border-radius:8px;padding:10px 14px;margin-bottom:16px;">
        <span style="flex:1;font-size:12px;color:#a78bfa;word-break:break-all;">${link}</span>
        <button class="btn btn-ghost btn-sm" onclick="navigator.clipboard.writeText('${link}');toast('链接已复制')">复制</button>
      </div>
      <div style="font-size:12px;color:#666;margin-bottom:16px;">链接有效期：7 天 · 可在设置中重置链接</div>
      <div class="modal-actions"><button class="btn btn-ghost" onclick="hideModal()">关闭</button></div>
    `;
  } else if (type === 'member-assignment') {
    const user = getUserById(extra);
    if (!user) return;
    if (!canEditMember(currentUser, user) && !canChangeMemberRole(currentUser, user)) {
      body.innerHTML = `
        <h3>调整归属</h3>
        <div style="color:#f59e0b; font-size:13px; margin-bottom:16px;">你当前没有权限调整该成员归属</div>
        <div class="modal-actions"><button class="btn btn-ghost" onclick="hideModal()">关闭</button></div>
      `;
      return;
    }
    const backTarget = currentBusinessAssignmentId;
    body.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px;">
        ${backTarget ? _backBtn("showModal('business-detail','" + backTarget + "')", '返回业务详情') : ''}
        <h3 style="margin:0;">调整归属</h3>
      </div>
      <div style="background:#0d0d14; border:1px solid #1e1e2e; border-radius:10px; padding:12px 14px; margin-bottom:16px;">
        <div style="font-size:14px; font-weight:600;">${user.name}</div>
        <div style="font-size:12px; color:#888; margin-top:4px;">当前角色：${ROLES[user.role].label} · 当前归属：${getUserOrgPath(user)}</div>
      </div>
      <div id="member-assignment-fields">${renderMemberAssignmentFields(extra)}</div>
      <div class="modal-actions">
        ${backTarget ? `<button class="btn btn-ghost" onclick="showModal('business-detail','${backTarget}')">返回</button>` : `<button class="btn btn-ghost" onclick="hideModal()">取消</button>`}
        <button class="btn btn-primary" onclick="saveMemberAssignment('${extra}')">保存</button>
      </div>
    `;
  } else if (type === 'business-detail') {
    const business = getBusinessOptionById(extra);
    if (!business) return;
    if (!getVisibleOrganizationBusinessIds(currentUser).includes(extra)) {
      body.innerHTML = `
        <h3>业务详情</h3>
        <div style="color:#f59e0b; font-size:13px; margin-bottom:16px;">你当前没有权限查看该业务详情</div>
        <div class="modal-actions"><button class="btn btn-ghost" onclick="hideModal()">关闭</button></div>
      `;
      return;
    }
    const rows = getBusinessDetailRows(currentUser, extra);
    const unassignedUsers = currentUser.role === 'superadmin' ? getUnassignedUsers() : [];
    body.innerHTML = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:16px;">
        <div>
          <h3>业务：${business.label}</h3>
          <div style="font-size:12px; color:#888; margin-top:6px;">在这里维护该业务下的成员归属，新增成员和移出成员也统一在这里处理。</div>
        </div>
      </div>
      <div style="background:#0d0d14; border:1px solid #1e1e2e; border-radius:12px; overflow:hidden;">
        <table class="team-table">
          <thead><tr><th>成员</th><th>角色</th><th>当前归属</th><th>操作</th></tr></thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                <td>${row.name}</td>
                <td><span class="tag tag-${row.role}">${row.roleLabel}</span></td>
                <td>${row.orgPath}</td>
                <td>${row.editable ? `
                  <div style="display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;">
                    <button class="btn btn-ghost btn-sm" onclick="showBusinessAssignmentModal('${row.userId}', '${extra}')">调整归属</button>
                    <button class="btn btn-danger btn-sm" onclick="removeUserFromBusiness('${row.userId}', '${extra}')">移出</button>
                  </div>
                ` : '<span style="color:#666;">只读</span>'}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center; color:#666; padding:24px;">当前业务暂无成员</td></tr>'}
          </tbody>
        </table>
      </div>
      ${currentUser.role === 'superadmin' ? `
      <div class="perm-section" style="margin-top:16px;">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <div>
            <h4 style="margin:0;">待分配成员 (${unassignedUsers.length})</h4>
            <div style="font-size:12px; color:#888; margin-top:4px;">勾选成员后点击"批量加入"可一次性添加多人。</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="batchAssignToBusiness('${extra}')">批量加入</button>
        </div>
        ${renderMemberPicker('unassigned-picker', unassignedUsers, [])}
      </div>` : ''}
      <div class="modal-actions"><button class="btn btn-ghost" onclick="hideModal()">关闭</button></div>
    `;
  } else if (type === 'business-line') {
    body.innerHTML = `
      <h3>新增业务线</h3>
      <label>业务名称</label><input type="text" id="m-business-name" placeholder="例如：新增长线">
      <label>颜色</label>
      <div class="color-pick">
        <div class="color-dot active" style="background:#7c3aed;" data-color="#7c3aed" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#3b82f6;" data-color="#3b82f6" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#10b981;" data-color="#10b981" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#f59e0b;" data-color="#f59e0b" onclick="pickColor(this)"></div>
      </div>
      <div style="font-size:12px; color:#666; margin-bottom:16px;">创建后可在业务详情里继续把未分配成员拉入该业务。</div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="createBusinessLine()">创建</button>
      </div>
    `;
  } else if (type === 'edit-business') {
    const business = getBusinessOptionById(extra);
    if (!business) return;
    selectedColor = business.color;
    body.innerHTML = `
      <h3>编辑业务线</h3>
      <label>业务名称</label><input type="text" id="m-edit-business-name" value="${business.label}">
      <label>颜色</label>
      <div class="color-pick">
        ${['#7c3aed','#3b82f6','#10b981','#f59e0b','#8b5cf6','#f43f5e'].map(c => `<div class="color-dot ${business.color === c ? 'active' : ''}" style="background:${c};" data-color="${c}" onclick="pickColor(this)"></div>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="saveEditBusinessLine('${extra}')">保存</button>
      </div>
    `;
  } else if (type === 'group') {
    body.innerHTML = `
      <h3>新建分组</h3>
      <label>分组名称</label><input type="text" id="m-gname" placeholder="输入分组名称...">
      <label>颜色</label>
      <div class="color-pick">
        <div class="color-dot active" style="background:#7c3aed;" data-color="#7c3aed" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#f43f5e;" data-color="#f43f5e" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#3b82f6;" data-color="#3b82f6" onclick="pickColor(this)"></div>
        <div class="color-dot" style="background:#10b981;" data-color="#10b981" onclick="pickColor(this)"></div>
      </div>
      <label>添加成员</label>
      <div style="font-size:12px;color:#888;margin-bottom:12px;">支持批量勾选、全选和清空</div>
      ${renderMemberPicker('group-member-picks', users, [], '暂无可选成员')}
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="createGroup()">创建</button>
      </div>
    `;
  } else if (type === 'group-detail') {
    const g = getGroupById(extra);
    if (!g) return;
    const canManage = ROLES[currentUser.role].canManageTeam;
    const roleOrder = { manager: 0, leader: 1, member: 2 };
    const visibleMemberIds = g.members.filter(uid => { const u = getUserById(uid); return u && u.role !== 'superadmin'; });
    const sortedMembers = visibleMemberIds.map(uid => getUserById(uid)).filter(Boolean).sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
    const availableUsers = users.filter(u => !g.members.includes(u.id) && u.role !== 'superadmin');
    body.innerHTML = `
      <h3>分组: ${g.name}</h3>
      <div class="perm-section">
        <h4>👥 成员 (${sortedMembers.length})</h4>
        ${sortedMembers.length ? sortedMembers.map(u => `
          <div class="perm-row">
            <div class="p-user">
              <div class="mini-avatar" style="background:${u.color}">${u.short}</div>
              <div class="p-name">${u.name}<small>${ROLES[u.role].label}</small></div>
            </div>
            ${canManage ? `<button class="btn btn-danger btn-sm" onclick="removeFromGroup('${g.id}','${u.id}')">移除</button>` : ''}
          </div>`).join('') : '<div class="member-picker-empty">当前分组还没有成员</div>'}
      </div>
      ${canManage ? `
      <div class="perm-section">
        <h4>➕ 添加成员</h4>
        <div style="font-size:12px;color:#888;margin-bottom:12px;">仅显示当前未加入该分组的成员，可批量添加</div>
        ${renderMemberPicker('add-member-picks', availableUsers, [], '当前没有可添加的成员')}
        ${availableUsers.length ? `
        <div style="display:flex; justify-content:flex-end;">
          <button class="btn btn-primary btn-sm" onclick="addMembersToGroup('${g.id}')">添加选中成员</button>
        </div>` : ''}
      </div>` : ''}
      <div class="modal-actions"><button class="btn btn-ghost" onclick="hideModal()">关闭</button></div>
    `;
  } else if (type === 'workflow') {
    if (!currentFolder || !canCreateFolderWorkflow(currentFolder)) {
      body.innerHTML = `
        <h3>创建工作流</h3>
        <div style="color:#f59e0b; font-size:13px; margin-bottom:16px;">你当前无权限在该文件夹创建工作流</div>
        <div class="modal-actions"><button class="btn btn-ghost" onclick="hideModal()">关闭</button></div>
      `;
      return;
    }
    body.innerHTML = `
      <h3>新建工作流</h3>
      <div style="background:#0d0d14; border:1px solid #1e1e2e; border-radius:8px; padding:10px 14px; margin-bottom:16px; font-size:12px; color:#888;">
        工作流将保存到你的个人资源库，并自动挂载到当前文件夹「${currentFolder.name}」
      </div>
      <label>工作流名称</label><input type="text" id="m-wf-name" placeholder="例如：短视频高转化模板...">
      <label>说明</label><textarea id="m-wf-desc" placeholder="描述该工作流适用场景与输出方式..."></textarea>
      <label>发布范围</label>
      <div class="radio-group">
        <div class="radio-option selected" onclick="selectRadio(this, 'wf-scope')" data-value="personal"><div class="dot"></div>🔒 仅自己可见</div>
        <div class="radio-option" onclick="selectRadio(this, 'wf-scope')" data-value="team"><div class="dot"></div>🌐 发布共享</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="createWorkflowFromWorkspace()">创建并挂载</button>
      </div>
    `;
  } else if (type === 'library-workflow') {
    body.innerHTML = `
      <h3>新建工作流</h3>
      <div style="background:#0d0d14; border:1px solid #1e1e2e; border-radius:8px; padding:10px 14px; margin-bottom:16px; font-size:12px; color:#888;">
        工作流将保存到你的个人资源库，之后可在任意文件夹中挂载使用
      </div>
      <label>工作流名称</label><input type="text" id="m-wf-name" placeholder="例如：短视频高转化模板...">
      <label>说明</label><textarea id="m-wf-desc" placeholder="描述该工作流适用场景与输出方式..."></textarea>
      <label>发布范围</label>
      <div class="radio-group">
        <div class="radio-option selected" onclick="selectRadio(this, 'wf-scope')" data-value="personal"><div class="dot"></div>🔒 仅自己可见</div>
        <div class="radio-option" onclick="selectRadio(this, 'wf-scope')" data-value="team"><div class="dot"></div>🌐 发布共享</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="createWorkflowFromLibrary()">创建</button>
      </div>
    `;
  } else if (type === 'library-pick') {
    if (!currentFolder) return;
    const existingRefs = ensureFolderWorkflowRefs(currentFolder);
    const mountedIds = new Set(existingRefs.map(r => r.workflowId));
    const available = globalWorkflows.filter(wf =>
      !mountedIds.has(wf.id) && (wf.creator === currentUser.id || wf.scope === 'team')
    );
    body.innerHTML = `
      <h3>从资源库添加工作流</h3>
      <div style="margin-bottom:16px; font-size:13px; color:#888;">选择要挂载到「${currentFolder.name}」的工作流</div>
      ${available.length ? `
      <div id="lib-pick-list" style="max-height:400px; overflow-y:auto;">
        ${available.map(wf => {
          const creator = getUserById(wf.creator);
          return `
          <div class="group-chip" data-wfid="${wf.id}" onclick="toggleChip(this)" style="display:flex; align-items:center; gap:10px; padding:12px; margin-bottom:8px; width:100%; border-radius:10px;">
            <span style="font-size:20px;">${wf.icon || '🔁'}</span>
            <div style="flex:1;">
              <div style="font-weight:500; font-size:13px;">${wf.name}</div>
              <div style="font-size:11px; color:#888;">${wf.desc} · ${creator ? creator.name : '未知'}</div>
            </div>
            <span class="tag ${wf.scope === 'team' ? 'tag-shared' : 'tag-private'}">${wf.scope === 'team' ? '共享' : '个人'}</span>
          </div>`;
        }).join('')}
      </div>` : '<div style="color:#666; padding:20px; text-align:center;">没有可添加的工作流。请先在资源库中创建工作流。</div>'}
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        ${available.length ? '<button class="btn btn-primary" onclick="mountSelectedWorkflows()">添加到文件夹</button>' : ''}
      </div>
    `;
  } else if (type === 'import-script') {
    body.innerHTML = `
      <h3>导入脚本</h3>
      <label>脚本集名称</label>
      <input type="text" id="m-import-name" placeholder="例如：618 推广脚本合集...">
      <label>描述</label>
      <textarea id="m-import-desc" placeholder="描述脚本内容和适用场景..."></textarea>
      <label>上传文件</label>
      <div class="file-upload-zone" id="import-drop-zone" onclick="document.getElementById('import-file-input').click()"
           ondragover="event.preventDefault();this.style.borderColor='#7c3aed';"
           ondragleave="this.style.borderColor='#2a2a3a';"
           ondrop="event.preventDefault();this.style.borderColor='#2a2a3a';handleImportFiles(event.dataTransfer.files);">
        <div class="upload-icon">📄</div>
        <strong>点击选择文件或拖拽到此处</strong>
        <div style="margin-top:4px;">支持 .txt .md .doc .docx 格式，可多选</div>
      </div>
      <input type="file" id="import-file-input" multiple accept=".txt,.md,.doc,.docx" style="display:none;" onchange="handleImportFiles(this.files)">
      <div id="import-file-list" style="margin-top:12px;"></div>
      <label style="margin-top:12px;">标签</label>
      <input type="text" id="m-import-tags" placeholder="多个标签用逗号分隔，例如：品牌,春季">
      <label>发布范围</label>
      <div class="radio-group">
        <div class="radio-option selected" onclick="selectRadio(this, 'import-scope')" data-value="personal"><div class="dot"></div>🔒 仅自己可见</div>
        <div class="radio-option" onclick="selectRadio(this, 'import-scope')" data-value="team"><div class="dot"></div>🌐 发布共享</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="doImportScript()">导入</button>
      </div>
    `;
    window._importFiles = [];
  } else if (type === 'import-asset') {
    body.innerHTML = `
      <h3>导入素材</h3>
      <label>素材包名称</label>
      <input type="text" id="m-import-name" placeholder="例如：春季产品视频素材...">
      <label>描述</label>
      <textarea id="m-import-desc" placeholder="描述素材内容和用途..."></textarea>
      <label>上传视频文件</label>
      <div class="file-upload-zone" id="import-drop-zone" onclick="document.getElementById('import-file-input').click()"
           ondragover="event.preventDefault();this.style.borderColor='#7c3aed';"
           ondragleave="this.style.borderColor='#2a2a3a';"
           ondrop="event.preventDefault();this.style.borderColor='#2a2a3a';handleImportFiles(event.dataTransfer.files);">
        <div class="upload-icon">🎬</div>
        <strong>点击选择文件或拖拽到此处</strong>
        <div style="margin-top:4px;">支持 .mp4 .mov .avi 等视频格式，可多选</div>
      </div>
      <input type="file" id="import-file-input" multiple accept="video/*,.mp4,.mov,.avi" style="display:none;" onchange="handleImportFiles(this.files)">
      <div id="import-file-list" style="margin-top:12px;"></div>
      <label style="margin-top:12px;">标签</label>
      <input type="text" id="m-import-tags" placeholder="多个标签用逗号分隔，例如：产品,竖版">
      <label>发布范围</label>
      <div class="radio-group">
        <div class="radio-option selected" onclick="selectRadio(this, 'import-scope')" data-value="personal"><div class="dot"></div>🔒 仅自己可见</div>
        <div class="radio-option" onclick="selectRadio(this, 'import-scope')" data-value="team"><div class="dot"></div>🌐 发布共享</div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" onclick="hideModal()">取消</button>
        <button class="btn btn-primary" onclick="doImportAsset()">导入</button>
      </div>
    `;
    window._importFiles = [];
  }
}

function hideModal() {
  cleanupVideoPlayerModal();
  cleanupAssetPreviewModal();
  currentBusinessAssignmentId = '';
  document.getElementById('modal-overlay').classList.remove('show');
  const body = document.getElementById('modal-body');
  body.className = 'modal';
  body.style.cssText = '';
}

// ===== Modal Helpers =====
let selectedColor = '#7c3aed';
let currentBusinessAssignmentId = '';
function pickColor(el) {
  el.parentElement.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
  el.classList.add('active');
  selectedColor = el.dataset.color;
}
function selectRadio(el, group) {
  el.parentElement.querySelectorAll('.radio-option').forEach(r => r.classList.remove('selected'));
  el.classList.add('selected');
  // Toggle share options visibility
  if (group === 'proj-vis') {
    const show = el.dataset.value === 'shared';
    const opt = document.getElementById('proj-share-options');
    if (opt) opt.style.display = show ? '' : 'none';
  }
  if (group === 'fold-vis') {
    const show = el.dataset.value === 'shared';
    const opt = document.getElementById('fold-share-options');
    if (opt) opt.style.display = show ? '' : 'none';
  }
  if (group === 'fp-vis') {
    const show = el.dataset.value === 'shared';
    const opt = document.getElementById('fp-share-options');
    if (opt) opt.style.display = show ? '' : 'none';
  }
}
function toggleChip(el) { el.classList.toggle('selected'); }
function updateMemberPickerCount(id) {
  const root = document.getElementById(id);
  if (!root) return 0;
  const total = root.querySelectorAll('input[type="checkbox"]').length;
  const selected = root.querySelectorAll('input[type="checkbox"]:checked').length;
  const count = document.getElementById(`${id}-count`);
  if (count) count.textContent = `已选 ${selected} / ${total}`;
  return selected;
}
function setAllMemberChecks(id, checked) {
  const root = document.getElementById(id);
  if (!root) return;
  root.querySelectorAll('.member-check-row').forEach(row => {
    if (row.style.display === 'none') return;
    const input = row.querySelector('input[type="checkbox"]');
    if (input) input.checked = checked;
  });
  updateMemberPickerCount(id);
}
function getCheckedMemberIds(id) {
  const root = document.getElementById(id);
  if (!root) return [];
  return [...root.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
}
function filterMemberPicker(id, keyword) {
  const root = document.getElementById(id);
  if (!root) return;
  const query = keyword.trim().toLowerCase();
  let visible = 0;
  root.querySelectorAll('.member-alpha-section').forEach(section => {
    let sectionVisible = 0;
    section.querySelectorAll('.member-check-row').forEach(row => {
      const name = row.dataset.name || '';
      const email = row.dataset.email || '';
      const initial = (row.dataset.initial || '').toLowerCase();
      const matched = !query || name.includes(query) || email.includes(query) || initial.startsWith(query);
      row.style.display = matched ? '' : 'none';
      if (matched) {
        sectionVisible++;
        visible++;
      }
    });
    section.style.display = sectionVisible ? '' : 'none';
    const anchor = root.querySelector(`.member-index-anchor[data-initial="${section.dataset.initial}"]`);
    if (anchor) anchor.classList.toggle('hidden', !sectionVisible);
  });
  const empty = document.getElementById(`${id}-no-results`);
  if (empty) empty.style.display = visible ? 'none' : 'block';
}
function jumpMemberPickerToInitial(id, initial) {
  const root = document.getElementById(id);
  if (!root) return;
  const list = root.querySelector('.member-picker-list');
  const target = root.querySelector(`.member-alpha-section[data-initial="${initial}"]`);
  if (!target) {
    toast(`没有首字母为 ${initial} 的成员`);
    return;
  }
  if (target.style.display === 'none') {
    toast(`当前筛选结果中没有 ${initial} 分组`);
    return;
  }
  const title = target.querySelector('.member-alpha-title');
  root.querySelectorAll('.member-alpha-title.located').forEach(el => el.classList.remove('located'));
  if (title) title.classList.add('located');
  if (list) list.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
  setTimeout(() => {
    if (title) title.classList.remove('located');
  }, 1200);
}

function renderBusinessSelect(selectId, value, onchange) {
  const options = getBusinessLines();
  return `
    <select id="${selectId}" onchange="${onchange}" style="width:100%; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:8px; padding:10px 12px; color:#e0e0e0; font-size:13px; margin-bottom:16px; outline:none;" ${options.length ? '' : 'disabled'}>
      ${options.length
        ? options.map(option => `<option value="${option.id}" ${value === option.id ? 'selected' : ''}>${option.label}</option>`).join('')
        : '<option value="">暂无业务线</option>'}
    </select>
  `;
}

function renderManagerSelect(selectId, businessId, value, excludeUserId = '', onchange = '') {
  const managers = getManagersForBusiness(businessId, excludeUserId);
  return `
    <select id="${selectId}" ${onchange ? `onchange="${onchange}"` : ''} style="width:100%; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:8px; padding:10px 12px; color:#e0e0e0; font-size:13px; margin-bottom:16px; outline:none;">
      <option value="" ${!value ? 'selected' : ''}>暂不指定（由经理后续分配）</option>
      ${managers.map(manager => `<option value="${manager.id}" ${value === manager.id ? 'selected' : ''}>${manager.name}</option>`).join('')}
    </select>
  `;
}

function renderSubgroupSelect(selectId, value, allowEmpty = false) {
  return `
    <select id="${selectId}" style="width:100%; background:#0a0a0f; border:1px solid #2a2a3a; border-radius:8px; padding:10px 12px; color:#e0e0e0; font-size:13px; margin-bottom:16px; outline:none;">
      ${allowEmpty ? `<option value="" ${!value ? 'selected' : ''}>暂不指定（由经理后续分配）</option>` : ''}
      ${SUBGROUP_OPTIONS.map(option => `<option value="${option.id}" ${value === option.id ? 'selected' : ''}>${option.label}</option>`).join('')}
    </select>
  `;
}

function renderInviteOrgFields() {
  const role = document.getElementById('m-irole')?.value || 'member';
  if (role === 'superadmin') {
    return '<div style="font-size:12px; color:#666; margin-bottom:16px;">超级管理员不挂业务与分类，创建后默认进入平台管理。</div>';
  }
  if (currentUser.role === 'superadmin') {
    return '<div style="font-size:12px; color:#666; margin-bottom:16px;">新成员创建后默认进入未分配，归属请到“业务”页里再设置。</div>';
  }

  const selectedSubgroup = document.getElementById('m-isubgroup')?.value || 'a';

  let html = '';
  html += `<div style="font-size:12px; color:#888; margin-bottom:12px;">一级业务：${getBusinessOptionById(currentUser.businessId)?.label || '未分配业务'}</div>`;

  if (role === 'manager') {
    html += '<div style="font-size:12px; color:#666; margin-bottom:16px;">经理创建后默认接管该一级业务，并自动拥有 a类 / b类 两个分类。</div>';
    return html;
  }

  html += `<div style="font-size:12px; color:#888; margin-bottom:12px;">直属经理：${currentUser.name}</div>`;

  html += '<label>二级分类</label>';
  html += renderSubgroupSelect('m-isubgroup', selectedSubgroup);
  return html;
}

function refreshInviteOrgFields() {
  const container = document.getElementById('invite-org-fields');
  if (!container) return;
  container.innerHTML = renderInviteOrgFields();
}

function renderMemberAssignmentFields(userId) {
  const user = getUserById(userId);
  if (!user) return '';
  const currentScope = getManagerScopeById(user.managerScopeId);
  const defaultBusinessId = currentBusinessAssignmentId || user.businessId || currentScope?.businessId || getDefaultBusinessId();
  const selectedBusinessId = currentUser.role === 'manager'
    ? currentUser.businessId
    : (document.getElementById('m-assign-business')?.value || defaultBusinessId);
  const selectedManagerId = currentUser.role === 'manager'
    ? currentUser.id
    : (document.getElementById('m-assign-manager')?.value || currentScope?.managerId || '');
  const selectedSubgroup = document.getElementById('m-assign-subgroup')?.value || user.subgroupKey || (currentUser.role === 'superadmin' ? '' : 'a');

  if (user.role === 'manager') {
    return `
      <label>一级业务</label>
      ${renderBusinessSelect('m-assign-business', selectedBusinessId, "refreshMemberAssignmentFields('" + userId + "')")}
      <div style="font-size:12px; color:#666; margin-top:-8px;">经理固定管理当前一级业务。</div>
    `;
  }

  if (currentUser.role === 'superadmin') {
    return `
      <label>一级业务</label>
      ${renderBusinessSelect('m-assign-business', selectedBusinessId, "refreshMemberAssignmentFields('" + userId + "')")}
      <label>直属经理</label>
      ${renderManagerSelect('m-assign-manager', selectedBusinessId, selectedManagerId, user.id)}
      <label>二级分类</label>
      ${renderSubgroupSelect('m-assign-subgroup', selectedSubgroup, true)}
    `;
  }

  return `
    <div style="font-size:12px; color:#888; margin-bottom:12px;">一级业务：${getBusinessOptionById(currentUser.businessId)?.label || '未分配业务'}</div>
    <div style="font-size:12px; color:#888; margin-bottom:12px;">直属经理：${currentUser.name}</div>
    <label>二级分类</label>
    ${renderSubgroupSelect('m-assign-subgroup', selectedSubgroup)}
  `;
}

function refreshMemberAssignmentFields(userId) {
  const container = document.getElementById('member-assignment-fields');
  if (!container) return;
  container.innerHTML = renderMemberAssignmentFields(userId);
}

// ===== CRUD Actions =====
function createProject() {
  const client = document.getElementById('m-client').value.trim();
  const product = document.getElementById('m-product').value.trim();
  if (!client || !product) { toast('请填写客户和产品名称'); return; }
  const name = client + '-' + product;
  const media = document.getElementById('m-media').value;
  const industry = normalizeProjectIndustry(document.getElementById('m-industry').value);
  const desc = document.getElementById('m-desc').value.trim();
  const vis = document.querySelector('.radio-option.selected')?.dataset.value || 'private';
  const selGroups = [...document.querySelectorAll('#proj-group-chips .group-chip.selected')].map(c => c.dataset.gid);

  projects.push({
    id: Date.now(), name, client, product, media, industry, desc, color: selectedColor, updated: '刚刚',
    visibility: vis, owner: currentUser.id,
    visibleTo: vis === 'shared' ? { type: 'groups', groups: selGroups } : { type: 'specific_users', users: [currentUser.id] },
    members: [currentUser.id],
    folders: []
  });
  hideModal(); renderSidebarProjects(); goPage('projects');
  toast('项目创建成功');
}

function createFolder() {
  const name = document.getElementById('m-fname').value.trim();
  if (!name || !currentProject) return;
  const vis = document.querySelector('.radio-option.selected')?.dataset.value || 'private';
  const members = [currentUser.id];
  if (vis === 'shared') {
    document.querySelectorAll('.fold-member-check:checked').forEach(cb => {
      if (!members.includes(cb.dataset.uid)) members.push(cb.dataset.uid);
    });
  }
  currentProject.folders.push({ id: Date.now(), name, visibility: vis, owner: currentUser.id, members, files: [] });
  hideModal(); goPage('folder'); renderSidebarProjects();
  toast('文件夹创建成功');
}

function saveEditProject() {
  if (!currentProject) return;
  const client = document.getElementById('m-client').value.trim();
  const product = document.getElementById('m-product').value.trim();
  if (!client || !product) { toast('请填写客户和产品名称'); return; }
  currentProject.client = client;
  currentProject.product = product;
  currentProject.name = client + '-' + product;
  currentProject.media = document.getElementById('m-media').value;
  currentProject.industry = normalizeProjectIndustry(document.getElementById('m-industry').value);
  currentProject.desc = document.getElementById('m-desc').value.trim();
  currentProject.color = selectedColor;
  currentProject.updated = '刚刚';
  hideModal(); goPage('folder'); renderSidebarProjects();
  toast('项目已更新');
}

function saveEditFolder() {
  if (!currentFolder || !currentProject) return;
  const name = document.getElementById('m-fname').value.trim();
  if (!name) { toast('请输入文件夹名称'); return; }
  currentFolder.name = name;
  const vis = document.querySelector('.radio-option.selected')?.dataset.value || currentFolder.visibility;
  currentFolder.visibility = vis;
  const members = [currentFolder.owner];
  if (vis === 'shared') {
    document.querySelectorAll('.fold-member-check:checked').forEach(cb => {
      if (!members.includes(cb.dataset.uid)) members.push(cb.dataset.uid);
    });
  }
  currentFolder.members = members;
  hideModal(); goPage('folder'); renderSidebarProjects();
  toast('文件夹已更新');
}

function createWorkflowFromWorkspace() {
  if (!currentFolder || !canCreateFolderWorkflow(currentFolder)) return;
  const name = document.getElementById('m-wf-name')?.value.trim();
  const desc = document.getElementById('m-wf-desc')?.value.trim() || '';
  const scope = document.querySelector('.radio-option.selected')?.dataset.value || 'personal';
  if (!name) return;

  const newWf = { id: 'wf-' + Date.now(), name, desc, icon: scope === 'team' ? '🔁' : '🧪', creator: currentUser.id, scope, createdAt: '2026-03-30' };
  globalWorkflows.push(newWf);

  const refs = ensureFolderWorkflowRefs(currentFolder);
  refs.push({ workflowId: newWf.id, addedBy: currentUser.id });

  hideModal();
  renderWorkspace();
  updateWorkspaceNav();
  toast(`工作流 "${name}" 已创建并挂载到当前文件夹`);
}

function createWorkflowFromLibrary() {
  const name = document.getElementById('m-wf-name')?.value.trim();
  const desc = document.getElementById('m-wf-desc')?.value.trim() || '';
  const scope = document.querySelector('.radio-option.selected')?.dataset.value || 'personal';
  if (!name) return;

  const newWf = { id: 'wf-' + Date.now(), name, desc, icon: scope === 'team' ? '🔁' : '🧪', creator: currentUser.id, scope, createdAt: '2026-03-30' };
  globalWorkflows.push(newWf);

  hideModal();
  renderLibrary();
  toast(`工作流 "${name}" 已保存到资源库`);
}

function mountSelectedWorkflows() {
  if (!currentFolder) return;
  const selected = [...document.querySelectorAll('#lib-pick-list .group-chip.selected')].map(el => el.dataset.wfid);
  if (!selected.length) { toast('请至少选择一个工作流'); return; }

  const refs = ensureFolderWorkflowRefs(currentFolder);
  selected.forEach(wfId => {
    if (!refs.some(r => r.workflowId === wfId)) {
      refs.push({ workflowId: wfId, addedBy: currentUser.id });
    }
  });

  hideModal();
  renderWorkspace();
  updateWorkspaceNav();
  toast(`已添加 ${selected.length} 个工作流到当前文件夹`);
}

function addProjMember() {
  const uid = document.getElementById('pp-add-user').value;
  if (!uid || !currentProject) return;
  if (!currentProject.members.includes(uid)) currentProject.members.push(uid);
  showModal('project-perm');
  toast('成员已添加');
}
function removeProjMember(uid) {
  if (!currentProject) return;
  currentProject.members = currentProject.members.filter(m => m !== uid);
  showModal('project-perm');
  toast('成员已移除');
}
function saveProjPerm() {
  hideModal(); goPage('folder'); renderSidebarProjects();
  toast('权限已保存');
}

function addFolderMember() {
  const uid = document.getElementById('fp-add-user').value;
  if (!uid || !currentFolder) return;
  if (!currentFolder.members.includes(uid)) currentFolder.members.push(uid);
  showModal('folder-perm');
  toast('成员已添加');
}
function removeFolderMember(uid) {
  if (!currentFolder) return;
  currentFolder.members = currentFolder.members.filter(m => m !== uid);
  showModal('folder-perm');
  toast('成员已移除');
}
function saveFolderPerm() {
  if (!currentFolder) return;
  const vis = document.querySelector('.radio-option.selected')?.dataset.value || currentFolder.visibility;
  currentFolder.visibility = vis;

  const selectedGroups = [...document.querySelectorAll('#fp-group-chips .group-chip.selected')].map(c => c.dataset.gid);
  currentFolder.visibleGroups = vis === 'shared' ? selectedGroups : [];

  if (vis === 'shared' && selectedGroups.length) {
    selectedGroups.forEach(gid => {
      const g = getGroupById(gid);
      if (!g) return;
      g.members.forEach(uid => {
        if (!currentFolder.members.includes(uid)) {
          currentFolder.members.push(uid);
        }
      });
    });
  }

  hideModal(); goPage('folder'); renderSidebarProjects();
  toast('权限已保存');
}

function inviteMember() {
  if (currentUser.role !== 'superadmin' && currentUser.role !== 'manager') return;
  const email = document.getElementById('m-iemail').value.trim();
  const name = document.getElementById('m-iname').value.trim();
  if (!email) { toast('请输入邮箱地址'); return; }
  if (!name) { toast('请输入姓名'); return; }
  const role = document.getElementById('m-irole').value;
  const businessId = currentUser.role === 'manager' && role !== 'superadmin'
    ? currentUser.businessId
    : '';
  let managerScopeId = '';
  let subgroupKey = '';
  if (currentUser.role === 'manager' && role !== 'superadmin' && role !== 'manager') {
    managerScopeId = ensureManagerScopeForUser(currentUser);
    subgroupKey = document.getElementById('m-isubgroup')?.value || 'a';
  }
  const newUser = {
    id: 'u' + Date.now(),
    name,
    short: name[0].toUpperCase(),
    initial: name[0].toUpperCase(),
    role,
    email,
    groups: [],
    businessId,
    managerScopeId,
    subgroupKey,
    leaderId: '',
    color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6,'0'),
    joined: '2026-04-16',
    status: 'pending'
  };
  users.push(newUser);
  syncUserOrganization(newUser);
  hideModal(); settingsSection = 'team'; settingsTeamTab = 'members'; goPage('settings');
  toast(`邀请已发送至 ${email}`);
}

function saveMemberAssignment(userId) {
  const user = getUserById(userId);
  if (!user || (!canEditMember(currentUser, user) && !canChangeMemberRole(currentUser, user))) return;
  const businessId = currentBusinessAssignmentId || document.getElementById('m-assign-business')?.value || user.businessId;
  const subgroupKey = document.getElementById('m-assign-subgroup')?.value || user.subgroupKey || 'a';
  const detailBusinessId = currentBusinessAssignmentId || businessId || user.businessId;
  if (user.role === 'manager') {
    if (!businessId) { toast('请选择一级业务'); return; }
    if (!assignUserToBusinessLine(user.id, businessId)) { toast('该经理暂时无法加入这个业务'); return; }
  } else if (currentUser.role === 'manager') {
    if (!assignUserToBusinessLine(user.id, currentUser.businessId, currentUser.id, subgroupKey)) {
      toast('当前成员无法调整到该业务');
      return;
    }
  } else {
    const managerId = document.getElementById('m-assign-manager')?.value;
    if (!businessId) { toast('请选择一级业务'); return; }
    if (!managerId) {
      // superadmin chose "暂不指定" — assign to business only, let manager handle details later
      const business = getBusinessOptionById(businessId);
      if (!business) { toast('请选择一级业务'); return; }
      clearUserOrganizationAssignment(user);
      user.businessId = business.id;
      syncUserOrganization(user);
    } else {
      if (!assignUserToBusinessLine(user.id, businessId, managerId, subgroupKey)) {
        toast('请确认该业务下已经有可用经理');
        return;
      }
    }
  }
  hideModal();
  renderTeam();
  renderGroups();
  if (detailBusinessId) showModal('business-detail', detailBusinessId);
  toast(`已更新 ${user.name} 的归属`);
}

function showBusinessAssignmentModal(userId, businessId) {
  currentBusinessAssignmentId = businessId || '';
  showModal('member-assignment', userId);
}

function createBusinessLine() {
  if (currentUser.role !== 'superadmin') return;
  const name = document.getElementById('m-business-name')?.value.trim();
  if (!name) { toast('请输入业务名称'); return; }
  const business = createBusinessLineRecord(name, selectedColor);
  if (!business) { toast('业务线创建失败'); return; }
  hideModal();
  renderGroups();
  toast(`已新增业务线 ${business.label}`);
}

function saveEditBusinessLine(businessId) {
  if (currentUser.role !== 'superadmin') return;
  const business = getBusinessOptionById(businessId);
  if (!business) return;
  const name = document.getElementById('m-edit-business-name')?.value.trim();
  if (!name) { toast('请输入业务名称'); return; }
  business.label = name;
  business.color = selectedColor || business.color;
  hideModal();
  renderGroups();
  toast(`已更新业务线 ${business.label}`);
}

function deleteBusinessLine(businessId) {
  const business = getBusinessOptionById(businessId);
  if (!business || currentUser.role !== 'superadmin') return;
  if (!confirm(`确定删除“${business.label}”吗？该业务下成员会回到未分配。`)) return;
  deleteBusinessLineRecord(businessId);
  hideModal();
  renderTeam();
  renderGroups();
  toast(`已删除业务线 ${business.label}`);
}

function removeUserFromBusiness(userId, businessId) {
  const user = getUserById(userId);
  if (!user) return;
  if (!canEditMember(currentUser, user) && !canChangeMemberRole(currentUser, user)) return;
  if (!confirm(`确定将 ${user.name} 移出当前业务吗？`)) return;
  removeUserFromBusinessLine(userId);
  renderTeam();
  renderGroups();
  showModal('business-detail', businessId);
  toast(`已将 ${user.name} 移回未分配`);
}

function batchAssignToBusiness(businessId) {
  if (currentUser.role !== 'superadmin') return;
  const selectedIds = getCheckedMemberIds('unassigned-picker');
  if (!selectedIds.length) { toast('请先勾选要加入的成员'); return; }
  const business = getBusinessOptionById(businessId);
  if (!business) return;
  selectedIds.forEach(uid => {
    const user = getUserById(uid);
    if (user && user.role !== 'superadmin' && !user.businessId) {
      user.businessId = business.id;
      syncUserOrganization(user);
    }
  });
  renderTeam();
  renderGroups();
  showModal('business-detail', businessId);
  toast(`已将 ${selectedIds.length} 人加入 ${business.label}`);
}

function removeMember(uid) {
  if (currentUser.role !== 'superadmin') return;
  if (!confirm('确定要移除该成员吗？')) return;
  const u = users.find(u => u.id === uid);
  users = users.filter(u => u.id !== uid);
  managerScopes = managerScopes.filter(scope => scope.managerId !== uid);
  groups.forEach(g => { g.members = g.members.filter(m => m !== uid); });
  renderTeam();
  renderGroups();
  toast(`已移除成员 ${u ? u.name : uid}`);
}

function createGroup() {
  const name = document.getElementById('m-gname').value.trim();
  if (!name) return;
  const memberIds = getCheckedMemberIds('group-member-picks');
  const g = { id: 'g' + Date.now(), name, color: selectedColor, members: memberIds };
  groups.push(g);
  memberIds.forEach(uid => {
    const u = users.find(u => u.id === uid);
    if (u && !u.groups.includes(g.id)) u.groups.push(g.id);
  });
  hideModal(); settingsSection = 'team'; settingsTeamTab = 'groups'; goPage('settings');
  toast(`分组 "${name}" 已创建`);
}

function addMembersToGroup(gid) {
  const g = getGroupById(gid);
  if (!g) return;
  const selected = getCheckedMemberIds('add-member-picks');
  if (!selected.length) { toast('请先选择要添加的成员'); return; }
  selected.forEach(uid => {
    if (!g.members.includes(uid)) g.members.push(uid);
    const u = users.find(u => u.id === uid);
    if (u && !u.groups.includes(gid)) u.groups.push(gid);
  });
  showModal('group-detail', gid);
  toast(`已添加 ${selected.length} 名成员`);
}

function removeFromGroup(gid, uid) {
  const g = getGroupById(gid);
  if (g) { g.members = g.members.filter(m => m !== uid); if (g.leaderId === uid) g.leaderId = null; }
  const u = users.find(u => u.id === uid);
  if (u) { u.groups = u.groups.filter(g => g !== gid); }
  showModal('group-detail', gid);
  toast('已从分组移除');
}

function changeGroupLeader(gid, uid) {
  const g = getGroupById(gid);
  if (!g) return;
  g.leaderId = uid || null;
  const leader = getUserById(uid);
  // If the new leader is not role=leader, optionally upgrade
  if (leader && leader.role === 'member') {
    leader.role = 'leader';
    toast(`已将 ${leader.name} 设为 ${g.name} 组长，角色升级为组长`);
  } else {
    toast(`已将 ${leader ? leader.name : '无'} 设为 ${g.name} 组长`);
  }
  showModal('group-detail', gid);
}

// ===== File Import Handling =====
function handleImportFiles(fileList) {
  if (!fileList || !fileList.length) return;
  if (!window._importFiles) window._importFiles = [];
  for (let i = 0; i < fileList.length; i++) {
    const f = fileList[i];
    if (!window._importFiles.some(ef => ef.name === f.name)) {
      window._importFiles.push({ name: f.name, size: f.size });
    }
  }
  renderImportFileList();
}

function removeImportFile(idx) {
  window._importFiles.splice(idx, 1);
  renderImportFileList();
}

function renderImportFileList() {
  const container = document.getElementById('import-file-list');
  if (!container || !window._importFiles) return;
  if (!window._importFiles.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `
    <div style="font-size:12px; color:#888; margin-bottom:8px;">已选 ${window._importFiles.length} 个文件</div>
    ${window._importFiles.map((f, i) => `
      <div style="display:flex; align-items:center; gap:10px; padding:8px 12px; background:#0d0d14; border:1px solid #1e1e2e; border-radius:8px; margin-bottom:6px; font-size:13px;">
        <span>${f.name.match(/\.(mp4|mov|avi|webm)$/i) ? '🎥' : '📄'}</span>
        <span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f.name}</span>
        <span style="color:#666; font-size:11px;">${formatFileSize(f.size)}</span>
        <span style="cursor:pointer; color:#f87171; font-size:14px;" onclick="removeImportFile(${i})" title="移除">✕</span>
      </div>
    `).join('')}
  `;
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function doImportScript() {
  const name = document.getElementById('m-import-name')?.value.trim();
  if (!name) { toast('请输入脚本集名称'); return; }
  const desc = document.getElementById('m-import-desc')?.value.trim() || '';
  const tags = (document.getElementById('m-import-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
  const scope = document.querySelector('.radio-option.selected')?.dataset.value || 'personal';
  const files = (window._importFiles || []).map(f => f.name);

  libraryScripts.push({
    id: 'ls-' + Date.now(),
    name, desc, creator: currentUser.id, scope,
    createdAt: new Date().toISOString().slice(0, 10),
    fileCount: files.length || 0,
    tags, files
  });
  window._importFiles = [];
  hideModal();
  libraryTab = 'scripts';
  renderLibrary();
  toast(`脚本集 "${name}" 已导入 (${files.length} 个文件)`);
}

function doImportAsset() {
  const name = document.getElementById('m-import-name')?.value.trim();
  if (!name) { toast('请输入素材包名称'); return; }
  const desc = document.getElementById('m-import-desc')?.value.trim() || '';
  const tags = (document.getElementById('m-import-tags')?.value || '').split(',').map(t => t.trim()).filter(Boolean);
  const scope = document.querySelector('.radio-option.selected')?.dataset.value || 'personal';
  const files = (window._importFiles || []).map(f => f.name);

  libraryAssets.push({
    id: 'la-' + Date.now(),
    name, desc, creator: currentUser.id, scope,
    createdAt: new Date().toISOString().slice(0, 10),
    fileCount: files.length || 0,
    format: 'mp4', tags, files
  });
  window._importFiles = [];
  hideModal();
  libraryTab = 'assets';
  renderLibrary();
  toast(`素材包 "${name}" 已导入 (${files.length} 个文件)`);
}

// ===== Context Menus =====
function showProjectContextMenu(e, projId) {
  e.preventDefault(); e.stopPropagation();
  const proj = projects.find(p => p.id === projId);
  const myRole = getMyRoleInProject(proj);
  const cm = document.getElementById('context-menu');
  const canManageProj = myRole === 'owner' || ROLES[currentUser.role].canManageTeam;
  cm.innerHTML = `
    <div class="cm-item" onclick="openProject(${projId});hideContextMenu();">📂 打开</div>
    <div class="cm-item ${canManageProj?'':'disabled'}" onclick="if(${canManageProj}){currentProject=projects.find(p=>p.id===${projId});showModal('edit-project');hideContextMenu();}">✏️ 编辑项目</div>
    <div class="cm-item ${canManageProj?'':'disabled'}" onclick="if(${canManageProj}){currentProject=projects.find(p=>p.id===${projId});showModal('project-perm');hideContextMenu();}">⚙ 权限设置</div>
    <div class="cm-divider"></div>
    <div class="cm-item ${canManageProj?'':'disabled'}" style="${canManageProj?'color:#f43f5e':''}">🗑 删除</div>
  `;
  cm.classList.add('show');
  cm.style.left = e.clientX + 'px';
  cm.style.top = e.clientY + 'px';
}

function showFolderContextMenu(e, folderId) {
  e.preventDefault(); e.stopPropagation();
  const folder = currentProject.folders.find(f => f.id === folderId);
  const myRole = getMyRoleInFolder(folder);
  const canManageFolder = myRole === 'owner' || ROLES[currentUser.role].canManageTeam;
  const canEdit = myRole === 'owner' || myRole === 'editor';
  const cm = document.getElementById('context-menu');
  cm.innerHTML = `
    <div class="cm-item" onclick="openFolder(${folderId});hideContextMenu();">📂 打开</div>
    <div class="cm-item ${canEdit?'':'disabled'}" onclick="if(${canEdit}){currentFolder=currentProject.folders.find(f=>f.id===${folderId});showModal('edit-folder');hideContextMenu();}">✏️ 编辑文件夹</div>
    <div class="cm-item ${canEdit?'':'disabled'}" onclick="currentFolder=currentProject.folders.find(f=>f.id===${folderId});enterWorkspace();hideContextMenu();">⚡ 开始创作</div>
    <div class="cm-item ${canManageFolder?'':'disabled'}" onclick="if(${canManageFolder}){currentFolder=currentProject.folders.find(f=>f.id===${folderId});showModal('folder-perm');hideContextMenu();}">⚙ 权限设置</div>
    <div class="cm-divider"></div>
    <div class="cm-item ${canManageFolder?'':'disabled'}" style="${canManageFolder?'color:#f43f5e':''}">🗑 删除</div>
  `;
  cm.classList.add('show');
  cm.style.left = e.clientX + 'px';
  cm.style.top = e.clientY + 'px';
}

function showBusinessContextMenu(e, businessId) {
  e.preventDefault(); e.stopPropagation();
  const business = getBusinessOptionById(businessId);
  if (!business) return;
  const canManage = currentUser.role === 'superadmin';
  const cm = document.getElementById('context-menu');
  cm.innerHTML = `
    <div class="cm-item" onclick="showModal('business-detail','${businessId}');hideContextMenu();">📂 查看详情</div>
    <div class="cm-item ${canManage?'':'disabled'}" onclick="if(${canManage}){showModal('edit-business','${businessId}');hideContextMenu();}">✏️ 编辑业务</div>
    <div class="cm-divider"></div>
    <div class="cm-item ${canManage?'':'disabled'}" style="${canManage?'color:#f43f5e':''}" onclick="if(${canManage}){deleteBusinessLine('${businessId}');hideContextMenu();}">🗑 删除</div>
  `;
  cm.classList.add('show');
  cm.style.left = e.clientX + 'px';
  cm.style.top = e.clientY + 'px';
}

function hideContextMenu() { document.getElementById('context-menu').classList.remove('show'); }
document.addEventListener('click', hideContextMenu);

// ===== Toast =====
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ===== Tool Detail =====
function openToolDetail(toolId) {
  currentToolDetail = toolId;
  renderWorkspace();
}

function closeToolDetail() {
  currentToolDetail = null;
  renderWorkspace();
}

function renderToolDetailPage(toolId) {
  const tool = TOOLBOX_TOOLS.find(t => t.id === toolId);
  if (!tool) return '<div style="color:#666;">工具未找到</div>';

  const header = `
    <div class="tool-header">
      ${_backBtn("closeToolDetail()", '返回工具箱')}
      <span style="font-size:24px;">${tool.icon}</span>
      <div>
        <div style="font-size:18px; font-weight:600;">${tool.name}</div>
        <div style="font-size:12px; color:#888;">${tool.en}</div>
      </div>
    </div>
  `;

  let formHtml = '';

  if (toolId === 'tool-video') {
    formHtml = renderToolFormVideo();
  } else if (toolId === 'tool-script') {
    formHtml = renderToolFormScript();
  } else if (toolId === 'tool-understand') {
    formHtml = renderToolFormUnderstand();
  } else if (toolId === 'tool-translate') {
    formHtml = renderToolFormTranslate();
  } else if (toolId === 'tool-extract') {
    formHtml = renderToolFormExtract();
  } else if (toolId === 'tool-voice') {
    formHtml = renderToolFormVoice();
  } else if (toolId === 'tool-disclaimer') {
    formHtml = renderToolFormDisclaimer();
  } else if (toolId === 'tool-grok') {
    formHtml = renderToolFormGrok();
  } else if (toolId === 'tool-veo') {
    formHtml = renderToolFormVeo();
  }

  return header + formHtml;
}

function _taskInfoCard(options = {}) {
  const showDescription = options.showDescription !== false;
  return `
    <div class="form-card">
      <div class="form-card-title">📋 任务基本信息</div>
      <div class="form-field">
        <label>任务名称 <span class="required">*</span></label>
        <input type="text" placeholder="输入任务名称...">
      </div>
      ${showDescription ? `
      <div class="form-field">
        <label>任务描述</label>
        <textarea placeholder="${options.descriptionPlaceholder || '简要说明本次任务的目标或背景'}"></textarea>
      </div>` : ''}
    </div>
  `;
}

function _advancedCard(contentHtml, emptyText = '当前工具暂无额外高级设置。') {
  return `
    <div class="form-card">
      <div class="advanced-toggle" onclick="toggleAdvanced(this)">
        <span>⚙ 高级设置</span><span class="adv-arrow">▶</span>
      </div>
      <div class="advanced-body" style="max-height:0;">
        ${contentHtml || `<div class="info-banner" style="margin-top:12px;">${emptyText}</div>`}
      </div>
    </div>
  `;
}

function _outputPreviewCard(items) {
  return `
    <div class="form-card output-preview-card">
      <div class="form-card-title">📦 输出结构预览</div>
      <div style="font-size:11px; color:#666; margin-bottom:12px;">分析完成后将输出以下内容：</div>
      <div class="output-preview-list">
        ${items.map(item => `
          <div class="output-preview-item">
            <div class="op-label">${item.label}</div>
            <div class="op-desc">${item.desc}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function _renderSelectList(items, type = 'checkbox', name = 'tool-list') {
  return `
    <div class="select-list">
      ${items.map((item, index) => `
        <label class="select-list-item">
          <input type="${type}" name="${name}" ${index === 0 ? 'checked' : ''}>
          <span>${item}</span>
        </label>
      `).join('')}
    </div>
  `;
}

let _toolTranslateLanguageConfigs = {};

function getDefaultMarketCorpusForLanguage(language) {
  return TRANSLATION_LANGUAGE_MARKET_DEFAULTS[language] || '无特定语料';
}

function normalizeTranslationCustomTerms(value) {
  if (typeof value !== 'string') return '';
  return value
    .split(/\s*(?:\r?\n|；|;)+\s*/)
    .map(item => item.trim())
    .filter(Boolean)
    .join('；');
}

function normalizeTranslationLanguageConfigs(languages, configs = {}, options = {}) {
  const selectedLanguages = Array.isArray(languages) && languages.length ? [...new Set(languages)] : ['英文'];
  const existingConfigs = configs && typeof configs === 'object' ? configs : {};
  const marketBindings = options.marketBindings && typeof options.marketBindings === 'object' ? options.marketBindings : {};
  const customTerms = options.customTerms && typeof options.customTerms === 'object' ? options.customTerms : {};
  const shouldUseFallbackMarket = options.fallbackMarketValue && options.fallbackMarketValue !== '无特定语料';
  const fallbackCustomTerms = normalizeTranslationCustomTerms(typeof options.fallbackCustomTerms === 'string' ? options.fallbackCustomTerms : '');
  const nextConfigs = {};
  selectedLanguages.forEach(language => {
    const existing = existingConfigs[language] && typeof existingConfigs[language] === 'object'
      ? existingConfigs[language]
      : {};
    nextConfigs[language] = {
      marketCorpus: existing.marketCorpus || marketBindings[language] || (shouldUseFallbackMarket ? options.fallbackMarketValue : getDefaultMarketCorpusForLanguage(language)),
      customTerms: normalizeTranslationCustomTerms(existing.customTerms ?? customTerms[language] ?? (selectedLanguages.length === 1 ? fallbackCustomTerms : ''))
    };
  });
  return nextConfigs;
}

function buildTranslationLanguageConfigUpdateCall(template, language, key) {
  return template
    .replace('__LANG__', String(language).replace(/'/g, "\\'"))
    .replace('__KEY__', String(key).replace(/'/g, "\\'"))
    .replace('__VALUE__', 'this.value');
}

function renderTranslationLanguageConfigFields(languages, configs = {}, updateCallTemplate, options = {}) {
  const normalizedConfigs = normalizeTranslationLanguageConfigs(languages, configs);
  const compact = options && options.compact === true;

  if (compact) {
    return `
      <div class="translation-lang-config-stack translation-lang-config-stack--compact">
        ${languages.map(language => `
          <div class="translation-lang-config-card">
            <div class="translation-lang-config-card-title">${language}</div>
            <div class="translation-lang-config-card-field">
              <div class="translation-lang-config-card-label">绑定市场语料</div>
              <select data-translate-language="${language}" data-translate-config-key="marketCorpus" onchange="${buildTranslationLanguageConfigUpdateCall(updateCallTemplate, language, 'marketCorpus')}">
                ${MARKETS.map(market => `<option value="${market}" ${normalizedConfigs[language].marketCorpus === market ? 'selected' : ''}>${market}</option>`).join('')}
              </select>
            </div>
            <div class="translation-lang-config-card-field">
              <div class="translation-lang-config-card-label">术语表</div>
              <input type="text" data-translate-language="${language}" data-translate-config-key="customTerms" placeholder="原词=译词，用“；”分隔多个术语" value="${escapeHtml(normalizedConfigs[language].customTerms || '')}" oninput="${buildTranslationLanguageConfigUpdateCall(updateCallTemplate, language, 'customTerms')}" spellcheck="false" autocomplete="off">
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
    <div class="translation-lang-config-stack">
      <div class="translation-lang-config-head" aria-hidden="true">
        <div>目标语言</div>
        <div>绑定市场语料</div>
        <div>术语表</div>
      </div>
      ${languages.map(language => `
        <div class="translation-lang-config-row">
          <div class="translation-lang-config-cell translation-lang-config-cell--language">
            <div class="translation-lang-config-mobile-label">目标语言</div>
            <div class="translation-lang-config-name">${language}</div>
          </div>
          <div class="translation-lang-config-cell">
            <div class="translation-lang-config-mobile-label">绑定市场语料</div>
            <select data-translate-language="${language}" data-translate-config-key="marketCorpus" onchange="${buildTranslationLanguageConfigUpdateCall(updateCallTemplate, language, 'marketCorpus')}">
              ${MARKETS.map(market => `<option value="${market}" ${normalizedConfigs[language].marketCorpus === market ? 'selected' : ''}>${market}</option>`).join('')}
            </select>
          </div>
          <div class="translation-lang-config-cell translation-lang-config-cell--terms">
            <div class="translation-lang-config-mobile-label">术语表</div>
            <input type="text" data-translate-language="${language}" data-translate-config-key="customTerms" placeholder="指定固定翻译词对，格式：原词=译词，使用全角分号“；”分隔多个术语" value="${escapeHtml(normalizedConfigs[language].customTerms || '')}" oninput="${buildTranslationLanguageConfigUpdateCall(updateCallTemplate, language, 'customTerms')}" spellcheck="false" autocomplete="off">
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function getToolTranslateSelectedLanguages() {
  return [...document.querySelectorAll('#tool-translate-targets .multi-tag.active')].map(tag => tag.dataset.language || tag.textContent.trim());
}

function collectToolTranslateLanguageConfigs() {
  const configs = {};
  document.querySelectorAll('#tool-translate-language-configs [data-translate-language]').forEach(field => {
    const language = field.dataset.translateLanguage;
    const key = field.dataset.translateConfigKey;
    if (!language || !key) return;
    if (!configs[language]) configs[language] = {};
    configs[language][key] = field.value;
  });
  return configs;
}

function updateToolTranslateLanguageConfig(language, key, value) {
  if (!_toolTranslateLanguageConfigs[language]) {
    _toolTranslateLanguageConfigs[language] = normalizeTranslationLanguageConfigs([language], {})[language];
  }
  _toolTranslateLanguageConfigs[language][key] = key === 'customTerms' ? normalizeTranslationCustomTerms(value) : value;
}

function isAdvancedBodyExpanded(body) {
  if (!body) return false;
  return body.style.maxHeight !== '0' && body.style.maxHeight !== '0px';
}

function syncAdvancedBodyHeight(body) {
  if (!isAdvancedBodyExpanded(body)) return;
  requestAnimationFrame(() => {
    body.style.maxHeight = `${body.scrollHeight}px`;
  });
}

function syncParentAdvancedBodyHeight(element) {
  if (!element || typeof element.closest !== 'function') return;
  syncAdvancedBodyHeight(element.closest('.advanced-body'));
}

window.addEventListener('resize', () => {
  document.querySelectorAll('.advanced-body').forEach(syncAdvancedBodyHeight);
});

function renderToolTranslateLanguageConfigs(configs = null) {
  const container = document.getElementById('tool-translate-language-configs');
  if (!container) return;
  const selectedLanguages = getToolTranslateSelectedLanguages();
  const currentConfigs = {
    ..._toolTranslateLanguageConfigs,
    ...collectToolTranslateLanguageConfigs(),
    ...(configs && typeof configs === 'object' ? configs : {})
  };
  _toolTranslateLanguageConfigs = normalizeTranslationLanguageConfigs(selectedLanguages, currentConfigs);
  container.innerHTML = renderTranslationLanguageConfigFields(selectedLanguages, _toolTranslateLanguageConfigs, "updateToolTranslateLanguageConfig('__LANG__','__KEY__', __VALUE__)");
  syncParentAdvancedBodyHeight(container);
}

function toggleToolTranslateTargetLanguage(tagElement) {
  const activeTags = document.querySelectorAll('#tool-translate-targets .multi-tag.active');
  if (tagElement.classList.contains('active') && activeTags.length <= 1) {
    toast('至少选择 1 个目标语言');
    return;
  }
  const currentConfigs = collectToolTranslateLanguageConfigs();
  tagElement.classList.toggle('active');
  renderToolTranslateLanguageConfigs(currentConfigs);
}

function setToolVideoModel(model) {
  if (!WORKFLOW_VIDEO_MODEL_CONFIG[model]) return;
  currentVideoToolModel = model;
  renderWorkspace();
}

function normalizeIntegerInputValue(input, min, max) {
  if (!input) return null;
  const rawValue = String(input.value ?? '').trim();
  if (!rawValue) return null;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return null;
  const clamped = Math.min(max, Math.max(min, Math.round(parsed)));
  input.value = clamped;
  return clamped;
}

function updateToolVideoCount(input, prefix = 'tool-video-count') {
  const label = document.getElementById(prefix + '-val');
  const value = typeof input === 'object' ? normalizeIntegerInputValue(input, 1, 4) : input;
  if (value == null) return;
  if (label) label.textContent = value;
}

function renderToolVideoCountField(prefix = 'tool-video-count', defaultValue = 1) {
  return `
    <div class="form-field">
      <label>生成数量 <span class="required">*</span>: <span id="${prefix}-val" style="color:#a78bfa; font-weight:600;">${defaultValue}</span></label>
      <input class="num-input" type="number" min="1" max="4" step="1" value="${defaultValue}" oninput="updateToolVideoCount(this,'${prefix}')">
      <small>单次最多生成 4 个视频任务。</small>
    </div>
  `;
}

function renderToolVideoModelSwitcher() {
  return `
    <div class="form-card">
      <div class="form-card-title">🎬 视频生成模型</div>
      <div class="card-select" style="grid-template-columns:repeat(${TOOL_VIDEO_MODEL_OPTIONS.length},minmax(0,1fr));">
        ${TOOL_VIDEO_MODEL_OPTIONS.map(option => `
          <div class="card-select-item ${currentVideoToolModel === option.value ? 'active' : ''}" onclick="setToolVideoModel('${option.value}')">
            <div class="cs-name">${option.icon} ${option.title}</div>
            <div class="cs-desc">${option.description}</div>
          </div>
        `).join('')}
      </div>
      <small style="display:block; margin-top:10px; color:#888;">切换模型后，下方参数会按当前模型的能力自动变化。</small>
    </div>
  `;
}

function renderToolVideoSettingsCard() {
  if (!WORKFLOW_VIDEO_MODEL_CONFIG[currentVideoToolModel]) {
    currentVideoToolModel = 'Grok';
  }
  const modelConfig = WORKFLOW_VIDEO_MODEL_CONFIG[currentVideoToolModel];

  if (currentVideoToolModel === 'Grok') {
    return `
      <div class="form-card">
        <div class="form-card-title">🤖 视频生成 Agent 设置</div>
        <div class="form-field">
          <label>视频时长 <span class="required">*</span></label>
          <div class="radio-btns">
            ${modelConfig.durations.map((duration, index) => `<div class="radio-btn ${index === 0 ? 'active' : ''}" onclick="toggleRadioBtn(this)">${duration}</div>`).join('')}
          </div>
        </div>
        <div class="form-field">
          <label>参考图片</label>
          <div class="file-upload-zone" onclick="toast('选择参考图片（原型演示）')">
            <div class="upload-icon">🖼</div>
            <strong>点击上传参考图片</strong>
            <div style="margin-top:4px;">JPG / PNG，最大 10MB；作为视频起始帧参考</div>
          </div>
        </div>
        <div class="form-field">
          <label>视频描述 <span class="required">*</span></label>
          <textarea placeholder="建议 50 ~ 300 字，英文效果最佳；描述视频画面内容、人物动作、场景氛围等..."></textarea>
        </div>
        <div class="form-field">
          <label>画面比例 <span class="required">*</span></label>
          <select>
            ${modelConfig.ratios.map(ratio => `<option ${ratio === '9:16' ? 'selected' : ''}>${ratio}</option>`).join('')}
          </select>
        </div>
        ${renderToolVideoCountField('tool-video-count', 1)}
      </div>
    `;
  }

  if (currentVideoToolModel === 'Veo 3.1') {
    return `
      <div class="form-card">
        <div class="form-card-title">🎞 视频生成 Agent 设置</div>
        <div class="form-field">
          <label>视频时长 <span class="required">*</span></label>
          <div class="radio-btns">
            ${modelConfig.durations.map((duration, index) => `<div class="radio-btn ${index === 1 ? 'active' : ''}" onclick="toggleRadioBtn(this)">${duration}</div>`).join('')}
          </div>
        </div>
        <div class="form-field">
          <label>起始帧图片</label>
          <div class="file-upload-zone" onclick="toast('选择起始帧图片（原型演示）')">
            <strong>🖼 上传起始帧图片</strong>
            <div style="margin-top:4px;">JPG / PNG，最大 10MB；指定视频第一帧画面</div>
          </div>
        </div>
        <div class="form-field">
          <label>结束帧图片</label>
          <div class="file-upload-zone" onclick="toast('选择结束帧图片（原型演示）')">
            <strong>🖼 上传结束帧图片</strong>
            <div style="margin-top:4px;">与起始帧配合可精确控制视频开头和结尾</div>
          </div>
        </div>
        <div class="form-field">
          <label>参考图片</label>
          <div class="file-upload-zone" onclick="toast('选择参考图片（原型演示）')">
            <strong>🖼 上传参考图片</strong>
            <div style="margin-top:4px;">作为整体视觉风格参考</div>
          </div>
        </div>
        <div class="form-field">
          <label>视频描述 <span class="required">*</span></label>
          <textarea placeholder="建议 50 ~ 500 字，英文效果最佳；描述视频画面内容、场景、动作和氛围..."></textarea>
        </div>
        <div class="form-field">
          <label>画面比例 <span class="required">*</span></label>
          <select>
            ${modelConfig.ratios.map(ratio => `<option ${ratio === '9:16' ? 'selected' : ''}>${ratio}</option>`).join('')}
          </select>
        </div>
        ${renderToolVideoCountField('tool-video-count', 1)}
      </div>
    `;
  }

  return `
    <div class="form-card">
      <div class="form-card-title">🎬 视频生成 Agent 设置</div>
      <div class="form-field">
        <label>参考图片</label>
        <div class="file-upload-zone" onclick="toast('选择参考图片（原型演示）')">
          <div class="upload-icon">🖼</div>
          <strong>点击上传参考图片</strong>
          <div style="margin-top:4px;">支持 JPG / PNG / WebP，最大 10MB</div>
        </div>
      </div>
      <div class="form-field">
        <label>视频描述 <span class="required">*</span></label>
        <textarea placeholder="描述你想要生成的视频内容，最多 2000 字..."></textarea>
      </div>
      <div class="form-field">
        <label>画面比例 <span class="required">*</span></label>
        <select>
          ${modelConfig.ratios.map(ratio => `<option ${ratio === '9:16' ? 'selected' : ''}>${ratio}</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label>时长 <span class="required">*</span></label>
        <div class="radio-btns">
          ${modelConfig.durations.map((duration, index) => `<div class="radio-btn ${index === 1 ? 'active' : ''}" onclick="toggleRadioBtn(this)">${duration}</div>`).join('')}
        </div>
      </div>
      ${renderToolVideoCountField('tool-video-count', 1)}
    </div>
  `;
}

function renderToolFormVideo() {
  return _taskInfoCard({ showDescription: false }) + renderToolVideoModelSwitcher() + renderToolVideoSettingsCard() + _advancedCard('') + `
    <button class="btn-submit" onclick="submitToolTask('tool-video')">✦ 生成视频</button>
  `;
}

function updateScriptCount(input) {
  const value = typeof input === 'object' ? normalizeIntegerInputValue(input, 1, 20) : input;
  if (value == null) return;
  const count = document.getElementById('script-count-val');
  if (count) count.textContent = value;
  const btn = document.getElementById('script-submit-label');
  if (btn) btn.textContent = `✦ 生成 ${count ? count.textContent : value} 个脚本`;
}

const SCRIPT_FAKE_FILES_POOL = [
  { name: 'sample-script-ref.md', icon: '📄' },
  { name: 'video-analysis-report.pdf', icon: '📋' },
  { name: 'winning-script-template.docx', icon: '📝' },
  { name: 'brand-guideline.md', icon: '📑' }
];

let _toolScriptSource = { text: '', files: [] };
let _scriptFileIdSeq = 0;

function pickNextFakeScriptFile(existingNames) {
  const unused = SCRIPT_FAKE_FILES_POOL.filter(f => !existingNames.includes(f.name));
  if (unused.length) return unused[Math.floor(Math.random() * unused.length)];
  const base = SCRIPT_FAKE_FILES_POOL[Math.floor(Math.random() * SCRIPT_FAKE_FILES_POOL.length)];
  let n = 2;
  while (existingNames.includes(`${base.name} (${n})`)) n++;
  return { name: `${base.name} (${n})`, icon: base.icon };
}

function renderScriptSourceComposer(ctx) {
  const files = Array.isArray(ctx.files) ? ctx.files : [];
  const upstream = ctx.upstream && ctx.upstream.label ? ctx.upstream : null;
  const showUpstreamChip = !!(upstream && upstream.active);
  const showUpstreamRestore = !!(upstream && !upstream.active);
  const hasAnyChip = showUpstreamChip || files.length > 0;
  const placeholder = ctx.placeholder || '描述创意方向、粘贴分析报告或参考脚本，也可拖入文件...';
  return `
    <div class="script-composer"
         ondragover="handleScriptComposerDragOver(event, this)"
         ondragleave="handleScriptComposerDragLeave(event, this)"
         ondrop="${ctx.dropCall}">
      <div class="script-composer-inner">
        ${hasAnyChip ? `
          <div class="script-composer-chips">
            ${showUpstreamChip ? `
              <div class="script-composer-chip script-composer-chip--upstream" title="移除后 agent 不再沿用上游产出">
                <span>✦ 来自『${escapeHtml(upstream.label)}』的产出</span>
                <button type="button" class="script-composer-chip-remove" onclick="${ctx.removeUpstreamCall}" aria-label="移除上游">×</button>
              </div>
            ` : ''}
            ${files.map(f => `
              <div class="script-composer-chip">
                <span>${f.icon || '📄'} ${escapeHtml(f.name)}</span>
                <button type="button" class="script-composer-chip-remove" onclick="${ctx.removeFileCall.replace('__ID__', f.id)}" aria-label="移除文件">×</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
        <textarea class="script-composer-textarea" placeholder="${placeholder}" oninput="${ctx.textOninput}" spellcheck="false">${escapeHtml(ctx.text || '')}</textarea>
        <button type="button" class="script-composer-attach" onclick="${ctx.addFileCall}" aria-label="附加文件" title="附加文件">📎</button>
      </div>
      <div class="script-composer-drop-overlay"><span>松开以添加文件</span></div>
    </div>
    ${showUpstreamRestore ? `<button type="button" class="script-composer-restore" onclick="${ctx.restoreUpstreamCall}">+ 重新使用上游产出</button>` : ''}
  `;
}

function renderToolScriptSourceComposer() {
  return renderScriptSourceComposer({
    text: _toolScriptSource.text,
    files: _toolScriptSource.files,
    upstream: null,
    textOninput: 'setToolScriptSourceText(this.value)',
    addFileCall: 'addToolScriptFakeFile()',
    removeFileCall: "removeToolScriptFakeFile('__ID__')",
    removeUpstreamCall: '',
    restoreUpstreamCall: '',
    dropCall: 'handleToolScriptDrop(event, this)'
  });
}

function rerenderToolScriptComposer() {
  const container = document.getElementById('tool-script-composer');
  if (container) container.innerHTML = renderToolScriptSourceComposer();
}

function setToolScriptSourceText(value) {
  _toolScriptSource.text = value;
}

function addToolScriptFakeFile() {
  toast('选择文件（原型演示）');
  const existing = _toolScriptSource.files.map(f => f.name);
  const next = pickNextFakeScriptFile(existing);
  _toolScriptSource.files.push({ id: `f${++_scriptFileIdSeq}`, name: next.name, icon: next.icon });
  rerenderToolScriptComposer();
}

function removeToolScriptFakeFile(id) {
  _toolScriptSource.files = _toolScriptSource.files.filter(f => f.id !== id);
  rerenderToolScriptComposer();
}

function handleToolScriptDrop(event, el) {
  event.preventDefault();
  el.classList.remove('script-composer--drag');
  addToolScriptFakeFile();
}

function handleScriptComposerDragOver(event, el) {
  event.preventDefault();
  el.classList.add('script-composer--drag');
}

function handleScriptComposerDragLeave(event, el) {
  if (el.contains(event.relatedTarget)) return;
  el.classList.remove('script-composer--drag');
}

function renderToolFormScript() {
  return _taskInfoCard({ showDescription: true, descriptionPlaceholder: '为本次脚本生成任务补充背景或目标...' }) + `
    <div class="form-card">
      <div class="form-card-title">📝 脚本生成 Agent 设置</div>
      <div class="form-field">
        <label>脚本素材 <span class="required">*</span></label>
        <div id="tool-script-composer">${renderToolScriptSourceComposer()}</div>
        <small>支持创意描述、分析报告、参考脚本任意组合；文件拖入或点 📎 即可，agent 自行识别。</small>
      </div>
      <div class="form-field">
        <label>内容类型 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">网赚类</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">非网赚类</div>
        </div>
      </div>
      <div class="form-field">
        <label>配音语言 <span class="required">*</span></label>
        <select>${LANGUAGES.map((language, index) => `<option ${index === 0 ? 'selected' : ''}>${language}</option>`).join('')}</select>
      </div>
      <div class="form-field">
        <label>视频时长 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn" onclick="toggleRadioBtn(this)">10s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">15s</div>
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">20s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">30s</div>
        </div>
      </div>
      <div class="form-field">
        <label>脚本数量 <span class="required">*</span>: <span id="script-count-val" style="color:#a78bfa; font-weight:600;">5</span></label>
        <input class="num-input" type="number" min="1" max="20" step="1" value="5" oninput="updateScriptCount(this)">
        <small>默认 5，范围 1 - 20。</small>
      </div>
    </div>
    ${_advancedCard(`
      <div class="form-field" style="margin-top:14px;">
        <label>底层模型</label>
        <select>
          ${GEMINI_BASE_MODELS.map(model => `<option>${model}</option>`).join('')}
        </select>
        <small>默认-Gemini 2.5 Pro</small>
      </div>
      <div class="form-field">
        <label>知识库参考</label>
        <input type="text" placeholder="关键词搜索知识库示例...">
        <label class="checkbox-item" style="margin:10px 0 8px;">
          <input type="checkbox"> 全选
        </label>
        <div class="checkbox-list">
          ${SCRIPT_KNOWLEDGE_BASE_OPTIONS.map(option => `<label class="checkbox-item"><input type="checkbox" ${['品牌知识库', '高转化历史脚本'].includes(option) ? 'checked' : ''}> ${option}</label>`).join('')}
        </div>
        <small>从知识库中选择历史优质脚本作为 Few-shot 示例，引导 Gemini 模仿其风格和结构；支持关键词搜索，可全选。</small>
      </div>
    `)}
    <button class="btn-submit" onclick="submitToolTask('tool-script')"><span id="script-submit-label">✦ 生成 5 个脚本</span></button>
  `;
}

function renderToolFormUnderstand() {
  return _taskInfoCard({ showDescription: false }) + `
    <div class="form-card">
      <div class="form-card-title">🔍 视频理解 Agent 设置</div>
      <div class="form-field">
        <label>视频输入方式 <span class="required">*</span></label>
        <div class="tab-switch" style="margin-bottom:12px;">
          <div class="tab-switch-item active" onclick="switchToolTab(this,'understand-upload')">上传文件</div>
          <div class="tab-switch-item" onclick="switchToolTab(this,'understand-url')">视频 URL</div>
        </div>
        <div id="understand-upload">
          <div class="file-upload-zone" onclick="toast('选择视频文件（原型演示）')">
            <div class="upload-icon">🎥</div>
            <strong>点击上传视频文件</strong>
            <div style="margin-top:4px;">支持 MP4 / MOV，单个文件 ≤ 500MB</div>
          </div>
        </div>
        <div id="understand-url" style="display:none;">
          <input type="text" placeholder="输入直链 MP4 视频 URL...">
        </div>
      </div>
      <div class="form-field">
        <label>额外上下文</label>
        <textarea placeholder="补充视频背景信息，如“这是一个印尼赚钱 App 广告”..."></textarea>
      </div>
    </div>
    ${_advancedCard(`
      <div class="form-field" style="margin-top:14px;">
        <label>底层模型</label>
        <select>${GEMINI_BASE_MODELS.map(model => `<option>${model}</option>`).join('')}</select>
        <small>默认-Gemini 2.5 Pro</small>
      </div>
    `)}
    ${_outputPreviewCard([
      { label: '分析报告（1 份）', desc: '单个分析报告文档内整合整体风格分析、逐镜头视觉描述和视频生成提示词，便于直接传递给后续脚本生成 Agent。' }
    ])}
    <button class="btn-submit" onclick="submitToolTask('tool-understand')">✦ 开始分析</button>
  `;
}

function renderToolFormTranslate() {
  const translateScriptItems = libraryScripts.flatMap(script =>
    script.files.map(file => `${script.name} / ${file} · ${script.createdAt}`)
  );
  const defaultTargetLanguages = TRANSLATION_TARGETS.filter((_, index) => index < 2);
  _toolTranslateLanguageConfigs = normalizeTranslationLanguageConfigs(defaultTargetLanguages, {});
  return _taskInfoCard({ showDescription: false }) + `
    <div class="form-card">
      <div class="form-card-title">🌐 文本翻译 Agent 设置</div>
      <div class="form-field">
        <label>翻译内容来源 <span class="required">*</span></label>
        <div class="tab-switch" style="margin-bottom:12px;">
          <div class="tab-switch-item active" onclick="switchToolTab(this,'translate-lib')">从脚本库选择</div>
          <div class="tab-switch-item" onclick="switchToolTab(this,'translate-manual')">手动输入</div>
        </div>
        <div id="translate-lib">
          ${_renderSelectList(translateScriptItems, 'checkbox', 'translate-script')}
        </div>
        <div id="translate-manual" style="display:none;">
          <textarea placeholder="粘贴需要翻译的文本内容，最多 2000 字..."></textarea>
        </div>
      </div>
      <div class="form-field">
        <label>源语言 <span class="required">*</span></label>
        <select><option>自动检测</option>${LANGUAGES.map(language => `<option ${language === '中文（简体）' ? 'selected' : ''}>${language}</option>`).join('')}</select>
      </div>
      <div class="form-field">
        <label>目标语言 <span class="required">*</span></label>
        <div class="multi-tags" id="tool-translate-targets">
          ${TRANSLATION_TARGETS.map((language, index) => `<div class="multi-tag ${index < 2 ? 'active' : ''}" data-language="${language}" onclick="toggleToolTranslateTargetLanguage(this)">${language}</div>`).join('')}
        </div>
      </div>
      <div class="form-field">
        <label>翻译风格 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn" onclick="toggleRadioBtn(this)">直译</div>
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">意译</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">广告文案</div>
        </div>
      </div>
    </div>
    ${_advancedCard(`
      <div class="form-field" style="margin-top:14px;">
        <label>底层模型</label>
        <select>${GEMINI_BASE_MODELS.map(model => `<option>${model}</option>`).join('')}</select>
        <small>默认-Gemini 2.5 Pro</small>
      </div>
      <div class="form-field">
        <label>语言级配置</label>
        <div id="tool-translate-language-configs">${renderTranslationLanguageConfigFields(defaultTargetLanguages, _toolTranslateLanguageConfigs, "updateToolTranslateLanguageConfig('__LANG__','__KEY__', __VALUE__)")}</div>
        <small>为每个目标语言分别设置市场语料和术语表。</small>
      </div>
    `)}
    <button class="btn-submit" onclick="submitToolTask('tool-translate')">✦ 开始翻译</button>
  `;
}

function renderToolFormExtract() {
  return _taskInfoCard({ showDescription: false }) + `
    <div class="form-card">
      <div class="form-card-title">✂️ 文案提取 Agent 设置</div>
      <div class="form-field">
        <label>素材类型 <span class="required">*</span></label>
        <div class="tab-switch" style="margin-bottom:12px;">
          <div class="tab-switch-item active" onclick="switchToolTab(this,'extract-video')">视频</div>
          <div class="tab-switch-item" onclick="switchToolTab(this,'extract-image')">图片</div>
        </div>
        <div id="extract-video">
          <div class="file-upload-zone" onclick="toast('选择视频文件（原型演示）')">
            <div class="upload-icon">🎥</div>
            <strong>点击上传视频素材</strong>
            <div style="margin-top:4px;">支持 MP4 / MOV，≤ 500MB</div>
          </div>
        </div>
        <div id="extract-image" style="display:none;">
          <div class="file-upload-zone" onclick="toast('选择图片文件（原型演示）')">
            <div class="upload-icon">🖼</div>
            <strong>点击上传图片素材</strong>
            <div style="margin-top:4px;">支持 JPG / PNG，≤ 5MB，最多 10 张</div>
          </div>
        </div>
      </div>
      <div class="form-field">
        <label>提取内容 <span class="required">*</span></label>
        <div class="multi-tags">
          <div class="multi-tag active" onclick="this.classList.toggle('active')">台词 / 旁白</div>
          <div class="multi-tag" onclick="this.classList.toggle('active')">字幕文字</div>
          <div class="multi-tag" onclick="this.classList.toggle('active')">画面中的文字</div>
          <div class="multi-tag" onclick="this.classList.toggle('active')">标题</div>
          <div class="multi-tag" onclick="this.classList.toggle('active')">标语</div>
        </div>
      </div>
      <div class="form-field">
        <label>输出语言 <span class="required">*</span></label>
        <select>
          <option>保持原语言</option>
          ${LANGUAGES.map(language => `<option>${language}</option>`).join('')}
        </select>
      </div>
      <div class="form-field">
        <label style="display:flex; align-items:center; gap:10px;">
          时间戳输出
          <label class="toggle-switch"><input type="checkbox"><span class="toggle-slider"></span></label>
        </label>
        <small>开启后每段台词附带起止时间戳，格式 [00:03-00:08]，默认关闭。</small>
      </div>
    </div>
    ${_advancedCard(`
      <div class="form-field" style="margin-top:14px;">
        <label>底层模型</label>
        <select>${GEMINI_BASE_MODELS.map(model => `<option>${model}</option>`).join('')}</select>
        <small>默认-Gemini 2.5 Pro</small>
      </div>
    `)}
    <button class="btn-submit" onclick="submitToolTask('tool-extract')">✦ 开始提取</button>
  `;
}

function renderToolFormVoice() {
  return _taskInfoCard({ showDescription: false }) + `
    <div class="form-card">
      <div class="form-card-title">🎙 配音优化 Agent 设置</div>
      <div class="form-field">
        <label>配音文本来源 <span class="required">*</span></label>
        <div class="tab-switch" style="margin-bottom:12px;">
          <div class="tab-switch-item active" onclick="switchToolTab(this,'voice-lib')">从脚本库选择</div>
          <div class="tab-switch-item" onclick="switchToolTab(this,'voice-manual')">手动输入</div>
        </div>
        <div id="voice-lib">
          ${_renderSelectList(libraryScripts.flatMap(script => script.files.map(file => `${script.name} / ${file}`)), 'radio', 'voice-script')}
        </div>
        <div id="voice-manual" style="display:none;">
          <textarea placeholder="粘贴需要配音的台词内容，最多 5000 字符；支持 <#1.5#> 停顿标记语法"></textarea>
        </div>
      </div>
      <div class="form-field">
        <label>语言 / 音色分类 <span class="required">*</span></label>
        <div class="tab-switch" style="margin-bottom:12px;">
          ${VOICE_LIBRARY.map((category, index) => `<div class="tab-switch-item ${index === 0 ? 'active' : ''}" onclick="switchToolTab(this,'voice-cat-${category.id}')">${category.label}</div>`).join('')}
        </div>
        ${VOICE_LIBRARY.map((category, index) => `
          <div id="voice-cat-${category.id}" ${index > 0 ? 'style="display:none;"' : ''}>
            <div class="voice-cards">
              ${category.voices.map((voice, voiceIndex) => `
                <div class="voice-card ${index === 0 && voiceIndex === 0 ? 'active' : ''}" onclick="selectVoiceCard(this)">
                  <div class="vc-icon">🎤</div>${voice}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <small>共 22 种语言，80+ 个音色；支持试听后选中。</small>
      </div>
      <div class="form-field">
        <label>语速: <span id="voice-speed-val" style="color:#a78bfa; font-weight:600;">1.0x</span></label>
        <div class="range-slider-wrap">
          <input type="range" min="5" max="20" value="10" oninput="document.getElementById('voice-speed-val').textContent=(this.value/10).toFixed(1)+'x'">
          <span class="range-slider-val">0.5x - 2.0x</span>
        </div>
      </div>
    </div>
    ${_advancedCard(`
      <div class="form-field" style="margin-top:14px;">
        <label>音量 <span id="voice-volume-val" style="color:#a78bfa;">1.0</span></label>
        <div class="range-slider-wrap">
          <input type="range" min="0.1" max="1.0" value="1.0" step="0.1" oninput="document.getElementById('voice-volume-val').textContent=Number(this.value).toFixed(1)">
          <span class="range-slider-val">0.1 ~ 1.0</span>
        </div>
      </div>
      <div class="form-field">
        <label>语调 <span id="voice-pitch-val" style="color:#a78bfa;">0</span></label>
        <div class="range-slider-wrap">
          <input type="range" min="-12" max="12" value="0" step="1" oninput="document.getElementById('voice-pitch-val').textContent=this.value">
          <span class="range-slider-val">-12 ~ +12</span>
        </div>
      </div>
      <div class="form-field">
        <label style="display:flex; align-items:center; gap:10px;">
          背景音乐
          <label class="toggle-switch"><input type="checkbox" onchange="document.getElementById('voice-bgm-style').style.display=this.checked?'':'none'"><span class="toggle-slider"></span></label>
        </label>
        <select id="voice-bgm-style" style="display:none; margin-top:8px;">
          ${BACKGROUND_MUSIC_STYLES.map(style => `<option>${style}</option>`).join('')}
        </select>
      </div>
    `)}
    <button class="btn-submit" onclick="submitToolTask('tool-voice')">✦ 生成配音</button>
  `;
}

function renderToolFormDisclaimer() {
  return _taskInfoCard({ showDescription: false }) + `
    <div class="form-card">
      <div class="form-card-title">⚠️ 添加警示语 Agent 设置</div>
      <div class="form-field">
        <label>视频来源 <span class="required">*</span></label>
        <div class="tab-switch" style="margin-bottom:12px;">
          <div class="tab-switch-item active" onclick="switchToolTab(this,'discl-history')">从生成历史选择</div>
          <div class="tab-switch-item" onclick="switchToolTab(this,'discl-upload')">上传视频文件</div>
        </div>
        <div id="discl-history">
          ${_renderSelectList(['品牌故事_v1.mp4', '品牌故事_v2.mp4', '新品发布_30s.mp4', 'product_intro_PT.mp4', 'product_intro_ES.mp4'], 'checkbox', 'discl-history-video')}
        </div>
        <div id="discl-upload" style="display:none;">
          <div class="file-upload-zone" onclick="toast('选择视频文件（原型演示）')">
            <div class="upload-icon">🎥</div>
            <strong>点击上传视频文件</strong>
            <div style="margin-top:4px;">支持批量上传，最多 10 个文件</div>
          </div>
        </div>
      </div>
      <div class="form-field">
        <label>警示语内容 <span class="required">*</span></label>
        <div class="template-chips">
          ${DISCLAIMER_PRESETS.map(preset => `<div class="template-chip" onclick="document.getElementById('discl-text').value='${preset.value}'">${preset.label}</div>`).join('')}
        </div>
        <textarea id="discl-text" placeholder="手动输入警示语，或从预设模板中选择..."></textarea>
      </div>
      <div class="form-field">
        <label>语言 <span class="required">*</span></label>
        <select>${DISCLAIMER_LANGUAGES.map((language, index) => `<option ${index === 0 ? 'selected' : ''}>${language}</option>`).join('')}</select>
      </div>
      <div class="form-field">
        <label>显示位置 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">底部居中</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">底部左侧</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">底部右侧</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">顶部居中</div>
        </div>
      </div>
      <div class="form-field">
        <label>字体大小 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn" onclick="toggleRadioBtn(this)">小（视频宽度 2%）</div>
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">中（3%，默认）</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">大（4%）</div>
        </div>
      </div>
      <div class="form-field">
        <label>字体颜色 <span class="required">*</span></label>
        <div class="color-input-wrap">
          <input type="color" value="#ffffff">
          <input type="text" value="#FFFFFF" style="width:100px;">
        </div>
      </div>
      <div class="form-field">
        <label>显示时长 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">全程显示（默认）</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">仅最后 3s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">仅最后 5s</div>
        </div>
      </div>
    </div>
    ${_advancedCard('')}
    <button class="btn-submit" onclick="submitToolTask('tool-disclaimer')">✦ 添加警示语</button>
  `;
}

function renderToolFormGrok() {
  return _taskInfoCard({ showDescription: false }) + `
    <div class="form-card">
      <div class="form-card-title">🤖 Grok 视频生成 Agent 设置</div>
      <div class="form-field">
        <label>视频时长 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">10s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">20s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">30s</div>
        </div>
      </div>
      <div class="form-field">
        <label>参考图片</label>
        <div class="file-upload-zone" onclick="toast('选择参考图片（原型演示）')">
          <div class="upload-icon">🖼</div>
          <strong>点击上传参考图片</strong>
          <div style="margin-top:4px;">JPG / PNG，最大 10MB；作为视频起始帧参考</div>
        </div>
      </div>
      <div class="form-field">
        <label>视频描述 <span class="required">*</span></label>
        <textarea placeholder="建议 50 ~ 300 字，英文效果最佳；描述视频画面内容、人物动作、场景氛围等..."></textarea>
      </div>
      <div class="form-field">
        <label>画面比例 <span class="required">*</span></label>
        <select>
          <option>16:9</option>
          <option selected>9:16</option>
          <option>1:1</option>
        </select>
      </div>
      ${renderToolVideoCountField('tool-grok-count', 1)}
    </div>
    ${_advancedCard('')}
    <button class="btn-submit" onclick="submitToolTask('tool-grok')">✦ 生成视频</button>
  `;
}

function renderToolFormVeo() {
  return _taskInfoCard({ showDescription: false }) + `
    <div class="form-card">
      <div class="form-card-title">🎞 Veo 3.1 视频生成 Agent 设置</div>
      <div class="form-field">
        <label>视频时长 <span class="required">*</span></label>
        <div class="radio-btns">
          <div class="radio-btn" onclick="toggleRadioBtn(this)">8s</div>
          <div class="radio-btn active" onclick="toggleRadioBtn(this)">16s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">24s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">32s</div>
          <div class="radio-btn" onclick="toggleRadioBtn(this)">40s</div>
        </div>
      </div>
      <div class="form-field">
        <label>起始帧图片</label>
        <div class="file-upload-zone" onclick="toast('选择起始帧图片（原型演示）')">
          <strong>🖼 上传起始帧图片</strong>
          <div style="margin-top:4px;">JPG / PNG，最大 10MB；指定视频第一帧画面</div>
        </div>
      </div>
      <div class="form-field">
        <label>结束帧图片</label>
        <div class="file-upload-zone" onclick="toast('选择结束帧图片（原型演示）')">
          <strong>🖼 上传结束帧图片</strong>
          <div style="margin-top:4px;">与起始帧配合可精确控制视频开头和结尾</div>
        </div>
      </div>
        <div class="form-field">
          <label>参考图片</label>
          <div class="file-upload-zone" onclick="toast('选择参考图片（原型演示）')">
            <strong>🖼 上传参考图片</strong>
            <div style="margin-top:4px;">作为整体视觉风格参考</div>
          </div>
        </div>
        <div class="form-field">
          <label>视频描述 <span class="required">*</span></label>
          <textarea placeholder="建议 50 ~ 500 字，英文效果最佳；描述视频画面内容、场景、动作和氛围..."></textarea>
        </div>
        <div class="form-field">
          <label>画面比例 <span class="required">*</span></label>
          <select>
            <option>16:9</option>
            <option selected>9:16</option>
          </select>
        </div>
        ${renderToolVideoCountField('tool-veo-count', 1)}
      </div>
    ${_advancedCard('')}
    <button class="btn-submit" onclick="submitToolTask('tool-veo')">✦ 生成视频</button>
  `;
}

// ===== Tool Form Helpers =====
function toggleRadioBtn(el) {
  el.parentElement.querySelectorAll('.radio-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function selectVoiceCard(el) {
  el.parentElement.querySelectorAll('.voice-card').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function selectCardOption(el) {
  el.parentElement.querySelectorAll('.card-select-item').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function switchToolTab(el, showId) {
  const tabSwitch = el.parentElement;
  tabSwitch.querySelectorAll('.tab-switch-item').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  // Hide all sibling panels, show target
  const parent = tabSwitch.parentElement;
  const allIds = [...tabSwitch.querySelectorAll('.tab-switch-item')].map((t,i) => {
    // Find the corresponding panel by order
    return null;
  });
  // Simple approach: hide all divs that are tab panels after the tab-switch
  let sibling = tabSwitch.nextElementSibling;
  while (sibling) {
    if (sibling.id && sibling.tagName === 'DIV') {
      sibling.style.display = sibling.id === showId ? '' : 'none';
    }
    sibling = sibling.nextElementSibling;
  }
}

function toggleAdvanced(el) {
  const body = el.nextElementSibling;
  const arrow = el.querySelector('.adv-arrow');
  if (!isAdvancedBodyExpanded(body)) {
    body.style.maxHeight = `${body.scrollHeight}px`;
    if (arrow) arrow.classList.add('open');
  } else {
    body.style.maxHeight = '0px';
    if (arrow) arrow.classList.remove('open');
  }
}

function submitToolTask(toolId) {
  const tool = TOOLBOX_TOOLS.find(t => t.id === toolId);
  const taskLabel = toolId === 'tool-video' && tool
    ? `${tool.name} · ${currentVideoToolModel}`
    : (tool ? tool.name : toolId);
  toast(`✅ 任务已提交: ${taskLabel}（原型演示）`);
  setTimeout(() => closeToolDetail(), 800);
}

// ===== Workflow DAG Canvas (Full Page, Interactive) =====
let _wfCanvasConfigured = new Set();
let _wfZoom = 1;
let _wfPanX = 0, _wfPanY = 0;
let _wfIsPanning = false, _wfPanStartX = 0, _wfPanStartY = 0;
let _wfDragNode = null, _wfDragOffX = 0, _wfDragOffY = 0;
let _wfNodePositions = {}; // nodeId -> {x,y}
let _wfEdges = [];         // [{from, to}]
let _wfNextId = 100;
let _wfConnecting = null;  // {fromId, startX, startY} during edge draw
let _wfGhostEdge = null;   // {x,y} mouse pos during edge draw
let _wfNodeDefs = {};      // nodeId -> {id, type, label, icon, subLabel}
let _wfConfigState = {};   // nodeId -> selected field values for config panel
let _wfDirty = false;      // true once user edits (drag/delete/add)
let _wfGlobalConfirmEnabled = true; // global switch: honor per-node needsConfirmation settings when true; bypass all confirmations when false
let _wfJustDragged = false; // suppress click after drag

const WF_NODE_W = 220;
const WF_NODE_H = 68;
const WF_GAP_X = 100;
const WF_PALETTE_NODES = [
  { type: 'input', variant: 'copy', icon: '📥', label: '输入节点' },
  { type: 'agent', variant: 'script', icon: '🤖', label: 'Agent 节点' },
  { type: 'output', icon: '📦', label: '产出物' }
];

function getWfNodeVariant(node) {
  if (!node) return '';
  if (node.variant) return node.variant;
  const label = node.label || '';
  if (node.type === 'input') {
    return label.includes('视频') ? 'video' : 'copy';
  }
  if (node.type === 'agent') {
    if (label.includes('脚本生成')) return 'script';
    if (label.includes('视频生成')) return 'video';
    if (label.includes('视频理解')) return 'understand';
    if (label.includes('翻译')) return 'translate';
    if (label.includes('文案提取')) return 'extract';
    if (label.includes('配音')) return 'voice';
    if (label.includes('警示语')) return 'disclaimer';
    return 'script';
  }
  return '';
}

function getWfVariantMeta(node) {
  if (!node) return null;
  if (node.type === 'input') {
    return WF_INPUT_VARIANTS[getWfNodeVariant(node)] || WF_INPUT_VARIANTS.copy;
  }
  if (node.type === 'agent') {
    return WF_AGENT_VARIANTS[getWfNodeVariant(node)] || WF_AGENT_VARIANTS.script;
  }
  return null;
}

function normalizeWfNodeDef(node, forceLabel = false) {
  const normalized = { ...node };
  if (normalized.type === 'output' && (normalized.label || '').includes('输入')) {
    normalized.type = 'input';
  }
  const meta = getWfVariantMeta(normalized);
  if (meta) {
    normalized.variant = meta.value;
    normalized.icon = meta.icon;
    if (forceLabel || !normalized.label || WF_GENERIC_LABELS.has(normalized.label)) {
      normalized.label = meta.label;
    }
  }
  normalized.subLabel = _wfSubLabel(normalized);
  return normalized;
}

function getWfNodeOutputType(node) {
  if (!node) return '未指定';
  const meta = getWfVariantMeta(node);
  if (meta && meta.outputType) return meta.outputType;

  const label = node.label || '';
  if (label.includes('报告')) return '分析报告';
  if (label.includes('配音')) return '配音';
  if (label.includes('视频')) return '视频';
  if (label.includes('翻译')) return '翻译';
  if (label.includes('脚本')) return '脚本';
  if (label.includes('文案')) return '文案';
  return '未指定';
}

function setWfNodeVariant(nodeId, variant) {
  const node = _wfNodeDefs[nodeId];
  if (!node || (node.type !== 'input' && node.type !== 'agent')) return;
  node.variant = variant;
  const meta = getWfVariantMeta(node);
  if (meta) {
    node.icon = meta.icon;
    node.label = meta.label;
  }
  _wfConfigState[nodeId] = {
    ...getWfNodeConfigDefaults(node),
    ...(_wfConfigState[nodeId] || {})
  };
  if (node.type === 'agent' && getWfNodeVariant(node) === 'video') {
    _wfConfigState[nodeId] = syncWfVideoState(_wfConfigState[nodeId]);
  }
  _wfCanvasConfigured.delete(nodeId);
  _wfDirty = true;
  _renderWfCanvas();
}

function _wfSubLabel(node) {
  if (node.type === 'start') return '起始节点';
  if (node.type === 'input' || node.type === 'agent') {
    const meta = getWfVariantMeta(node);
    return meta ? meta.subLabel : '';
  }
  if (node.type === 'output') {
    const outputType = inferWfOutputType(node.id);
    return outputType === '未指定' ? '产出物 · 未指定' : `产出物 · ${outputType}`;
  }
  return '';
}

function _guessWfOutputTypeFromLabel(label = '') {
  if (label.includes('报告')) return '分析报告';
  if (label.includes('配音')) return '配音';
  if (label.includes('翻译')) return '翻译';
  if (label.includes('脚本')) return '脚本';
  if (label.includes('文案')) return '文案';
  if (label.includes('视频')) return '视频';
  return '未指定';
}

function _inferWorkflowOutputType(nodeId, nodeLookup, edges, visited = new Set()) {
  if (!nodeId || visited.has(nodeId)) return '未指定';
  visited.add(nodeId);

  const node = nodeLookup[nodeId];
  if (!node) return '未指定';

  if (node.type !== 'output') {
    const nodeOutputType = getWfNodeOutputType(node);
    return nodeOutputType !== '未指定' ? nodeOutputType : _guessWfOutputTypeFromLabel(node.label || '');
  }

  const incomingEdges = (edges || []).filter(edge => edge.to === nodeId);
  for (const edge of incomingEdges) {
    const upstreamType = _inferWorkflowOutputType(edge.from, nodeLookup, edges, visited);
    if (upstreamType !== '未指定') return upstreamType;
  }

  return _guessWfOutputTypeFromLabel(node.label || '');
}

function inferWfOutputType(nodeId, visited = new Set()) {
  return _inferWorkflowOutputType(nodeId, _wfNodeDefs, _wfEdges, visited);
}

function inferTemplateWfOutputType(wt, nodeId) {
  if (!wt || !Array.isArray(wt.nodes)) return '未指定';
  const nodeLookup = wt.nodes.reduce((map, node) => {
    map[node.id] = node;
    return map;
  }, {});
  return _inferWorkflowOutputType(nodeId, nodeLookup, getWorkflowTemplateEdges(wt));
}

function openWorkflowCanvas(templateId) {
  currentWorkflowTemplateId = templateId;
  currentWorkflowNodeId = null;
  _wfCanvasConfigured.clear();
  _wfZoom = 1; _wfPanX = 0; _wfPanY = 0;
  _wfDirty = false;
  _wfNodePositions = {}; _wfEdges = []; _wfNodeDefs = {}; _wfConfigState = {};

  const wt = WORKFLOW_TEMPLATES.find(w => w.id === templateId);
  if (!wt) return;

  const templatePositions = getWorkflowTemplatePositions(wt, { baseX: 80, baseY: 260, gapX: WF_GAP_X, nodeW: WF_NODE_W });
  wt.nodes.forEach(node => {
    const normalizedNode = normalizeWfNodeDef(node);
    const pos = templatePositions[normalizedNode.id] || { x: 80, y: 260 };
    _wfNodePositions[normalizedNode.id] = { x: pos.x, y: pos.y };
    _wfNodeDefs[normalizedNode.id] = normalizedNode;
  });
  _wfEdges = getWorkflowTemplateEdges(wt);

  const main = document.querySelector('.main');
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  let canvasPage = document.getElementById('page-wf-canvas');
  if (!canvasPage) {
    canvasPage = document.createElement('div');
    canvasPage.id = 'page-wf-canvas';
    canvasPage.className = 'page';
    canvasPage.style.padding = '0';
    canvasPage.style.height = '100vh';
    canvasPage.style.overflow = 'hidden';
    main.appendChild(canvasPage);
  }
  canvasPage.classList.add('active');

  // Initial pan — rough center; wfFitView called after measure
  _wfPanX = 60;
  _wfPanY = 0;

  _renderWfCanvas();
}

function closeWfCanvas() {
  const canvasPage = document.getElementById('page-wf-canvas');
  if (canvasPage) canvasPage.classList.remove('active');
  currentWorkflowTemplateId = null;
  currentWorkflowNodeId = null;
  goPage('workspace');
}

function _renderWfCanvas() {
  const canvasPage = document.getElementById('page-wf-canvas');
  const wt = WORKFLOW_TEMPLATES.find(w => w.id === currentWorkflowTemplateId);
  if (!canvasPage || !wt) return;

  const showPanel = !!currentWorkflowNodeId;
  const activeNode = currentWorkflowNodeId ? _wfNodeDefs[currentWorkflowNodeId] : null;

  // Build nodes HTML
  let nodesHtml = '';
  for (const [nid, pos] of Object.entries(_wfNodePositions)) {
    const def = _wfNodeDefs[nid];
    if (!def) continue;
    const subLabel = _wfSubLabel(def);
    const isConf = def.type === 'start' || def.type === 'input' || def.type === 'agent';
    const outputState = def.type === 'output' ? (_wfConfigState[nid] || {}) : null;
    const needsConfirm = !!(outputState && outputState.needsConfirmation);
    const badge = isConf
      ? (_wfCanvasConfigured.has(nid)
        ? '<div class="wf-node-badge configured">已配置</div>'
        : '<div class="wf-node-badge pending">待配置</div>')
      : '';
    const confirmChip = needsConfirm ? '<span class="wf-node-confirm-chip">中断确认</span>' : '';
    nodesHtml += `
      <div class="wf-abs-node wf-type-${def.type} ${currentWorkflowNodeId === nid ? 'active' : ''} ${needsConfirm && !_wfGlobalConfirmEnabled ? 'confirm-disabled' : ''}"
           id="wf-node-${nid}"
           style="left:${pos.x}px; top:${pos.y}px;"
           onmousedown="wfNodeMouseDown(event,'${nid}')"
           onclick="wfNodeClick(event,'${nid}')"
           oncontextmenu="wfNodeContextMenu(event,'${nid}')">
        <div class="wf-node-top">
          <div class="wf-node-icon">${def.icon}</div>
          <div class="wf-node-text">
            <div class="wf-node-name">${def.label}</div>
            <div class="wf-node-sub">${subLabel}</div>
          </div>
        </div>
        ${(badge || confirmChip) ? '<div class="wf-node-bottom">' + badge + confirmChip + '</div>' : ''}
        ${def.type !== 'start' ? '<button class="wf-node-del" onclick="event.stopPropagation();wfDeleteNode(\'' + nid + '\')" title="删除节点"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg></button>' : ''}
        <div class="wf-port port-out" onmousedown="wfPortMouseDown(event,'${nid}','out')"></div>
        <div class="wf-port port-in"></div>
      </div>
    `;
  }

  // SVG edges: rendered empty initially, filled after DOM measurement
  let edgeSvg = '';

  // Build minimap
  const allPos = Object.values(_wfNodePositions);
  const mmScale = 0.08;
  let minimapNodes = '';
  for (const [nid, pos] of Object.entries(_wfNodePositions)) {
    const def = _wfNodeDefs[nid];
    const col = def.type === 'start'
      ? '#3b82f6'
      : def.type === 'input'
        ? '#f59e0b'
        : def.type === 'agent'
          ? '#7c3aed'
          : '#10b981';
    const nw = _getNodeW(nid);
    const nh = _getNodeH(nid);
    minimapNodes += `<div class="wf-minimap-node" style="left:${pos.x*mmScale+8}px;top:${pos.y*mmScale+8}px;width:${nw*mmScale}px;height:${nh*mmScale}px;background:${col};"></div>`;
  }

  canvasPage.innerHTML = `
    <div class="wf-canvas-page">
      <div class="wf-canvas-topbar">
        <button class="wf-back" onclick="closeWfCanvas()" title="返回" aria-label="返回">${_svgBack}</button>
        <span class="wf-title">${wt.name}</span>
        <span class="wf-tag">工作流画布</span>
        <div class="wf-actions">
          <div class="wf-global-confirm ${_wfGlobalConfirmEnabled ? 'on' : 'off'}" title="控制本工作流所有产出物节点的中断确认总开关">
            <span class="wgc-icon">⏸</span>
            <div class="wgc-text">
              <div class="wgc-title">中断确认</div>
              <div class="wgc-sub">${_wfGlobalConfirmEnabled ? '按节点配置执行' : '本次运行全部跳过'}</div>
            </div>
            <label class="toggle-switch" style="margin:0;">
              <input type="checkbox" ${_wfGlobalConfirmEnabled ? 'checked' : ''} onchange="toggleWfGlobalConfirm(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <button class="btn btn-ghost ${_wfDirty ? '' : 'disabled'}" ${_wfDirty ? 'onclick="wfShowSaveAs()"' : ''} id="wf-saveas-btn">📋 另存为</button>
          <button class="btn btn-primary" onclick="runWorkflow('${wt.id}')">▶ 运行工作流</button>
        </div>
      </div>
      <div class="wf-canvas-body">
        <div class="wf-canvas-area" id="wf-canvas-area"
             onmousedown="wfCanvasMouseDown(event)"
             onwheel="wfCanvasWheel(event)">
          <div class="wf-canvas-grid"></div>
          <div class="wf-canvas-transform" id="wf-canvas-transform"
               style="transform: translate(${_wfPanX}px, ${_wfPanY}px) scale(${_wfZoom});">
            <svg class="wf-canvas-svg" width="4000" height="2000">${edgeSvg}</svg>
            ${nodesHtml}
          </div>

          <div class="wf-node-palette">
            <div class="palette-title">拖拽添加节点</div>
            ${WF_PALETTE_NODES.map(node => `
              <div class="wf-palette-item" draggable="true" ondragstart="wfPaletteDragStart(event,'${node.type}','${node.icon}','${node.label}','${node.variant || ''}')">
                <span class="pi-icon">${node.icon}</span>${node.type === 'output' ? '产出物节点' : node.label}
              </div>
            `).join('')}
          </div>

          <div class="wf-canvas-zoom">
            <button onclick="wfSetZoom(_wfZoom+0.15)">+</button>
            <button onclick="wfSetZoom(_wfZoom-0.15)">−</button>
            <div class="zoom-label" id="wf-zoom-label">${Math.round(_wfZoom*100)}%</div>
            <button onclick="wfFitView()" style="font-size:11px;" title="适应画布">⊞</button>
          </div>

          <div class="wf-minimap">
            <div class="wf-minimap-inner">
              ${minimapNodes}
            </div>
          </div>
        </div>

        <div class="wf-config-panel ${showPanel ? '' : 'hidden'}">
          ${activeNode ? renderWfNodeConfig(activeNode, wt) : ''}
        </div>
      </div>
    </div>
  `;

  // Attach global mouse listeners + measure real node sizes & redraw edges
  const area = document.getElementById('wf-canvas-area');
  if (area) {
    area.addEventListener('dragover', wfCanvasDragOver);
    area.addEventListener('drop', wfCanvasDrop);
  }
  // After DOM paint, measure real node sizes and fix edges
  requestAnimationFrame(() => { _wfMeasureAndRedraw(true); });
}

// Measure actual DOM node sizes and rebuild SVG edges
function _wfMeasureAndRedraw(fitView) {
  for (const nid of Object.keys(_wfNodeDefs)) {
    const el = document.getElementById('wf-node-' + nid);
    if (el) {
      _wfNodeDefs[nid]._w = el.offsetWidth;
      _wfNodeDefs[nid]._h = el.offsetHeight;
    }
  }
  // Re-layout horizontally using measured widths when template does not define its own graph layout.
  const wt = WORKFLOW_TEMPLATES.find(w => w.id === currentWorkflowTemplateId);
  if (wt && !hasWorkflowTemplateLayout(wt)) {
    let maxH = 0;
    wt.nodes.forEach((node) => {
      const h = _getNodeH(node.id);
      if (h > maxH) maxH = h;
    });
    let curX = 80;
    const centerY = 260 + maxH / 2;
    wt.nodes.forEach((node) => {
      const pos = _wfNodePositions[node.id];
      if (!pos) return;
      const w = _getNodeW(node.id);
      const h = _getNodeH(node.id);
      pos.x = curX;
      pos.y = centerY - h / 2; // vertically center
      curX += w + WF_GAP_X;
      const el = document.getElementById('wf-node-' + node.id);
      if (el) { el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px'; }
    });
  }
  _updateWfEdges();
  if (fitView) wfFitView();
}

function _getNodeW(nid) { return (_wfNodeDefs[nid] && _wfNodeDefs[nid]._w) || WF_NODE_W; }
function _getNodeH(nid) { return (_wfNodeDefs[nid] && _wfNodeDefs[nid]._h) || WF_NODE_H; }

// --- Zoom ---
function wfSetZoom(z) {
  _wfZoom = Math.max(0.2, Math.min(2.5, z));
  _applyWfTransform();
  const label = document.getElementById('wf-zoom-label');
  if (label) label.textContent = Math.round(_wfZoom * 100) + '%';
}

function wfCanvasWheel(e) {
  e.preventDefault();
  const area = document.getElementById('wf-canvas-area');
  if (!area) return;
  const rect = area.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const oldZ = _wfZoom;
  const delta = e.deltaY > 0 ? -0.08 : 0.08;
  const newZ = Math.max(0.2, Math.min(2.5, oldZ + delta));
  // Zoom toward mouse
  _wfPanX = mx - (mx - _wfPanX) * (newZ / oldZ);
  _wfPanY = my - (my - _wfPanY) * (newZ / oldZ);
  _wfZoom = newZ;
  _applyWfTransform();
  const label = document.getElementById('wf-zoom-label');
  if (label) label.textContent = Math.round(_wfZoom * 100) + '%';
}

function wfFitView() {
  const nids = Object.keys(_wfNodePositions);
  if (!nids.length) return;
  const area = document.getElementById('wf-canvas-area');
  if (!area) return;
  const rect = area.getBoundingClientRect();
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const nid of nids) {
    const p = _wfNodePositions[nid];
    const w = _getNodeW(nid);
    const h = _getNodeH(nid);
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + w > maxX) maxX = p.x + w;
    if (p.y + h > maxY) maxY = p.y + h;
  }
  minX -= 80; minY -= 80; maxX += 80; maxY += 80;
  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const panelW = currentWorkflowNodeId ? 380 : 0;
  const availW = rect.width - panelW - 40;
  const availH = rect.height - 40;
  _wfZoom = Math.max(0.2, Math.min(1.5, Math.min(availW / contentW, availH / contentH)));
  _wfPanX = (availW - contentW * _wfZoom) / 2 - minX * _wfZoom + 20;
  _wfPanY = (availH - contentH * _wfZoom) / 2 - minY * _wfZoom + 20;
  _applyWfTransform();
  const label = document.getElementById('wf-zoom-label');
  if (label) label.textContent = Math.round(_wfZoom * 100) + '%';
}

function _applyWfTransform() {
  const el = document.getElementById('wf-canvas-transform');
  if (el) el.style.transform = `translate(${_wfPanX}px,${_wfPanY}px) scale(${_wfZoom})`;
}

// --- Pan ---
function wfCanvasMouseDown(e) {
  if (_wfConnecting) return; // edge drawing mode
  if (e.target.closest('.wf-abs-node') || e.target.closest('.wf-port') || e.target.closest('.wf-node-palette') || e.target.closest('.wf-canvas-zoom') || e.target.closest('.wf-minimap')) return;
  _wfIsPanning = true;
  _wfPanStartX = e.clientX - _wfPanX;
  _wfPanStartY = e.clientY - _wfPanY;
  const area = document.getElementById('wf-canvas-area');
  if (area) area.classList.add('grabbing');

  const onMove = (ev) => {
    if (!_wfIsPanning) return;
    _wfPanX = ev.clientX - _wfPanStartX;
    _wfPanY = ev.clientY - _wfPanStartY;
    _applyWfTransform();
  };
  const onUp = () => {
    _wfIsPanning = false;
    if (area) area.classList.remove('grabbing');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// --- Node drag ---
function wfNodeMouseDown(e, nodeId) {
  if (e.target.closest('.wf-port')) return; // don't drag when clicking port
  e.stopPropagation();
  const pos = _wfNodePositions[nodeId];
  if (!pos) return;
  const startX = e.clientX;
  const startY = e.clientY;
  const origX = pos.x;
  const origY = pos.y;
  let moved = false;

  const nodeEl = document.getElementById('wf-node-' + nodeId);
  const area = document.getElementById('wf-canvas-area');

  const onMove = (ev) => {
    const dx = (ev.clientX - startX) / _wfZoom;
    const dy = (ev.clientY - startY) / _wfZoom;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    if (!moved) return;
    pos.x = origX + dx;
    pos.y = origY + dy;
    if (nodeEl) {
      nodeEl.classList.add('dragging');
      nodeEl.style.left = pos.x + 'px';
      nodeEl.style.top = pos.y + 'px';
    }
    if (area) area.classList.add('node-dragging');
    _updateWfEdges();
  };
  const onUp = () => {
    if (moved) { _wfDirty = true; _wfJustDragged = true; _updateSaveAsBtn(); }
    if (nodeEl) nodeEl.classList.remove('dragging');
    if (area) area.classList.remove('node-dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function wfNodeClick(e, nodeId) {
  // Only fire if we didn't drag
  if (_wfJustDragged) { _wfJustDragged = false; return; }
  if (e.target.closest('.wf-port')) return;
  e.stopPropagation();
  if (currentWorkflowNodeId === nodeId) {
    currentWorkflowNodeId = null;
  } else {
    currentWorkflowNodeId = nodeId;
  }
  _renderWfCanvas();
}

// --- Update SVG edges using measured node sizes ---
function _updateWfEdges() {
  const svg = document.querySelector('.wf-canvas-svg');
  if (!svg) return;
  let edgeSvg = '';
  for (const edge of _wfEdges) {
    const fp = _wfNodePositions[edge.from];
    const tp = _wfNodePositions[edge.to];
    if (!fp || !tp) continue;
    const fw = _getNodeW(edge.from);
    const fh = _getNodeH(edge.from);
    const th = _getNodeH(edge.to);
    // Port-out: right:-5px → center at nodeX + nodeW + 5
    // Port-in:  left:-5px  → center at nodeX - 5
    const x1 = fp.x + fw + 5;
    const y1 = fp.y + fh / 2;
    const x2 = tp.x - 5;
    const y2 = tp.y + th / 2;
    const dist = Math.abs(x2 - x1);
    const cx1 = x1 + dist * 0.35;
    const cx2 = x2 - dist * 0.35;
    edgeSvg += `<path d="M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}"/>`;
    edgeSvg += `<circle class="edge-dot" cx="${x1}" cy="${y1}" r="5"/>`;
    edgeSvg += `<circle class="edge-dot" cx="${x2}" cy="${y2}" r="5"/>`;
  }
  if (_wfConnecting && _wfGhostEdge) {
    const fp = _wfNodePositions[_wfConnecting.fromId];
    if (fp) {
      const fw = _getNodeW(_wfConnecting.fromId);
      const fh = _getNodeH(_wfConnecting.fromId);
      const x1 = fp.x + fw + 5;
      const y1 = fp.y + fh / 2;
      const x2 = _wfGhostEdge.x;
      const y2 = _wfGhostEdge.y;
      const dist = Math.abs(x2 - x1);
      const cx1 = x1 + dist * 0.35;
      const cx2 = x2 - dist * 0.35;
      edgeSvg += `<path class="edge-ghost" d="M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}"/>`;
    }
  }
  svg.innerHTML = edgeSvg;
}

// --- Port / Edge drawing ---
function wfPortMouseDown(e, nodeId, portType) {
  e.stopPropagation();
  e.preventDefault();
  if (portType !== 'out') return;
  _wfConnecting = { fromId: nodeId };
  _wfGhostEdge = null;
  const area = document.getElementById('wf-canvas-area');

  const onMove = (ev) => {
    if (!_wfConnecting) return;
    const rect = document.getElementById('wf-canvas-transform').getBoundingClientRect();
    _wfGhostEdge = {
      x: (ev.clientX - rect.left) / _wfZoom,
      y: (ev.clientY - rect.top) / _wfZoom
    };
    _updateWfEdges();
  };
  const onUp = (ev) => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    if (!_wfConnecting) return;
    // Check if dropped on a node
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const nodeEl = el ? el.closest('.wf-abs-node') : null;
    if (nodeEl) {
      const targetId = nodeEl.id.replace('wf-node-', '');
      if (targetId !== _wfConnecting.fromId && !_wfEdges.some(e => e.from === _wfConnecting.fromId && e.to === targetId)) {
        _wfEdges.push({ from: _wfConnecting.fromId, to: targetId });
        _wfDirty = true;
        toast('已连接节点');
      }
    }
    _wfConnecting = null;
    _wfGhostEdge = null;
    _updateWfEdges();
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// --- Palette drag to create new node ---
function wfPaletteDragStart(e, type, icon, label, variant = '') {
  e.dataTransfer.setData('text/plain', JSON.stringify({ type, icon, label, variant }));
  e.dataTransfer.effectAllowed = 'copy';
}

function wfCanvasDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}

function wfCanvasDrop(e) {
  e.preventDefault();
  let data;
  try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
  if (!data || !data.type) return;

  const transform = document.getElementById('wf-canvas-transform');
  if (!transform) return;
  const rect = transform.getBoundingClientRect();
  const x = (e.clientX - rect.left) / _wfZoom;
  const y = (e.clientY - rect.top) / _wfZoom;

  const newId = 'nc' + (_wfNextId++);
  _wfNodePositions[newId] = { x, y };
  _wfNodeDefs[newId] = normalizeWfNodeDef({
    id: newId,
    type: data.type,
    variant: data.variant,
    label: data.label,
    icon: data.icon
  }, true);
  _wfDirty = true;
  _renderWfCanvas();
  toast('已添加新节点「' + _wfNodeDefs[newId].label + '」');
}

function selectWfNode(nodeId) {
  if (currentWorkflowNodeId === nodeId) {
    currentWorkflowNodeId = null;
  } else {
    currentWorkflowNodeId = nodeId;
  }
  _renderWfCanvas();
}

// --- Delete node ---
function _updateSaveAsBtn() {
  const btn = document.getElementById('wf-saveas-btn');
  if (!btn) return;
  if (_wfDirty) {
    btn.classList.remove('disabled');
    btn.onclick = wfShowSaveAs;
  } else {
    btn.classList.add('disabled');
    btn.onclick = null;
  }
}

function wfDeleteNode(nodeId) {
  const def = _wfNodeDefs[nodeId];
  if (!def) return;
  if (def.type === 'start') { toast('起始节点不可删除'); return; }
  delete _wfNodeDefs[nodeId];
  delete _wfNodePositions[nodeId];
  _wfEdges = _wfEdges.filter(e => e.from !== nodeId && e.to !== nodeId);
  if (currentWorkflowNodeId === nodeId) currentWorkflowNodeId = null;
  _wfDirty = true;
  _renderWfCanvas();
  toast('已删除节点「' + def.label + '」');
}

// --- Node right-click context menu ---
function wfNodeContextMenu(e, nodeId) {
  e.preventDefault();
  e.stopPropagation();
  const def = _wfNodeDefs[nodeId];
  if (!def) return;
  const cm = document.getElementById('context-menu');
  const isStart = def.type === 'start';
  cm.innerHTML = `
    <div class="cm-item" onclick="selectWfNode('${nodeId}');hideContextMenu();">⚙ 配置节点</div>
    <div class="cm-divider"></div>
    <div class="cm-item ${isStart ? 'disabled' : ''}" onclick="${isStart ? '' : "wfDeleteNode('" + nodeId + "');hideContextMenu();"}">🗑 删除节点</div>
  `;
  cm.style.left = e.clientX + 'px';
  cm.style.top = e.clientY + 'px';
  cm.classList.add('show');
}

// --- Keyboard shortcut: Delete/Backspace to remove selected node ---
document.addEventListener('keydown', function(e) {
  if (!currentWorkflowTemplateId || !currentWorkflowNodeId) return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    wfDeleteNode(currentWorkflowNodeId);
  }
});

// --- Save As modal ---
function wfShowSaveAs() {
  if (!_wfDirty) return;
  const wt = WORKFLOW_TEMPLATES.find(w => w.id === currentWorkflowTemplateId);
  const defaultName = wt ? wt.name + '（副本）' : '新工作流';
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');
  body.innerHTML = `
    <h3>另存为新工作流</h3>
    <p style="font-size:13px;color:#888;margin:-4px 0 16px;">工作流将保存至我的资源库和当前文件夹</p>
    <label>工作流名称</label>
    <input type="text" id="wf-save-name" value="${defaultName}" placeholder="输入名称...">
    <label>描述（可选）</label>
    <textarea id="wf-save-desc" placeholder="简要描述工作流用途..."></textarea>
    <label>是否共享</label>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
      <label class="toggle-switch" style="margin:0;">
        <input type="checkbox" id="wf-save-share" checked>
        <span class="toggle-slider"></span>
      </label>
      <span style="font-size:13px;color:#aaa;" id="wf-share-label">开启共享后，团队其他成员也可查看与使用</span>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="hideModal()">取消</button>
      <button class="btn btn-primary" onclick="wfSaveAs()">保存</button>
    </div>
  `;
  overlay.classList.add('show');
}

function wfSaveAs() {
  const name = document.getElementById('wf-save-name')?.value?.trim();
  if (!name) { toast('请输入工作流名称'); return; }
  const shared = document.getElementById('wf-save-share')?.checked;
  hideModal();
  _wfDirty = false;
  _renderWfCanvas();
  if (shared) {
    toast('已保存「' + name + '」到我的资源库，并已共享给团队');
  } else {
    toast('已保存「' + name + '」到我的资源库');
  }
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getWfNodeConfigDefaults(node) {
  if (node.type === 'start') {
    return { taskName: '', taskDescription: '' };
  }
  if (node.type === 'input') {
    if (getWfNodeVariant(node) === 'video') {
      return {
        inputMode: 'upload',
        videoUrl: ''
      };
    }
    return { copyContent: '' };
  }
  if (node.type === 'agent') {
    const variant = getWfNodeVariant(node);
    if (variant === 'script') {
      return {
        scriptInputText: '',
        scriptInputFiles: [],
        includeUpstream: true,
        contentType: '网赚类',
        voiceLanguage: '中文（简体）',
        videoDuration: '20s',
        scriptCount: '3',
        baseModel: 'Gemini 2.5 Pro',
        knowledgeBaseQuery: '',
        knowledgeBaseRefs: ['品牌知识库', '高转化历史脚本']
      };
    }
    if (variant === 'video') {
      return {
        videoModel: 'Grok',
        referenceImage: '',
        startFrameImage: '',
        endFrameImage: '',
        videoDescription: '',
        videoDuration: '10s',
        ratio: '9:16',
        videoCount: 1
      };
    }
    if (variant === 'understand') {
      return {
        inputMode: 'upload',
        videoUrl: '',
        extraContext: '',
        baseModel: 'Gemini 2.5 Pro'
      };
    }
    if (variant === 'translate') {
      return {
        translationSource: 'upstream',
        manualTranslationText: '',
        sourceLanguage: '自动检测',
        targetLanguages: ['英文'],
        translationStyle: '意译',
        baseModel: 'Gemini 2.5 Pro',
        translationLanguageConfigs: normalizeTranslationLanguageConfigs(['英文'], {})
      };
    }
    if (variant === 'extract') {
      return {
        materialType: 'video',
        extractTargets: ['台词 / 旁白'],
        outputLanguage: '保持原语言',
        includeTimestamps: false,
        baseModel: 'Gemini 2.5 Pro'
      };
    }
    if (variant === 'voice') {
      const scriptOptions = getWfScriptLibraryOptions();
      const defaultCategory = VOICE_LIBRARY[0] || { id: 'cn', voices: [] };
      return {
        voiceTextSource: 'library',
        selectedScript: scriptOptions[0] || '',
        voiceCategory: defaultCategory.id,
        voiceTone: defaultCategory.voices[0] || '',
        voiceSpeed: 1.0,
        voiceVolume: 1.0,
        voicePitch: 0,
        enableBackgroundMusic: false,
        backgroundMusicStyle: '无'
      };
    }
    if (variant === 'disclaimer') {
      return {
        disclaimerSource: 'history',
        selectedVideos: [WF_DISCLAIMER_HISTORY_VIDEOS[0]],
        disclaimerPreset: '',
        disclaimerText: '',
        disclaimerLanguage: '中文（简体）',
        disclaimerPosition: '底部居中',
        disclaimerFontSize: '中（3%，默认）',
        disclaimerColor: '#FFFFFF',
        disclaimerDuration: '全程显示（默认）'
      };
    }
  }
  if (node.type === 'output') {
    return {
      outputName: node.label,
      namingRule: '{产品名}_{日期}_{序号}',
      saveToLibrary: true,
      needsConfirmation: false,
      confirmNote: '请检查本节点产出物是否符合预期，确认后工作流将继续执行下游节点。'
    };
  }
  return {
    nodeName: node.label,
    nodeDescription: ''
  };
}

function syncWfVideoState(state) {
  if (!WORKFLOW_VIDEO_MODEL_CONFIG[state.videoModel]) {
    state.videoModel = 'Grok';
  }
  const modelConfig = WORKFLOW_VIDEO_MODEL_CONFIG[state.videoModel];
  if (!modelConfig.ratios.includes(state.ratio)) {
    state.ratio = modelConfig.ratios[0];
  }
  if (!modelConfig.durations.includes(state.videoDuration)) {
    state.videoDuration = modelConfig.durations[0];
  }
  delete state.grokApiProvider;
  delete state.resolution;
  return state;
}

function getWfNodeConfigState(node) {
  if (!_wfConfigState[node.id]) {
    _wfConfigState[node.id] = getWfNodeConfigDefaults(node);
  }
  if (node.type === 'agent' && getWfNodeVariant(node) === 'script') {
    _wfConfigState[node.id] = syncWfScriptState(node, _wfConfigState[node.id]);
  }
  if (node.type === 'agent' && getWfNodeVariant(node) === 'video') {
    _wfConfigState[node.id] = syncWfVideoState(_wfConfigState[node.id]);
  }
  if (node.type === 'agent' && getWfNodeVariant(node) === 'translate') {
    _wfConfigState[node.id] = syncWfTranslateState(_wfConfigState[node.id]);
  }
  return _wfConfigState[node.id];
}

function syncWfTranslateState(state) {
  if (!state) return state;
  state.targetLanguages = Array.isArray(state.targetLanguages) && state.targetLanguages.length
    ? [...new Set(state.targetLanguages)]
    : ['英文'];
  state.translationLanguageConfigs = normalizeTranslationLanguageConfigs(
    state.targetLanguages,
    state.translationLanguageConfigs,
    {
      marketBindings: state.marketCorpusBindings,
      customTerms: state.glossaryCustomBindings,
      fallbackMarketValue: state.marketCorpus,
      fallbackCustomTerms: state.glossary
    }
  );
  return state;
}

function hasWfUsableUpstream(nodeId) {
  return _wfEdges.some(edge => edge.to === nodeId && _wfNodeDefs[edge.from] && _wfNodeDefs[edge.from].type !== 'start');
}

function syncWfScriptState(node, state) {
  if (!node || !state) return state;
  if (!Array.isArray(state.scriptInputFiles)) state.scriptInputFiles = [];
  if (typeof state.scriptInputText !== 'string') state.scriptInputText = '';
  if (typeof state.includeUpstream !== 'boolean') state.includeUpstream = true;
  return state;
}

function _getUpstreamOutputCount(nodeId) {
  // Walk upstream edges to find the nearest agent node's output count
  const visited = new Set();
  const queue = [nodeId];
  while (queue.length) {
    const nid = queue.shift();
    if (visited.has(nid)) continue;
    visited.add(nid);
    const incomingEdges = _wfEdges.filter(e => e.to === nid);
    for (const edge of incomingEdges) {
      const upNode = _wfNodeDefs[edge.from];
      if (!upNode) continue;
      if (upNode.type === 'agent') {
        const upState = _wfConfigState[edge.from] || {};
        const variant = getWfNodeVariant(upNode);
        if (variant === 'script') return Number(upState.scriptCount) || 3;
        if (variant === 'video') return Number(upState.videoCount) || 1;
        if (variant === 'extract') return 1;
        return 1;
      }
      if (upNode.type === 'output') {
        queue.push(edge.from);
      }
    }
  }
  return null; // no upstream agent found
}

function setWfCfgValue(nodeId, key, value, rerender = false) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  state[key] = value;
  if (node.type === 'agent' && getWfNodeVariant(node) === 'script') {
    syncWfScriptState(node, state);
  }
  if (node.type === 'agent' && getWfNodeVariant(node) === 'video') {
    syncWfVideoState(state);
  }
  if (node.type === 'agent' && getWfNodeVariant(node) === 'translate') {
    syncWfTranslateState(state);
  }
  if (rerender) {
    _renderWfCanvas();
  }
}

function setWfCfgCountValue(nodeId, key, input, min, max, asNumber = false, rerender = false) {
  const value = normalizeIntegerInputValue(input, min, max);
  if (value == null) return;
  setWfCfgValue(nodeId, key, asNumber ? value : String(value), rerender);
}

function setWfCfgMultiOption(nodeId, key, value, checked, rerender = true) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  const currentValues = new Set(Array.isArray(state[key]) ? state[key] : []);
  if (checked) currentValues.add(value);
  else currentValues.delete(value);
  state[key] = [...currentValues];
  if (node.type === 'agent' && getWfNodeVariant(node) === 'translate') {
    syncWfTranslateState(state);
  }
  if (rerender) _renderWfCanvas();
}

function setWfCfgMultiAll(nodeId, key, values, checked) {
  setWfCfgValue(nodeId, key, checked ? [...values] : [], true);
}

function toggleWfCfgMulti(nodeId, key, value) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  const currentValues = new Set(Array.isArray(state[key]) ? state[key] : []);
  if (currentValues.has(value)) {
    if (currentValues.size === 1) return;
    currentValues.delete(value);
  } else {
    currentValues.add(value);
  }
  state[key] = [...currentValues];
  if (node.type === 'agent' && getWfNodeVariant(node) === 'translate') {
    syncWfTranslateState(state);
  }
  _renderWfCanvas();
}

function setWfTranslateLanguageConfig(nodeId, language, key, value) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  state.translationLanguageConfigs = normalizeTranslationLanguageConfigs(
    state.targetLanguages,
    state.translationLanguageConfigs,
    {
      marketBindings: state.marketCorpusBindings,
      customTerms: state.glossaryCustomBindings,
      fallbackMarketValue: state.marketCorpus,
      fallbackCustomTerms: state.glossary
    }
  );
  state.translationLanguageConfigs[language][key] = key === 'customTerms' ? normalizeTranslationCustomTerms(value) : value;
}

function renderWfTranslateLanguageConfigFields(nodeId, state) {
  const configs = normalizeTranslationLanguageConfigs(
    state.targetLanguages,
    state.translationLanguageConfigs,
    {
      marketBindings: state.marketCorpusBindings,
      customTerms: state.glossaryCustomBindings,
      fallbackMarketValue: state.marketCorpus,
      fallbackCustomTerms: state.glossary
    }
  );
  return renderTranslationLanguageConfigFields(state.targetLanguages, configs, `setWfTranslateLanguageConfig('${nodeId}','__LANG__','__KEY__', __VALUE__)`, { compact: true });
}

function renderWfChipGroup(nodeId, key, options, activeValue) {
  return `
    <div class="cfg-chips">
      ${options.map(option => `
        <div class="cfg-chip ${activeValue === option ? 'active' : ''}" onclick="setWfCfgValue('${nodeId}','${key}','${option}', true)">${option}</div>
      `).join('')}
    </div>
  `;
}

function renderWfMultiChipGroup(nodeId, key, options, activeValues) {
  const selected = Array.isArray(activeValues) ? activeValues : [];
  return `
    <div class="cfg-chips">
      ${options.map(option => `
        <div class="cfg-chip ${selected.includes(option) ? 'active' : ''}" onclick="toggleWfCfgMulti('${nodeId}','${key}','${option}')">${option}</div>
      `).join('')}
    </div>
  `;
}

function renderWfCardGroup(nodeId, key, options, activeValue) {
  return `
    <div class="cfg-card-grid">
      ${options.map(option => `
        <div class="cfg-card ${activeValue === option.value ? 'active' : ''}" onclick="setWfCfgValue('${nodeId}','${key}','${option.value}', true)">
          <strong>${option.title}</strong>
          <small>${option.description}</small>
        </div>
      `).join('')}
    </div>
  `;
}

function renderWfVariantCardGroup(nodeId, options, activeValue) {
  return `
    <div class="cfg-card-grid">
      ${options.map(option => `
        <div class="cfg-card ${activeValue === option.value ? 'active' : ''}" onclick="setWfNodeVariant('${nodeId}','${option.value}')">
          <strong>${option.title}</strong>
          <small>${option.description}</small>
        </div>
      `).join('')}
    </div>
  `;
}

function getWfScriptLibraryOptions() {
  if (typeof libraryScripts === 'undefined' || !Array.isArray(libraryScripts)) return [];
  return libraryScripts.flatMap(script => (script.files || []).map(file => `${script.name} / ${file}`));
}

function renderWfRadioList(nodeId, key, options, activeValue) {
  return `
    <div class="cfg-list">
      ${options.map(option => `
        <label>
          <input type="radio" name="${nodeId}-${key}" ${activeValue === option ? 'checked' : ''} onchange='setWfCfgValue("${nodeId}","${key}",${JSON.stringify(option)}, true)'>
          <span>${option}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function renderWfCheckboxList(nodeId, key, options, activeValues) {
  const selectedValues = Array.isArray(activeValues) ? activeValues : [];
  return `
    <div class="cfg-list">
      ${options.map(option => `
        <label>
          <input type="checkbox" ${selectedValues.includes(option) ? 'checked' : ''} onchange='toggleWfCfgMulti("${nodeId}","${key}",${JSON.stringify(option)})'>
          <span>${option}</span>
        </label>
      `).join('')}
    </div>
  `;
}

function getScriptUpstreamDisplayNode(nodeId) {
  const edge = _wfEdges.find(e => e.to === nodeId && _wfNodeDefs[e.from] && _wfNodeDefs[e.from].type !== 'start');
  return edge ? _wfNodeDefs[edge.from] : null;
}

function renderWfScriptSourceComposer(nodeId, state) {
  const upstreamNode = getScriptUpstreamDisplayNode(nodeId);
  const upstreamLabel = upstreamNode ? (upstreamNode.label || upstreamNode.name || '上游节点') : '';
  const upstream = upstreamLabel
    ? { label: upstreamLabel, active: state.includeUpstream !== false }
    : null;
  return renderScriptSourceComposer({
    text: state.scriptInputText || '',
    files: state.scriptInputFiles || [],
    upstream,
    textOninput: `setWfCfgValue('${nodeId}','scriptInputText',this.value)`,
    addFileCall: `addWfScriptFakeFile('${nodeId}')`,
    removeFileCall: `removeWfScriptFakeFile('${nodeId}','__ID__')`,
    removeUpstreamCall: `setWfScriptIncludeUpstream('${nodeId}', false)`,
    restoreUpstreamCall: `setWfScriptIncludeUpstream('${nodeId}', true)`,
    dropCall: `handleWfScriptDrop(event, this, '${nodeId}')`
  });
}

function addWfScriptFakeFile(nodeId) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  if (!Array.isArray(state.scriptInputFiles)) state.scriptInputFiles = [];
  toast('选择文件（原型演示）');
  const existing = state.scriptInputFiles.map(f => f.name);
  const next = pickNextFakeScriptFile(existing);
  state.scriptInputFiles.push({ id: `f${++_scriptFileIdSeq}`, name: next.name, icon: next.icon });
  _renderWfCanvas();
}

function removeWfScriptFakeFile(nodeId, fileId) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  state.scriptInputFiles = (state.scriptInputFiles || []).filter(f => f.id !== fileId);
  _renderWfCanvas();
}

function setWfScriptIncludeUpstream(nodeId, value) {
  setWfCfgValue(nodeId, 'includeUpstream', value, true);
}

function handleWfScriptDrop(event, el, nodeId) {
  event.preventDefault();
  el.classList.remove('script-composer--drag');
  addWfScriptFakeFile(nodeId);
}

function setWfVoiceCategory(nodeId, categoryId) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  const nextCategory = VOICE_LIBRARY.find(category => category.id === categoryId);
  state.voiceCategory = categoryId;
  if (nextCategory && !nextCategory.voices.includes(state.voiceTone)) {
    state.voiceTone = nextCategory.voices[0] || '';
  }
  _renderWfCanvas();
}

function setWfDisclaimerPreset(nodeId, presetText) {
  const node = _wfNodeDefs[nodeId];
  if (!node) return;
  const state = getWfNodeConfigState(node);
  state.disclaimerPreset = presetText;
  state.disclaimerText = presetText;
  _renderWfCanvas();
}

function getWfNodeConfigTitle(node) {
  if (node.type === 'start') return '任务配置（起始节点）';
  if (node.type === 'input' || node.type === 'agent') {
    const meta = getWfVariantMeta(node);
    return meta ? meta.configTitle : node.label;
  }
  if (node.type === 'output') return '产出物节点';
  return node.label;
}

function renderWfNodeConfig(node, wt) {
  const state = getWfNodeConfigState(node);
  const variant = getWfNodeVariant(node);
  let fields = '';

  if (node.type === 'start') {
    fields = `
      <div class="cfg-row">
        <div class="cfg-label">任务名称</div>
        <input type="text" value="${escapeHtml(state.taskName)}" placeholder="如：消除游戏-0330-多语言" oninput="setWfCfgValue('${node.id}','taskName',this.value)">
        <small class="cfg-help">为本次工作流执行实例命名。</small>
      </div>
      <div class="cfg-row">
        <div class="cfg-label">任务描述</div>
        <textarea placeholder="本次执行的背景说明（可选）" oninput="setWfCfgValue('${node.id}','taskDescription',this.value)">${escapeHtml(state.taskDescription)}</textarea>
      </div>
    `;
  } else if (node.type === 'input') {
    fields = `
      <div class="cfg-row">
        <div class="cfg-label">输入类型</div>
        ${renderWfVariantCardGroup(node.id, WF_INPUT_VARIANT_OPTIONS, variant)}
      </div>
    `;
    if (variant === 'copy') {
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">文案内容</div>
          <textarea placeholder="直接输入要用于视频生成的文案内容..." oninput="setWfCfgValue('${node.id}','copyContent',this.value)">${escapeHtml(state.copyContent)}</textarea>
        </div>
      `;
    } else {
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">视频输入方式</div>
          <div class="tab-switch" style="margin-bottom:12px;">
            <div class="tab-switch-item ${state.inputMode === 'upload' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','inputMode','upload', true)">上传文件</div>
            <div class="tab-switch-item ${state.inputMode === 'url' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','inputMode','url', true)">视频 URL</div>
          </div>
          ${state.inputMode === 'upload' ? `
            <div class="cfg-upload" onclick="toast('上传视频文件（原型演示）')">上传文件（MP4 / MOV，≤ 500MB）</div>
          ` : `
            <input type="url" value="${escapeHtml(state.videoUrl)}" placeholder="输入直链 MP4 视频 URL" oninput="setWfCfgValue('${node.id}','videoUrl',this.value)">
          `}
        </div>
      `;
    }
  } else if (node.type === 'agent') {
    fields = `
      <div class="cfg-row">
        <div class="cfg-label">Agent 类型</div>
        <select onchange="setWfNodeVariant('${node.id}',this.value)">
          ${WF_AGENT_VARIANT_OPTIONS.map(option => `<option value="${option.value}" ${variant === option.value ? 'selected' : ''}>${option.title}</option>`).join('')}
        </select>
      </div>
    `;

    if (variant === 'script') {
      const filteredKnowledgeBaseOptions = SCRIPT_KNOWLEDGE_BASE_OPTIONS.filter(option =>
        option.includes((state.knowledgeBaseQuery || '').trim())
      );
      const selectedKnowledgeBaseRefs = Array.isArray(state.knowledgeBaseRefs) ? state.knowledgeBaseRefs : [];
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">脚本素材</div>
          ${renderWfScriptSourceComposer(node.id, state)}
          <small class="cfg-help">支持创意描述、分析报告、参考脚本任意组合；文件拖入或点 📎 即可，agent 自行识别。</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">内容类型</div>
          ${renderWfChipGroup(node.id, 'contentType', ['网赚类', '非网赚类'], state.contentType)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">配音语言</div>
          <select onchange="setWfCfgValue('${node.id}','voiceLanguage',this.value)">
            ${LANGUAGES.map(language => `<option value="${language}" ${state.voiceLanguage === language ? 'selected' : ''}>${language}</option>`).join('')}
          </select>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">视频时长</div>
          ${renderWfChipGroup(node.id, 'videoDuration', ['10s', '15s', '20s', '30s'], state.videoDuration)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">脚本数量</div>
          <input type="number" min="1" max="20" step="1" value="${escapeHtml(state.scriptCount)}" oninput="setWfCfgCountValue('${node.id}','scriptCount',this,1,20,false,true)">
          <small class="cfg-help">默认 5，范围 1 - 20。</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">底层模型</div>
          ${renderWfChipGroup(node.id, 'baseModel', GEMINI_BASE_MODELS, state.baseModel)}
          <small class="cfg-help">默认-Gemini 2.5 Pro</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">知识库参考</div>
          <input type="text" value="${escapeHtml(state.knowledgeBaseQuery || '')}" placeholder="关键词搜索知识库示例..." oninput="setWfCfgValue('${node.id}','knowledgeBaseQuery',this.value, true)">
          <div class="cfg-switch-row" style="margin-top:10px;">
            <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#ddd;">
              <input type="checkbox" ${selectedKnowledgeBaseRefs.length === SCRIPT_KNOWLEDGE_BASE_OPTIONS.length ? 'checked' : ''} onchange='setWfCfgMultiAll("${node.id}","knowledgeBaseRefs",${JSON.stringify(SCRIPT_KNOWLEDGE_BASE_OPTIONS)},this.checked)'>
              <span>全选</span>
            </label>
          </div>
          <div class="cfg-list" style="margin-top:8px;">
            ${(filteredKnowledgeBaseOptions.length ? filteredKnowledgeBaseOptions : ['未找到匹配项']).map(option => (
              option === '未找到匹配项'
                ? `<div style="font-size:12px; color:#666;">${option}</div>`
                : `<label>
                    <input type="checkbox" ${selectedKnowledgeBaseRefs.includes(option) ? 'checked' : ''} onchange='setWfCfgMultiOption("${node.id}","knowledgeBaseRefs",${JSON.stringify(option)},this.checked)'>
                    <span>${option}</span>
                  </label>`
            )).join('')}
          </div>
          <small class="cfg-help">从知识库中选择历史优质脚本作为 Few-shot 示例，引导 Gemini 模仿其风格和结构；支持关键词搜索，可全选。</small>
        </div>
      `;
    } else if (variant === 'video') {
      const modelConfig = WORKFLOW_VIDEO_MODEL_CONFIG[state.videoModel] || WORKFLOW_VIDEO_MODEL_CONFIG['Grok'];
      const durations = modelConfig.durations;
      const videoCount = Number(state.videoCount || 1);

      fields += `
        <div class="cfg-row">
          <div class="cfg-label">视频模型</div>
          ${renderWfCardGroup(node.id, 'videoModel', [
            { value: 'Grok', title: 'Grok', description: 'xAI，支持多时长' },
            { value: 'Veo 3.1', title: 'Veo 3.1', description: 'Google，支持长视频' }
          ], state.videoModel)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">视频时长</div>
          ${renderWfChipGroup(node.id, 'videoDuration', durations, state.videoDuration)}
        </div>
        ${state.videoModel === 'Veo 3.1' ? `
          <div class="cfg-row">
            <div class="cfg-label">起始帧图片</div>
            <div class="cfg-upload" onclick="toast('上传起始帧图片（原型演示）')">上传起始帧图片（JPG / PNG，最大 10MB）</div>
          </div>
          <div class="cfg-row">
            <div class="cfg-label">结束帧图片</div>
            <div class="cfg-upload" onclick="toast('上传结束帧图片（原型演示）')">上传结束帧图片（JPG / PNG，最大 10MB）</div>
          </div>
        ` : ''}
        <div class="cfg-row">
          <div class="cfg-label">参考图片</div>
          <div class="cfg-upload" onclick="toast('上传参考图片（原型演示）')">${state.videoModel === 'Veo 3.1' ? '上传参考图片，作为整体视觉风格参考' : '上传后应用到视频生成，通常上传产品图或品牌素材'}</div>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">视频描述</div>
          <textarea placeholder="${state.videoModel === 'Grok' ? '建议 50 ~ 300 字，英文效果最佳；描述视频画面内容、人物动作、场景氛围等...' : '建议 50 ~ 500 字，英文效果最佳；描述视频画面内容、场景、动作和氛围...'}" oninput="setWfCfgValue('${node.id}','videoDescription',this.value)">${escapeHtml(state.videoDescription || '')}</textarea>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">画面比例</div>
          ${renderWfChipGroup(node.id, 'ratio', modelConfig.ratios, state.ratio)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">每条输入的生成数量</div>
          <input type="number" min="1" max="4" step="1" value="${videoCount}" oninput="setWfCfgCountValue('${node.id}','videoCount',this,1,4,true,true)">
          ${(() => {
            const upCount = _getUpstreamOutputCount(node.id);
            if (upCount && upCount > 1) {
              const total = upCount * videoCount;
              return '<small class="cfg-help">上游共 ' + upCount + ' 条产出物，每条生成 ' + videoCount + ' 个视频，预计总产出 <b style="color:#a78bfa;">' + total + '</b> 个视频。</small>';
            }
            return '<small class="cfg-help">对上游每条产出物各生成该数量的视频。如上游有 3 条脚本且此处设为 2，则总产出 3 × 2 = 6 个视频。</small>';
          })()}
        </div>
      `;
    } else if (variant === 'understand') {
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">视频输入方式</div>
          <div class="tab-switch" style="margin-bottom:12px;">
            <div class="tab-switch-item ${state.inputMode === 'upload' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','inputMode','upload', true)">上传文件</div>
            <div class="tab-switch-item ${state.inputMode === 'url' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','inputMode','url', true)">视频 URL</div>
          </div>
          ${state.inputMode === 'upload' ? `
            <div class="cfg-upload" onclick="toast('上传视频文件（原型演示）')">上传文件（MP4 / MOV，≤ 500MB）</div>
          ` : `
            <input type="url" value="${escapeHtml(state.videoUrl)}" placeholder="输入直链 MP4 视频 URL" oninput="setWfCfgValue('${node.id}','videoUrl',this.value)">
          `}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">额外上下文</div>
          <textarea placeholder="补充视频背景信息..." oninput="setWfCfgValue('${node.id}','extraContext',this.value)">${escapeHtml(state.extraContext)}</textarea>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">底层模型</div>
          ${renderWfChipGroup(node.id, 'baseModel', GEMINI_BASE_MODELS, state.baseModel)}
          <small class="cfg-help">默认-Gemini 2.5 Pro</small>
        </div>
      `;
    } else if (variant === 'translate') {
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">翻译内容来源</div>
          <div class="tab-switch" style="margin-bottom:12px;">
            <div class="tab-switch-item ${state.translationSource === 'upstream' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','translationSource','upstream', true)">沿用上游节点</div>
            <div class="tab-switch-item ${state.translationSource === 'manual' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','translationSource','manual', true)">手动输入</div>
          </div>
          ${state.translationSource === 'manual'
            ? `<textarea placeholder="粘贴需要翻译的文本内容，最多 2000 字..." oninput="setWfCfgValue('${node.id}','manualTranslationText',this.value)">${escapeHtml(state.manualTranslationText || '')}</textarea>`
            : ''}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">源语言</div>
          <select onchange="setWfCfgValue('${node.id}','sourceLanguage',this.value)">
            ${['自动检测', ...LANGUAGES].map(language => `<option value="${language}" ${state.sourceLanguage === language ? 'selected' : ''}>${language}</option>`).join('')}
          </select>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">目标语言</div>
          ${renderWfMultiChipGroup(node.id, 'targetLanguages', TRANSLATION_TARGETS, state.targetLanguages)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">翻译风格</div>
          ${renderWfChipGroup(node.id, 'translationStyle', ['直译', '意译', '广告文案'], state.translationStyle)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">底层模型</div>
          ${renderWfChipGroup(node.id, 'baseModel', GEMINI_BASE_MODELS, state.baseModel)}
          <small class="cfg-help">默认-Gemini 2.5 Pro</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">语言级配置</div>
          ${renderWfTranslateLanguageConfigFields(node.id, state)}
          <small class="cfg-help">为每个目标语言分别设置市场语料和术语表。</small>
        </div>
      `;
    } else if (variant === 'extract') {
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">素材类型</div>
          <div class="tab-switch" style="margin-bottom:12px;">
            <div class="tab-switch-item ${state.materialType === 'video' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','materialType','video', true)">视频</div>
            <div class="tab-switch-item ${state.materialType === 'image' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','materialType','image', true)">图片</div>
          </div>
          ${state.materialType === 'video'
            ? '<div class="cfg-upload" onclick="toast(\'上传视频素材（原型演示）\')">点击上传视频素材（MP4 / MOV，≤ 500MB）</div>'
            : '<div class="cfg-upload" onclick="toast(\'上传图片素材（原型演示）\')">点击上传图片素材（JPG / PNG，≤ 5MB，最多 10 张）</div>'}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">提取内容</div>
          ${renderWfMultiChipGroup(node.id, 'extractTargets', ['台词 / 旁白', '字幕文字', '画面中的文字', '标题', '标语'], state.extractTargets)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">输出语言</div>
          <select onchange="setWfCfgValue('${node.id}','outputLanguage',this.value)">
            ${['保持原语言', ...LANGUAGES].map(language => `<option value="${language}" ${state.outputLanguage === language ? 'selected' : ''}>${language}</option>`).join('')}
          </select>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">时间戳输出</div>
          <div class="cfg-switch-row">
            <label class="toggle-switch">
              <input type="checkbox" ${state.includeTimestamps ? 'checked' : ''} onchange="setWfCfgValue('${node.id}','includeTimestamps',this.checked)">
              <span class="toggle-slider"></span>
            </label>
            <span style="font-size:12px;color:#888;">开启后每段台词附带起止时间戳，格式 [00:03-00:08]，默认关闭。</span>
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">底层模型</div>
          ${renderWfChipGroup(node.id, 'baseModel', ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'], state.baseModel)}
        </div>
      `;
    } else if (variant === 'voice') {
      const scriptOptions = getWfScriptLibraryOptions();
      const activeVoiceCategory = VOICE_LIBRARY.find(category => category.id === state.voiceCategory) || VOICE_LIBRARY[0];
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">配音文本来源</div>
          <div class="tab-switch" style="margin-bottom:12px;">
            <div class="tab-switch-item ${state.voiceTextSource === 'library' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','voiceTextSource','library', true)">从脚本库选择</div>
            <div class="tab-switch-item ${state.voiceTextSource === 'manual' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','voiceTextSource','manual', true)">手动输入</div>
          </div>
          ${state.voiceTextSource === 'library'
            ? (scriptOptions.length
              ? renderWfRadioList(node.id, 'selectedScript', scriptOptions, state.selectedScript)
              : '<small class="cfg-help">当前脚本库暂无可用脚本。</small>')
            : `<textarea placeholder="粘贴需要配音的台词内容，最多 5000 字符；支持 <#1.5#> 停顿标记语法" oninput="setWfCfgValue('${node.id}','manualVoiceText',this.value)">${escapeHtml(state.manualVoiceText || '')}</textarea>`}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">语言 / 音色分类</div>
          <select onchange="setWfVoiceCategory('${node.id}',this.value)">
            ${VOICE_LIBRARY.map(category => `<option value="${category.id}" ${state.voiceCategory === category.id ? 'selected' : ''}>${category.label}</option>`).join('')}
          </select>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">音色</div>
          <select onchange="setWfCfgValue('${node.id}','voiceTone',this.value)">
            ${(activeVoiceCategory?.voices || []).map(voice => `<option value="${voice}" ${state.voiceTone === voice ? 'selected' : ''}>${voice}</option>`).join('')}
          </select>
          <small class="cfg-help">共 22 种语言，80+ 个音色；先切换分类，再选择具体音色。</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">语速</div>
          <input type="range" min="0.5" max="2" step="0.1" value="${Number(state.voiceSpeed).toFixed(1)}" oninput="setWfCfgValue('${node.id}','voiceSpeed',Number(this.value));this.nextElementSibling.textContent=Number(this.value).toFixed(1)+'x'">
          <small class="cfg-help">${Number(state.voiceSpeed).toFixed(1)}x</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">音量</div>
          <input type="range" min="0.1" max="1" step="0.1" value="${Number(state.voiceVolume).toFixed(1)}" oninput="setWfCfgValue('${node.id}','voiceVolume',Number(this.value));this.nextElementSibling.textContent=Number(this.value).toFixed(1)">
          <small class="cfg-help">${Number(state.voiceVolume).toFixed(1)}</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">语调</div>
          <input type="range" min="-12" max="12" step="1" value="${Number(state.voicePitch)}" oninput="setWfCfgValue('${node.id}','voicePitch',Number(this.value));this.nextElementSibling.textContent=this.value">
          <small class="cfg-help">${Number(state.voicePitch)}</small>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">背景音乐</div>
          <div class="cfg-switch-row">
            <label class="toggle-switch">
              <input type="checkbox" ${state.enableBackgroundMusic ? 'checked' : ''} onchange="setWfCfgValue('${node.id}','enableBackgroundMusic',this.checked, true)">
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        ${state.enableBackgroundMusic ? `
          <div class="cfg-row">
            <div class="cfg-label">背景音乐风格</div>
            <select onchange="setWfCfgValue('${node.id}','backgroundMusicStyle',this.value)">
              ${BACKGROUND_MUSIC_STYLES.map(style => `<option value="${style}" ${state.backgroundMusicStyle === style ? 'selected' : ''}>${style}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      `;
    } else if (variant === 'disclaimer') {
      fields += `
        <div class="cfg-row">
          <div class="cfg-label">视频来源</div>
          <div class="tab-switch" style="margin-bottom:12px;">
            <div class="tab-switch-item ${state.disclaimerSource === 'history' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','disclaimerSource','history', true)">从生成历史选择</div>
            <div class="tab-switch-item ${state.disclaimerSource === 'upload' ? 'active' : ''}" onclick="setWfCfgValue('${node.id}','disclaimerSource','upload', true)">上传视频文件</div>
          </div>
          ${state.disclaimerSource === 'history'
            ? renderWfCheckboxList(node.id, 'selectedVideos', WF_DISCLAIMER_HISTORY_VIDEOS, state.selectedVideos)
            : '<div class="cfg-upload" onclick="toast(\'选择视频文件（原型演示）\')">点击上传视频文件，支持批量上传，最多 10 个文件</div>'}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">警示语内容</div>
          <div class="cfg-chips">
            ${DISCLAIMER_PRESETS.map(preset => `
              <div class="cfg-chip ${state.disclaimerPreset === preset.value ? 'active' : ''}" onclick='setWfDisclaimerPreset("${node.id}",${JSON.stringify(preset.value)})'>${preset.label}</div>
            `).join('')}
          </div>
          <textarea placeholder="手动输入警示语，或从预设模板中选择..." oninput="setWfCfgValue('${node.id}','disclaimerText',this.value)">${escapeHtml(state.disclaimerText)}</textarea>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">语言</div>
          <select onchange="setWfCfgValue('${node.id}','disclaimerLanguage',this.value)">
            ${DISCLAIMER_LANGUAGES.map(language => `<option value="${language}" ${state.disclaimerLanguage === language ? 'selected' : ''}>${language}</option>`).join('')}
          </select>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">显示位置</div>
          ${renderWfChipGroup(node.id, 'disclaimerPosition', ['底部居中', '底部左侧', '底部右侧', '顶部居中'], state.disclaimerPosition)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">字体大小</div>
          ${renderWfChipGroup(node.id, 'disclaimerFontSize', ['小（视频宽度 2%）', '中（3%，默认）', '大（4%）'], state.disclaimerFontSize)}
        </div>
        <div class="cfg-row">
          <div class="cfg-label">字体颜色</div>
          <div style="display:flex; gap:10px; align-items:center;">
            <input type="color" value="${escapeHtml(state.disclaimerColor)}" style="width:48px; height:40px; padding:0; border:none; background:transparent;" oninput="setWfCfgValue('${node.id}','disclaimerColor',this.value);this.nextElementSibling.value=this.value.toUpperCase();">
            <input type="text" value="${escapeHtml(state.disclaimerColor)}" oninput="setWfCfgValue('${node.id}','disclaimerColor',this.value)" style="margin-bottom:0;">
          </div>
        </div>
        <div class="cfg-row">
          <div class="cfg-label">显示时长</div>
          ${renderWfChipGroup(node.id, 'disclaimerDuration', ['全程显示（默认）', '仅最后 3s', '仅最后 5s'], state.disclaimerDuration)}
        </div>
      `;
    }
  } else if (node.type === 'output') {
    fields = `
      <div class="cfg-row">
        <div class="cfg-label">当前产出物类型</div>
        <div style="font-size:13px; color:#c8c8d0; padding:4px 0 10px;">${inferWfOutputType(node.id)}</div>
        <small class="cfg-help">根据上游连入节点自动判断；未连线时显示为未指定。</small>
      </div>
      <div class="cfg-row">
        <div class="cfg-label">产出物名称</div>
        <input type="text" value="${escapeHtml(state.outputName)}" placeholder="如：广告视频 / 多语言脚本" oninput="setWfCfgValue('${node.id}','outputName',this.value)">
      </div>
      <div class="cfg-row">
        <div class="cfg-label">命名规则</div>
        <input type="text" value="${escapeHtml(state.namingRule)}" oninput="setWfCfgValue('${node.id}','namingRule',this.value)">
        <small class="cfg-help">支持变量：{产品名}_{日期}_{序号}，如 消除游戏_20260330_001。</small>
      </div>
      <div class="cfg-row">
        <div class="cfg-label">保存到任务中心</div>
        <div class="cfg-switch-row">
          <label class="toggle-switch">
            <input type="checkbox" ${state.saveToLibrary ? 'checked' : ''} onchange="setWfCfgValue('${node.id}','saveToLibrary',this.checked)">
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size:12px;color:#888;">默认开启，完成后自动归档到任务中心。</span>
        </div>
      </div>
      <div class="cfg-row">
        <div class="wf-confirm-block">
          <div class="wcb-head">
            <div class="wcb-title">⏸ 中断确认</div>
            <label class="toggle-switch" style="margin:0;">
              <input type="checkbox" ${state.needsConfirmation ? 'checked' : ''} onchange="setWfCfgValue('${node.id}','needsConfirmation',this.checked, true)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="wcb-desc">开启后，本节点产出物生成完成时工作流将自动暂停，在任务中心生成「待确认」任务。你确认通过后才会继续执行下游节点；不合适时可选择全部或部分重新生成。适用于脚本、分析报告等需要人工把关的关键产出物。</div>
          ${state.needsConfirmation ? `
            <div style="font-size:12px; color:#c8c8d0; margin-bottom:6px;">确认提示语（将展示在任务确认面板）</div>
            <textarea placeholder="请检查本节点产出物是否符合预期..." oninput="setWfCfgValue('${node.id}','confirmNote',this.value)">${escapeHtml(state.confirmNote || '')}</textarea>
          ` : ''}
        </div>
      </div>
    `;
  } else {
    fields = `
      <div class="cfg-row">
        <div class="cfg-label">节点名称</div>
        <input type="text" value="${escapeHtml(state.nodeName)}" oninput="setWfCfgValue('${node.id}','nodeName',this.value)">
      </div>
      <div class="cfg-row">
        <div class="cfg-label">节点描述</div>
        <textarea oninput="setWfCfgValue('${node.id}','nodeDescription',this.value)">${escapeHtml(state.nodeDescription)}</textarea>
      </div>
    `;
  }

  return `
    <div class="wf-config-header">
      <h3>${getWfNodeConfigTitle(node)}</h3>
      <button class="close-btn" onclick="selectWfNode('${node.id}')">✕</button>
    </div>
    <div class="wf-config-body">
      ${fields}
    </div>
    <div class="wf-config-footer">
      <button class="btn-confirm" onclick="confirmWfNodeConfig('${node.id}')">确认配置</button>
      ${node.type !== 'start' ? '<button class="btn-delete-node" onclick="wfDeleteNode(\'' + node.id + '\')">🗑 删除节点</button>' : ''}
    </div>
  `;
}

function confirmWfNodeConfig(nodeId) {
  _wfCanvasConfigured.add(nodeId);
  currentWorkflowNodeId = null;
  _renderWfCanvas();
  toast('节点配置已保存');
}

function toggleWfGlobalConfirm(enabled) {
  _wfGlobalConfirmEnabled = !!enabled;
  _renderWfCanvas();
  toast(_wfGlobalConfirmEnabled
    ? '已启用中断确认：按节点配置执行'
    : '已关闭中断确认：本次运行将跳过所有节点级确认');
}

function runWorkflow(templateId) {
  const wt = WORKFLOW_TEMPLATES.find(w => w.id === templateId);
  if (wt && !_wfCanvasConfigured.has('n1')) {
    currentWorkflowNodeId = 'n1';
    _renderWfCanvas();
    toast('请先配置任务信息');
    return;
  }
  const confirmNodes = Object.entries(_wfConfigState)
    .filter(([nid, st]) => _wfNodeDefs[nid] && _wfNodeDefs[nid].type === 'output' && st && st.needsConfirmation)
    .map(([nid]) => _wfNodeDefs[nid].label);
  closeWfCanvas();
  if (!_wfGlobalConfirmEnabled) {
    if (confirmNodes.length) {
      toast('✅ 工作流已启动（中断确认已全局关闭，' + confirmNodes.length + ' 个节点的确认将被跳过）');
    } else {
      toast('✅ 工作流「' + (wt ? wt.name : '') + '」已开始运行（原型演示）');
    }
    return;
  }
  if (confirmNodes.length) {
    toast('✅ 工作流已启动，共 ' + confirmNodes.length + ' 个节点开启了中断确认，到达时将在任务中心生成「待确认」任务');
  } else {
    toast('✅ 工作流「' + (wt ? wt.name : '') + '」已开始运行（原型演示）');
  }
}
