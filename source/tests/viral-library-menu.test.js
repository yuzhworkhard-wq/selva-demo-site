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

test('viral library filters stay in document flow instead of sticking', () => {
  const css = fs.readFileSync(path.join(siteRoot, 'styles.css'), 'utf8');
  const start = css.indexOf('.vl-filters');
  assert.ok(start >= 0, 'expected .vl-filters styles');
  const block = css.slice(start, start + 280);
  assert.match(block, /position:\s*static/);
  assert.doesNotMatch(block, /position:\s*(sticky|fixed)/);
});

test('viral library render puts filters and cards in the same page', () => {
  const app = loadApp();
  app.eval('renderViralLibrary()');
  const html = app.eval("document.getElementById('viral-library-content').innerHTML");
  assert.match(html, /class="vl-filters"/);
  assert.match(html, /渠道/);
  assert.match(html, /class="vl-grid"/);
  assert.match(html, /人气值/);
  assert.doesNotMatch(html, /position:\s*sticky/);
});
