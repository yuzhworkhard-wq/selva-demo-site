/* 长视频编排：demo 用结构化扩写。真实接入时换成模型返回的全局设定 + 分镜。 */

export const AUTO_REF_POOL = {
  character: [
    'showcase/diego.jpg',
    'showcase/mei.jpg',
    'showcase/sarah.jpg',
    'showcase/jonas.jpg',
    'showcase/freya.jpg',
    'showcase/omar.jpg',
  ],
  scene: [
    'frames/frame_01.jpg',
    'frames/frame_02.jpg',
    'frames/frame_05.jpg',
    'frames/frame_07.jpg',
  ],
  prop: [
    'frames/frame_04.jpg',
    'frames/frame_06.jpg',
    'frames/frame_08.jpg',
    'frames/frame_03.jpg',
  ],
};

const KIND_LABEL = { character: '人物', scene: '场景', prop: '物品' };

export function entityKindLabel(kind) {
  return KIND_LABEL[kind] || kind;
}

function parseSec(d) {
  const n = parseInt(String(d).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

function fmtTime(sec) {
  const s = Math.max(0, Number(sec) || 0);
  const m = Math.floor(s / 60);
  const rem = s - m * 60;
  if (rem % 1 === 0) return `${m}:${String(rem).padStart(2, '0')}`;
  return `${m}:${rem.toFixed(1).padStart(4, '0')}`;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function pickPool(kind, i) {
  const pool = AUTO_REF_POOL[kind] || AUTO_REF_POOL.prop;
  return pool[i % pool.length];
}

/** 时长是否超过该模型单次直出上限 → 必须进编排 */
export function needsOrchestration(cfg, duration) {
  if (!cfg || !duration) return false;
  const direct = cfg.directMax || null;
  if (!direct) return false;
  return parseSec(duration) > parseSec(direct);
}

/** 把第一步已上传的参考图尽量挂到实体上（按顺序：人物 → 场景 → 物品） */
export function bindImagesToEntities(entities, imageUrls = []) {
  const urls = (imageUrls || []).filter(Boolean);
  let ui = 0;
  return entities.map((e) => {
    if (e.imageUrl) return e;
    if (ui < urls.length) {
      return { ...e, imageUrl: urls[ui++], imageSource: 'upload' };
    }
    return { ...e, imageUrl: null, imageSource: null };
  });
}

/** 为缺图实体自动分配设定图（demo 占位图） */
export function autoFillMissingRefs(entities) {
  const counters = { character: 0, scene: 0, prop: 0 };
  return entities.map((e) => {
    if (e.imageUrl) return e;
    const i = counters[e.kind] || 0;
    counters[e.kind] = i + 1;
    return {
      ...e,
      imageUrl: pickPool(e.kind, i),
      imageSource: 'auto',
    };
  });
}

export function allEntitiesFilled(entities) {
  return Array.isArray(entities) && entities.length > 0 && entities.every(e => e && e.imageUrl);
}

/**
 * 短输入 → 全局设定 + @实体 + 分镜（信息流广告节拍）。
 * 文案随用户输入变化，结构固定便于 demo。
 */
export function buildLongVideoPlan({
  sourceText = '',
  aspect = '9:16',
  duration = '60s',
  imageUrls = [],
} = {}) {
  const brief = String(sourceText || '').trim() || '产品推广短视频';
  const totalSec = parseSec(duration) || 60;
  const beatCount = totalSec >= 90 ? 8 : totalSec >= 45 ? 6 : 5;

  const entities = [
    {
      id: 'ent-host',
      tag: '@男主持人',
      kind: 'character',
      label: '男主持人',
      role: '街头采访主持人',
      summary: '拉美裔青年男性，白短袖 Polo，左手银表，手持采访麦',
    },
    {
      id: 'ent-guest',
      tag: '@女受访者',
      kind: 'character',
      label: '女受访者',
      role: '路人受访者',
      summary: '拉美裔青年女性，黄 V 领短袖，棕色细带斜挎包',
    },
    {
      id: 'ent-street',
      tag: '@街道场景',
      kind: 'scene',
      label: '街道场景',
      role: '外景',
      summary: '明亮户外街道，黄蓝建筑，行人背景，晴天高饱和',
    },
    {
      id: 'ent-mic',
      tag: '@采访麦克风',
      kind: 'prop',
      label: '采访麦克风',
      role: '道具',
      summary: '黑海绵头麦，方形橙粉渐变台标',
    },
    {
      id: 'ent-phone',
      tag: '@智能手机',
      kind: 'prop',
      label: '智能手机',
      role: '道具',
      summary: '黑框手机，用于展示 App 界面与到账短信',
    },
  ];

  const global = {
    style: '写实街头采访，色彩明亮饱和',
    aspect,
    camera: '手持微晃为主；人物与手机屏特写硬切',
    lighting: '自然亮光，高饱和，中对比',
    edit: '快节奏硬切，采访镜头与手机屏交替',
    locale: '西班牙语（墨西哥口音）· 墨西哥街头',
    subtitle: '底部常驻免责声明；对白白字黑边居中；手机特写无字幕',
    audio: '对白清晰，轻微街噪声，无 BGM',
    duration,
    brief,
  };

  const advancedGlobal = [
    '【风格与全局设定】',
    `艺术风格：${global.style}`,
    `画幅比例：${global.aspect}`,
    `运镜与打光：${global.camera}；${global.lighting}`,
    `剪辑与转场：${global.edit}`,
    `语言与地域：${global.locale}`,
    `字幕设定：${global.subtitle}`,
    `声音基调：${global.audio}`,
    `总时长：${global.duration}`,
    '',
    '【人物设定】',
    ...entities.filter(e => e.kind === 'character').flatMap(e => [
      `${e.tag}`,
      `身份角色：${e.role}`,
      `稳定外观：${e.summary}`,
      '',
    ]),
    '【场景设定】',
    ...entities.filter(e => e.kind === 'scene').flatMap(e => [
      `${e.tag}`,
      `场景信息：${e.summary}`,
      '',
    ]),
    '【关键物品设定】',
    ...entities.filter(e => e.kind === 'prop').flatMap(e => [
      `${e.tag}`,
      `物品信息：${e.summary}`,
      '',
    ]),
  ].join('\n');

  const templates = [
    {
      narrative: '开场钩子',
      visual: '中近景正面拍 @男主持人 举麦面向镜头，街景虚化',
      dialogue: '「你有没有试过这个 App？今天路人实测到账。」',
      shotSize: '中近景',
      move: '手持微动',
    },
    {
      narrative: '痛点抛出',
      visual: '过肩拍 @女受访者 犹豫摇头，背景 @街道场景',
      dialogue: '「我一直觉得这种赚零花不太靠谱……」',
      shotSize: '中景',
      move: '固定机位',
    },
    {
      narrative: '产品演示',
      visual: '@智能手机 屏幕特写：打开 App、点击任务',
      dialogue: '（无对白，界面操作声）',
      shotSize: '特写',
      move: '固定',
    },
    {
      narrative: '到账证明',
      visual: '手机短信/余额特写与 @女受访者 惊喜反应交叉剪',
      dialogue: '「等等，真的到账了？」',
      shotSize: '特写→中近景',
      move: '硬切',
    },
    {
      narrative: '卖点强化',
      visual: '@男主持人 与 @女受访者 正反打，展示关键卖点',
      dialogue: '「规则透明，按应用规则结算。」',
      shotSize: '正反打',
      move: '手持',
    },
    {
      narrative: '行动号召',
      visual: '双人中景 + 屏幕引导手势，字幕强化 CTA',
      dialogue: '「想试的话，按下方规则自己上手。」',
      shotSize: '中景',
      move: '轻推',
    },
    {
      narrative: '补充证据',
      visual: '再次 @智能手机 界面滑动，叠免责声明',
      dialogue: '（旁白）结果因人而异。',
      shotSize: '特写',
      move: '固定',
    },
    {
      narrative: '收束',
      visual: '街景全景，主持人挥手结束采访',
      dialogue: '「今天就到这，下条街见。」',
      shotSize: '全景',
      move: '手持拉开',
    },
  ];

  const used = templates.slice(0, beatCount);
  const slice = totalSec / used.length;
  let t0 = 0;
  const shots = used.map((tpl, i) => {
    const start = t0;
    const end = i === used.length - 1 ? totalSec : Math.round((i + 1) * slice * 10) / 10;
    t0 = end;
    const timeRange = `${fmtTime(start)} – ${fmtTime(end)}`;
    const promptFull = [
      `镜头${i + 1}（${timeRange}）`,
      `叙事功能：${tpl.narrative}`,
      `画面与动作：景别 ${tpl.shotSize}；运镜 ${tpl.move}；${tpl.visual}`,
      `对白：${tpl.dialogue}`,
      `音效：街头环境声，人声清晰`,
      `文字与图形：底部免责声明；对白字幕（手机特写除外）`,
      `创意锚点：${brief.slice(0, 80)}`,
    ].join('\n');

    const promptHtml = [
      `<p><b>镜头 ${i + 1}</b> <span class="lv-time">${esc(timeRange)}</span></p>`,
      `<p><span class="dim-lock">叙事</span> ${esc(tpl.narrative)}</p>`,
      `<p><span class="dim-var">画面</span> ${esc(tpl.visual)}</p>`,
      `<p><span class="dim-var">对白</span> ${esc(tpl.dialogue)}</p>`,
    ].join('');

    return {
      id: `shot-${i + 1}`,
      index: i,
      timeRange,
      startSec: start,
      endSec: end,
      narrative: tpl.narrative,
      visualSummary: tpl.visual,
      dialogue: tpl.dialogue,
      shotSize: tpl.shotSize,
      move: tpl.move,
      promptFull,
      promptHtml,
    };
  });

  return {
    global,
    advancedGlobal,
    entities: bindImagesToEntities(entities, imageUrls),
    shots,
  };
}
