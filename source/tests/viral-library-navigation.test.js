const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('viral video library sits between projects and personal library in the sidebar', () => {
  const html = read('index.html');
  const projects = html.indexOf('data-page="projects"');
  const viralLibrary = html.indexOf('data-page="viral-library"');
  const personalLibrary = html.indexOf('data-page="library"');

  assert(projects >= 0, 'projects navigation item is present');
  assert(viralLibrary >= 0, 'viral library navigation item is present');
  assert(personalLibrary >= 0, 'personal library navigation item is present');
  assert(projects < viralLibrary, 'viral library follows projects');
  assert(viralLibrary < personalLibrary, 'viral library precedes personal library');
  assert.match(html, /id="page-viral-library"/);
  assert.match(html, /<button[^>]+data-page="viral-library"[^>]+aria-label="打开爆款视频库"/);
});

test('platform navigation opens the viral library in the shared video iframe', () => {
  const navigation = read('actions/navigation.js');
  const interactions = read('actions/interactions.js');

  assert.match(navigation, /page === 'viral-library'/);
  assert.match(navigation, /openViralLibraryTool\(\)/);
  assert.match(navigation, /skipViralLibraryEmbed/);
  assert.match(navigation, /setAttribute\('aria-current', 'page'\)/);
  assert.match(interactions, /selva-hot-library-open/);
  assert.match(interactions, /initialSource: pendingViralLibrarySource/);
  assert.match(interactions, /e\.source !== cloneFrameWindow/);
  assert.match(interactions, /section === 'viral-library'/);
  assert.match(interactions, /skipViralLibraryEmbed: true/);
});
