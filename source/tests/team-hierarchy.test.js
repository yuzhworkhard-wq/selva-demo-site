const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-selva-app.test-helper');

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

test('superadmin sees four first-level business options', () => {
  const app = loadApp();
  const superadmin = app.getUsers().find(user => user.role === 'superadmin');
  app.setCurrentUserById(superadmin.id);

  const options = normalize(app.call('getScopedBusinessFilterOptions').map(item => item.v));

  assert.deepEqual(options, ['all', 'overseas-ent', 'local-ent', 'overseas-tool', 'local-tool']);
});

test('manager only sees a and b filters', () => {
  const app = loadApp();
  app.setCurrentUserById('u5');

  const options = normalize(app.call('getScopedBusinessFilterOptions').map(item => item.v));

  assert.deepEqual(options, ['all', 'a', 'b']);
});

test('organization path uses business and subgroup labels', () => {
  const app = loadApp();
  const users = app.getUsers();

  assert.equal(app.call('getUserOrgPath', users.find(user => user.id === 'u5')), '出海互娱 / 经理');
  assert.equal(app.call('getUserOrgPath', users.find(user => user.id === 'u4')), '出海互娱 / a类');
});

test('manager can edit only own scope members and leaders cannot edit members', () => {
  const app = loadApp();
  const users = app.getUsers();
  const manager = users.find(user => user.id === 'u5');
  const sameScopeMember = users.find(user => user.id === 'u4');
  const otherScopeMember = users.find(user => user.id === 'u7');
  const leader = users.find(user => user.id === 'u2');

  assert.equal(app.call('canEditMember', manager, sameScopeMember), true);
  assert.equal(app.call('canEditMember', manager, otherScopeMember), false);
  assert.equal(app.call('canEditMember', leader, sameScopeMember), false);
  assert.equal(app.call('canChangeMemberRole', manager, sameScopeMember), false);
  assert.equal(app.call('canChangeMemberRole', users.find(user => user.id === 'u1'), sameScopeMember), true);
});

test('data center visibility follows hierarchy scope', () => {
  const app = loadApp();
  const users = app.getUsers();

  const managerVisibleIds = normalize([...app.call('getVisibleDataCenterUserIds', users.find(user => user.id === 'u5'))].sort());
  const leaderVisibleIds = normalize([...app.call('getVisibleDataCenterUserIds', users.find(user => user.id === 'u2'))].sort());
  const memberVisibleIds = normalize([...app.call('getVisibleDataCenterUserIds', users.find(user => user.id === 'u4'))].sort());

  assert.deepEqual(managerVisibleIds, ['u2', 'u4', 'u6', 'u8']);
  assert.deepEqual(leaderVisibleIds, ['u4', 'u6']);
  assert.deepEqual(memberVisibleIds, ['u4']);
});

test('manager data center list is scoped by hierarchy and subgroup filter', () => {
  const app = loadApp();
  app.setCurrentUserById('u5');
  app.eval("dataCenterFilter = { q:'', media:'all', business:'all', industry:'all', client:'all', product:'all', person:'all', createdFrom:'', createdTo:'', publishFrom:'', publishTo:'', publishQuick:'' };");

  const visibleUploaders = normalize([...new Set(app.call('getDcFilteredVideos').map(video => video.uploader))].sort());
  assert.deepEqual(visibleUploaders, ['u2', 'u4', 'u6', 'u8']);

  app.eval("dataCenterFilter.business = 'a';");
  const subgroupAUploaders = normalize([...new Set(app.call('getDcFilteredVideos').map(video => video.uploader))].sort());
  assert.deepEqual(subgroupAUploaders, ['u2', 'u4', 'u6']);
});

test('organization view is scoped by current user role', () => {
  const app = loadApp();
  const users = app.getUsers();

  const superadminBusinesses = normalize(app.call('getVisibleOrganizationBusinessIds', users.find(user => user.id === 'u1')));
  const managerBusinesses = normalize(app.call('getVisibleOrganizationBusinessIds', users.find(user => user.id === 'u5')));
  const leaderBusinesses = normalize(app.call('getVisibleOrganizationBusinessIds', users.find(user => user.id === 'u2')));
  const managerCounts = normalize(app.call('getManagerScopeSubgroupCounts', 'mgr-u5'));

  assert.deepEqual(superadminBusinesses, ['overseas-ent', 'local-ent', 'overseas-tool', 'local-tool']);
  assert.deepEqual(managerBusinesses, ['overseas-ent']);
  assert.deepEqual(leaderBusinesses, ['overseas-ent']);
  assert.deepEqual(managerCounts, { a: 3, b: 1 });
});

test('all roles can open team settings and member action mode follows permissions', () => {
  const app = loadApp();
  const users = app.getUsers();
  const superadmin = users.find(user => user.id === 'u1');
  const manager = users.find(user => user.id === 'u5');
  const leader = users.find(user => user.id === 'u2');
  const member = users.find(user => user.id === 'u4');
  const otherScopeMember = users.find(user => user.id === 'u7');

  assert.equal(normalize(app.call('getSettingsNavItems', superadmin)).some(item => item.id === 'team'), true);
  assert.equal(normalize(app.call('getSettingsNavItems', leader)).some(item => item.id === 'team'), true);
  assert.equal(normalize(app.call('getSettingsNavItems', member)).some(item => item.id === 'team'), true);
  assert.deepEqual(normalize(app.call('getSettingsTeamTabs').map(item => item.label)), ['成员', '业务']);

  assert.equal(app.call('getMemberActionMode', superadmin, member), 'role-only');
  assert.equal(app.call('getMemberActionMode', manager, member), 'readonly');
  assert.equal(app.call('getMemberActionMode', leader, member), 'readonly');
  assert.equal(app.call('getBusinessMemberActionMode', manager, member), 'assignment');
  assert.equal(app.call('getBusinessMemberActionMode', manager, otherScopeMember), 'readonly');
});

