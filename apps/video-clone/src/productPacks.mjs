/* 产品包 demo 种子与工具。平台资源库与视频生成共用同一批 id / 素材语义。
   平台页用 clone/ 前缀路径；iframe 内用相对 clone 根路径（无前缀）。
   投放地区与爆款库 VIDEO_REGIONS 同名单，支付方式与纸钞用 public/product-packs/ 下的真实图片。 */

import { VIDEO_REGIONS } from './videoRegionConfig.mjs';

const REGION_PAYMENT = {
  ar: 'Mercado Pago', au: 'PayID', br: 'Pix', ca: 'Interac', cl: 'Webpay',
  co: 'Nequi', de: 'PayPal', ec: 'Deuna', fr: 'PayPal', id: 'Dana',
  jp: 'PayPay', ke: 'M-Pesa', kr: 'KakaoPay', lk: 'FriMi', mx: 'OXXO',
  my: "Touch 'n Go", ng: 'OPay', nz: 'PayPal', pe: 'Yape', ph: 'GCash',
  pk: 'JazzCash', th: 'PromptPay', tr: 'Papara', tw: 'LINE Pay', uk: 'PayPal',
  us: 'PayPal', uy: 'Mercado Pago', vn: 'MoMo', za: 'SnapScan',
};

/* 真实支付 logo，文件在 public/product-packs/payments/；库外的支付名才退回文字徽标 */
const PAYMENT_LOGOS = {
  'mercado pago': 'mercadopago.svg', payid: 'payid.png', pix: 'pix.png', interac: 'interac.png',
  webpay: 'webpay.svg', nequi: 'nequi.png', paypal: 'paypal.png', deuna: 'deuna.png',
  dana: 'dana.png', paypay: 'paypay.png', 'm-pesa': 'mpesa.png', mpesa: 'mpesa.png',
  kakaopay: 'kakaopay.png', 'kakao pay': 'kakaopay.png', frimi: 'frimi.png', oxxo: 'oxxo.png',
  "touch 'n go": 'touchngo.png', 'touch n go': 'touchngo.png', tng: 'touchngo.png', opay: 'opay.png',
  yape: 'yape.png', gcash: 'gcash.png', jazzcash: 'jazzcash.png', promptpay: 'promptpay.png',
  papara: 'papara.png', 'line pay': 'linepay.png', linepay: 'linepay.png', momo: 'momo.png',
  snapscan: 'snapscan.png',
};

/* 与平台 PACK_REGION_OPTIONS 的 code/currencyZh 同源；纸钞图在 public/product-packs/notes/<code>.jpg */
const REGION_CURRENCY = {
  ar: ['ARS', '阿根廷比索'], au: ['AUD', '澳元'], br: ['BRL', '雷亚尔'],
  ca: ['CAD', '加元'], cl: ['CLP', '智利比索'], co: ['COP', '哥伦比亚比索'],
  de: ['EUR', '欧元'], ec: ['USD', '美元'], fr: ['EUR', '欧元'],
  id: ['IDR', '印尼盾'], jp: ['JPY', '日元'], ke: ['KES', '肯尼亚先令'],
  kr: ['KRW', '韩元'], lk: ['LKR', '斯里兰卡卢比'], mx: ['MXN', '墨西哥比索'],
  my: ['MYR', '林吉特'], ng: ['NGN', '奈拉'], nz: ['NZD', '新西兰元'],
  pe: ['PEN', '索尔'], ph: ['PHP', '菲律宾比索'], pk: ['PKR', '巴基斯坦卢比'],
  th: ['THB', '泰铢'], tr: ['TRY', '土耳其里拉'], tw: ['TWD', '新台币'],
  uk: ['GBP', '英镑'], us: ['USD', '美元'], uy: ['UYU', '乌拉圭比索'],
  vn: ['VND', '越南盾'], za: ['ZAR', '兰特'],
};

export const PACK_REGIONS = VIDEO_REGIONS.map(r => ({
  value: r.value,
  label: r.label,
  payment: REGION_PAYMENT[r.value] || 'Local Pay',
}));

export function regionNote(regionValue) {
  const c = REGION_CURRENCY[regionValue];
  if (!c) return { noteName: '', noteImage: '' };
  const [code, zh] = c;
  return { noteName: `${zh} ${code}`, noteImage: `product-packs/notes/${code.toLowerCase()}.jpg` };
}

export function paymentLogoFor(name, color) {
  const file = PAYMENT_LOGOS[String(name || '').trim().toLowerCase()];
  return file ? `product-packs/payments/${file}` : paymentLogoDataUri(name, color);
}

