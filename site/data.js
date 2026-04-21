// ===== Users & Roles =====
const ROLES = {
  superadmin: { label: '超级管理员', color: '#f43f5e', canSystemSettings: true, canManageTeam: true, canCreateProject: true, canSeeAll: true, canEditAll: true },
  manager:    { label: '经理',       color: '#f59e0b', canSystemSettings: false, canManageTeam: true, canCreateProject: false, canSeeAll: true, canEditAll: false },
  leader:     { label: '组长',       color: '#3b82f6', canSystemSettings: false, canManageTeam: false, canCreateProject: true, canSeeAll: false, canEditAll: false },
  member:     { label: '成员',       color: '#666',    canSystemSettings: false, canManageTeam: false, canCreateProject: true, canSeeAll: false, canEditAll: false },
};

const SYSTEM_WORKFLOWS = [
  { id: 'swf-1', name: '先生成脚本生成视频', icon: '🎬', desc: '任务配置 → 脚本生成 Agent → 视频脚本 → 视频生成 Agent → 广告视频' },
  { id: 'swf-2', name: '文案生成视频', icon: '✍️', desc: '任务配置 → 文案输入 → 视频生成 Agent → 广告视频' },
  { id: 'swf-3', name: '模仿爆款视频', icon: '🔥', desc: '任务配置 → 视频理解 Agent → 分析报告 → 脚本生成 Agent → 脚本 → 视频生成 Agent → 视频' },
  { id: 'swf-4', name: '多语言视频生成', icon: '🌍', desc: '任务配置 → 脚本生成 Agent → 视频脚本 → 葡语分支 + 西语分支 → 多语言视频' },
];

// ===== Global Workflow Library =====
let globalWorkflows = [
  { id: 'wf-101-a', name: '品牌片头批量生成', desc: '适配三版时长自动裁切', icon: '🔁', creator: 'u1', scope: 'team', createdAt: '2026-02-15' },
  { id: 'wf-101-b', name: '口播快剪模板', desc: '保留高能句并自动加字幕', icon: '🔁', creator: 'u2', scope: 'team', createdAt: '2026-02-20' },
  { id: 'wf-102-a', name: '新品发布节奏版', desc: '前 5 秒强化卖点转场', icon: '🔁', creator: 'u1', scope: 'team', createdAt: '2026-03-01' },
  { id: 'wf-102-b', name: '李晓个人实验流', desc: '字幕样式与镜头速度实验', icon: '🧪', creator: 'u2', scope: 'personal', createdAt: '2026-03-10' },
  { id: 'wf-201-a', name: '海外字幕适配流', desc: '多语言字幕与口型节拍对齐', icon: '🔁', creator: 'u1', scope: 'team', createdAt: '2026-01-25' },
];

// ===== Library: Scripts & Assets =====
let libraryScripts = [
  { id: 'ls-1', name: '消除游戏-网赚类脚本', desc: '5条已验证高转化率广告脚本', creator: 'u1', scope: 'team', createdAt: '2026-03-28', fileCount: 5, tags: ['网赚','消除游戏'], files: ['脚本_001.md','脚本_002.md','脚本_003.md','脚本_004.md','脚本_005.md'] },
  { id: 'ls-2', name: '品牌故事系列脚本', desc: '品牌视频叙事脚本集合', creator: 'u1', scope: 'team', createdAt: '2026-03-25', fileCount: 3, tags: ['品牌'], files: ['品牌故事_主线.md','品牌故事_支线A.md','品牌故事_支线B.md'] },
  { id: 'ls-3', name: '李晓实验文案', desc: '个人创作文案草稿', creator: 'u2', scope: 'personal', createdAt: '2026-03-20', fileCount: 2, tags: ['实验'], files: ['实验分镜_v1.md','实验分镜_v2.md'] },
];
let libraryAssets = [
  { id: 'la-1', name: '春季产品素材包', desc: '15秒/30秒产品展示视频合集', creator: 'u1', scope: 'team', createdAt: '2026-03-27', fileCount: 6, format: 'mp4', tags: ['春季','产品'], files: ['春季_15s_A.mp4','春季_15s_B.mp4','春季_30s_A.mp4','春季_30s_B.mp4','春季_30s_C.mp4','春季_片尾.mp4'] },
  { id: 'la-2', name: '品牌片头模板', desc: '标准品牌片头3版', creator: 'u1', scope: 'team', createdAt: '2026-03-22', fileCount: 3, format: 'mp4', tags: ['品牌','片头'], files: ['片头_标准版.mp4','片头_简洁版.mp4','片头_节日版.mp4'] },
  { id: 'la-3', name: '王芳-海外参考素材', desc: '竞品视频截取片段', creator: 'u3', scope: 'personal', createdAt: '2026-03-18', fileCount: 4, format: 'mp4', tags: ['海外','参考'], files: ['竞品_A.mp4','竞品_B.mp4','竞品_C.mp4','竞品_D.mp4'] },
];

