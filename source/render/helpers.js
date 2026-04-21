// ===== Workflow Templates =====
const WORKFLOW_TEMPLATES = [
  { id: 'wt-1', name: '先生成脚本生成视频', icon: '🎬', desc: '任务配置 → 脚本生成 Agent → 视频脚本 → 视频生成 Agent → 广告视频',
    nodes: [
      { id: 'n1', type: 'start', label: '任务配置', icon: '⚙️' },
      { id: 'n2', type: 'agent', variant: 'script', label: '脚本生成 Agent', icon: '📝' },
      { id: 'n3', type: 'output', label: '视频脚本', icon: '📄' },
      { id: 'n4', type: 'agent', variant: 'video', label: '视频生成 Agent', icon: '🎥' },
      { id: 'n5', type: 'output', label: '广告视频', icon: '🎬' },
    ]},
  { id: 'wt-2', name: '文案生成视频', icon: '✍️', desc: '任务配置 → 文案输入 → 视频生成 Agent → 广告视频',
    nodes: [
      { id: 'n1', type: 'start', label: '任务配置', icon: '⚙️' },
      { id: 'n2', type: 'input', variant: 'copy', label: '文案输入', icon: '📝' },
      { id: 'n3', type: 'agent', variant: 'video', label: '视频生成 Agent', icon: '🎥' },
      { id: 'n4', type: 'output', label: '广告视频', icon: '🎬' },
    ]},
  { id: 'wt-3', name: '模仿爆款视频', icon: '🔥', desc: '任务配置 → 视频理解 Agent → 分析报告 → 脚本生成 Agent → 脚本 → 视频生成 Agent → 视频',
    nodes: [
      { id: 'n1', type: 'start', label: '任务配置', icon: '⚙️' },
      { id: 'n2', type: 'agent', variant: 'understand', label: '视频理解 Agent', icon: '🔍' },
      { id: 'n3', type: 'output', label: '分析报告', icon: '📄' },
      { id: 'n4', type: 'agent', variant: 'script', label: '脚本生成 Agent', icon: '📝' },
      { id: 'n5', type: 'output', label: '脚本', icon: '📄' },
      { id: 'n6', type: 'agent', variant: 'video', label: '视频生成 Agent', icon: '🎥' },
      { id: 'n7', type: 'output', label: '视频', icon: '🎬' },
    ]},
  { id: 'wt-4', name: '多语言视频生成', icon: '🌍', desc: '任务配置 → 脚本生成 Agent → 视频脚本 → 葡语分支 + 西语分支 → 多语言视频',
    nodes: [
      { id: 'n1', type: 'start', label: '任务配置', icon: '⚙️' },
      { id: 'n2', type: 'agent', variant: 'script', label: '脚本生成 Agent', icon: '📝' },
      { id: 'n3', type: 'output', label: '视频脚本', icon: '📄' },
      { id: 'n4', type: 'agent', variant: 'translate', label: '文本翻译 Agent（葡语）', icon: '🌐' },
      { id: 'n5', type: 'output', label: '葡语脚本', icon: '📄' },
      { id: 'n6', type: 'agent', variant: 'video', label: '视频生成 Agent（葡语）', icon: '🎥' },
      { id: 'n7', type: 'output', label: '葡语视频', icon: '🎬' },
      { id: 'n8', type: 'agent', variant: 'translate', label: '文本翻译 Agent（西语）', icon: '🌐' },
      { id: 'n9', type: 'output', label: '西语脚本', icon: '📄' },
      { id: 'n10', type: 'agent', variant: 'video', label: '视频生成 Agent（西语）', icon: '🎥' },
      { id: 'n11', type: 'output', label: '西语视频', icon: '🎬' },
    ],
    edges: [
      { from: 'n1', to: 'n2' },
      { from: 'n2', to: 'n3' },
      { from: 'n3', to: 'n4' },
      { from: 'n4', to: 'n5' },
      { from: 'n5', to: 'n6' },
      { from: 'n6', to: 'n7' },
      { from: 'n3', to: 'n8' },
      { from: 'n8', to: 'n9' },
      { from: 'n9', to: 'n10' },
      { from: 'n10', to: 'n11' },
    ],
    positions: {
      n1: { x: 80, y: 260 },
      n2: { x: 400, y: 260 },
      n3: { x: 720, y: 260 },
      n4: { x: 1040, y: 110 },
      n5: { x: 1360, y: 110 },
      n6: { x: 1680, y: 110 },
      n7: { x: 2000, y: 110 },
      n8: { x: 1040, y: 410 },
      n9: { x: 1360, y: 410 },
      n10: { x: 1680, y: 410 },
      n11: { x: 2000, y: 410 },
    }},
];

function hasWorkflowTemplateLayout(wt) {
  return !!(wt && wt.positions && Object.keys(wt.positions).length);
}

function getWorkflowTemplatePositions(wt, options = {}) {
  const baseX = options.baseX ?? 80;
  const baseY = options.baseY ?? 260;
  const gapX = options.gapX ?? 100;
  const nodeW = options.nodeW ?? 220;
  if (!wt || !Array.isArray(wt.nodes)) return {};

  const positions = {};
  wt.nodes.forEach((node, index) => {
    const pos = wt.positions && wt.positions[node.id];
    positions[node.id] = pos
      ? { x: pos.x, y: pos.y }
      : { x: baseX + index * (nodeW + gapX), y: baseY };
  });
  return positions;
}

function getWorkflowTemplateEdges(wt) {
  if (!wt || !Array.isArray(wt.nodes)) return [];
  if (Array.isArray(wt.edges) && wt.edges.length) {
    return wt.edges.map(edge => ({ from: edge.from, to: edge.to }));
  }
  const edges = [];
  for (let i = 1; i < wt.nodes.length; i++) {
    edges.push({ from: wt.nodes[i - 1].id, to: wt.nodes[i].id });
  }
  return edges;
}

// ===== Toolbox Tools =====
const TOOLBOX_TOOLS = [
  { id: 'tool-script', name: '脚本生成', en: 'Script Generation', icon: '📝', category: 'content', desc: '支持基于创意描述、分析报告或参考脚本批量生成广告脚本' },
  { id: 'tool-video', name: '视频生成', en: 'Video Generation', icon: '🎥', category: 'video', desc: '统一入口切换 Grok、Veo 3.1 视频生成模型' },
  { id: 'tool-understand', name: '视频理解', en: 'Video Understanding', icon: '🔍', category: 'content', desc: 'AI 深度分析视频内容，输出风格解析和提示词' },
  { id: 'tool-translate', name: '文本翻译', en: 'Text Translation', icon: '🌐', category: 'content', desc: 'AI 多语言广告文案翻译，支持按目标语言配置市场语料与术语表' },
  { id: 'tool-extract', name: '文案提取', en: 'Script Extraction', icon: '✂️', category: 'content', desc: '从视频或图片中智能提取台词、字幕等文案' },
  { id: 'tool-voice', name: '配音优化', en: 'Voice Studio', icon: '🎙', category: 'content', desc: '将脚本台词转换为高保真语音，80+ 音色' },
  { id: 'tool-disclaimer', name: '添加警示语', en: 'Disclaimer Overlay', icon: '⚠️', category: 'content', desc: '为视频自动添加合规警示语文字' },
];

const LANGUAGES = ['中文（简体）','英文','葡萄牙语（巴西）','西班牙语（哥伦比亚）','日语','韩语','法语','印尼语','越南语'];
const MARKETS = ['无特定语料','巴西','哥伦比亚','墨西哥','日本','韩国','印尼'];
const TRANSLATION_TARGETS = ['中文（简体）','英文','葡萄牙语（巴西）','西班牙语（哥伦比亚）','日语','韩语','法语','印尼语','越南语'];
const TRANSLATION_LANGUAGE_MARKET_DEFAULTS = {
  '葡萄牙语（巴西）': '巴西',
  '西班牙语（哥伦比亚）': '哥伦比亚',
  '日语': '日本',
  '韩语': '韩国',
  '印尼语': '印尼'
};
const GEMINI_BASE_MODELS = ['Gemini 2.5 Pro', 'Gemini 2.5 Flash'];
const SCRIPT_KNOWLEDGE_BASE_OPTIONS = ['品牌知识库', '产品手册', '高转化历史脚本', '海外市场案例集'];
const DISCLAIMER_LANGUAGES = ['中文（简体）', '英文', '葡萄牙语（巴西）', '西班牙语'];
const BACKGROUND_MUSIC_STYLES = ['无', '轻快', '励志', '温暖'];
const WORKFLOW_VIDEO_MODEL_CONFIG = {
  'Grok': {
    label: 'Grok（xAI，支持多时长）',
    durations: ['10s', '20s', '30s'],
    ratios: ['9:16', '16:9', '1:1']
  },
  'Veo 3.1': {
    label: 'Veo 3.1（Google，支持长视频）',
    durations: ['8s', '16s', '24s', '32s', '40s'],
    ratios: ['9:16', '16:9']
  }
};
const TOOL_VIDEO_MODEL_OPTIONS = [
  { value: 'Grok', icon: '🤖', title: 'Grok', description: 'xAI，支持 10s / 20s / 30s' },
  { value: 'Veo 3.1', icon: '🎞', title: 'Veo 3.1', description: 'Google，支持长视频' }
];
const VOICE_LIBRARY = [
  { id: 'cn', label: 'CN 中文 36 个', voices: ['青涩青年','精英青年','霸道青年','阳光少年','磁性男声','成熟男声','沉稳男声','活力男声','新闻男声','主持男声','温柔女声','甜美女性','少女','御姐','成熟女性','知性女性','电台女声','主持女声','温暖旁白','活力旁白','广告热卖','科技解说','国风女声','可爱童声'] },
  { id: 'us', label: 'US 英语 20 个', voices: ['Professional Male','Energetic Male','Young Male','Warm Male','Narrator Male','News Male','Professional Female','Casual Female','Bright Female','Elegant Female','Luxury Female','Friendly Female'] },
  { id: 'jp', label: 'JP 日语 6 个', voices: ['日语青年男声','日语成熟男声','日语少女','日语御姐','日语旁白女声','日语主持男声'] },
  { id: 'kr', label: 'KR 韩语 4 个', voices: ['韩语青年男声','韩语温柔女声','韩语主持女声','韩语品牌旁白'] },
  { id: 'es', label: 'ES 西班牙语 4 个', voices: ['西语男声 A','西语男声 B','西语女声 A','西语女声 B'] },
  { id: 'br', label: 'BR 葡萄牙语 4 个', voices: ['葡语男声 A','葡语男声 B','葡语女声 A','葡语女声 B'] },
  { id: 'intl', label: '更多语言 22+', voices: ['法语男声','法语女声','印尼语男声','印尼语女声','越南语男声','越南语女声','德语男声','意大利语女声'] }
];
const DISCLAIMER_PRESETS = [
  { label: '网赚类标准警示语', value: '本广告内容为推广演示，收益表现因人而异，请谨慎判断。' },
  { label: '游戏类标准警示语', value: '游戏内容为广告演示，请以实际上线版本为准。' },
  { label: '金融类标准警示语', value: '投资有风险，入市需谨慎。' }
];
const WF_GENERIC_LABELS = new Set(['输入节点', 'Agent 节点', '产出物', '产出物节点']);
const WF_INPUT_VARIANTS = {
  copy: {
    value: 'copy',
    label: '文案输入',
    icon: '📝',
    subLabel: '输入节点 · 文案',
    outputType: '文案',
    configTitle: '输入节点',
    switchTitle: '输入类型',
    switchDescription: '同一个输入节点可在文案输入和视频输入之间切换。'
  },
  video: {
    value: 'video',
    label: '视频输入',
    icon: '🎞️',
    subLabel: '输入节点 · 视频',
    outputType: '视频',
    configTitle: '输入节点',
    switchTitle: '输入类型',
    switchDescription: '同一个输入节点可在文案输入和视频输入之间切换。'
  }
};
const WF_AGENT_VARIANTS = {
  script: {
    value: 'script',
    label: '脚本生成 Agent',
    icon: '📝',
    subLabel: 'Agent 节点 · 脚本生成',
    outputType: '脚本',
    configTitle: '脚本生成 Agent 节点'
  },
  video: {
    value: 'video',
    label: '视频生成 Agent',
    icon: '🎥',
    subLabel: 'Agent 节点 · 视频生成',
    outputType: '视频',
    configTitle: '视频生成 Agent 节点'
  },
  understand: {
    value: 'understand',
    label: '视频理解 Agent',
    icon: '🔍',
    subLabel: 'Agent 节点 · 视频理解',
    outputType: '分析报告',
    configTitle: '视频理解 Agent 节点'
  },
  translate: {
    value: 'translate',
    label: '文本翻译 Agent',
    icon: '🌐',
    subLabel: 'Agent 节点 · 文本翻译',
    outputType: '翻译',
    configTitle: '文本翻译 Agent 节点'
  },
  extract: {
    value: 'extract',
    label: '文案提取 Agent',
    icon: '✂️',
    subLabel: 'Agent 节点 · 文案提取',
    outputType: '脚本',
    configTitle: '文案提取 Agent 节点'
  },
  voice: {
    value: 'voice',
    label: '配音优化 Agent',
    icon: '🎙',
    subLabel: 'Agent 节点 · 配音优化',
    outputType: '配音',
    configTitle: '配音优化 Agent 节点'
  },
  disclaimer: {
    value: 'disclaimer',
    label: '添加警示语 Agent',
    icon: '⚠️',
    subLabel: 'Agent 节点 · 添加警示语',
    outputType: '视频',
    configTitle: '添加警示语 Agent 节点'
  }
};
const WF_INPUT_VARIANT_OPTIONS = [
  { value: 'copy', title: '文案输入', description: '直接输入文案内容，供后续节点引用' },
  { value: 'video', title: '视频输入', description: '上传视频文件或填写视频 URL 作为输入' }
];
const WF_AGENT_VARIANT_OPTIONS = [
  { value: 'script', title: '脚本生成', description: '根据创意和约束批量生成脚本' },
  { value: 'video', title: '视频生成', description: '调用视频模型生成成片' },
  { value: 'understand', title: '视频理解', description: '分析参考视频并提取风格信息' },
  { value: 'translate', title: '文本翻译', description: '生成多语言文案版本' },
  { value: 'extract', title: '文案提取', description: '从视频或图片中提取文本内容' },
  { value: 'voice', title: '配音优化', description: '将文本转换为可用的语音素材' },
  { value: 'disclaimer', title: '添加警示语', description: '为视频叠加合规提醒文案' }
];
const WF_DISCLAIMER_HISTORY_VIDEOS = ['品牌故事_v1.mp4', '品牌故事_v2.mp4', '新品发布_30s.mp4', 'product_intro_PT.mp4', 'product_intro_ES.mp4'];

