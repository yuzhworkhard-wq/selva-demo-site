const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const { loadApp } = require('./load-selva-app.test-helper');

const sourceRoot = path.resolve(__dirname, '..');
const siteRoot = path.resolve(__dirname, '../../site');

test('left nav includes 爆款视频库 as its own page', () => {
  const html = fs.readFileSync(path.join(sourceRoot, 'index.html'), 'utf8');
  assert.match(html, /data-page="viral-library"/);
  assert.match(html, /爆款视频库/);
  assert.match(html, /id="page-viral-library"/);
  assert.match(html, /id="viral-library-content"/);
});

test('menu 爆款视频库 loads the same viral library page', () => {
  const app = loadApp();
  app.eval('renderViralLibrary()');
  const html = app.eval("document.getElementById('viral-library-content').innerHTML");
  assert.match(html, /clone\/index\.html\?viral=1/);
  assert.match(html, /viral-lib-frame/);
});

test('viral library CSS keeps filters in document flow', () => {
  const css = fs.readFileSync(path.join(siteRoot, '..', 'apps/video-clone/src/styles.css'), 'utf8');
  assert.match(css, /\.clone-main--library/);
  const libPage = css.slice(css.indexOf('.lib-page {'), css.indexOf('.lib-page {') + 280);
  assert.match(libPage, /overflow:\s*visible/);
  assert.doesNotMatch(libPage, /position:\s*(sticky|fixed)/);
});