const FOLDER_WORKFLOW_REFS = {
  101: [{ workflowId: 'wf-101-a', addedBy: 'u1' }, { workflowId: 'wf-101-b', addedBy: 'u2' }],
  102: [{ workflowId: 'wf-102-a', addedBy: 'u1' }, { workflowId: 'wf-102-b', addedBy: 'u2' }],
  201: [{ workflowId: 'wf-201-a', addedBy: 'u1' }],
};

const DEFAULT_BUSINESS_LINES = [
  { id: 'overseas-ent', label: '出海互娱', color: '#3b82f6' },
  { id: 'local-ent', label: '本土互娱', color: '#f59e0b' },
  { id: 'overseas-tool', label: '出海工具', color: '#10b981' },
  { id: 'local-tool', label: '本土工具', color: '#8b5cf6' },
];
let businessLines = DEFAULT_BUSINESS_LINES.map(line => ({ ...line }));

const SUBGROUP_OPTIONS = [
  { id: 'a', label: 'a类' },
  { id: 'b', label: 'b类' },
];

let managerScopes = [
  { id: 'mgr-u5', managerId: 'u5', businessId: 'overseas-ent' },
  { id: 'mgr-u13', managerId: 'u13', businessId: 'local-ent' },
  { id: 'mgr-u14', managerId: 'u14', businessId: 'overseas-tool' },
];

