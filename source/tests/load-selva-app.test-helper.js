const fs = require('fs');
const path = require('path');
const vm = require('vm');

function createStubElement() {
  return {
    style: {},
    className: '',
    innerHTML: '',
    textContent: '',
    value: '',
    dataset: {},
    children: [],
    disabled: false,
    checked: false,
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    insertBefore(child) {
      this.children.push(child);
      return child;
    },
    remove() {},
    play() {},
    pause() {},
    load() {},
    querySelector() {
      return createStubElement();
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
    focus() {},
    blur() {},
    setAttribute() {},
    removeAttribute() {},
    getAttribute() {
      return '';
    },
    scrollTo() {},
  };
}

function createDocument() {
  const elements = new Map();
  return {
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createStubElement());
      return elements.get(id);
    },
    querySelector() {
      return createStubElement();
    },
    querySelectorAll() {
      return [];
    },
    createElement() {
      return createStubElement();
    },
    addEventListener() {},
    removeEventListener() {},
  };
}

function loadApp() {
  const root = path.resolve(__dirname, '..');
  const context = vm.createContext({
    console,
    document: createDocument(),
    window: {
      addEventListener() {},
      removeEventListener() {},
    },
    navigator: { clipboard: { writeText() {} } },
    confirm: () => true,
    alert() {},
    requestAnimationFrame: cb => cb(),
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    Map,
    Set,
    JSON,
  });

  [
    'data.js',
    'state.js',
    'render/helpers.js',
    'render/pages.js',
    'actions/interactions.js',
    'actions/navigation.js',
    'app.js',
  ].forEach(file => {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
  });

  return {
    call(fnName, ...args) {
      context.__testArgs = args;
      try {
        return vm.runInContext(`${fnName}(...__testArgs)`, context);
      } finally {
        delete context.__testArgs;
      }
    },
    eval(expression) {
      return vm.runInContext(expression, context);
    },
    setCurrentUserById(userId) {
      context.__testUserId = userId;
      try {
        vm.runInContext('currentUser = users.find(user => user.id === __testUserId);', context);
      } finally {
        delete context.__testUserId;
      }
    },
    getUsers() {
      return vm.runInContext('users', context);
    },
  };
}

module.exports = { loadApp };