test('business detail rows expose editable members only inside allowed scope', () => {
  const app = loadApp();
  const users = app.getUsers();
  const managerRows = normalize(app.call('getBusinessDetailRows', users.find(user => user.id === 'u5'), 'overseas-ent'));
  const superadminRows = normalize(app.call('getBusinessDetailRows', users.find(user => user.id === 'u1'), 'overseas-ent'));

  assert.equal(managerRows.some(row => row.userId === 'u4' && row.editable === true), true);
  assert.equal(managerRows.some(row => row.userId === 'u7' && row.editable === true), false);
  assert.equal(superadminRows.some(row => row.userId === 'u5' && row.editable === true), true);
});

test('superadmin invited users stay unassigned until business placement happens', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');

  app.eval(`
    document.getElementById('m-iemail').value = 'new-member@company.com';
    document.getElementById('m-iname').value = '新成员';
    document.getElementById('m-irole').value = 'member';
  `);

  app.call('inviteMember');

  const newUser = app.getUsers().find(user => user.email === 'new-member@company.com');
  assert.equal(newUser.businessId, '');
  assert.equal(newUser.managerScopeId, '');
  assert.equal(newUser.subgroupKey, '');
  assert.equal(app.call('getUserOrgPath', newUser), '未分配');
  assert.equal(normalize(app.call('getUnassignedUsers').map(user => user.id)).includes(newUser.id), true);
});

test('business lines are dynamic and deleting one returns assigned users to unassigned', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');

  app.eval(`
    document.getElementById('m-iemail').value = 'manager-new@company.com';
    document.getElementById('m-iname').value = '新经理';
    document.getElementById('m-irole').value = 'manager';
  `);
  app.call('inviteMember');
  const newManager = app.getUsers().find(user => user.email === 'manager-new@company.com');

  app.eval(`
    document.getElementById('m-iemail').value = 'member-new@company.com';
    document.getElementById('m-iname').value = '待分配成员';
    document.getElementById('m-irole').value = 'member';
  `);
  app.call('inviteMember');
  const newMember = app.getUsers().find(user => user.email === 'member-new@company.com');

  const business = app.call('createBusinessLineRecord', '直播业务', '#123456');
  app.call('assignUserToBusinessLine', newManager.id, business.id);
  app.call('assignUserToBusinessLine', newMember.id, business.id, newManager.id, 'a');

  assert.equal(normalize(app.call('getScopedBusinessFilterOptions').map(item => item.v)).includes(business.id), true);
  assert.equal(app.call('getUserOrgPath', newManager), '直播业务 / 经理');
  assert.equal(app.call('getUserOrgPath', newMember), '直播业务 / a类');

  app.call('deleteBusinessLineRecord', business.id);

  const users = app.getUsers();
  const deletedManager = users.find(user => user.id === newManager.id);
  const deletedMember = users.find(user => user.id === newMember.id);

  assert.equal(deletedManager.businessId, '');
  assert.equal(deletedManager.managerScopeId, '');
  assert.equal(deletedMember.businessId, '');
  assert.equal(deletedMember.managerScopeId, '');
  assert.equal(deletedMember.subgroupKey, '');
  assert.equal(app.call('getUserOrgPath', deletedMember), '未分配');
  assert.equal(normalize(app.call('getScopedBusinessFilterOptions').map(item => item.v)).includes(business.id), false);
});

test('business placement can add unassigned users into a business and remove them back out', () => {
  const app = loadApp();
  app.setCurrentUserById('u1');

  app.eval(`
    document.getElementById('m-iemail').value = 'assignable@company.com';
    document.getElementById('m-iname').value = '可分配成员';
    document.getElementById('m-irole').value = 'member';
  `);
  app.call('inviteMember');

  const newUser = app.getUsers().find(user => user.email === 'assignable@company.com');
  assert.equal(app.call('getBusinessDetailRows', app.getUsers().find(user => user.id === 'u1'), 'overseas-ent').some(row => row.userId === newUser.id), false);

  app.call('assignUserToBusinessLine', newUser.id, 'overseas-ent', 'u5', 'b');

  const assignedUser = app.getUsers().find(user => user.id === newUser.id);
  assert.equal(assignedUser.businessId, 'overseas-ent');
  assert.equal(assignedUser.managerScopeId, 'mgr-u5');
  assert.equal(assignedUser.subgroupKey, 'b');
  assert.equal(app.call('getBusinessDetailRows', app.getUsers().find(user => user.id === 'u1'), 'overseas-ent').some(row => row.userId === newUser.id), true);

  app.call('removeUserFromBusinessLine', newUser.id);

  const removedUser = app.getUsers().find(user => user.id === newUser.id);
  assert.equal(removedUser.businessId, '');
  assert.equal(removedUser.managerScopeId, '');
  assert.equal(removedUser.subgroupKey, '');
  assert.equal(app.call('getBusinessDetailRows', app.getUsers().find(user => user.id === 'u1'), 'overseas-ent').some(row => row.userId === newUser.id), false);
  assert.equal(normalize(app.call('getUnassignedUsers').map(user => user.id)).includes(newUser.id), true);
});