let users = [
  { id: 'u1', name: '张明', short: 'A', initial: 'Z', role: 'superadmin', email: 'zhangming@company.com', groups: [], businessId: '', managerScopeId: '', subgroupKey: '', leaderId: '', color: '#7c3aed', joined: '2025-12-01', status: 'active' },
  { id: 'u5', name: '陈雨', short: 'C', initial: 'C', role: 'manager', email: 'chenyu@company.com', groups: ['g1'], businessId: 'overseas-ent', managerScopeId: 'mgr-u5', subgroupKey: '', leaderId: '', color: '#ec4899', joined: '2025-12-10', status: 'active' },
  { id: 'u13', name: '方毅', short: 'F', initial: 'F', role: 'manager', email: 'fangyi@company.com', groups: ['g2'], businessId: 'local-ent', managerScopeId: 'mgr-u13', subgroupKey: '', leaderId: '', color: '#0ea5e9', joined: '2025-12-15', status: 'active' },
  { id: 'u14', name: '林静', short: 'J', initial: 'L', role: 'manager', email: 'linjing@company.com', groups: ['g3'], businessId: 'overseas-tool', managerScopeId: 'mgr-u14', subgroupKey: '', leaderId: '', color: '#a855f7', joined: '2026-01-05', status: 'active' },
  { id: 'u2', name: '李晓', short: 'L', initial: 'L', role: 'leader', email: 'lixiao@company.com', groups: ['g1'], businessId: 'overseas-ent', managerScopeId: 'mgr-u5', subgroupKey: 'a', leaderId: '', color: '#3b82f6', joined: '2026-01-15', status: 'active' },
  { id: 'u3', name: '王芳', short: 'W', initial: 'W', role: 'leader', email: 'wangfang@company.com', groups: ['g2'], businessId: 'local-ent', managerScopeId: 'mgr-u13', subgroupKey: 'a', leaderId: '', color: '#10b981', joined: '2026-02-10', status: 'active' },
  { id: 'u9', name: '吴楠', short: 'N', initial: 'W', role: 'leader', email: 'wunan@company.com', groups: ['g3'], businessId: 'overseas-tool', managerScopeId: 'mgr-u14', subgroupKey: 'a', leaderId: '', color: '#14b8a6', joined: '2026-01-20', status: 'active' },
  { id: 'u4', name: '赵强', short: 'Z', initial: 'Z', role: 'member', email: 'zhaoqiang@company.com', groups: ['g1'], businessId: 'overseas-ent', managerScopeId: 'mgr-u5', subgroupKey: 'a', leaderId: 'u2', color: '#f59e0b', joined: '2026-03-01', status: 'pending' },
  { id: 'u6', name: '刘洋', short: 'Y', initial: 'L', role: 'member', email: 'liuyang@company.com', groups: ['g1'], businessId: 'overseas-ent', managerScopeId: 'mgr-u5', subgroupKey: 'a', leaderId: 'u2', color: '#06b6d4', joined: '2026-02-20', status: 'active' },
  { id: 'u8', name: '周磊', short: 'M', initial: 'Z', role: 'member', email: 'zhoulei@company.com', groups: ['g1'], businessId: 'overseas-ent', managerScopeId: 'mgr-u5', subgroupKey: 'b', leaderId: '', color: '#8b5cf6', joined: '2026-03-10', status: 'active' },
  { id: 'u7', name: '孙婷', short: 'T', initial: 'S', role: 'member', email: 'sunting@company.com', groups: ['g2'], businessId: 'local-ent', managerScopeId: 'mgr-u13', subgroupKey: 'a', leaderId: 'u3', color: '#f43f5e', joined: '2026-03-05', status: 'active' },
  { id: 'u10', name: '郑浩', short: 'H', initial: 'Z', role: 'member', email: 'zhenghao@company.com', groups: ['g2'], businessId: 'local-ent', managerScopeId: 'mgr-u13', subgroupKey: 'b', leaderId: '', color: '#d946ef', joined: '2026-03-15', status: 'active' },
  { id: 'u11', name: '黄蕾', short: 'R', initial: 'H', role: 'member', email: 'huanglei@company.com', groups: ['g3'], businessId: 'overseas-tool', managerScopeId: 'mgr-u14', subgroupKey: 'a', leaderId: 'u9', color: '#f97316', joined: '2026-03-18', status: 'active' },
  { id: 'u12', name: '许凡', short: 'F', initial: 'X', role: 'member', email: 'xufan@company.com', groups: ['g3'], businessId: 'overseas-tool', managerScopeId: 'mgr-u14', subgroupKey: 'b', leaderId: '', color: '#84cc16', joined: '2026-03-20', status: 'pending' },
];

let groups = [
  { id: 'g1', name: '品牌组', color: '#7c3aed', members: ['u5','u2','u4','u6','u8'], leaderId: 'u2' },
  { id: 'g2', name: '海外组', color: '#3b82f6', members: ['u13','u3','u7','u10'], leaderId: 'u3' },
  { id: 'g3', name: '增长组', color: '#10b981', members: ['u14','u9','u11','u12'], leaderId: 'u9' },
];

let currentUser = users[0]; // start as admin