export function paymentLogoDataUri(name, color = '#16a34a') {
  const label = String(name || 'Pay').slice(0, 12);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="48" fill="${color}"/>
  <text x="120" y="128" text-anchor="middle" font-family="system-ui,sans-serif" font-size="36" font-weight="700" fill="#fff">${escapeXml(label)}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function appLogoDataUri(name, color = '#6366f1') {
  const ch = String(name || 'A').trim().charAt(0).toUpperCase() || 'A';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <rect width="240" height="240" rx="52" fill="${color}"/>
  <text x="120" y="148" text-anchor="middle" font-family="system-ui,sans-serif" font-size="110" font-weight="700" fill="#fff">${escapeXml(ch)}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function regionPaymentName(regionValue) {
  return PACK_REGIONS.find(r => r.value === regionValue)?.payment || 'Local Pay';
}

export function regionLabel(regionValue) {
  return PACK_REGIONS.find(r => r.value === regionValue)?.label || regionValue;
}

/** iframe / 构建产物内的相对路径 */
export const PRODUCT_PACKS = [
  {
    id: 'pp-1',
    name: 'CashDrama',
    desc: '看短剧赚钱 · Pix 结算',
    region: 'br',
    playUrl: 'https://play.google.com/store/apps/details?id=com.xj.cash.drama',
    logo: 'product-packs/cashdrama/icon.png',
    appImages: [
      'product-packs/cashdrama/shot_01.jpg',
      'product-packs/cashdrama/shot_02.jpg',
      'product-packs/cashdrama/shot_03.jpg',
    ],
    paymentLogo: paymentLogoFor('Pix'),
    paymentName: 'Pix',
    ...regionNote('br'),
    creator: 'u1',
    createdAt: '2026-04-10',
  },
  {
    id: 'pp-2',
    name: 'Lucky Flower Drop',
    desc: '鲜花消除 · Dana 支付',
    region: 'id',
    playUrl: 'https://play.google.com/store/apps/details?id=com.lucky.flower.puzzle.game',
    logo: 'product-packs/luckyflower/icon.png',
    appImages: [
      'product-packs/luckyflower/shot_01.jpg',
      'product-packs/luckyflower/shot_02.jpg',
      'product-packs/luckyflower/shot_03.jpg',
    ],
    paymentLogo: paymentLogoFor('Dana'),
    paymentName: 'Dana',
    ...regionNote('id'),
    creator: 'u1',
    createdAt: '2026-04-08',
  },
];

const PLAY_LISTING_DEMOS = {
  'com.xj.cash.drama': {
    name: 'CashDrama',
    desc: '看短剧赚钱 · 免费短剧与提现奖励',
    preferredRegion: 'br',
    logo: 'product-packs/cashdrama/icon.png',
    appImages: [
      'product-packs/cashdrama/shot_01.jpg',
      'product-packs/cashdrama/shot_02.jpg',
      'product-packs/cashdrama/shot_03.jpg',
    ],
  },
  'com.lucky.flower.puzzle.game': {
    name: 'Lucky Flower Drop',
    desc: '鲜花消除解谜 · 轻松益智',
    preferredRegion: 'id',
    logo: 'product-packs/luckyflower/icon.png',
    appImages: [
      'product-packs/luckyflower/shot_01.jpg',
      'product-packs/luckyflower/shot_02.jpg',
      'product-packs/luckyflower/shot_03.jpg',
    ],
  },
};

/* 产品包的真源是平台资源库，不是上面那份种子：iframe 一就绪宿主就把整库灌进来
   （selva-clone-packs），库里新建/删除也会再推一次。上面的种子只在脱离平台
   单独跑子应用时兜底，两边 id 与素材语义对齐，所以换过来不会让已挂的包失配。 */
let hostPacks = null;
const packSubs = new Set();

/* 平台侧图片路径带 clone/ 前缀（它在主仓根下看这个目录），iframe 自己就在 clone/ 里，
   带着前缀会 404。data:/blob:/http(s):/绝对路径原样放过。 */
function toFramePath(url) {
  const s = String(url || '');
  if (!s || /^(data:|blob:|https?:|\/)/.test(s)) return s;
  return s.replace(/^(\.\/)?clone\//, '');
}

function normalizeHostPack(pack) {
  return {
    ...pack,
    logo: toFramePath(pack.logo),
    paymentLogo: toFramePath(pack.paymentLogo),
    noteImage: toFramePath(pack.noteImage),
    appImages: (pack.appImages || []).map(toFramePath).filter(Boolean),
  };
}

export function setHostProductPacks(list) {
  hostPacks = Array.isArray(list) ? list.map(normalizeHostPack) : null;
  packSubs.forEach(fn => fn());
}

export function subscribeProductPacks(fn) {
  packSubs.add(fn);
  return () => packSubs.delete(fn);
}

export function getProductPacks() {
  return hostPacks || PRODUCT_PACKS;
}

export function packImageUrls(pack) {
  if (!pack) return [];
  const list = [];
  if (pack.logo) list.push(pack.logo);
  (pack.appImages || []).forEach(u => { if (u) list.push(u); });
  if (pack.paymentLogo) list.push(pack.paymentLogo);
  if (pack.noteImage) list.push(pack.noteImage);
  return list;
}

/** Demo：根据 Play 链接假拉取元数据；已知包名走真实演示素材 */
export function mockFetchPlayListing(playUrl, region) {
  const url = String(playUrl || '');
  const idMatch = url.match(/id=([^&]+)/);
  const rawId = idMatch ? decodeURIComponent(idMatch[1]) : '';
  const known = PLAY_LISTING_DEMOS[rawId];
  const paymentName = regionPaymentName(known?.preferredRegion || region);
  if (known) {
    return {
      name: known.name,
      desc: known.desc,
      logo: known.logo,
      appImages: (known.appImages || []).slice(0, 3),
      paymentName,
      paymentLogo: paymentLogoFor(paymentName),
      ...regionNote(known.preferredRegion || region),
      region: known.preferredRegion || region,
    };
  }
  const guess = rawId.split('.').pop() || 'DemoApp';
  const name = guess.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Demo App';
  return {
    name,
    logo: appLogoDataUri(name),
    appImages: ['frames/frame_01.jpg', 'frames/frame_03.jpg', 'frames/frame_06.jpg'].slice(0, 3),
    paymentName,
    paymentLogo: paymentLogoFor(paymentName),
    ...regionNote(region),
  };
}

export function mockRegenPayment(bankName) {
  const name = String(bankName || '').trim() || 'Pay';
  const colors = ['#16a34a', '#2563eb', '#db2777', '#ca8a04', '#7c3aed'];
  const color = colors[name.length % colors.length];
  return { paymentName: name, paymentLogo: paymentLogoFor(name, color) };
}