// ===== Mock Tasks =====
const MOCK_TASKS = [
  {
    id: 'T-20260409-PC1',
    name: '新品发布-脚本确认',
    status: 'pending_confirm',
    source: 'workflow',
    toolName: '先生成脚本生成视频',
    product: '消除游戏',
    outputSummary: '脚本 3 条 待确认，视频待生成',
    createdAt: '2026-04-09 10:32',
    duration: '2 分 08 秒（已暂停）',
    videoModel: 'Grok',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-1',
    pendingConfirmNodeId: 'n3',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '8 秒',
        params: [
          { label: '任务名称', value: '新品发布-脚本确认' },
          { label: '任务描述', value: '先生成脚本并人工把关，确认通过后再进入视频生成阶段。' }
        ],
        outputs: [],
        outputSummary: '任务配置完成'
      },
      n2: {
        status: 'completed',
        duration: '1 分 46 秒',
        params: [
          { label: '创意描述', value: '突出新版本玩法更新与限时福利，节奏轻快，适合 15s 社媒投放。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '3' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '已生成 3 条候选脚本，等待用户确认'
      },
      n3: {
        status: 'pending_confirm',
        duration: '14 秒',
        needsConfirmation: true,
        confirmNote: '请检查这 3 条候选脚本的节奏、卖点表达是否符合新版本发布调性。确认通过后将自动进入视频生成阶段。',
        params: [
          { label: '产出物名称', value: '视频脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' },
          { label: '中断确认', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '新品发布_脚本_001.md', status: 'done', duration: '18 秒' },
          { name: '新品发布_脚本_002.md', status: 'done', duration: '20 秒' },
          { name: '新品发布_脚本_003.md', status: 'done', duration: '22 秒' }
        ],
        outputSummary: '3 条脚本已生成，等待用户确认'
      },
      n4: {
        status: 'waiting',
        duration: '—',
        params: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '20s' },
          { label: '画面比例', value: '9:16' },
          { label: '每条输入的生成数量', value: '1（上游 3 条脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [],
        outputSummary: '等待上游确认后启动'
      },
      n5: {
        status: 'waiting',
        duration: '—',
        params: [
          { label: '产出物名称', value: '广告视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [],
        outputSummary: '等待视频生成完成'
      }
    },
    outputs: [
      { name: '新品发布_脚本_001.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] },
      { name: '新品发布_脚本_002.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] },
      { name: '新品发布_脚本_003.md', status: 'done', duration: '22 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260330-001',
    toolId: 'tool-script',
    name: '消除游戏-618-5条',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '消除游戏',
    outputSummary: '脚本 5 条',
    createdAt: '2026-03-30 14:23',
    duration: '1 分 12 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '消除游戏-618-5条' },
          { label: '任务描述', value: '为 618 节点准备 5 条高转化脚本。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '强调快速赚钱、操作简单、真实截图展示，突出提现速度与新人福利。' },
          { label: '内容类型', value: '网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '5' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['品牌知识库', '高转化历史脚本'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: '脚本_001.md', status: 'done', duration: '11 秒', actions: ['预览', '复制', '下载'] },
      { name: '脚本_002.md', status: 'done', duration: '12 秒', actions: ['预览', '复制', '下载'] },
      { name: '脚本_003.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '脚本_004.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '脚本_005.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260330-002',
    toolId: 'tool-video',
    name: '消除游戏-Grok视频',
    status: 'generating',
    source: 'toolbox',
    toolName: '视频生成',
    product: '消除游戏',
    outputSummary: '视频 1 个（生成中）',
    createdAt: '2026-03-30 15:01',
    duration: '—',
    videoModel: 'Grok',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '消除游戏-Grok视频' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '20s' },
          { label: '参考图片', value: 'starter_product.png' },
          { label: '视频描述', value: 'A fast-paced vertical ad showing a young user receiving cash rewards in the app, bright UI close-ups, energetic pacing and celebratory reactions.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '1' }
        ]
      }
    ],
    outputs: [
      { name: '消除游戏_grok_001.mp4', status: 'processing', duration: '进行中', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260330-003',
    name: '春季活动-多语言',
    status: 'completed',
    source: 'workflow',
    toolName: '多语言视频生成',
    product: '春季营销',
    outputSummary: '脚本 9 条 + 视频 6 个',
    createdAt: '2026-03-30 10:15',
    duration: '8 分 42 秒',
    videoModel: 'Veo 3.1',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-4',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '12 秒',
        params: [
          { label: '任务名称', value: '春季活动-多语言' },
          { label: '任务描述', value: '先生成基础视频脚本，再拆分为葡语与西语两条视频生成分支。' }
        ],
        outputs: [],
        outputSummary: '多语言分支结构已确认'
      },
      n2: {
        status: 'completed',
        duration: '1 分 32 秒',
        params: [
          { label: '创意描述', value: '强调春季优惠、节奏轻快、适合社媒投放。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '3' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '基础视频脚本已生成'
      },
      n3: {
        status: 'completed',
        duration: '33 秒',
        params: [
          { label: '产出物名称', value: '视频脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '春季_视频脚本_001.md', status: 'done', duration: '28 秒' },
          { name: '春季_视频脚本_002.md', status: 'done', duration: '31 秒' },
          { name: '春季_视频脚本_003.md', status: 'done', duration: '33 秒' }
        ],
        outputSummary: '生成 3 条可供多语言分支复用的视频脚本'
      },
      n4: {
        status: 'completed',
        duration: '46 秒',
        params: [
          { label: '目标语言', value: '葡萄牙语（巴西）' },
          { label: '翻译风格', value: '广告文案' },
          { label: '语言级配置', value: '葡萄牙语（巴西）｜市场：巴西' }
        ],
        outputs: [],
        outputSummary: '葡语翻译任务已执行'
      },
      n5: {
        status: 'completed',
        duration: '19 秒',
        params: [
          { label: '产出物名称', value: '葡语脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}_{语种}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '春季_PT_001.txt', status: 'done', duration: '16 秒' },
          { name: '春季_PT_002.txt', status: 'done', duration: '18 秒' },
          { name: '春季_PT_003.txt', status: 'done', duration: '19 秒' }
        ],
        outputSummary: '完成 3 条葡语脚本'
      },
      n6: {
        status: 'completed',
        duration: '2 分 38 秒',
        params: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '16s' },
          { label: '画面比例', value: '9:16' },
          { label: '参考图片', value: 'spring_visual_pt.png' },
          { label: '每条输入的生成数量', value: '1（上游 3 条葡语脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [],
        outputSummary: '已提交 3 条葡语视频生成任务'
      },
      n7: {
        status: 'completed',
        duration: '37 秒',
        params: [
          { label: '产出物名称', value: '葡语视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '春季_PT_001.mp4', status: 'done', duration: '47 秒' },
          { name: '春季_PT_002.mp4', status: 'done', duration: '51 秒' },
          { name: '春季_PT_003.mp4', status: 'done', duration: '1 分 00 秒' }
        ],
        outputSummary: '已归档 3 个葡语视频到素材库'
      },
      n8: {
        status: 'completed',
        duration: '48 秒',
        params: [
          { label: '目标语言', value: '西班牙语（哥伦比亚）' },
          { label: '翻译风格', value: '广告文案' },
          { label: '语言级配置', value: '西班牙语（哥伦比亚）｜市场：哥伦比亚' }
        ],
        outputs: [],
        outputSummary: '西语翻译任务已执行'
      },
      n9: {
        status: 'completed',
        duration: '20 秒',
        params: [
          { label: '产出物名称', value: '西语脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}_{语种}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '春季_ES_001.txt', status: 'done', duration: '17 秒' },
          { name: '春季_ES_002.txt', status: 'done', duration: '19 秒' },
          { name: '春季_ES_003.txt', status: 'done', duration: '20 秒' }
        ],
        outputSummary: '完成 3 条西语脚本'
      },
      n10: {
        status: 'completed',
        duration: '2 分 43 秒',
        params: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '16s' },
          { label: '画面比例', value: '9:16' },
          { label: '参考图片', value: 'spring_visual_es.png' },
          { label: '每条输入的生成数量', value: '1（上游 3 条西语脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [],
        outputSummary: '已提交 3 条西语视频生成任务'
      },
      n11: {
        status: 'completed',
        duration: '39 秒',
        params: [
          { label: '产出物名称', value: '西语视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '春季_ES_001.mp4', status: 'done', duration: '49 秒' },
          { name: '春季_ES_002.mp4', status: 'done', duration: '56 秒' },
          { name: '春季_ES_003.mp4', status: 'done', duration: '1 分 02 秒' }
        ],
        outputSummary: '已归档 3 个西语视频到素材库'
      }
    },
    outputs: [
      { name: '春季_视频脚本_001.md', status: 'done', duration: '28 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_视频脚本_002.md', status: 'done', duration: '31 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_视频脚本_003.md', status: 'done', duration: '33 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_PT_001.txt', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_PT_002.txt', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_PT_003.txt', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_PT_001.mp4', status: 'done', duration: '47 秒', actions: ['播放', '下载'] },
      { name: '春季_PT_002.mp4', status: 'done', duration: '51 秒', actions: ['播放', '下载'] },
      { name: '春季_PT_003.mp4', status: 'done', duration: '1 分 00 秒', actions: ['播放', '下载'] },
      { name: '春季_ES_001.txt', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_ES_002.txt', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_ES_003.txt', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季_ES_001.mp4', status: 'done', duration: '49 秒', actions: ['播放', '下载'] },
      { name: '春季_ES_002.mp4', status: 'done', duration: '56 秒', actions: ['播放', '下载'] },
      { name: '春季_ES_003.mp4', status: 'done', duration: '1 分 02 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260329-001',
    name: '赚钱App-爆款模仿',
    status: 'completed',
    source: 'workflow',
    toolName: '模仿爆款视频',
    product: '赚钱App',
    outputSummary: '分析报告 1 份 + 脚本 3 条 + 视频 3 个',
    createdAt: '2026-03-29 16:30',
    duration: '12 分 05 秒',
    videoModel: 'Grok',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-3',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '10 秒',
        params: [
          { label: '任务名称', value: '赚钱App-爆款模仿' },
          { label: '任务描述', value: '先拆解竞品爆款视频并沉淀分析报告，再生成 3 条脚本和 3 个视频。' }
        ],
        outputs: [],
        outputSummary: '任务配置已保存'
      },
      n2: {
        status: 'completed',
        duration: '1 分 48 秒',
        params: [
          { label: '视频输入方式', value: '上传文件' },
          { label: '额外上下文', value: '这是一个印尼赚钱 App 广告。' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '视频理解完成，已生成 1 份综合分析报告'
      },
      n3: {
        status: 'completed',
        duration: '58 秒',
        params: [
          { label: '产出物名称', value: '分析报告' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '爆款视频分析报告.md', status: 'done', duration: '58 秒' }
        ],
        outputSummary: '生成 1 份分析报告，内含风格拆解、镜头描述和视频生成提示词'
      },
      n4: {
        status: 'completed',
        duration: '1 分 06 秒',
        params: [
          { label: '创意描述', value: '延续竞品的开场钩子、强节奏镜头和提现反馈桥段，重写成适配本产品的广告脚本。' },
          { label: '内容类型', value: '网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '3' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '基于分析报告生成 3 条同类脚本'
      },
      n5: {
        status: 'completed',
        duration: '41 秒',
        params: [
          { label: '产出物名称', value: '脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '爆款_脚本_001.md', status: 'done', duration: '18 秒' },
          { name: '爆款_脚本_002.md', status: 'done', duration: '19 秒' },
          { name: '爆款_脚本_003.md', status: 'done', duration: '21 秒' }
        ],
        outputSummary: '生成 3 条同类脚本'
      },
      n6: {
        status: 'completed',
        duration: '7 分 36 秒',
        params: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '20s' },
          { label: '画面比例', value: '9:16' },
          { label: '每条输入的生成数量', value: '1（上游 3 条脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [],
        outputSummary: '根据脚本完成 3 个视频生成任务'
      },
      n7: {
        status: 'completed',
        duration: '33 秒',
        params: [
          { label: '产出物名称', value: '视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '爆款_video_001.mp4', status: 'done', duration: '2 分 11 秒' },
          { name: '爆款_video_002.mp4', status: 'done', duration: '2 分 18 秒' },
          { name: '爆款_video_003.mp4', status: 'done', duration: '2 分 23 秒' }
        ],
        outputSummary: '脚本与视频已全部归档'
      }
    },
    outputs: [
      { name: '爆款视频分析报告.md', status: 'done', duration: '58 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_脚本_001.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_脚本_002.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_脚本_003.md', status: 'done', duration: '21 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_video_001.mp4', status: 'done', duration: '2 分 11 秒', actions: ['播放', '下载'] },
      { name: '爆款_video_002.mp4', status: 'done', duration: '2 分 18 秒', actions: ['播放', '下载'] },
      { name: '爆款_video_003.mp4', status: 'done', duration: '2 分 23 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260329-002',
    toolId: 'tool-voice',
    name: '产品介绍-配音',
    status: 'completed',
    source: 'toolbox',
    toolName: '配音优化',
    product: '消除游戏',
    outputSummary: '配音 1 条',
    createdAt: '2026-03-29 11:20',
    duration: '32 秒',
    videoModel: null,
    outputTypes: ['voice'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '产品介绍-配音' }]
      },
      {
        title: '配音优化 Agent 设置',
        fields: [
          { label: '配音文本来源', value: '从脚本库选择' },
          { label: '脚本选择', value: '消除游戏-网赚类脚本 / 脚本_002.md' },
          { label: '语言 / 音色分类', value: 'CN 中文 36 个' },
          { label: '音色', value: '精英青年' },
          { label: '语速', value: '1.2x' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '音量', value: '1.0' },
          { label: '语调', value: '0' },
          { label: '背景音乐', value: '开启 · 轻快' }
        ]
      }
    ],
    outputs: [
      { name: '产品介绍_配音.mp3', status: 'done', duration: '32 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260328-001',
    toolId: 'tool-translate',
    name: '海外投放-翻译',
    status: 'completed',
    source: 'toolbox',
    toolName: '文本翻译',
    product: '赚钱App',
    outputSummary: '翻译 4 语言',
    createdAt: '2026-03-28 09:45',
    duration: '2 分 15 秒',
    videoModel: null,
    outputTypes: ['translation'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '海外投放-翻译' }]
      },
      {
        title: '文本翻译 Agent 设置',
        fields: [
          { label: '翻译内容来源', value: '从脚本库选择' },
          { label: '脚本选择（从脚本库时）', value: ['消除游戏-网赚类脚本 / 脚本_001.md · 2026-03-28', '消除游戏-网赚类脚本 / 脚本_004.md · 2026-03-28'], kind: 'tags' },
          { label: '源语言', value: '自动检测' },
          { label: '目标语言', value: ['英文', '葡萄牙语（巴西）', '日语', '印尼语'], kind: 'tags' },
          { label: '翻译风格', value: '广告文案' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '语言级配置', value: ['英文｜市场：无特定语料', '葡萄牙语（巴西）｜市场：巴西', '日语｜市场：日本', '印尼语｜市场：印尼'], kind: 'tags' },
          { label: '术语表', value: '英文：withdraw=提现\n印尼语：cash reward=现金奖励' }
        ]
      }
    ],
    outputs: [
      { name: '译文_EN.txt', status: 'done', duration: '23 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_BR.txt', status: 'done', duration: '27 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_JP.txt', status: 'done', duration: '31 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_ID.txt', status: 'done', duration: '29 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260328-002',
    toolId: 'tool-understand',
    name: '竞品分析-视频理解',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频理解',
    product: '—',
    outputSummary: '分析报告 1 份',
    createdAt: '2026-03-28 14:10',
    duration: '1 分 48 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '竞品分析-视频理解' }]
      },
      {
        title: '视频理解 Agent 设置',
        fields: [
          { label: '视频输入方式', value: '上传文件' },
          { label: '额外上下文', value: '这是一个印尼赚钱 App 广告，目标人群为 18-30 岁移动端用户。' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [{ label: '底层模型', value: 'Gemini 2.5 Pro' }]
      },
      {
        title: '输出结构（分析完成后展示）',
        fields: [
          { label: '整体风格分析', value: '广告 / 应用推广；真人出镜与界面演示结合；节奏轻快且富有感染力；情绪从好奇到惊喜；关键词：手机赚钱应用、零钱到账、提现页面。' },
          { label: '逐镜头视觉描述', value: '镜头 1：年轻女性展示手机界面；镜头 2：任务列表快速切换；镜头 3：提现到账界面特写。' },
          { label: '视频生成提示词（完整）', value: 'A vertical mobile ad showing a young Indonesian female creator using a reward app, fast UI close-ups, bright color grading, energetic pacing, cash-out success reaction.' }
        ]
      }
    ],
    outputs: [
      { name: '竞品分析报告.md', status: 'done', duration: '1 分 48 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260327-001',
    toolId: 'tool-video',
    name: 'Veo3.1-测试视频',
    status: 'failed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '消除游戏',
    outputSummary: '视频 2 个（1 成功 1 失败）',
    createdAt: '2026-03-27 17:00',
    duration: '5 分 20 秒',
    videoModel: 'Veo 3.1',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: 'Veo3.1-测试视频' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '16s' },
          { label: '起始帧图片', value: 'game_ui_start.png' },
          { label: '结束帧图片', value: 'game_ui_end.png' },
          { label: '参考图片', value: 'game_ui_ref.png' },
          { label: '视频描述', value: 'Generate a short 9:16 ad showing the gameplay loop, cash reward popup and a final CTA scene.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '2' }
        ]
      }
    ],
    outputs: [
      { name: 'veo31_001.mp4', status: 'done', duration: '2 分 11 秒', actions: ['播放', '下载'] },
      { name: 'veo31_002.mp4', status: 'failed', duration: '3 分 09 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260326-001',
    name: '消除游戏-脚本生成视频',
    status: 'partial',
    source: 'workflow',
    toolName: '先生成脚本生成视频',
    product: '消除游戏',
    outputSummary: '脚本 3 条 + 视频 2 个（1 失败）',
    createdAt: '2026-03-26 10:00',
    duration: '15 分 30 秒',
    videoModel: 'Grok',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-1',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '14 秒',
        params: [
          { label: '任务名称', value: '消除游戏-脚本生成视频' },
          { label: '任务描述', value: '先生成脚本，再批量生成广告视频。' }
        ],
        outputs: [],
        outputSummary: '任务上下文已建立'
      },
      n2: {
        status: 'completed',
        duration: '2 分 08 秒',
        params: [
          { label: '创意描述', value: '展示真实游戏截图与提现反馈，节奏紧凑。' },
          { label: '内容类型', value: '网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '3' },
          { label: '底层模型', value: 'Gemini 2.5 Flash' }
        ],
        outputs: [
          { name: '脚本_a.md', status: 'done', duration: '21 秒' },
          { name: '脚本_b.md', status: 'done', duration: '18 秒' },
          { name: '脚本_c.md', status: 'done', duration: '22 秒' }
        ],
        outputSummary: '已生成 3 条脚本'
      },
      n3: {
        status: 'completed',
        duration: '36 秒',
        params: [
          { label: '产出物名称', value: '视频脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '脚本_a.md', status: 'done', duration: '21 秒' },
          { name: '脚本_b.md', status: 'done', duration: '18 秒' },
          { name: '脚本_c.md', status: 'done', duration: '22 秒' }
        ],
        outputSummary: '3 条脚本已产出'
      },
      n4: {
        status: 'failed',
        duration: '11 分 45 秒',
        params: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '30s' },
          { label: '画面比例', value: '9:16' },
          { label: '每条输入的生成数量', value: '1（上游 3 条脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [
          { name: 'video_a.mp4', status: 'done', duration: '4 分 51 秒' },
          { name: 'video_b.mp4', status: 'failed', duration: '6 分 54 秒' }
        ],
        outputSummary: '2 个视频成功，1 个视频失败'
      },
      n5: {
        status: 'failed',
        duration: '47 秒',
        params: [
          { label: '产出物名称', value: '广告视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: 'video_a.mp4', status: 'done', duration: '4 分 51 秒' },
          { name: 'video_b.mp4', status: 'failed', duration: '6 分 54 秒' }
        ],
        outputSummary: '已汇总 5 个产出物，其中 1 个失败'
      }
    },
    outputs: [
      { name: '脚本_a.md', status: 'done', duration: '21 秒', actions: ['预览', '复制', '下载'] },
      { name: '脚本_b.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] },
      { name: '脚本_c.md', status: 'done', duration: '22 秒', actions: ['预览', '复制', '下载'] },
      { name: 'video_a.mp4', status: 'done', duration: '4 分 51 秒', actions: ['播放', '下载'] },
      { name: 'video_b.mp4', status: 'failed', duration: '6 分 54 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260327-101',
    toolId: 'tool-extract',
    name: '口播视频-文案提取',
    status: 'completed',
    source: 'toolbox',
    toolName: '文案提取',
    product: '品牌推广',
    outputSummary: '提取文本 1 份',
    createdAt: '2026-03-27 09:10',
    duration: '2 分 46 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '口播视频-文案提取' }]
      },
      {
        title: '文案提取 Agent 设置',
        fields: [
          { label: '素材类型', value: '视频' },
          { label: '素材上传', value: 'brand_talking_head.mp4' },
          { label: '提取内容', value: ['台词 / 旁白', '字幕文字', '标题'], kind: 'tags' },
          { label: '输出语言', value: '保持原语言' },
          { label: '时间戳输出', value: '关闭', kind: 'toggle-off' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ]
      }
    ],
    outputs: [
      { name: '提取文本.md', status: 'done', duration: '51 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260327-102',
    toolId: 'tool-video',
    name: '新品发布-Veo31',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '品牌推广',
    outputSummary: '视频 1 个',
    createdAt: '2026-03-27 13:25',
    duration: '5 分 08 秒',
    videoModel: 'Veo 3.1',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '新品发布-Veo31' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '16s' },
          { label: '起始帧图片', value: 'start_frame.png' },
          { label: '结束帧图片', value: 'end_frame.png' },
          { label: '参考图片', value: 'style_reference.png' },
          { label: '视频描述', value: 'A premium product launch film with dramatic lighting, slow reveal shots and clean brand typography.' },
          { label: '画面比例', value: '16:9' },
          { label: '生成数量', value: '1' }
        ]
      }
    ],
    outputs: [
      { name: '新品发布_veo31_001.mp4', status: 'done', duration: '5 分 08 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260413-001',
    toolId: 'tool-script',
    name: '消除游戏-清明节脚本',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '消除游戏',
    outputSummary: '脚本 4 条',
    createdAt: '2026-04-13 09:18',
    duration: '58 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '消除游戏-清明节脚本' },
          { label: '任务描述', value: '清明小长假主题脚本素材，配合短假期投放节奏。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '清明小长假主题，强调休闲娱乐与限时礼包，目标人群为下沉市场。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '15s' },
          { label: '脚本数量', value: '4' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['品牌知识库', '节假日营销话术'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: '清明_脚本_001.md', status: 'done', duration: '12 秒', actions: ['预览', '复制', '下载'] },
      { name: '清明_脚本_002.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '清明_脚本_003.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '清明_脚本_004.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260413-002',
    toolId: 'tool-video',
    name: '春季营销-Grok短视频',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '春季营销',
    outputSummary: '视频 2 个',
    createdAt: '2026-04-13 11:42',
    duration: '4 分 12 秒',
    videoModel: 'Grok',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '春季营销-Grok短视频' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '15s' },
          { label: '参考图片', value: 'spring_visual_ref.png' },
          { label: '视频描述', value: 'A bright spring-themed vertical ad with cherry blossom transitions, energetic pacing and quick UI close-ups of the gameplay loop.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '2' }
        ]
      }
    ],
    outputs: [
      { name: '春季_grok_001.mp4', status: 'done', duration: '2 分 02 秒', actions: ['播放', '下载'] },
      { name: '春季_grok_002.mp4', status: 'done', duration: '2 分 10 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260413-003',
    toolId: 'tool-translate',
    name: '赚钱App-五语言翻译',
    status: 'completed',
    source: 'toolbox',
    toolName: '文本翻译',
    product: '赚钱App',
    outputSummary: '翻译 5 语言',
    createdAt: '2026-04-13 14:55',
    duration: '2 分 48 秒',
    videoModel: null,
    outputTypes: ['translation'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '赚钱App-五语言翻译' },
          { label: '任务描述', value: '为东南亚 + 拉美双区域投放准备 5 语言广告译文。' }
        ]
      },
      {
        title: '文本翻译 Agent 设置',
        fields: [
          { label: '翻译内容来源', value: '从脚本库选择' },
          { label: '脚本选择（从脚本库时）', value: ['赚钱App-提现脚本 / 脚本_001.md · 2026-04-12', '赚钱App-提现脚本 / 脚本_002.md · 2026-04-12'], kind: 'tags' },
          { label: '源语言', value: '中文（简体）' },
          { label: '目标语言', value: ['英文', '葡萄牙语（巴西）', '日语', '印尼语', '泰语'], kind: 'tags' },
          { label: '翻译风格', value: '广告文案' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '语言级配置', value: ['英文｜市场：无特定语料', '葡萄牙语（巴西）｜市场：巴西', '日语｜市场：日本', '印尼语｜市场：印尼', '泰语｜市场：泰国'], kind: 'tags' },
          { label: '术语表', value: '英文：withdraw=提现\n印尼语：cash reward=现金奖励\n泰语：bonus=新人福利' }
        ]
      }
    ],
    outputs: [
      { name: '译文_EN.txt', status: 'done', duration: '28 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_BR.txt', status: 'done', duration: '32 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_JP.txt', status: 'done', duration: '34 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_ID.txt', status: 'done', duration: '30 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_TH.txt', status: 'done', duration: '34 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260413-004',
    toolId: 'tool-video',
    name: '品牌推广-Veo3.1首发',
    status: 'generating',
    source: 'toolbox',
    toolName: '视频生成',
    product: '品牌推广',
    outputSummary: '视频 1 个（生成中）',
    createdAt: '2026-04-13 16:30',
    duration: '—',
    videoModel: 'Veo 3.1',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '品牌推广-Veo3.1首发' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '20s' },
          { label: '起始帧图片', value: 'brand_intro_start.png' },
          { label: '结束帧图片', value: 'brand_intro_end.png' },
          { label: '参考图片', value: 'brand_style_ref.png' },
          { label: '视频描述', value: 'A premium brand reveal film with cinematic camera moves, soft lighting and crisp typography for the new flagship product.' },
          { label: '画面比例', value: '16:9' },
          { label: '生成数量', value: '1' }
        ]
      }
    ],
    outputs: [
      { name: '品牌_veo31_001.mp4', status: 'processing', duration: '进行中', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260412-001',
    toolId: 'tool-script',
    name: '赚钱App-提现主题',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '赚钱App',
    outputSummary: '脚本 3 条',
    createdAt: '2026-04-12 09:50',
    duration: '46 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '赚钱App-提现主题' },
          { label: '任务描述', value: '主打提现快、新人福利的高转化脚本。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '突出快速到账与新人福利，聚焦真实用户场景。' },
          { label: '内容类型', value: '网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '3' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['品牌知识库', '高转化历史脚本'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: '提现_脚本_001.md', status: 'done', duration: '13 秒', actions: ['预览', '复制', '下载'] },
      { name: '提现_脚本_002.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '提现_脚本_003.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260412-002',
    toolId: 'tool-voice',
    name: '消除游戏-双音色配音',
    status: 'completed',
    source: 'toolbox',
    toolName: '配音优化',
    product: '消除游戏',
    outputSummary: '配音 2 条',
    createdAt: '2026-04-12 13:08',
    duration: '1 分 04 秒',
    videoModel: null,
    outputTypes: ['voice'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '消除游戏-双音色配音' }]
      },
      {
        title: '配音优化 Agent 设置',
        fields: [
          { label: '配音文本来源', value: '手动输入' },
          { label: '配音文本', value: '现金福利等你领，每天闯关都有惊喜——快来一起赢现金！' },
          { label: '语言 / 音色分类', value: 'CN 中文 36 个' },
          { label: '音色', value: '阳光男声 + 甜美少女' },
          { label: '语速', value: '1.1x' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '音量', value: '1.0' },
          { label: '语调', value: '+1' },
          { label: '背景音乐', value: '开启 · 轻快' }
        ]
      }
    ],
    outputs: [
      { name: '配音_男声.mp3', status: 'done', duration: '30 秒', actions: ['播放', '下载'] },
      { name: '配音_女声.mp3', status: 'done', duration: '34 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260412-003',
    name: '春季营销-脚本视频联动',
    status: 'completed',
    source: 'workflow',
    toolName: '先生成脚本生成视频',
    product: '春季营销',
    outputSummary: '脚本 3 条 + 视频 3 个',
    createdAt: '2026-04-12 16:22',
    duration: '7 分 18 秒',
    videoModel: 'Grok',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-1',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '11 秒',
        params: [
          { label: '任务名称', value: '春季营销-脚本视频联动' },
          { label: '任务描述', value: '春季营销节点的脚本 + 视频一体化产出。' }
        ],
        outputs: [],
        outputSummary: '任务上下文已建立'
      },
      n2: {
        status: 'completed',
        duration: '1 分 22 秒',
        params: [
          { label: '创意描述', value: '春日轻快节奏，强调踏青场景与限时折扣。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '15s' },
          { label: '脚本数量', value: '3' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [
          { name: '春季联动_脚本_001.md', status: 'done', duration: '14 秒' },
          { name: '春季联动_脚本_002.md', status: 'done', duration: '16 秒' },
          { name: '春季联动_脚本_003.md', status: 'done', duration: '17 秒' }
        ],
        outputSummary: '已生成 3 条候选脚本'
      },
      n3: {
        status: 'completed',
        duration: '28 秒',
        params: [
          { label: '产出物名称', value: '视频脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '春季联动_脚本_001.md', status: 'done', duration: '14 秒' },
          { name: '春季联动_脚本_002.md', status: 'done', duration: '16 秒' },
          { name: '春季联动_脚本_003.md', status: 'done', duration: '17 秒' }
        ],
        outputSummary: '3 条脚本已归档到素材库'
      },
      n4: {
        status: 'completed',
        duration: '4 分 32 秒',
        params: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '15s' },
          { label: '画面比例', value: '9:16' },
          { label: '每条输入的生成数量', value: '1（上游 3 条脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [
          { name: '春季联动_001.mp4', status: 'done', duration: '2 分 10 秒' },
          { name: '春季联动_002.mp4', status: 'done', duration: '2 分 14 秒' },
          { name: '春季联动_003.mp4', status: 'done', duration: '2 分 27 秒' }
        ],
        outputSummary: '已完成 3 个视频生成任务'
      },
      n5: {
        status: 'completed',
        duration: '25 秒',
        params: [
          { label: '产出物名称', value: '广告视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '春季联动_001.mp4', status: 'done', duration: '2 分 10 秒' },
          { name: '春季联动_002.mp4', status: 'done', duration: '2 分 14 秒' },
          { name: '春季联动_003.mp4', status: 'done', duration: '2 分 27 秒' }
        ],
        outputSummary: '3 个视频已归档到素材库'
      }
    },
    outputs: [
      { name: '春季联动_脚本_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季联动_脚本_002.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季联动_脚本_003.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季联动_001.mp4', status: 'done', duration: '2 分 10 秒', actions: ['播放', '下载'] },
      { name: '春季联动_002.mp4', status: 'done', duration: '2 分 14 秒', actions: ['播放', '下载'] },
      { name: '春季联动_003.mp4', status: 'done', duration: '2 分 27 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260411-001',
    toolId: 'tool-extract',
    name: '竞品-文案提取',
    status: 'completed',
    source: 'toolbox',
    toolName: '文案提取',
    product: '—',
    outputSummary: '提取文本 1 份',
    createdAt: '2026-04-11 10:14',
    duration: '1 分 38 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '竞品-文案提取' }]
      },
      {
        title: '文案提取 Agent 设置',
        fields: [
          { label: '素材类型', value: '视频' },
          { label: '素材上传', value: 'competitor_ad_april.mp4' },
          { label: '提取内容', value: ['台词 / 旁白', '字幕文字'], kind: 'tags' },
          { label: '输出语言', value: '保持原语言' },
          { label: '时间戳输出', value: '关闭', kind: 'toggle-off' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ]
      }
    ],
    outputs: [
      { name: '提取文本.md', status: 'done', duration: '48 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260411-002',
    toolId: 'tool-video',
    name: '消除游戏-Grok批量',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '消除游戏',
    outputSummary: '视频 4 个',
    createdAt: '2026-04-11 14:36',
    duration: '8 分 22 秒',
    videoModel: 'Grok',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '消除游戏-Grok批量' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '15s' },
          { label: '参考图片', value: 'gameplay_loop_ref.png' },
          { label: '视频描述', value: 'A high-energy mobile gameplay montage emphasising chain combos, cash reward popups and celebratory close-ups, optimised for short-form social.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '4' }
        ]
      }
    ],
    outputs: [
      { name: '消除_grok_001.mp4', status: 'done', duration: '2 分 04 秒', actions: ['播放', '下载'] },
      { name: '消除_grok_002.mp4', status: 'done', duration: '2 分 06 秒', actions: ['播放', '下载'] },
      { name: '消除_grok_003.mp4', status: 'done', duration: '2 分 02 秒', actions: ['播放', '下载'] },
      { name: '消除_grok_004.mp4', status: 'done', duration: '2 分 10 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260411-003',
    toolId: 'tool-translate',
    name: '品牌推广-双语字幕',
    status: 'failed',
    source: 'toolbox',
    toolName: '文本翻译',
    product: '品牌推广',
    outputSummary: '翻译失败：源文件解析异常',
    createdAt: '2026-04-11 17:48',
    duration: '12 秒',
    videoModel: null,
    outputTypes: ['translation'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '品牌推广-双语字幕' },
          { label: '任务描述', value: '为品牌片生成英文与日文字幕。' }
        ]
      },
      {
        title: '文本翻译 Agent 设置',
        fields: [
          { label: '翻译内容来源', value: '上传文件' },
          { label: '上传文件', value: 'brand_film_subtitle.srt' },
          { label: '源语言', value: '自动检测' },
          { label: '目标语言', value: ['英文', '日语'], kind: 'tags' },
          { label: '翻译风格', value: '广告文案' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '语言级配置', value: ['英文｜市场：无特定语料', '日语｜市场：日本'], kind: 'tags' },
          { label: '术语表', value: '（未配置）' }
        ]
      }
    ],
    outputs: [
      { name: '译文_EN.txt', status: 'failed', duration: '12 秒', actions: ['重试'] }
    ]
  },
  {
    id: 'T-20260410-001',
    toolId: 'tool-script',
    name: '多语言投放-印尼脚本',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '多语言投放',
    outputSummary: '脚本 5 条',
    createdAt: '2026-04-10 09:30',
    duration: '1 分 22 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '多语言投放-印尼脚本' },
          { label: '任务描述', value: '面向印尼市场的本地化广告脚本素材。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '面向印尼用户，强调本地化场景、家庭聚会和现金奖励福利。' },
          { label: '内容类型', value: '网赚类' },
          { label: '配音语言', value: '印尼语' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '5' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['印尼市场语料', '海外赚钱App话术'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: 'ID_脚本_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: 'ID_脚本_002.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: 'ID_脚本_003.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: 'ID_脚本_004.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: 'ID_脚本_005.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260410-002',
    name: '多语言投放-葡西联动',
    status: 'completed',
    source: 'workflow',
    toolName: '多语言视频生成',
    product: '多语言投放',
    outputSummary: '脚本 6 条 + 视频 4 个',
    createdAt: '2026-04-10 13:55',
    duration: '12 分 36 秒',
    videoModel: 'Veo 3.1',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-4',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '13 秒',
        params: [
          { label: '任务名称', value: '多语言投放-葡西联动' },
          { label: '任务描述', value: '生成基础脚本后，分别拆分为葡语和西语两条视频生成分支。' }
        ],
        outputs: [],
        outputSummary: '多语言分支结构已确认'
      },
      n2: {
        status: 'completed',
        duration: '1 分 18 秒',
        params: [
          { label: '创意描述', value: '强调拉美用户的家庭与社交场景，节奏轻快、易共鸣。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '2' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '基础视频脚本已生成'
      },
      n3: {
        status: 'completed',
        duration: '24 秒',
        params: [
          { label: '产出物名称', value: '视频脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '葡西基础_脚本_001.md', status: 'done', duration: '20 秒' },
          { name: '葡西基础_脚本_002.md', status: 'done', duration: '24 秒' }
        ],
        outputSummary: '生成 2 条供多语言分支复用的脚本'
      },
      n4: {
        status: 'completed',
        duration: '38 秒',
        params: [
          { label: '目标语言', value: '葡萄牙语（巴西）' },
          { label: '翻译风格', value: '广告文案' },
          { label: '语言级配置', value: '葡萄牙语（巴西）｜市场：巴西' }
        ],
        outputs: [],
        outputSummary: '葡语翻译任务已执行'
      },
      n5: {
        status: 'completed',
        duration: '17 秒',
        params: [
          { label: '产出物名称', value: '葡语脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}_{语种}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '葡语_脚本_001.md', status: 'done', duration: '15 秒' },
          { name: '葡语_脚本_002.md', status: 'done', duration: '18 秒' }
        ],
        outputSummary: '完成 2 条葡语脚本'
      },
      n6: {
        status: 'completed',
        duration: '3 分 36 秒',
        params: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '20s' },
          { label: '画面比例', value: '9:16' },
          { label: '参考图片', value: 'latam_visual_pt.png' },
          { label: '每条输入的生成数量', value: '1（上游 2 条葡语脚本 × 1 = 总计 2 个视频）' }
        ],
        outputs: [],
        outputSummary: '已提交 2 条葡语视频生成任务'
      },
      n7: {
        status: 'completed',
        duration: '32 秒',
        params: [
          { label: '产出物名称', value: '葡语视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '葡语_视频_001.mp4', status: 'done', duration: '3 分 08 秒' },
          { name: '葡语_视频_002.mp4', status: 'done', duration: '3 分 12 秒' }
        ],
        outputSummary: '已归档 2 个葡语视频到素材库'
      },
      n8: {
        status: 'completed',
        duration: '40 秒',
        params: [
          { label: '目标语言', value: '西班牙语（哥伦比亚）' },
          { label: '翻译风格', value: '广告文案' },
          { label: '语言级配置', value: '西班牙语（哥伦比亚）｜市场：哥伦比亚' }
        ],
        outputs: [],
        outputSummary: '西语翻译任务已执行'
      },
      n9: {
        status: 'completed',
        duration: '18 秒',
        params: [
          { label: '产出物名称', value: '西语脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}_{语种}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '西语_脚本_001.md', status: 'done', duration: '17 秒' },
          { name: '西语_脚本_002.md', status: 'done', duration: '20 秒' }
        ],
        outputSummary: '完成 2 条西语脚本'
      },
      n10: {
        status: 'completed',
        duration: '3 分 28 秒',
        params: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '20s' },
          { label: '画面比例', value: '9:16' },
          { label: '参考图片', value: 'latam_visual_es.png' },
          { label: '每条输入的生成数量', value: '1（上游 2 条西语脚本 × 1 = 总计 2 个视频）' }
        ],
        outputs: [],
        outputSummary: '已提交 2 条西语视频生成任务'
      },
      n11: {
        status: 'completed',
        duration: '32 秒',
        params: [
          { label: '产出物名称', value: '西语视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '西语_视频_001.mp4', status: 'done', duration: '3 分 02 秒' },
          { name: '西语_视频_002.mp4', status: 'done', duration: '3 分 16 秒' }
        ],
        outputSummary: '已归档 2 个西语视频到素材库'
      }
    },
    outputs: [
      { name: '葡西基础_脚本_001.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] },
      { name: '葡西基础_脚本_002.md', status: 'done', duration: '24 秒', actions: ['预览', '复制', '下载'] },
      { name: '葡语_脚本_001.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '葡语_脚本_002.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] },
      { name: '西语_脚本_001.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '西语_脚本_002.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] },
      { name: '葡语_视频_001.mp4', status: 'done', duration: '3 分 08 秒', actions: ['播放', '下载'] },
      { name: '葡语_视频_002.mp4', status: 'done', duration: '3 分 12 秒', actions: ['播放', '下载'] },
      { name: '西语_视频_001.mp4', status: 'done', duration: '3 分 02 秒', actions: ['播放', '下载'] },
      { name: '西语_视频_002.mp4', status: 'done', duration: '3 分 16 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260410-003',
    toolId: 'tool-understand',
    name: '春季营销-竞品理解',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频理解',
    product: '春季营销',
    outputSummary: '分析报告 1 份',
    createdAt: '2026-04-10 16:18',
    duration: '1 分 32 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '春季营销-竞品理解' }]
      },
      {
        title: '视频理解 Agent 设置',
        fields: [
          { label: '视频输入方式', value: '上传文件' },
          { label: '额外上下文', value: '春季品牌广告样片，目标人群为 25-35 岁女性用户。' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [{ label: '底层模型', value: 'Gemini 2.5 Pro' }]
      },
      {
        title: '输出结构（分析完成后展示）',
        fields: [
          { label: '整体风格分析', value: '春季品牌广告；柔和色调与花瓣转场，节奏舒缓，情绪以温暖、希望为主。关键词：踏青、家庭聚会、新季上新。' },
          { label: '逐镜头视觉描述', value: '镜头 1：清晨花海特写；镜头 2：母女户外野餐；镜头 3：产品柔光特写与品牌 logo 收尾。' },
          { label: '视频生成提示词（完整）', value: 'A spring brand commercial with soft pastel color grading, blooming flowers transitions, family picnic scenes and gentle product close-ups, ending on a warm logo reveal.' }
        ]
      }
    ],
    outputs: [
      { name: '春季_竞品分析.md', status: 'done', duration: '1 分 32 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260408-001',
    toolId: 'tool-script',
    name: '消除游戏-母亲节脚本',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '消除游戏',
    outputSummary: '脚本 4 条',
    createdAt: '2026-04-08 10:08',
    duration: '1 分 02 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '消除游戏-母亲节脚本' },
          { label: '任务描述', value: '母亲节情感营销脚本，配合亲情陪伴向素材投放。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '母亲节温情主题，强调亲情陪伴、共同游戏与轻松解压氛围。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '15s' },
          { label: '脚本数量', value: '4' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['品牌知识库', '节日情感营销话术'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: '母亲节_脚本_001.md', status: 'done', duration: '13 秒', actions: ['预览', '复制', '下载'] },
      { name: '母亲节_脚本_002.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '母亲节_脚本_003.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '母亲节_脚本_004.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260408-002',
    toolId: 'tool-video',
    name: '赚钱App-Veo3.1测试',
    status: 'failed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '赚钱App',
    outputSummary: '视频 2 个（全部失败）',
    createdAt: '2026-04-08 13:25',
    duration: '4 分 48 秒',
    videoModel: 'Veo 3.1',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '赚钱App-Veo3.1测试' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '20s' },
          { label: '起始帧图片', value: 'cashout_start.png' },
          { label: '结束帧图片', value: 'cashout_end.png' },
          { label: '参考图片', value: 'app_ui_ref.png' },
          { label: '视频描述', value: 'A vertical mobile ad showcasing the in-app withdraw flow, fast UI close-ups, cash counting animation and a confident CTA reveal.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '2' }
        ]
      }
    ],
    outputs: [
      { name: '赚钱_veo31_001.mp4', status: 'failed', duration: '2 分 18 秒', actions: ['重试'] },
      { name: '赚钱_veo31_002.mp4', status: 'failed', duration: '2 分 30 秒', actions: ['重试'] }
    ]
  },
  {
    id: 'T-20260408-003',
    name: '消除游戏-爆款模仿',
    status: 'completed',
    source: 'workflow',
    toolName: '模仿爆款视频',
    product: '消除游戏',
    outputSummary: '分析报告 1 份 + 脚本 3 条 + 视频 3 个',
    createdAt: '2026-04-08 16:42',
    duration: '9 分 04 秒',
    videoModel: 'Grok',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-3',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '12 秒',
        params: [
          { label: '任务名称', value: '消除游戏-爆款模仿' },
          { label: '任务描述', value: '基于竞品爆款拆解，生成 3 条同类脚本与 3 个视频。' }
        ],
        outputs: [],
        outputSummary: '任务上下文已建立'
      },
      n2: {
        status: 'completed',
        duration: '1 分 32 秒',
        params: [
          { label: '视频输入方式', value: '上传文件' },
          { label: '额外上下文', value: '一支海外消除类游戏的爆款短视频，目标参考其开场钩子和奖励反馈节奏。' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '视频理解完成，已生成 1 份分析报告'
      },
      n3: {
        status: 'completed',
        duration: '46 秒',
        params: [
          { label: '产出物名称', value: '分析报告' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '爆款分析报告_0408.md', status: 'done', duration: '46 秒' }
        ],
        outputSummary: '生成 1 份分析报告，含风格拆解与视频提示词'
      },
      n4: {
        status: 'completed',
        duration: '54 秒',
        params: [
          { label: '创意描述', value: '复用竞品的强节奏镜头与连击爆点，重写为本产品的广告脚本。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '15s' },
          { label: '脚本数量', value: '3' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '基于分析报告生成 3 条同类脚本'
      },
      n5: {
        status: 'completed',
        duration: '32 秒',
        params: [
          { label: '产出物名称', value: '脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '爆款_脚本_001.md', status: 'done', duration: '15 秒' },
          { name: '爆款_脚本_002.md', status: 'done', duration: '17 秒' },
          { name: '爆款_脚本_003.md', status: 'done', duration: '18 秒' }
        ],
        outputSummary: '生成 3 条同类脚本'
      },
      n6: {
        status: 'completed',
        duration: '5 分 12 秒',
        params: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '15s' },
          { label: '画面比例', value: '9:16' },
          { label: '每条输入的生成数量', value: '1（上游 3 条脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [],
        outputSummary: '根据脚本完成 3 个视频生成任务'
      },
      n7: {
        status: 'completed',
        duration: '28 秒',
        params: [
          { label: '产出物名称', value: '视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '爆款_001.mp4', status: 'done', duration: '2 分 38 秒' },
          { name: '爆款_002.mp4', status: 'done', duration: '2 分 42 秒' },
          { name: '爆款_003.mp4', status: 'done', duration: '2 分 50 秒' }
        ],
        outputSummary: '脚本与视频已全部归档'
      }
    },
    outputs: [
      { name: '爆款分析报告_0408.md', status: 'done', duration: '46 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_脚本_001.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_脚本_002.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_脚本_003.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] },
      { name: '爆款_001.mp4', status: 'done', duration: '2 分 38 秒', actions: ['播放', '下载'] },
      { name: '爆款_002.mp4', status: 'done', duration: '2 分 42 秒', actions: ['播放', '下载'] },
      { name: '爆款_003.mp4', status: 'done', duration: '2 分 50 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260407-001',
    toolId: 'tool-voice',
    name: '品牌推广-旁白配音',
    status: 'completed',
    source: 'toolbox',
    toolName: '配音优化',
    product: '品牌推广',
    outputSummary: '配音 1 条',
    createdAt: '2026-04-07 11:18',
    duration: '38 秒',
    videoModel: null,
    outputTypes: ['voice'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '品牌推广-旁白配音' }]
      },
      {
        title: '配音优化 Agent 设置',
        fields: [
          { label: '配音文本来源', value: '从脚本库选择' },
          { label: '脚本选择', value: '品牌推广-旗舰款脚本 / 脚本_001.md' },
          { label: '语言 / 音色分类', value: 'CN 中文 36 个' },
          { label: '音色', value: '沉稳大叔' },
          { label: '语速', value: '0.95x' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '音量', value: '1.0' },
          { label: '语调', value: '-1' },
          { label: '背景音乐', value: '开启 · 大气' }
        ]
      }
    ],
    outputs: [
      { name: '品牌_旁白.mp3', status: 'done', duration: '38 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260407-002',
    toolId: 'tool-script',
    name: '春季营销-踏青主题',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '春季营销',
    outputSummary: '脚本 3 条',
    createdAt: '2026-04-07 15:42',
    duration: '52 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '春季营销-踏青主题' },
          { label: '任务描述', value: '春日踏青场景的轻量化广告脚本。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '春日踏青场景，主打轻松愉悦、家庭出游和限时折扣氛围。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '3' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['春季营销知识库'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: '踏青_脚本_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '踏青_脚本_002.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '踏青_脚本_003.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260405-001',
    toolId: 'tool-video',
    name: '消除游戏-Veo3.1精修',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '消除游戏',
    outputSummary: '视频 1 个',
    createdAt: '2026-04-05 10:45',
    duration: '5 分 18 秒',
    videoModel: 'Veo 3.1',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '消除游戏-Veo3.1精修' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '16s' },
          { label: '起始帧图片', value: 'puzzle_start.png' },
          { label: '结束帧图片', value: 'puzzle_end.png' },
          { label: '参考图片', value: 'puzzle_style_ref.png' },
          { label: '视频描述', value: 'A polished vertical mobile-game ad with cinematic lighting, slow-motion combo highlights and a clean CTA card on the final beat.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '1' }
        ]
      }
    ],
    outputs: [
      { name: '消除_veo31_精修.mp4', status: 'done', duration: '5 分 18 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260405-002',
    toolId: 'tool-translate',
    name: '赚钱App-日语本地化',
    status: 'completed',
    source: 'toolbox',
    toolName: '文本翻译',
    product: '赚钱App',
    outputSummary: '翻译 1 语言',
    createdAt: '2026-04-05 14:30',
    duration: '34 秒',
    videoModel: null,
    outputTypes: ['translation'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '赚钱App-日语本地化' },
          { label: '任务描述', value: '为日本市场补一版日语广告译文。' }
        ]
      },
      {
        title: '文本翻译 Agent 设置',
        fields: [
          { label: '翻译内容来源', value: '从脚本库选择' },
          { label: '脚本选择（从脚本库时）', value: ['赚钱App-提现脚本 / 脚本_001.md · 2026-04-12'], kind: 'tags' },
          { label: '源语言', value: '中文（简体）' },
          { label: '目标语言', value: ['日语'], kind: 'tags' },
          { label: '翻译风格', value: '广告文案' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '语言级配置', value: ['日语｜市场：日本'], kind: 'tags' },
          { label: '术语表', value: '日语：withdraw=出金\ncash reward=現金リワード' }
        ]
      }
    ],
    outputs: [
      { name: '译文_JP.txt', status: 'done', duration: '34 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260405-003',
    name: '品牌推广-脚本视频联动',
    status: 'pending_confirm',
    source: 'workflow',
    toolName: '先生成脚本生成视频',
    product: '品牌推广',
    outputSummary: '脚本 3 条 待确认，视频待生成',
    createdAt: '2026-04-05 17:12',
    duration: '2 分 32 秒（已暂停）',
    videoModel: 'Veo 3.1',
    outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-1',
    pendingConfirmNodeId: 'n3',
    workflowNodeDetails: {
      n1: {
        status: 'completed',
        duration: '10 秒',
        params: [
          { label: '任务名称', value: '品牌推广-脚本视频联动' },
          { label: '任务描述', value: '高端品牌片脚本与视频一体化产出，脚本节点开启中断确认。' }
        ],
        outputs: [],
        outputSummary: '任务配置已保存'
      },
      n2: {
        status: 'completed',
        duration: '1 分 22 秒',
        params: [
          { label: '创意描述', value: '高端品牌调性，慢节奏镜头，强调质感、故事性与产品细节。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '16s' },
          { label: '脚本数量', value: '3' },
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ],
        outputs: [],
        outputSummary: '已生成 3 条候选脚本，等待用户确认'
      },
      n3: {
        status: 'pending_confirm',
        duration: '12 秒',
        needsConfirmation: true,
        confirmNote: '请检查这 3 条脚本的品牌调性是否符合本季调研结论，确认通过后将进入视频生成阶段。',
        params: [
          { label: '产出物名称', value: '视频脚本' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' },
          { label: '中断确认', value: '开启', kind: 'toggle' }
        ],
        outputs: [
          { name: '品牌_脚本_001.md', status: 'done', duration: '20 秒' },
          { name: '品牌_脚本_002.md', status: 'done', duration: '22 秒' },
          { name: '品牌_脚本_003.md', status: 'done', duration: '24 秒' }
        ],
        outputSummary: '3 条脚本已生成，等待用户确认'
      },
      n4: {
        status: 'waiting',
        duration: '—',
        params: [
          { label: '视频模型', value: 'Veo 3.1' },
          { label: '视频时长', value: '16s' },
          { label: '画面比例', value: '16:9' },
          { label: '每条输入的生成数量', value: '1（上游 3 条脚本 × 1 = 总计 3 个视频）' }
        ],
        outputs: [],
        outputSummary: '等待上游确认后启动'
      },
      n5: {
        status: 'waiting',
        duration: '—',
        params: [
          { label: '产出物名称', value: '广告视频' },
          { label: '命名规则', value: '{产品名}_{日期}_{序号}' },
          { label: '保存到素材库', value: '开启', kind: 'toggle' }
        ],
        outputs: [],
        outputSummary: '等待视频生成完成'
      }
    },
    outputs: [
      { name: '品牌_脚本_001.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] },
      { name: '品牌_脚本_002.md', status: 'done', duration: '22 秒', actions: ['预览', '复制', '下载'] },
      { name: '品牌_脚本_003.md', status: 'done', duration: '24 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260403-001',
    toolId: 'tool-script',
    name: '消除游戏-劳动节脚本',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '消除游戏',
    outputSummary: '脚本 4 条',
    createdAt: '2026-04-03 09:22',
    duration: '1 分 08 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '消除游戏-劳动节脚本' },
          { label: '任务描述', value: '为劳动节福利季储备 4 条投放脚本。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '劳动节福利季，强调假期解压玩法、限时奖励与多人组队体验。' },
          { label: '内容类型', value: '非网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '15s' },
          { label: '脚本数量', value: '4' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['品牌知识库', '节假日营销话术'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: '劳动节_脚本_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '劳动节_脚本_002.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '劳动节_脚本_003.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '劳动节_脚本_004.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260403-002',
    toolId: 'tool-video',
    name: '春季营销-Grok补量',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '春季营销',
    outputSummary: '视频 3 个',
    createdAt: '2026-04-03 14:18',
    duration: '6 分 24 秒',
    videoModel: 'Grok',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '春季营销-Grok补量' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '15s' },
          { label: '参考图片', value: 'spring_visual_supplement.png' },
          { label: '视频描述', value: 'A supplemental batch of bright spring-themed vertical ads matching the campaign style guide, with quick UI close-ups and energetic transitions.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '3' }
        ]
      }
    ],
    outputs: [
      { name: '春季补量_001.mp4', status: 'done', duration: '2 分 06 秒', actions: ['播放', '下载'] },
      { name: '春季补量_002.mp4', status: 'done', duration: '2 分 08 秒', actions: ['播放', '下载'] },
      { name: '春季补量_003.mp4', status: 'done', duration: '2 分 10 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260403-003',
    toolId: 'tool-extract',
    name: '海外竞品-文案提取',
    status: 'completed',
    source: 'toolbox',
    toolName: '文案提取',
    product: '多语言投放',
    outputSummary: '提取文本 1 份',
    createdAt: '2026-04-03 17:08',
    duration: '46 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '海外竞品-文案提取' }]
      },
      {
        title: '文案提取 Agent 设置',
        fields: [
          { label: '素材类型', value: '视频' },
          { label: '素材上传', value: 'overseas_competitor_ad.mp4' },
          { label: '提取内容', value: ['台词 / 旁白', '字幕文字', '标题'], kind: 'tags' },
          { label: '输出语言', value: '英文' },
          { label: '时间戳输出', value: '开启', kind: 'toggle' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' }
        ]
      }
    ],
    outputs: [
      { name: '海外提取_文本.md', status: 'done', duration: '46 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260401-001',
    toolId: 'tool-script',
    name: '赚钱App-愚人节脚本',
    status: 'completed',
    source: 'toolbox',
    toolName: '脚本生成',
    product: '赚钱App',
    outputSummary: '脚本 3 条',
    createdAt: '2026-04-01 10:30',
    duration: '54 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [
          { label: '任务名称', value: '赚钱App-愚人节脚本' },
          { label: '任务描述', value: '愚人节话题脚本，借势节日热度做现金福利转化。' }
        ]
      },
      {
        title: '脚本生成 Agent 设置',
        fields: [
          { label: '创意描述', value: '愚人节趣味反转剧情，结合"以为是骗局结果是现金福利"反差。' },
          { label: '内容类型', value: '网赚类' },
          { label: '配音语言', value: '中文（简体）' },
          { label: '视频时长', value: '20s' },
          { label: '脚本数量', value: '3' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '底层模型', value: 'Gemini 2.5 Pro' },
          { label: '知识库参考', value: ['品牌知识库', '高转化历史脚本'], kind: 'tags' }
        ]
      }
    ],
    outputs: [
      { name: '愚人节_脚本_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '愚人节_脚本_002.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '愚人节_脚本_003.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260401-002',
    toolId: 'tool-video',
    name: '消除游戏-Grok首测',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频生成',
    product: '消除游戏',
    outputSummary: '视频 2 个',
    createdAt: '2026-04-01 15:48',
    duration: '4 分 02 秒',
    videoModel: 'Grok',
    outputTypes: ['video'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '消除游戏-Grok首测' }]
      },
      {
        title: '视频生成 Agent 设置',
        fields: [
          { label: '视频模型', value: 'Grok' },
          { label: '视频时长', value: '15s' },
          { label: '参考图片', value: 'puzzle_first_test.png' },
          { label: '视频描述', value: 'An initial Grok test batch for the puzzle game, fast UI close-ups, combo effects and a concise CTA card.' },
          { label: '画面比例', value: '9:16' },
          { label: '生成数量', value: '2' }
        ]
      }
    ],
    outputs: [
      { name: '消除_grok首测_001.mp4', status: 'done', duration: '1 分 58 秒', actions: ['播放', '下载'] },
      { name: '消除_grok首测_002.mp4', status: 'done', duration: '2 分 04 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260331-001',
    toolId: 'tool-voice',
    name: '春季营销-甜美配音',
    status: 'completed',
    source: 'toolbox',
    toolName: '配音优化',
    product: '春季营销',
    outputSummary: '配音 1 条',
    createdAt: '2026-03-31 11:12',
    duration: '28 秒',
    videoModel: null,
    outputTypes: ['voice'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '春季营销-甜美配音' }]
      },
      {
        title: '配音优化 Agent 设置',
        fields: [
          { label: '配音文本来源', value: '从脚本库选择' },
          { label: '脚本选择', value: '春季营销-踏青脚本 / 脚本_001.md' },
          { label: '语言 / 音色分类', value: 'CN 中文 36 个' },
          { label: '音色', value: '甜美少女' },
          { label: '语速', value: '1.0x' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [
          { label: '音量', value: '1.0' },
          { label: '语调', value: '0' },
          { label: '背景音乐', value: '开启 · 春日轻音乐' }
        ]
      }
    ],
    outputs: [
      { name: '春季_甜美配音.mp3', status: 'done', duration: '28 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260331-002',
    toolId: 'tool-understand',
    name: '赚钱App-竞品视频理解',
    status: 'completed',
    source: 'toolbox',
    toolName: '视频理解',
    product: '赚钱App',
    outputSummary: '分析报告 1 份',
    createdAt: '2026-03-31 16:05',
    duration: '1 分 56 秒',
    videoModel: null,
    outputTypes: ['script'],
    detailSections: [
      {
        title: '任务基本信息',
        fields: [{ label: '任务名称', value: '赚钱App-竞品视频理解' }]
      },
      {
        title: '视频理解 Agent 设置',
        fields: [
          { label: '视频输入方式', value: '上传文件' },
          { label: '额外上下文', value: '海外赚钱 App 竞品广告，目标人群为东南亚 18-30 岁移动端用户。' }
        ]
      },
      {
        title: '高级设置（默认折叠）',
        fields: [{ label: '底层模型', value: 'Gemini 2.5 Pro' }]
      },
      {
        title: '输出结构（分析完成后展示）',
        fields: [
          { label: '整体风格分析', value: '广告 / 应用推广；真人出镜与界面演示穿插；节奏快、情绪热烈；关键词：现金提现、新人福利、即时到账。' },
          { label: '逐镜头视觉描述', value: '镜头 1：年轻女孩展示提现到账；镜头 2：奖励金额数字飞涨；镜头 3：朋友惊喜反应 + APP logo 收尾。' },
          { label: '视频生成提示词（完整）', value: 'A vertical mobile ad for a Southeast Asia rewards app, featuring a young female creator, fast UI close-ups of cash withdrawal, energetic pacing and an enthusiastic friend-reaction shot at the end.' }
        ]
      }
    ],
    outputs: [
      { name: '赚钱_竞品分析.md', status: 'done', duration: '1 分 56 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  // ===== Additional tasks for cross-team coverage =====
  {
    id: 'T-20260414-101',
    toolId: 'tool-script', name: '消除游戏-假期脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '消除游戏', outputSummary: '脚本 3 条', createdAt: '2026-04-14 09:20', duration: '52 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-假期脚本' }] }],
    outputs: [
      { name: '假期_脚本_001.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '假期_脚本_002.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '假期_脚本_003.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260414-102',
    toolId: 'tool-video', name: '消除游戏-Grok竖版', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '消除游戏', outputSummary: '视频 2 个', createdAt: '2026-04-14 13:15', duration: '4 分 28 秒', videoModel: 'Grok', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-Grok竖版' }] }],
    outputs: [
      { name: '消除_竖版_001.mp4', status: 'done', duration: '2 分 08 秒', actions: ['播放', '下载'] },
      { name: '消除_竖版_002.mp4', status: 'done', duration: '2 分 20 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260413-201',
    toolId: 'tool-script', name: '赚钱App-印尼钩子脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '赚钱App', outputSummary: '脚本 4 条', createdAt: '2026-04-13 10:30', duration: '1 分 04 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '赚钱App-印尼钩子脚本' }] }],
    outputs: [
      { name: 'ID_钩子_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: 'ID_钩子_002.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: 'ID_钩子_003.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: 'ID_钩子_004.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260413-202',
    toolId: 'tool-video', name: '消除游戏-Veo3.1增长测试', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '消除游戏', outputSummary: '视频 2 个', createdAt: '2026-04-13 14:00', duration: '6 分 14 秒', videoModel: 'Veo 3.1', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-Veo3.1增长测试' }] }],
    outputs: [
      { name: '增长_veo31_001.mp4', status: 'done', duration: '3 分 10 秒', actions: ['播放', '下载'] },
      { name: '增长_veo31_002.mp4', status: 'done', duration: '3 分 04 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260412-201',
    name: '赚钱App-海外脚本视频', status: 'completed', source: 'workflow', toolName: '先生成脚本生成视频',
    product: '赚钱App', outputSummary: '脚本 2 条 + 视频 2 个', createdAt: '2026-04-12 11:00', duration: '9 分 22 秒', videoModel: 'Grok', outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-1',
    workflowNodeDetails: {
      n1: { status: 'completed', duration: '10 秒', params: [], outputs: [], outputSummary: '任务上下文已建立' },
      n2: { status: 'completed', duration: '1 分 12 秒', params: [], outputs: [
        { name: '海外_脚本_001.md', status: 'done', duration: '20 秒' },
        { name: '海外_脚本_002.md', status: 'done', duration: '22 秒' }
      ], outputSummary: '已生成 2 条脚本' },
      n3: { status: 'completed', duration: '28 秒', params: [], outputs: [], outputSummary: '脚本归档完成' },
      n4: { status: 'completed', duration: '7 分 32 秒', params: [], outputs: [
        { name: '海外_grok_001.mp4', status: 'done', duration: '3 分 42 秒' },
        { name: '海外_grok_002.mp4', status: 'done', duration: '3 分 50 秒' }
      ], outputSummary: '2 个视频已生成' },
      n5: { status: 'completed', duration: '30 秒', params: [], outputs: [], outputSummary: '归档完成' }
    },
    outputs: [
      { name: '海外_脚本_001.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] },
      { name: '海外_脚本_002.md', status: 'done', duration: '22 秒', actions: ['预览', '复制', '下载'] },
      { name: '海外_grok_001.mp4', status: 'done', duration: '3 分 42 秒', actions: ['播放', '下载'] },
      { name: '海外_grok_002.mp4', status: 'done', duration: '3 分 50 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260412-202',
    toolId: 'tool-translate', name: '赚钱App-越南泰国翻译', status: 'completed', source: 'toolbox', toolName: '文本翻译',
    product: '赚钱App', outputSummary: '翻译 2 语言', createdAt: '2026-04-12 15:30', duration: '1 分 38 秒', videoModel: null, outputTypes: ['translation'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '赚钱App-越南泰国翻译' }] }],
    outputs: [
      { name: '译文_VN.txt', status: 'done', duration: '26 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_TH.txt', status: 'done', duration: '28 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260411-201',
    toolId: 'tool-video', name: '消除游戏-Veo3.1增长A组', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '消除游戏', outputSummary: '视频 3 个', createdAt: '2026-04-11 09:45', duration: '9 分 06 秒', videoModel: 'Veo 3.1', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-Veo3.1增长A组' }] }],
    outputs: [
      { name: '增长A_veo31_001.mp4', status: 'done', duration: '3 分 02 秒', actions: ['播放', '下载'] },
      { name: '增长A_veo31_002.mp4', status: 'done', duration: '2 分 58 秒', actions: ['播放', '下载'] },
      { name: '增长A_veo31_003.mp4', status: 'done', duration: '3 分 06 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260411-202',
    toolId: 'tool-script', name: '消除游戏-增长组脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '消除游戏', outputSummary: '脚本 5 条', createdAt: '2026-04-11 13:00', duration: '1 分 08 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-增长组脚本' }] }],
    outputs: [
      { name: '增长组_脚本_001.md', status: 'done', duration: '12 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长组_脚本_002.md', status: 'done', duration: '13 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长组_脚本_003.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长组_脚本_004.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长组_脚本_005.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260410-101',
    toolId: 'tool-script', name: '消除游戏-儿童节预热脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '消除游戏', outputSummary: '脚本 3 条', createdAt: '2026-04-10 10:00', duration: '48 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-儿童节预热脚本' }] }],
    outputs: [
      { name: '儿童节_脚本_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '儿童节_脚本_002.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '儿童节_脚本_003.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260410-102',
    toolId: 'tool-video', name: '赚钱App-Grok品牌视频', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '赚钱App', outputSummary: '视频 2 个', createdAt: '2026-04-10 14:20', duration: '5 分 02 秒', videoModel: 'Grok', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '赚钱App-Grok品牌视频' }] }],
    outputs: [
      { name: '赚钱_grok_001.mp4', status: 'done', duration: '2 分 28 秒', actions: ['播放', '下载'] },
      { name: '赚钱_grok_002.mp4', status: 'done', duration: '2 分 34 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260409-101',
    toolId: 'tool-video', name: '消除游戏-Veo3.1品牌组', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '消除游戏', outputSummary: '视频 2 个', createdAt: '2026-04-09 11:00', duration: '6 分 32 秒', videoModel: 'Veo 3.1', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-Veo3.1品牌组' }] }],
    outputs: [
      { name: '品牌组_veo31_001.mp4', status: 'done', duration: '3 分 18 秒', actions: ['播放', '下载'] },
      { name: '品牌组_veo31_002.mp4', status: 'done', duration: '3 分 14 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260409-102',
    name: '春季营销-脚本视频快产', status: 'completed', source: 'workflow', toolName: '先生成脚本生成视频',
    product: '春季营销', outputSummary: '脚本 3 条 + 视频 3 个', createdAt: '2026-04-09 15:30', duration: '8 分 04 秒', videoModel: 'Grok', outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-1',
    workflowNodeDetails: {
      n1: { status: 'completed', duration: '8 秒', params: [], outputs: [], outputSummary: '任务上下文已建立' },
      n2: { status: 'completed', duration: '1 分 10 秒', params: [], outputs: [
        { name: '春季快产_脚本_001.md', status: 'done', duration: '18 秒' },
        { name: '春季快产_脚本_002.md', status: 'done', duration: '19 秒' },
        { name: '春季快产_脚本_003.md', status: 'done', duration: '20 秒' }
      ], outputSummary: '已生成 3 条脚本' },
      n3: { status: 'completed', duration: '22 秒', params: [], outputs: [], outputSummary: '脚本归档完成' },
      n4: { status: 'completed', duration: '6 分 24 秒', params: [], outputs: [
        { name: '春季快产_001.mp4', status: 'done', duration: '2 分 05 秒' },
        { name: '春季快产_002.mp4', status: 'done', duration: '2 分 08 秒' },
        { name: '春季快产_003.mp4', status: 'done', duration: '2 分 11 秒' }
      ], outputSummary: '3 个视频生成完成' },
      n5: { status: 'completed', duration: '20 秒', params: [], outputs: [], outputSummary: '归档完成' }
    },
    outputs: [
      { name: '春季快产_脚本_001.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季快产_脚本_002.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季快产_脚本_003.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] },
      { name: '春季快产_001.mp4', status: 'done', duration: '2 分 05 秒', actions: ['播放', '下载'] },
      { name: '春季快产_002.mp4', status: 'done', duration: '2 分 08 秒', actions: ['播放', '下载'] },
      { name: '春季快产_003.mp4', status: 'done', duration: '2 分 11 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260408-101',
    toolId: 'tool-script', name: '赚钱App-巴西版脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '赚钱App', outputSummary: '脚本 3 条', createdAt: '2026-04-08 09:15', duration: '56 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '赚钱App-巴西版脚本' }] }],
    outputs: [
      { name: 'BR_脚本_001.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: 'BR_脚本_002.md', status: 'done', duration: '19 秒', actions: ['预览', '复制', '下载'] },
      { name: 'BR_脚本_003.md', status: 'done', duration: '20 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260407-101',
    toolId: 'tool-video', name: '品牌推广-Grok15s', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '品牌推广', outputSummary: '视频 2 个', createdAt: '2026-04-07 10:40', duration: '4 分 48 秒', videoModel: 'Grok', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '品牌推广-Grok15s' }] }],
    outputs: [
      { name: '品牌_grok15s_001.mp4', status: 'done', duration: '2 分 18 秒', actions: ['播放', '下载'] },
      { name: '品牌_grok15s_002.mp4', status: 'done', duration: '2 分 30 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260406-001',
    toolId: 'tool-script', name: '消除游戏-增长组周脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '消除游戏', outputSummary: '脚本 4 条', createdAt: '2026-04-06 14:00', duration: '58 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-增长组周脚本' }] }],
    outputs: [
      { name: '增长周_脚本_001.md', status: 'done', duration: '13 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长周_脚本_002.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长周_脚本_003.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长周_脚本_004.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260405-001',
    toolId: 'tool-video', name: '消除游戏-Grok增长B组', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '消除游戏', outputSummary: '视频 3 个', createdAt: '2026-04-05 10:30', duration: '6 分 20 秒', videoModel: 'Grok', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-Grok增长B组' }] }],
    outputs: [
      { name: '增长B_grok_001.mp4', status: 'done', duration: '2 分 04 秒', actions: ['播放', '下载'] },
      { name: '增长B_grok_002.mp4', status: 'done', duration: '2 分 06 秒', actions: ['播放', '下载'] },
      { name: '增长B_grok_003.mp4', status: 'done', duration: '2 分 10 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260404-001',
    name: '品牌推广-增长组联动', status: 'completed', source: 'workflow', toolName: '先生成脚本生成视频',
    product: '品牌推广', outputSummary: '脚本 2 条 + 视频 2 个', createdAt: '2026-04-04 13:00', duration: '10 分 18 秒', videoModel: 'Veo 3.1', outputTypes: ['script', 'video'],
    workflowTemplate: 'wt-1',
    workflowNodeDetails: {
      n1: { status: 'completed', duration: '9 秒', params: [], outputs: [], outputSummary: '任务上下文已建立' },
      n2: { status: 'completed', duration: '1 分 08 秒', params: [], outputs: [
        { name: '增长联动_脚本_001.md', status: 'done', duration: '22 秒' },
        { name: '增长联动_脚本_002.md', status: 'done', duration: '24 秒' }
      ], outputSummary: '已生成 2 条脚本' },
      n3: { status: 'completed', duration: '26 秒', params: [], outputs: [], outputSummary: '脚本归档完成' },
      n4: { status: 'completed', duration: '8 分 35 秒', params: [], outputs: [
        { name: '增长联动_veo31_001.mp4', status: 'done', duration: '4 分 12 秒' },
        { name: '增长联动_veo31_002.mp4', status: 'done', duration: '4 分 23 秒' }
      ], outputSummary: '2 个视频生成完成' },
      n5: { status: 'completed', duration: '28 秒', params: [], outputs: [], outputSummary: '归档完成' }
    },
    outputs: [
      { name: '增长联动_脚本_001.md', status: 'done', duration: '22 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长联动_脚本_002.md', status: 'done', duration: '24 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长联动_veo31_001.mp4', status: 'done', duration: '4 分 12 秒', actions: ['播放', '下载'] },
      { name: '增长联动_veo31_002.mp4', status: 'done', duration: '4 分 23 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260403-001',
    toolId: 'tool-translate', name: '赚钱App-东南亚三语翻译', status: 'completed', source: 'toolbox', toolName: '文本翻译',
    product: '赚钱App', outputSummary: '翻译 3 语言', createdAt: '2026-04-03 09:00', duration: '1 分 52 秒', videoModel: null, outputTypes: ['translation'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '赚钱App-东南亚三语翻译' }] }],
    outputs: [
      { name: '译文_ID.txt', status: 'done', duration: '24 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_VN.txt', status: 'done', duration: '26 秒', actions: ['预览', '复制', '下载'] },
      { name: '译文_TH.txt', status: 'done', duration: '28 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260402-001',
    toolId: 'tool-video', name: '赚钱App-Grok海外版', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '赚钱App', outputSummary: '视频 2 个', createdAt: '2026-04-02 14:00', duration: '5 分 14 秒', videoModel: 'Grok', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '赚钱App-Grok海外版' }] }],
    outputs: [
      { name: '海外_grok_001.mp4', status: 'done', duration: '2 分 32 秒', actions: ['播放', '下载'] },
      { name: '海外_grok_002.mp4', status: 'done', duration: '2 分 42 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260401-101',
    toolId: 'tool-script', name: '消除游戏-品牌组4月脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '消除游戏', outputSummary: '脚本 3 条', createdAt: '2026-04-01 10:00', duration: '44 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-品牌组4月脚本' }] }],
    outputs: [
      { name: '品牌4月_脚本_001.md', status: 'done', duration: '13 秒', actions: ['预览', '复制', '下载'] },
      { name: '品牌4月_脚本_002.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '品牌4月_脚本_003.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260331-101',
    toolId: 'tool-video', name: '品牌推广-Veo3.1横版', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '品牌推广', outputSummary: '视频 1 个', createdAt: '2026-03-31 14:30', duration: '5 分 28 秒', videoModel: 'Veo 3.1', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '品牌推广-Veo3.1横版' }] }],
    outputs: [
      { name: '品牌_veo31_横版.mp4', status: 'done', duration: '5 分 28 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260330-101',
    toolId: 'tool-script', name: '赚钱App-品牌组脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '赚钱App', outputSummary: '脚本 3 条', createdAt: '2026-03-30 09:00', duration: '50 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '赚钱App-品牌组脚本' }] }],
    outputs: [
      { name: '品牌组_赚钱_001.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '品牌组_赚钱_002.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] },
      { name: '品牌组_赚钱_003.md', status: 'done', duration: '18 秒', actions: ['预览', '复制', '下载'] }
    ]
  },
  {
    id: 'T-20260328-101',
    toolId: 'tool-video', name: '消除游戏-Grok增长测试', status: 'completed', source: 'toolbox', toolName: '视频生成',
    product: '消除游戏', outputSummary: '视频 2 个', createdAt: '2026-03-28 15:00', duration: '4 分 36 秒', videoModel: 'Grok', outputTypes: ['video'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-Grok增长测试' }] }],
    outputs: [
      { name: '增长测试_grok_001.mp4', status: 'done', duration: '2 分 14 秒', actions: ['播放', '下载'] },
      { name: '增长测试_grok_002.mp4', status: 'done', duration: '2 分 22 秒', actions: ['播放', '下载'] }
    ]
  },
  {
    id: 'T-20260326-101',
    toolId: 'tool-script', name: '消除游戏-增长组首批脚本', status: 'completed', source: 'toolbox', toolName: '脚本生成',
    product: '消除游戏', outputSummary: '脚本 4 条', createdAt: '2026-03-26 11:00', duration: '1 分 02 秒', videoModel: null, outputTypes: ['script'],
    detailSections: [{ title: '任务基本信息', fields: [{ label: '任务名称', value: '消除游戏-增长组首批脚本' }] }],
    outputs: [
      { name: '增长首批_001.md', status: 'done', duration: '14 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长首批_002.md', status: 'done', duration: '15 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长首批_003.md', status: 'done', duration: '16 秒', actions: ['预览', '复制', '下载'] },
      { name: '增长首批_004.md', status: 'done', duration: '17 秒', actions: ['预览', '复制', '下载'] }
    ]
  }
];

// ===== Permissions Logic =====
function isLeaderOfGroupForProject(proj) {
  if (currentUser.role !== 'leader') return false;
  if (proj.visibleTo && proj.visibleTo.type === 'groups') {
    return proj.visibleTo.groups.some(gid => {
      const g = getGroupById(gid);
      return g && g.leaderId === currentUser.id;
    });
  }
  return false;
}
function isLeaderOfGroupForFolder(folder, proj) {
  if (currentUser.role !== 'leader') return false;
  if (folder.visibleGroups && folder.visibleGroups.length) {
    return folder.visibleGroups.some(gid => {
      const g = getGroupById(gid);
      return g && g.leaderId === currentUser.id;
    });
  }
  return proj ? isLeaderOfGroupForProject(proj) : false;
}
function canSeeProject(proj) {
  if (ROLES[currentUser.role].canSeeAll) return true;
  if (proj.owner === currentUser.id) return true;
  if (proj.members.includes(currentUser.id)) return true;
  if (proj.visibleTo.type === 'everyone') return true;
  if (proj.visibleTo.type === 'groups') return proj.visibleTo.groups.some(g => currentUser.groups.includes(g));
  if (proj.visibleTo.type === 'specific_users') return (proj.visibleTo.users || []).includes(currentUser.id);
  return false;
}
function canSeeFolder(folder) {
  if (ROLES[currentUser.role].canSeeAll) return true;
  if (folder.owner === currentUser.id) return true;
  if (folder.visibility === 'private') return folder.owner === currentUser.id;
  if (folder.members.includes(currentUser.id)) return true;
  if (Array.isArray(folder.visibleGroups) && folder.visibleGroups.length) {
    return folder.visibleGroups.some(gid => currentUser.groups.includes(gid));
  }
  return false;
}
function getMyRoleInProject(proj) {
  if (ROLES[currentUser.role].canEditAll) return 'owner';
  if (proj.owner === currentUser.id) return 'owner';
  if (currentUser.role === 'manager') return 'viewer';
  if (isLeaderOfGroupForProject(proj)) return 'editor';
  if (proj.members.includes(currentUser.id)) return 'editor';
  return 'viewer';
}
function getMyRoleInFolder(folder) {
  if (ROLES[currentUser.role].canEditAll) return 'owner';
  if (folder.owner === currentUser.id) return 'owner';
  if (currentUser.role === 'manager') return 'viewer';
  if (isLeaderOfGroupForFolder(folder, currentProject)) return 'editor';
  if (folder.members.includes(currentUser.id)) return 'editor';
  return 'viewer';
}
function getUserById(id) { return users.find(u => u.id === id); }
function getGroupById(id) { return groups.find(g => g.id === id); }
function getUserInitial(user) {
  return (user?.initial || user?.short || user?.name || '#').charAt(0).toUpperCase();
}
function getFileType(file) {
  if (file.type === 'script' || file.type === 'video') return file.type;
  const name = (file.name || '').toLowerCase();
  if (name.includes('脚本') || name.includes('script') || /\.(txt|md|doc|docx)$/.test(name)) return 'script';
  return 'video';
}

function ensureFolderWorkflowRefs(folder) {
  if (!folder) return [];
  if (!Array.isArray(folder.workflowRefs)) {
    folder.workflowRefs = (FOLDER_WORKFLOW_REFS[folder.id] || []).map(r => ({ ...r }));
  }
  return folder.workflowRefs;
}

function getWorkflowById(id) { return globalWorkflows.find(wf => wf.id === id); }

function getWorkflowRefCount(wfId) {
  let count = 0;
  projects.forEach(p => p.folders.forEach(f => {
    const refs = ensureFolderWorkflowRefs(f);
    if (refs.some(r => r.workflowId === wfId)) count++;
  }));
  return count;
}

function canCreateFolderWorkflow(folder) {
  const myRole = getMyRoleInFolder(folder);
  return myRole === 'owner' || myRole === 'editor';
}

function getFolderWorkflowBuckets(folder) {
  const refs = ensureFolderWorkflowRefs(folder);
  const mounted = refs.map(r => {
    const wf = getWorkflowById(r.workflowId);
    return wf ? { ...wf, addedBy: r.addedBy } : null;
  }).filter(Boolean);

  const myMounted = mounted.filter(wf => wf.creator === currentUser.id);
  const otherMounted = mounted.filter(wf => wf.creator !== currentUser.id);

  return {
    system: SYSTEM_WORKFLOWS,
    myMounted,
    otherMounted,
  };
}

function canSeeAllFolderGeneration(folder) {
  const myRole = getMyRoleInFolder(folder);
  return myRole === 'owner' || ROLES[currentUser.role].canEditAll;
}

function getFolderGenerationRecords(folder) {
  if (!folder) return { processing: [], history: [] };
  const records = folder.files.map(file => {
    const status = file.status === 'processing' ? 'processing' : 'history';
    return {
      id: file.name + '-' + (file.creator || 'unknown'),
      name: file.name,
      type: getFileType(file),
      creator: file.creator,
      workflowName: getFileType(file) === 'script' ? '脚本生成流程' : '视频生成流程',
      status,
      rawStatus: file.status,
      time: file.time,
    };
  });

  const visibleRecords = canSeeAllFolderGeneration(folder)
    ? records
    : records.filter(item => item.creator === currentUser.id);

  return {
    processing: visibleRecords.filter(item => item.status === 'processing'),
    history: visibleRecords.filter(item => item.status === 'history'),
  };
}

function getFolderContent(folder) {
  const scripts = [];
  const videos = [];
  const tasks = getFolderGenerationRecords(folder).processing;
  if (!folder) return { scripts, videos, tasks };
  folder.files.forEach(file => {
    if (getFileType(file) === 'script') scripts.push(file);
    else videos.push(file);
  });
  return { scripts, videos, tasks };
}
function fileStatusText(status) {
  return status === 'done' ? '已完成' : status === 'processing' ? '生成中' : '草稿';
}
function fileTypeText(file) {
  return getFileType(file) === 'script' ? '脚本' : '视频素材';
}
function fileIcon(file) {
  const type = getFileType(file);
  if (type === 'script') return '📝';
  return file.status === 'done' ? '🎥' : file.status === 'processing' ? '⏳' : '📄';
}
function renderWorkspaceNavSelection() {
  document.querySelectorAll('#workspace-nav .nav-item[data-ws-section]').forEach(item => {
    item.classList.toggle('active', currentPage === 'workspace' && item.dataset.wsSection === workspaceSection);
  });
}
function setWorkspaceSection(section) {
  workspaceSection = section;
  currentToolDetail = null;
  renderWorkspaceNavSelection();
  goPage('workspace');
}