// ===== Projects with permission data =====
let projects = [
  {
    id: 1, name: '春季营销-品牌推广', client: '春季营销', product: '品牌推广', media: 'kwai', industry: 'ent', desc: '2026 Q1 春季推广视频合集', color: '#7c3aed', updated: '2 小时前',
    visibility: 'shared',
    owner: 'u1',
    visibleTo: { type: 'groups', groups: ['g1'] },
    members: ['u1', 'u2', 'u4'],
    folders: [
      { id: 101, name: '品牌视频', visibility: 'shared', owner: 'u1', members: ['u1', 'u2'], files: [
        { name: '品牌故事_主脚本.md', type: 'script', status: 'done', time: '2 小时前', creator: 'u1', taskId: 'T-20260326-001', preview: '在这个春天，我们带来全新的生活方式。镜头从清晨的城市天际线缓缓推进，阳光洒在街道上...' },
        { name: '品牌故事_v1.mp4', type: 'video', status: 'done', time: '1 小时前', creator: 'u2', taskId: 'T-20260326-001', thumbHue: 260, thumbScene: '城市天际线 · 晨光', duration: '00:30', tags: ['品牌','春季'] },
        { name: '品牌故事_v2.mp4', status: 'done', time: '45 分钟前', creator: 'u2', taskId: 'T-20260326-001', thumbHue: 280, thumbScene: '产品特写 · 暖调', duration: '00:30', tags: ['品牌','暖调'] },
        { name: '品牌片头.mp4', type: 'video', status: 'processing', time: '进行中', creator: 'u1', taskId: 'T-20260330-002', thumbHue: 220, thumbScene: 'LOGO动画 · 渲染中', duration: '00:05', tags: ['片头'] },
      ]},
      { id: 102, name: '产品介绍', visibility: 'shared', owner: 'u1', members: ['u1', 'u2', 'u4', 'u6', 'u8'], files: [
        { name: '新品发布_脚本.txt', type: 'script', status: 'done', time: '4 小时前', creator: 'u1', taskId: 'T-20260330-001', preview: '【开场】你是否还在为选择困难而烦恼？今天，我们为你带来一款革命性的新产品，它将彻底改变...' },
        { name: '新品发布_30s.mp4', type: 'video', status: 'done', time: '3 小时前', creator: 'u1', taskId: 'T-20260329-001', thumbHue: 150, thumbScene: '产品展示 · 旋转', duration: '00:30', tags: ['新品','产品'] },
        { name: '功能介绍_15s.mp4', type: 'video', status: 'draft', time: '草稿', creator: 'u2', taskId: null, thumbHue: 200, thumbScene: '功能演示 · 分屏', duration: '00:15', tags: ['功能','介绍'] },
        { name: '假期脚本_赵强.md', type: 'script', status: 'done', time: '1 天前', creator: 'u4', taskId: 'T-20260414-101', preview: '假期限时礼包登场！消除关卡再升级，轻松闯关赢现金...' },
        { name: '消除竖版_u4_001.mp4', type: 'video', status: 'done', time: '5 天前', creator: 'u4', taskId: 'T-20260409-101', thumbHue: 140, thumbScene: '竖版消除 · 春日', duration: '00:20', tags: ['竖版','消除'] },
        { name: '4月脚本_u4.md', type: 'script', status: 'done', time: '13 天前', creator: 'u4', taskId: 'T-20260401-101', preview: '4月新主题上线！多倍积分任务来袭，现金大奖等你拿...' },
        { name: '消除竖版_u6_001.mp4', type: 'video', status: 'done', time: '1 天前', creator: 'u6', taskId: 'T-20260414-102', thumbHue: 170, thumbScene: '品牌竖版 · Grok', duration: '00:15', tags: ['Grok','竖版'] },
        { name: '赚钱品牌_u6.mp4', type: 'video', status: 'done', time: '4 天前', creator: 'u6', taskId: 'T-20260410-102', thumbHue: 200, thumbScene: '赚钱品牌 · Grok', duration: '00:20', tags: ['Grok','品牌'] },
        { name: '春季快产_u8_001.mp4', type: 'video', status: 'done', time: '5 天前', creator: 'u8', taskId: 'T-20260409-102', thumbHue: 260, thumbScene: '春季快产 · 竖版', duration: '00:15', tags: ['春季','快产'] },
        { name: '赚钱组脚本_u8.md', type: 'script', status: 'done', time: '15 天前', creator: 'u8', taskId: 'T-20260330-101', preview: '赚钱App核心卖点：快速到账、新人福利翻倍，马上体验！...' },
        { name: '品牌横版_u8.mp4', type: 'video', status: 'done', time: '14 天前', creator: 'u8', taskId: 'T-20260331-101', thumbHue: 290, thumbScene: '品牌横版 · Veo3.1', duration: '00:16', tags: ['Veo3.1','横版'] },
      ]},
      { id: 103, name: '李晓的草稿', visibility: 'private', owner: 'u2', members: ['u2'], files: [
        { name: '实验分镜脚本.md', type: 'script', status: 'draft', time: '昨天', creator: 'u2', taskId: 'T-20260328-002', preview: '分镜1: 俯拍城市夜景，霓虹灯闪烁（2s）\n分镜2: 手持跟拍人物穿过街道（3s）\n分镜3: ...' },
        { name: '实验_竖版_v1.mp4', type: 'video', status: 'draft', time: '昨天', creator: 'u2', taskId: 'T-20260327-001', thumbHue: 320, thumbScene: '竖版测试 · 夜景', duration: '00:20', tags: ['实验','竖版'] },
      ]},
    ]
  },
  {
    id: 2, name: '海外市场-多语言投放', client: '海外市场', product: '多语言投放', media: 'tt', industry: 'other', desc: '多语言广告素材制作', color: '#3b82f6', updated: '昨天',
    visibility: 'shared', owner: 'u1',
    visibleTo: { type: 'groups', groups: ['g2'] },
    members: ['u1', 'u3'],
    folders: [
      { id: 201, name: '葡西双语版', visibility: 'shared', owner: 'u1', members: ['u1', 'u3'], files: [
        { name: 'product_intro_PT_script.md', type: 'script', status: 'done', time: '昨天', creator: 'u1', taskId: 'T-20260330-003', preview: 'Apresentamos nossa nova campanha de primavera, criada para gerar cliques rápidos, destacar a oferta limitada e manter ritmo forte para social ads...' },
        { name: 'product_intro_PT.mp4', type: 'video', status: 'done', time: '昨天', creator: 'u3', taskId: 'T-20260330-003', thumbHue: 190, thumbScene: 'Product Hero · PT', duration: '00:30', tags: ['葡语','产品'] },
        { name: 'product_intro_ES_script.md', type: 'script', status: 'done', time: '昨天', creator: 'u1', taskId: 'T-20260330-003', preview: 'Presentamos nuestra nueva campaña de primavera, diseñada para destacar el beneficio principal, acelerar la decisión y adaptarse al ritmo social...' },
        { name: 'product_intro_ES.mp4', type: 'video', status: 'done', time: '昨天', creator: 'u3', taskId: 'T-20260330-003', thumbHue: 215, thumbScene: 'Product Hero · ES', duration: '00:30', tags: ['西语','产品'] },
      ]},
      { id: 202, name: '王芳的草稿', visibility: 'private', owner: 'u3', members: ['u3'], files: [
        { name: 'product_intro_JP_script.md', type: 'script', status: 'draft', time: '草稿', creator: 'u3', taskId: 'T-20260328-001', preview: '最新のイノベーションをご紹介します。グローバル市場向けに設計されたこの製品は、最先端の技術と...' },
        { name: 'product_intro_JP_draft.mp4', type: 'video', status: 'processing', time: '进行中', creator: 'u3', taskId: 'T-20260328-001', thumbHue: 350, thumbScene: '日本市場 · 渲染中', duration: '00:30', tags: ['日语','产品'] },
      ]},
    ]
  },
  {
    id: 3, name: '李晓-实验项目', client: '李晓', product: '实验项目', media: 'kwai', industry: 'other', desc: '李晓的私人创作空间', color: '#f43f5e', updated: '3 天前',
    visibility: 'private', owner: 'u2',
    visibleTo: { type: 'specific_users', users: ['u2'] },
    members: ['u2'],
    folders: [
      { id: 301, name: '预告片', visibility: 'private', owner: 'u2', members: ['u2'], files: [
        { name: 'teaser_script_v1.txt', type: 'script', status: 'draft', time: '草稿', creator: 'u2', taskId: 'T-20260329-002', preview: '【预告片脚本 v1】\n节奏：快切+慢镜交替\n开场：黑屏 → 文字浮现"即将到来"（1.5s）...' },
        { name: 'teaser_v1.mp4', type: 'video', status: 'draft', time: '草稿', creator: 'u2', taskId: 'T-20260329-002', thumbHue: 30, thumbScene: '预告片 · 快切节奏', duration: '00:45', tags: ['预告','快切'] },
      ]},
    ]
  },
  {
    id: 4, name: '赚钱App-海外增长', client: '赚钱App', product: '赚钱App', media: 'tt', industry: 'earn', desc: '海外市场赚钱App投放素材', color: '#3b82f6', updated: '1 天前',
    visibility: 'shared', owner: 'u3',
    visibleTo: { type: 'groups', groups: ['g2'] },
    members: ['u3', 'u7', 'u10', 'u13'],
    folders: [
      { id: 401, name: '海外脚本', visibility: 'shared', owner: 'u3', members: ['u3', 'u7', 'u10', 'u13'], files: [
        { name: '海外脚本_u3_001.md', type: 'script', status: 'done', time: '2 天前', creator: 'u3', taskId: 'T-20260412-201', preview: '海外赚钱App核心钩子脚本：开场展示提现截图，强节奏快切，精准触达东南亚用户...' },
        { name: '海外脚本_u3_002.md', type: 'script', status: 'done', time: '12 天前', creator: 'u3', taskId: 'T-20260403-001', preview: '三语版本底稿：印尼语/越南语/泰语，保留本地化语感，突出新人福利...' },
        { name: 'BR_脚本_u7_001.md', type: 'script', status: 'done', time: '1 天前', creator: 'u7', taskId: 'T-20260413-201', preview: '巴西版钩子文案：强调快速到账体验，适配本地社交媒体节奏...' },
        { name: 'BR_脚本_u7_002.md', type: 'script', status: 'done', time: '6 天前', creator: 'u7', taskId: 'T-20260408-101', preview: '巴西第二批脚本：场景切换升级，视觉更强烈，CTA更直接...' },
        { name: '译文汇总_u10.txt', type: 'script', status: 'done', time: '2 天前', creator: 'u10', taskId: 'T-20260412-202', preview: '越南/泰语广告译文汇总，风格：广告文案，已完成本地化校对...' },
      ]},
      { id: 402, name: '海外视频', visibility: 'shared', owner: 'u3', members: ['u3', 'u7', 'u10', 'u13'], files: [
        { name: '海外_grok_u3_001.mp4', type: 'video', status: 'done', time: '2 天前', creator: 'u3', taskId: 'T-20260412-201', thumbHue: 190, thumbScene: '海外投放 · Grok', duration: '00:20', tags: ['海外','Grok'] },
        { name: '海外_grok_u7_001.mp4', type: 'video', status: 'done', time: '12 天前', creator: 'u7', taskId: 'T-20260402-001', thumbHue: 210, thumbScene: '海外投放 · 竖版', duration: '00:20', tags: ['海外','竖版'] },
        { name: '品牌_grok_u10_001.mp4', type: 'video', status: 'done', time: '7 天前', creator: 'u10', taskId: 'T-20260407-101', thumbHue: 230, thumbScene: '品牌推广 · Grok', duration: '00:15', tags: ['品牌','Grok'] },
        { name: '品牌_grok_u10_002.mp4', type: 'video', status: 'done', time: '7 天前', creator: 'u10', taskId: 'T-20260407-101', thumbHue: 245, thumbScene: '品牌推广 · Grok B', duration: '00:15', tags: ['品牌','Grok'] },
      ]},
    ]
  },
  {
    id: 5, name: '增长营销-消除游戏', client: '增长营销', product: '消除游戏', media: 'kwai', industry: 'ent', desc: '增长组消除游戏广告素材', color: '#10b981', updated: '1 天前',
    visibility: 'shared', owner: 'u9',
    visibleTo: { type: 'groups', groups: ['g3'] },
    members: ['u9', 'u11', 'u12', 'u14'],
    folders: [
      { id: 501, name: '增长视频', visibility: 'shared', owner: 'u9', members: ['u9', 'u11', 'u12', 'u14'], files: [
        { name: '增长联动_u9_001.mp4', type: 'video', status: 'done', time: '10 天前', creator: 'u9', taskId: 'T-20260404-001', thumbHue: 150, thumbScene: '品牌联动 · Veo3.1', duration: '00:20', tags: ['品牌','Veo3.1'] },
        { name: '增长联动_u9_002.mp4', type: 'video', status: 'done', time: '10 天前', creator: 'u9', taskId: 'T-20260404-001', thumbHue: 165, thumbScene: '品牌联动 · B版', duration: '00:20', tags: ['品牌','Veo3.1'] },
        { name: '增长A_u9_001.mp4', type: 'video', status: 'done', time: '3 天前', creator: 'u9', taskId: 'T-20260411-201', thumbHue: 130, thumbScene: '增长A组 · Veo3.1', duration: '00:16', tags: ['增长','Veo3.1'] },
        { name: '增长B_u12_001.mp4', type: 'video', status: 'done', time: '9 天前', creator: 'u12', taskId: 'T-20260405-001', thumbHue: 175, thumbScene: '增长B组 · Grok', duration: '00:15', tags: ['增长','Grok'] },
        { name: '增长B_u12_002.mp4', type: 'video', status: 'done', time: '9 天前', creator: 'u12', taskId: 'T-20260405-001', thumbHue: 180, thumbScene: '增长B组 · Grok B', duration: '00:15', tags: ['增长','Grok'] },
        { name: '增长测试_u11_001.mp4', type: 'video', status: 'done', time: '17 天前', creator: 'u11', taskId: 'T-20260328-101', thumbHue: 200, thumbScene: '增长测试 · Grok', duration: '00:15', tags: ['增长','Grok'] },
      ]},
      { id: 502, name: '增长脚本', visibility: 'shared', owner: 'u9', members: ['u9', 'u11', 'u12', 'u14'], files: [
        { name: '增长联动_u9_脚本.md', type: 'script', status: 'done', time: '10 天前', creator: 'u9', taskId: 'T-20260404-001', preview: '品牌推广联动脚本：强调产品升级节奏，视觉钩子开场，数据展示收尾...' },
        { name: '增长组脚本_u11_001.md', type: 'script', status: 'done', time: '3 天前', creator: 'u11', taskId: 'T-20260411-202', preview: '消除游戏增长组脚本批次1：高能连击开场，礼包浮现，现金奖励收尾...' },
        { name: '增长周脚本_u11_001.md', type: 'script', status: 'done', time: '8 天前', creator: 'u11', taskId: 'T-20260406-001', preview: '增长组周脚本：本周主题"多倍积分周"，节奏紧凑，限时感强...' },
        { name: '增长首批_u12_001.md', type: 'script', status: 'done', time: '19 天前', creator: 'u12', taskId: 'T-20260326-101', preview: '增长组首批脚本：产品核心玩法展示，简洁直接，下沉市场向...' },
        { name: 'veo31增长_u8_202.mp4', type: 'video', status: 'done', time: '1 天前', creator: 'u8', taskId: 'T-20260413-202', thumbHue: 260, thumbScene: '增长测试 · Veo3.1', duration: '00:16', tags: ['增长','Veo3.1'] },
      ]},
    ]
  },
];
