const test = require('node:test');
const assert = require('node:assert/strict');

const { loadApp } = require('./load-selva-app.test-helper');

function normalize(value) {
  return JSON.parse(JSON.stringify(value));
}

test('assets center filter modal renders multiselect combos with multiple selected tags', () => {
  const app = loadApp();

  app.eval(`
    _assetFilterDraft = {
      industry: ['ent', 'tool'],
      business: [],
      client: [],
      product: [],
      folder: [],
    };
    renderAssetFilterModalBody();
  `);

  const html = app.eval("document.getElementById('modal-body').innerHTML");

  assert.match(html, /class="ms-combo"/);
  assert.match(html, /ms-combo-tag/);
  assert.doesNotMatch(html, /asset-filter-modal-select/);
});

test('folder filter stays disabled until at least one product is selected', () => {
  const app = loadApp();

  app.eval(`
    _assetFilterDraft = {
      industry: [],
      business: [],
      client: [],
      product: [],
      folder: [],
    };
    renderAssetFilterModalBody();
  `);

  const html = app.eval("document.getElementById('modal-body').innerHTML");

  assert.match(html, /文件夹.*请先选择产品/);
  assert.match(html, /task-filter-modal-field disabled/);
  assert.match(html, /ms-combo disabled/);
});

test('assets center filtering accepts multiple selected values in the same field', () => {
  const app = loadApp();

  const result = normalize(app.eval(`
    (() => {
      const videoItems = getAllAssetsData().filter(item => item.fileType === 'video');
      const clients = [...new Set(videoItems.map(item => item.projectClient).filter(Boolean))].slice(0, 2);
      return {
        clients,
        filteredClients: getFilteredAssetsItems({
          type: 'video',
          industry: [],
          business: [],
          client: clients,
          product: [],
          folder: [],
        }).map(item => item.projectClient),
      };
    })()
  `));

  assert.equal(result.clients.length, 2);
  assert(result.filteredClients.length > 0);
  assert.deepEqual([...new Set(result.filteredClients)].sort(), [...result.clients].sort());
});

test('assets center can batch sync selected videos without narrowing to a folder', () => {
  const app = loadApp();

  app.eval(`
    (() => {
      const picks = [];
      const seenFolders = new Set();
      getAllAssetsData().forEach(item => {
        if (item.fileType !== 'video' || seenFolders.has(item.folderId) || picks.length >= 2) return;
        item._fileRef.synced = false;
        item._fileRef.syncedAt = '';
        item._fileRef.syncedTo = '';
        seenFolders.add(item.folderId);
        picks.push({ projectId: item.projectId, folderId: item.folderId, name: item.name });
      });
      window.__assetTestPicks = picks;
      window.__assetTestPicks.forEach(pick => {
        toggleAssetSelection(pick.projectId, pick.folderId, pick.name, true);
      });
    })();
  `);

  app.call('renderAssetsCenter');
  const html = app.eval("document.getElementById('assets-center-content').innerHTML");

  assert.match(html, /批量同步选中视频/);
  assert.match(html, /已选 2 个视频/);

  app.call('syncSelectedAssets');

  const result = normalize(app.eval(`
    (() => ({
      syncedFlags: window.__assetTestPicks.map(pick => {
        const item = getAllAssetsData().find(asset =>
          asset.projectId === pick.projectId &&
          asset.folderId === pick.folderId &&
          asset.name === pick.name
        );
        return item ? item._fileRef.synced : false;
      }),
      selectionSize: currentAssetSelection.size,
    }))()
  `));

  assert.deepEqual(result.syncedFlags, [true, true]);
  assert.equal(result.selectionSize, 0);
});
