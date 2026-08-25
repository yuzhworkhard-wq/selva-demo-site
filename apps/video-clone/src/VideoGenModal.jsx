import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2, Check, Clock,
  ArrowLeft, ArrowUp, Plus, Film, Clapperboard, Music, Lock, AlertCircle,
  LayoutGrid, List, Copy, GitBranch, Settings, Wand2, Search, Calendar, DollarSign, Download, Play,
  Upload, FolderOpen, UserRound, Image as ImageIcon, Bookmark, Flame, Share2,
} from 'lucide-react';
import { notifyHostModal } from './hostModal';
import { buildVariantScripts } from './briefParser';
import {
  VIDEO_MODEL_CONFIG, MODEL_FAMILIES, DEFAULT_MODEL, modelCfg, modelLabel, familyOf,
  REF_KINDS, kindLabel, kindOfFile,
} from './videoModelConfig.mjs';
import {
  INDUSTRIES, SOURCES, VIDEO_TYPES, DURATION_BANDS, SIZES, CREATED_BANDS, CREATED_SEGMENT_LABELS,
  CAL_WEEKDAYS, formatSpend, deriveTodaySpend, formatUploadDate,
  filterLibrary, sortLibrary, filterFavorites, loadFavoriteIds, saveFavoriteIds, toggleFavoriteId,
  toIsoDate, parseIsoDate, monthGrid,
} from './viralLibrary.mjs';
import { regionLabelByIndex } from './videoRegionConfig.mjs';
import { LibraryRegionPicker } from './RegionPickerPanel';

/* ── 输入卡控件选项（视频生成语义，全部真下拉）── */
const ASPECTS = ['9:16', '1:1', '16:9'];
const COUNT_MAX = 4;

const toRefItems = (list) => (list || []).map(x => (typeof x === 'string' ? { url: x, name: '' } : x));
// 选择器里那排能力标签：时长 + 各类素材上限 + 提示词字数，一行看完这一档能干什么
function modelChips(model) {
  const cfg = modelCfg(model);
  const chips = [cfg.durations.join(' / ')];
  REF_KINDS.forEach(({ key }) => {
    const n = cfg.limits[key];
    if (n > 0) chips.push(`${kindLabel(model, key)} ×${n}`);
  });
  chips.push(`${cfg.maxChars} 字`);
  return chips;
}

/* ── 资源库（平台「我的资源库」的镜像，demo 写死）──
   分三类给人看：角色 / 图片 / 视频。但配额还是按素材类型算——
   角色和图片都占「参考图」的名额，视频占「参考视频」的名额。 */
const LIB_CHARACTERS = [
  { id: 'lc-1',  name: 'Chloe',  url: 'showcase/chloe.jpg',  meta: '女 · 青年 · 欧美' },
  { id: 'lc-2',  name: 'Kai',    url: 'showcase/kai.jpg',    meta: '男 · 成年 · 东亚' },
  { id: 'lc-3',  name: 'Elena',  url: 'showcase/elena.jpg',  meta: '女 · 青年 · 欧美' },
  { id: 'lc-4',  name: 'Jonas',  url: 'showcase/jonas.jpg',  meta: '男 · 成年 · 欧美' },
  { id: 'lc-5',  name: 'Sarah',  url: 'showcase/sarah.jpg',  meta: '女 · 成年 · 欧美' },
  { id: 'lc-6',  name: 'Diego',  url: 'showcase/diego.jpg',  meta: '男 · 中年 · 拉丁裔' },
  { id: 'lc-7',  name: 'Mei',    url: 'showcase/mei.jpg',    meta: '女 · 成年 · 东亚' },
  { id: 'lc-8',  name: 'Owen',   url: 'showcase/owen.jpg',   meta: '男 · 青年 · 非裔' },
  { id: 'lc-9',  name: 'Freya',  url: 'showcase/freya.jpg',  meta: '女 · 青年 · 欧美' },
  { id: 'lc-10', name: 'Victor', url: 'showcase/victor.jpg', meta: '男 · 中年 · 欧美' },
  { id: 'lc-11', name: 'Zoe',    url: 'showcase/zoe.jpg',    meta: '女 · 青年 · 欧美' },
  { id: 'lc-12', name: 'Walter', url: 'showcase/walter.jpg', meta: '男 · 老年 · 欧美' },
  { id: 'lc-13', name: 'Priya',  url: 'showcase/priya.jpg',  meta: '女 · 青年 · 南亚' },
  { id: 'lc-14', name: 'Omar',   url: 'showcase/omar.jpg',   meta: '男 · 青年 · 中东' },
];
const LIB_IMAGES = [
  { id: 'li-1', name: '街边ATM_到账实拍.jpg',   url: 'frames/frame_01.jpg', meta: '产品场景' },
  { id: 'li-2', name: '居家沙发_中景.jpg',      url: 'frames/frame_02.jpg', meta: '场景底图' },
  { id: 'li-3', name: '手机界面_收益页.jpg',    url: 'frames/frame_03.jpg', meta: 'UI 截图' },
  { id: 'li-4', name: '金额档位_R$特写.jpg',    url: 'frames/frame_04.jpg', meta: '金额镜' },
  { id: 'li-5', name: '街区台阶_日光.jpg',      url: 'frames/frame_05.jpg', meta: '场景底图' },
  { id: 'li-6', name: '地毯萌宠_暖调.jpg',      url: 'frames/frame_06.jpg', meta: '片尾素材' },
  { id: 'li-7', name: '商业街_夜景霓虹.jpg',    url: 'frames/frame_07.jpg', meta: '场景底图' },
  { id: 'li-8', name: '柴犬正面_片头.jpg',      url: 'frames/frame_08.jpg', meta: '片头素材' },
  { id: 'li-9', name: '客厅口播_手游.jpg',      url: 'frames/frame_09.jpg', meta: '产品场景' },
];
const LIB_VIDEOS = [
  { id: 'lv-1', name: '春季_15s_A.mp4',   url: 'test-clip.mp4', cover: 'frames/frame_01.jpg', meta: '00:15' },
  { id: 'lv-2', name: '片头_标准版.mp4',  url: 'test-clip.mp4', cover: 'frames/frame_08.jpg', meta: '00:05' },
  { id: 'lv-3', name: '竞品_口播A.mp4',   url: 'test-clip.mp4', cover: 'frames/frame_09.jpg', meta: '00:22' },
  { id: 'lv-4', name: '竞品_到账B.mp4',   url: 'test-clip.mp4', cover: 'frames/frame_04.jpg', meta: '00:18' },
  { id: 'lv-5', name: '夜景转场素材.mp4', url: 'test-clip.mp4', cover: 'frames/frame_07.jpg', meta: '00:08' },
  { id: 'lv-6', name: '片尾_温情版.mp4',  url: 'test-clip.mp4', cover: 'frames/frame_06.jpg', meta: '00:06' },
];
const LIB_TABS = [
  { key: 'character', label: '角色', icon: UserRound, kind: 'image', items: LIB_CHARACTERS, ratio: '9/16' },
  { key: 'image',     label: '图片', icon: ImageIcon, kind: 'image', items: LIB_IMAGES,     ratio: '3/4' },
  { key: 'video',     label: '视频', icon: Film,      kind: 'video', items: LIB_VIDEOS,     ratio: '3/4' },
];

/* 生成前的拦截：把「当前模型不允许的状态」逐条列出来。非空 = 生成按钮不给点，
   同时把第一条摆到底栏上方——错在哪、要删几个，说清楚了才算拦得住。 */
function genIssues(model, refs, promptText = '') {
  const cfg = modelCfg(model);
  const displayModel = modelLabel(model);
  const issues = [];
  if (cfg.imageRequired && refs.image.length === 0) issues.push(`${displayModel} 必须上传 1 张首帧图才能生成`);
  REF_KINDS.forEach(({ key }) => {
    const max = cfg.limits[key];
    const over = refs[key].length - max;
    if (over <= 0) return;
    const label = kindLabel(model, key);
    issues.push(max === 0
      ? `${displayModel} 不支持${label}，请移除已添加的 ${refs[key].length} 个`
      : `${displayModel} 最多 ${max} 个${label}，请移除 ${over} 个`);
  });
  // 字数上限由配置驱动：从长的那档换到短的，已写的字不替用户砍
  const overChars = promptText.length - cfg.maxChars;
  if (overChars > 0) issues.push(`${displayModel} 提示词最多 ${cfg.maxChars} 字，请删掉 ${overChars} 字`);
  return issues;
}

/* Magic Prompt：只管「这几条的 prompt 有多不一样」，不管要几条（那是条数的事）。
   它是每次生成时后台跑、每条各变一次、事后在任务详情里逐条查——
   输入框里那句话始终是用户自己写的，系统不去改它。 */
const MAGIC_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'on', label: '开' },
  { value: 'off', label: '关' },
];
const MAGIC_LABEL = { auto: '自动', on: '开', off: '关' };

/* ── 爆款视频库：按近 7 日消耗排序的投放素材库。
   视频生成第一步：悬停后点「做相似」＝把提示词灌进输入框（展示卡和库页卡不是同一套）。
   一级菜单库页点卡片＝打开这条的预览详情。── */
const DEMO_CLIP = 'test-clip.mp4';
const LIBRARY_PAGE_SIZE = 60;
const LIB_SORTS = [
  { value: 'spend', label: '消耗' },
  { value: 'new', label: '最新创建' },
  { value: 'fav', label: '收藏夹' },
];

function useViralFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(() => loadFavoriteIds());
  const toggleFavorite = (id) => {
    setFavoriteIds(prev => {
      const next = toggleFavoriteId(prev, id);
      saveFavoriteIds(next);
      return next;
    });
  };
  const isFavorited = (id) => favoriteIds.includes(id);
  return { favoriteIds, toggleFavorite, isFavorited };
}

const SHOWCASE_SEEDS = [
  { id: 'sc-01', product: 'mixreels', industry: '网赚', type: '原生', source: 'TikTok', spend: 42800, duration: 18, size: '9:16', days: 11, cover: 'showcase/sarah.jpg', title: '素人沙发口播 · 开箱式带货',
    prompt: '年轻女生坐在暖色调客厅沙发上对镜头口播，手里拿着产品边说边展示，语气像跟朋友分享，自然手持拍摄感，9:16 竖屏。' },
  { id: 'sc-02', product: 'CashDrama', industry: '网赚', type: '实拍', source: 'Kwai', spend: 31200, duration: 23, size: '9:16', days: 26, cover: 'frames/frame_01.jpg', title: '街边 ATM · 到账实拍',
    prompt: '街边 ATM 前，年轻女子手持手机面对镜头，介绍看短剧赚钱的 App，说「看一集就能到账」，真实手持拍摄感。' },
  { id: 'sc-03', product: 'UnboxKit', industry: '工具', type: '精剪', source: 'TikTok', spend: 18600, duration: 27, size: '9:16', days: 6, cover: 'showcase/jonas.jpg', title: '桌面开箱 · 硬核测评口吻',
    prompt: '男主播在布置精致的书桌前开箱产品，双手拿起展示细节，语气专业冷静像测评，暖光台灯 + 背景虚化。' },
  { id: 'sc-04', product: 'LuckyTile', industry: '游戏', type: '原生', source: 'TikTok', spend: 22100, duration: 15, size: '9:16', days: 19, cover: 'frames/frame_09.jpg', title: '客厅口播 · 手游安利',
    prompt: '日本美女在明亮客厅对镜头介绍一款麻将手游，手持手机展示界面，语气亲切自然，9:16 竖屏真实质感。' },
  { id: 'sc-05', product: 'GlowSkin', industry: '其他', type: '精剪', source: 'Kwai', spend: 9400, duration: 21, size: '9:16', days: 2, cover: 'showcase/chloe.jpg', title: '阳台自然光 · 护肤安利',
    prompt: '女生在阳台自然光下手持护肤瓶对镜头讲使用感受，画面通透干净，中景带手势特写产品，清新日系调色。' },
  { id: 'sc-06', product: 'PayClip', industry: '网赚', type: 'AI', source: 'TikTok', spend: 15700, duration: 12, size: '9:16', days: 31, cover: 'frames/frame_04.jpg', title: '手机屏特写 · 收益结算',
    prompt: '手机屏幕特写，展示 App 的收益结算界面，金额档位 R$2/4/6/10 依次点过，数字清晰醒目。' },
  { id: 'sc-07', product: 'ChatNow', industry: '社交', type: '原生', source: 'TikTok', spend: 12800, duration: 19, size: '9:16', days: 9, cover: 'showcase/mei.jpg', title: '厨房随手拍 · 生活流',
    prompt: '素人女生在厨房一边做事一边扭头对镜头讲产品体验，画面略带手持晃动，生活化不精致，像随手拍的真实分享。' },
  { id: 'sc-08', product: 'StreetAsk', industry: '社交', type: '实拍', source: 'Kwai', spend: 8700, duration: 24, size: '9:16', days: 14, cover: 'showcase/diego.jpg', title: '街头拦访 · 路人反应',
    prompt: '街头拦住路人做采访，路人对着镜头惊讶地说出使用感受，背景是热闹的商业街，手持跟拍纪实感。' },
  { id: 'sc-09', product: 'NightReel', industry: '互娱', type: '精剪', source: 'TikTok', spend: 25400, duration: 16, size: '9:16', days: 4, cover: 'showcase/victor.jpg', title: '夜色霓虹 · 高级感开场',
    prompt: '夜晚霓虹街头，男主角侧身走向镜头，冷调蓝紫光影，浅景深电影质感，镜头缓慢前推。' },
  { id: 'sc-10', product: 'PawClip', industry: '其他', type: 'AI', source: 'Kwai', spend: 6300, duration: 11, size: '9:16', days: 23, cover: 'frames/frame_08.jpg', title: '柴犬动效 · 片头素材',
    prompt: '让这只柴犬做几个可爱动作当片头：原地坐正、歪头、伸出前爪，镜头固定，背景保持不变。' },
  { id: 'sc-11', product: 'mixreels', industry: '工具', type: '混剪', source: 'TikTok', spend: 19200, duration: 20, size: '9:16', days: 17, cover: 'showcase/priya.jpg', title: '窗边中景 · 亲和讲解',
    prompt: '女主播在窗边柔光下中景口播，双手自然比划讲解卖点，暖色调亲和氛围，节奏舒缓。' },
  { id: 'sc-12', product: 'GlowSkin', industry: '其他', type: '原生', source: 'Kwai', spend: 14100, duration: 22, size: '9:16', days: 1, cover: 'showcase/zoe.jpg', title: '镜前上妆 · 边化边讲',
    prompt: '女生在化妆镜前一边上妆一边对镜头讲产品，镜面反射补光，特写与半身景交替，精致质感。' },
  { id: 'sc-13', product: 'ChatNow', industry: '社交', type: '实拍', source: 'TikTok', spend: 7600, duration: 18, size: '1:1', days: 8, cover: 'showcase/owen.jpg', title: '车里自拍 · 通勤口播',
    prompt: '男生坐在车里举着手机自拍视角讲产品，车窗外是流动的街景，光线自然，像通勤路上随手录的。' },
  { id: 'sc-14', product: 'PayClip', industry: '网赚', type: '混剪', source: 'Kwai', spend: 10300, duration: 25, size: '9:16', days: 29, cover: 'frames/frame_02.jpg', title: '居家场景 · 体验讲述',
    prompt: '温馨居家场景，模特在沙发上自然讲述产品体验，暖色调柔和光线，中景带手势互动。' },
  { id: 'sc-15', product: 'UnboxKit', industry: '工具', type: '精剪', source: 'TikTok', spend: 16800, duration: 28, size: '9:16', days: 13, cover: 'showcase/kai.jpg', title: '手持展示 · 参数对比',
    prompt: '男生双手举起两款产品做对比，镜头在两者之间来回切，语速偏快信息密度高，冷白光棚拍感。' },
  { id: 'sc-16', product: 'LuckyTile', industry: '游戏', type: 'AI', source: 'TikTok', spend: 54100, duration: 14, size: '9:16', days: 3, cover: 'showcase/freya.jpg', title: '沉浸开场 · 悬念钩子',
    prompt: '女生凑近镜头压低声音抛出一个悬念问题，随后转身指向身后屏幕上的游戏画面，暗调布光带戏剧感。' },
  { id: 'sc-17', product: 'CashDrama', industry: '网赚', type: '实拍', source: 'Kwai', spend: 28900, duration: 17, size: '9:16', days: 21, cover: 'showcase/elena.jpg', title: '到账截图 · 惊喜反应',
    prompt: '女生看着手机屏幕露出惊喜表情，把到账页面举到镜头前，背景是普通居家环境，真实感优先。' },
  { id: 'sc-18', product: 'StreetAsk', industry: '社交', type: '原生', source: 'Kwai', spend: 800, duration: 32, size: '16:9', days: 7, cover: 'showcase/omar.jpg', title: '门店门口 · 老板出镜',
    prompt: '店铺门口，老板双手抱胸对镜头讲自己怎么用这个工具省事，市井烟火气，自然光手持拍摄。' },
  { id: 'sc-19', product: 'NightReel', industry: '互娱', type: '精剪', source: 'TikTok', spend: 33400, duration: 15, size: '9:16', days: 16, cover: 'showcase/walter.jpg', title: '硬光棚拍 · 质感特写',
    prompt: '棚拍硬光打在主体侧脸，高对比明暗交界，镜头极慢推近，无台词只有环境音，高级广告片质感。' },
  { id: 'sc-20', product: 'PawClip', industry: '其他', type: '混剪', source: 'Kwai', spend: 4200, duration: 65, size: '9:16', days: 34, cover: 'frames/frame_06.jpg', title: '萌宠陪伴 · 温情结尾',
    prompt: '主人和宠物在地毯上互动，宠物凑近镜头，暖黄色调温情氛围，适合做片尾收束镜头。' },
  { id: 'sc-21', product: 'ReelCash', industry: '网赚', type: '原生', source: 'TikTok', spend: 36500, duration: 16, size: '9:16', days: 5, cover: 'showcase/sarah.jpg', title: '卧室口播 · 到账晒单',
    prompt: '女生在卧室床上对镜头展示手机到账截图，语气兴奋但自然，暖灯环境，竖屏真实分享感。' },
  { id: 'sc-22', product: 'TileRush', industry: '游戏', type: '精剪', source: 'TikTok', spend: 27800, duration: 13, size: '9:16', days: 12, cover: 'frames/frame_03.jpg', title: '游戏录屏 · 连击高光',
    prompt: '手游录屏穿插玩家惊喜反应，连击特效满屏，节奏快切，前 2 秒先给最高分画面。' },
  { id: 'sc-23', product: 'FaceGlow', industry: '工具', type: 'AI', source: 'Kwai', spend: 11200, duration: 19, size: '9:16', days: 3, cover: 'showcase/chloe.jpg', title: '前后对比 · 滤镜展示',
    prompt: '女生半脸对比展示滤镜前后效果，手指出屏引导看细节，干净背景，工具类转化口吻。' },
  { id: 'sc-24', product: 'DramaGo', industry: '网赚', type: '实拍', source: 'Kwai', spend: 24600, duration: 22, size: '9:16', days: 18, cover: 'frames/frame_05.jpg', title: '地铁口播 · 碎片时间',
    prompt: '通勤女生在地铁口对镜头讲用碎片时间刷短剧赚零花钱，环境真实略嘈杂，手持拍摄。' },
  { id: 'sc-25', product: 'ChatLoop', industry: '社交', type: '混剪', source: 'TikTok', spend: 9800, duration: 17, size: '1:1', days: 10, cover: 'showcase/mei.jpg', title: '群聊截图 · 社交证明',
    prompt: '快速切群聊截图和用户好评，中间穿插产品界面，强调朋友都在用，1:1 方形投放版。' },
  { id: 'sc-26', product: 'BoxLab', industry: '工具', type: '原生', source: 'TikTok', spend: 15400, duration: 26, size: '9:16', days: 7, cover: 'showcase/jonas.jpg', title: '工作台 · 效率展示',
    prompt: '博主在整洁工作台演示 App 如何省时间，屏幕录制与真人口播交叉，专业但不硬广。' },
  { id: 'sc-27', product: 'SpinWin', industry: '游戏', type: 'AI', source: 'Kwai', spend: 33200, duration: 11, size: '9:16', days: 2, cover: 'showcase/freya.jpg', title: '转盘抽奖 · 悬念开场',
    prompt: '游戏转盘特写从慢到快，停在中奖格时切真人惊喜反应，强钩子竖屏广告。' },
  { id: 'sc-28', product: 'VibeCut', industry: '互娱', type: '精剪', source: 'TikTok', spend: 18900, duration: 21, size: '9:16', days: 15, cover: 'showcase/victor.jpg', title: '卡点混剪 · 音乐驱动',
    prompt: '按鼓点切镜头，人物动作与音乐同步，霓虹色调，适合娱乐向投放的开场。' },
  { id: 'sc-29', product: 'EarnHub', industry: '网赚', type: '混剪', source: 'TikTok', spend: 41200, duration: 14, size: '9:16', days: 0, cover: 'frames/frame_07.jpg', title: '收益曲线 · 数据可视化',
    prompt: 'App 收益曲线动画配合真人 pointing 关键数字，强调今日收益，竖屏信息密度高。' },
  { id: 'sc-30', product: 'PetTok', industry: '其他', type: '实拍', source: 'Kwai', spend: 7200, duration: 24, size: '9:16', days: 6, cover: 'frames/frame_08.jpg', title: '宠物日常 · 软性植入',
    prompt: '记录宠物日常片段，主人在旁自然提到产品，不硬推，生活 vlog 质感。' },
];

/* 部分种子用完整分镜级提示词，方便爆款库详情里演示展开 / 收起。 */
const SHOWCASE_LONG_PROMPTS = {
  'sc-01': `A stop-motion animation shot from a vertical mobile phone shooting perspective, set against a pure, saturated bright green backdrop. In the extreme foreground, a hand enters holding a smartphone displaying a short-drama rewards app. The hand taps through three payout tiers (R$2 / R$4 / R$6) while coins animate on screen.

镜头 1（0–3s）：竖屏自拍视角，年轻女生坐在暖色客厅沙发上对镜头口播，手里拿着产品边说边展示，语气像跟朋友分享，自然 handheld 拍摄感。
镜头 2（3–10s）：切至手机屏特写，收益结算页数字依次亮起，手指轻点「提现」按钮，UI 清晰可读，轻微屏幕反光。
镜头 3（10–18s）：回到中景，女生把到账截图举到镜头前，表情从平静到惊喜，背景是普通居家环境，真实感优先。

Audio：轻快的 Lo-fi 底噪 + 女生葡语口播「assistir um episódio e já cai na conta」，保留少量环境白噪，整体像 TikTok 原生 UGC 广告。`,
  'sc-04': `日本美女在明亮客厅对镜头介绍一款麻将手游，手持手机展示界面，语气亲切自然，9:16 竖屏真实质感。

镜头 1（0–3s）：中景口播，女生微笑看向镜头，背景是暖色客厅与绿植，手持手机竖屏展示游戏主界面，节奏轻快，前 2 秒先给最高分连击画面作钩子。
镜头 2（3–8s）：切至手机屏幕特写，手指滑动展示关卡地图、奖励弹窗与转盘动画，UI 元素清晰可读，轻微手持晃动，景深浅。
镜头 3（8–15s）：回到中景，女生用另一只手比划「三消」手势，表情从好奇到惊喜，最后指向屏幕上的高分排行榜，自然光从左侧窗入。

Audio：轻快的日系 BGM，女生用日语口语介绍「この麻雀ゲーム、すごくハマる」，环境音保留少量客厅白噪，不做棚拍感，整体像真实 TikTok 原生投放素材。`,
  'sc-16': `女生凑近镜头压低声音抛出一个悬念问题，随后转身指向身后屏幕上的游戏画面，暗调布光带戏剧感，9:16 竖屏。

Opening hook（0–2s）：极近景面部特写，女生 whisper「你绝对猜不到这关隐藏奖励在哪」，眼神看镜头，浅景深，冷调侧光。
Mid section（2–9s）：快速切三组游戏录屏——连击特效满屏、Boss 战倒计时、开箱稀有皮肤，节奏随鼓点加速，每切 1.5s 插入一次女生 Reaction 小窗。
Closing（9–14s）：回到中景，女生指向屏幕上的 limited offer 倒计时，字幕叠加「今日免广告」，最后 1 秒 freeze 在最高光画面。

Audio：开头 2 秒环境静音突出 whisper，随后电子鼓点 + 游戏音效层叠；口播英语短句「This boss drops the rarest skin」，BGM 在 12s 处 hard cut 留 UI 点击声作 CTA。`,
};

const SHOWCASE_BATCHES = 12;
const SHOWCASE_VARIANTS = [
  '生活流版本', '高转化版本', '节奏加快版', '情绪强化版', '品牌感版本',
  '开场强化版', '镜头提速版', '口语化版本', '质感提升版', '测试放量版',
];

function showcaseDays(batch, index, baseDays) {
  const slot = batch * SHOWCASE_SEEDS.length + index;
  if (slot % 3 === 0) return 0;
  if (slot % 3 === 1) return 1 + (index % 4);
  return Math.min(88, baseDays + batch * 2 + (index % 6));
}

const SHOWCASE = Array.from({ length: SHOWCASE_BATCHES }, (_, batch) => SHOWCASE_SEEDS.map((item, index) => {
  const region = regionLabelByIndex(batch * SHOWCASE_SEEDS.length + index);
  const days = showcaseDays(batch, index, item.days);
  const basePrompt = SHOWCASE_LONG_PROMPTS[item.id] || item.prompt;
  if (batch === 0) return { ...item, region, days, prompt: basePrompt };
  const variant = SHOWCASE_VARIANTS[(batch - 1) % SHOWCASE_VARIANTS.length];
  return {
    ...item,
    id: `${item.id}-v${batch}`,
    spend: Math.max(400, item.spend - batch * 2800 - (index % 3) * 450),
    days,
    title: `${item.title} · ${variant}`,
    prompt: `${basePrompt} ${variant}，保留主体卖点并强化前 3 秒的画面钩子。`,
    region,
  };
})).flat();

/* ── 侧边栏 ── */
function CloneSidebar({ onHome }) {
  const nav = [
    { icon: LayoutGrid, label: '工具箱', onClick: onHome },
    { icon: Clapperboard, label: '视频生成', active: true },
    { icon: Copy, label: '视频克隆' },
    { icon: Film, label: '任务中心' },
  ];
  return (
    <aside className="clone-sidebar">
      <button className="clone-sidebar-logo" onClick={onHome} title="返回工具箱">
        <span className="logo-mark">S</span><span className="logo-text">SELVA</span>
      </button>
      <nav className="clone-sidebar-nav">
        {nav.map(n => (
          <button key={n.label} className={`clone-nav-item ${n.active ? 'active' : ''}`} onClick={n.onClick}>
            <n.icon size={17} strokeWidth={1.6} /><span>{n.label}</span>
          </button>
        ))}
      </nav>
      <div className="clone-sidebar-foot">
        <button className="clone-nav-item"><Settings size={17} strokeWidth={1.6} /><span>设置</span></button>
      </div>
    </aside>
  );
}

/* ── 紧凑下拉 Picker（输入卡控件用，真菜单）── */
function Picker({ icon: Icon, value, options, onChange, align = 'left', title, up = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className={`idea-pick ${open ? 'open' : ''}`} ref={ref} title={title}>
      <button type="button" className="idea-pick-btn" onClick={() => setOpen(o => !o)}>
        {Icon && <Icon size={14} className="idea-pick-ic" />}
        <span className="idea-pick-val">{value}</span>
        <ChevronDown size={13} className="idea-pick-chev" />
      </button>
      {open && (
        <div className={`idea-pick-menu idea-pick-menu--${align} ${up ? 'idea-pick-menu--up' : ''}`}>
          {options.map(o => (
            <button type="button" key={o} className={`idea-pick-opt ${o === value ? 'sel' : ''}`}
              onClick={() => { onChange(o); setOpen(false); }}>
              <span>{o}</span>{o === value && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 自增高文本域：和大模型对话框一样，输入多少长多少，到上限内部滚动 ── */
export function AutoTextarea({ value, onChange, onSubmit, placeholder, minRows = 1, maxHeight = 200, className = '', maxLength, readOnly = false, onFocus, tabIndex }) {
  const ref = useRef(null);
  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };
  useEffect(resize, [value]);
  return (
    <textarea
      ref={ref}
      className={`composer-input ${className}`}
      rows={minRows}
      value={value}
      maxLength={maxLength}
      readOnly={readOnly}
      tabIndex={tabIndex}
      placeholder={placeholder}
      onFocus={onFocus}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && onSubmit) { e.preventDefault(); onSubmit(); }
      }}
    />
  );
}

/* ══ @素材引用：输入框里的 chip ══
   和视频克隆的提示词编辑器同一套语义——引用一个素材就该看得见那张图，
   纯文字「参考图1」没有指认力（briefParser 的 assetChip 也是这么做的）。
   所以第一步的输入框不能是 textarea（纯文本控件装不下 DOM 节点），
   改成 contenteditable，chip 作为 contenteditable=false 的原子块整体删。

   对外仍然只吐纯文本：chip 的可见文字就是「@图片1」，innerText 天然拿到，
   于是 promptText 依旧是那个字符串，下游（briefParser / sourceText / 字数）全都不用改。 */
const TOK_KIND_LABEL = { image: '图片', video: '视频', audio: '音频' };
const TOK_ICON = {
  video: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2"/></svg>',
  audio: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
};
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tokLabel = (kind, idx) => `@${TOK_KIND_LABEL[kind]}${idx + 1}`;

// 一个素材 chip。图片给缩略图，视频/音频给图标（它们没有能一眼认出的画面）
function tokHtml(kind, idx, item) {
  const face = kind === 'image'
    ? `<img src="${escAttr(item.url)}" alt="">`
    : TOK_ICON[kind];
  return `<span class="composer-tok" contenteditable="false" data-kind="${kind}"`
    + ` data-url="${escAttr(item.url)}" title="${escAttr(item.name || TOK_KIND_LABEL[kind])}">`
    + `${face}${tokLabel(kind, idx)}</span>`;
}

// 已挂载素材摊平成一张可引用清单（顺序＝dock 里的顺序，编号也从这里来）
function refMentions(refs) {
  const out = [];
  REF_KINDS.forEach(({ key }) => {
    (refs[key] || []).forEach((item, idx) => {
      out.push({ kind: key, idx, item, label: tokLabel(key, idx), name: item.name || `${TOK_KIND_LABEL[key]}${idx + 1}` });
    });
  });
  return out;
}

/* 纯文本 → HTML。只在「外部把文字塞进来」时用（爆款模板 / 重新编辑 / 提交后清空）：
   那些文本里的 @图片1 也要还原成 chip，否则同一句话在写的时候是 chip、回填后变裸字。 */
function textToHtml(text, refs) {
  const list = refMentions(refs);
  const byLabel = Object.fromEntries(list.map(m => [m.label, m]));
  const re = /@(?:图片|视频|音频)\d+/g;
  let html = '', last = 0, m;
  while ((m = re.exec(text)) !== null) {
    const hit = byLabel[m[0]];
    if (!hit) continue;                       // 指不到实际素材的就是普通文字，别造假 chip
    html += escText(text.slice(last, m.index)) + tokHtml(hit.kind, hit.idx, hit.item);
    last = m.index + m[0].length;
  }
  html += escText(text.slice(last));
  return html.replace(/\n/g, '<br>');
}

/* 素材被删/换模型清空后，编辑器里那些 chip 就成了孤儿；序号也会整体前移。
   按 kind+url 重新认领：认不到的 chip 就地移除，认到的把序号文字刷新。 */
function syncToks(el, refs) {
  const list = refMentions(refs);
  let changed = false;
  el.querySelectorAll('.composer-tok').forEach(tok => {
    const kind = tok.dataset.kind;
    const url = tok.dataset.url;
    const hit = list.find(x => x.kind === kind && x.item.url === url);
    if (!hit) { tok.remove(); changed = true; return; }
    const want = tokLabel(kind, hit.idx);
    if (tok.lastChild && tok.lastChild.nodeType === 3 && tok.lastChild.nodeValue !== want) {
      tok.lastChild.nodeValue = want;
      changed = true;
    }
  });
  return changed;
}

/* 编辑器 DOM → 纯文本。不能用 innerText：chip 是 inline-flex，
   innerText 按「非 inline 就是块」把它前后各塞一个换行，
   于是「产品 @图片1」会变成「产品 \n@图片1」，断行一路串到 briefParser 里。 */
function readText(el) {
  let out = '';
  const walk = (node) => {
    node.childNodes.forEach(n => {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeName === 'BR') { out += '\n'; return; }
      if (n.classList && n.classList.contains('composer-tok')) { out += n.textContent; return; }
      // 回车在 contenteditable 里会生成 div/p，那才是真换行
      if ((n.nodeName === 'DIV' || n.nodeName === 'P') && out && !out.endsWith('\n')) out += '\n';
      walk(n);
    });
  };
  walk(el);
  return out;
}

// 把节点插到光标处，并把光标落到它后面（后面补一个空格，接着打字不会粘在 chip 上）
function insertAtCaret(el, node) {
  const sel = window.getSelection();
  let range;
  if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
    range = sel.getRangeAt(0);
    range.deleteContents();
  } else {                       // 光标不在编辑器里（如点菜单丢了焦点）：落到末尾
    range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
  }
  const space = document.createTextNode(' ');
  range.insertNode(space);
  range.insertNode(node);
  range.setStartAfter(space);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}

/* 光标正前方那个待补全的 @ 片段：返回 [@ 的位置, 已经打了的过滤词]。
   @ 紧跟在字母数字后面的不算（邮箱、@2x 这类），只有词首的 @ 才是引用。 */
function readAtQuery(el) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3 || !el.contains(node)) return null;
  const text = node.nodeValue.slice(0, sel.anchorOffset);
  const at = text.lastIndexOf('@');
  if (at < 0) return null;
  const query = text.slice(at + 1);
  if (/\s/.test(query) || query.length > 12) return null;   // 空格断词＝这个 @ 已经写废了
  const before = at > 0 ? text[at - 1] : '';
  if (before && /[A-Za-z0-9]/.test(before)) return null;
  return { node, at, query };
}

/* ── 第一步的输入框：contenteditable + @素材引用 ──
   非受控（挂载与外部注入时写一次 HTML，之后交给浏览器原生编辑），
   与克隆侧 PromptEditor 同一个理由：受控 contenteditable 会毁光标。 */
function ComposerEditor({
  value, onChange, onSubmit, placeholder, refs, maxHeight = 240,
  seed = 0, onPickMore,
}) {
  const ref = useRef(null);
  const [menu, setMenu] = useState(null);      // { x, y, top, query }
  const [active, setActive] = useState(0);
  const mentions = refMentions(refs);
  const list = menu
    ? mentions.filter(m => !menu.query
      || m.name.toLowerCase().includes(menu.query.toLowerCase())
      || m.label.includes(menu.query))
    : [];

  const emit = () => {
    const el = ref.current;
    if (el) onChange(readText(el));
  };
  const resize = () => {
    const el = ref.current;
    if (el) el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  };

  // 外部注入（模板/清空/重新编辑）才重写 DOM；用户自己打字时不碰，否则光标会跳
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (readText(el) !== value) el.innerHTML = textToHtml(value || '', refs);
    resize();
  }, [seed]);

  // 素材增删后同步 chip（孤儿删掉、序号刷新），文本随之变化要回吐给上层
  useEffect(() => {
    const el = ref.current;
    if (el && syncToks(el, refs)) emit();
  }, [refs.image, refs.video, refs.audio]);

  const closeMenu = () => { setMenu(null); setActive(0); };

  // 每次输入后重新判断光标前是不是一个待补全的 @
  const refreshMenu = () => {
    const el = ref.current;
    if (!el) return;
    const q = readAtQuery(el);
    if (!q) return closeMenu();
    const sel = window.getSelection();
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const box = el.getBoundingClientRect();
    // collapsed range 偶尔量不到（空行首）：退回用编辑器左缘
    const hit = rect.width || rect.height;
    setMenu({
      x: hit ? rect.left : box.left,
      y: hit ? rect.bottom : box.bottom,
      top: hit ? rect.top : box.top,
      query: q.query,
    });
    setActive(0);
  };

  const pick = (m) => {
    const el = ref.current;
    const q = readAtQuery(el);
    if (q) {   // 把已经打进去的「@图」这几个字删掉，chip 取而代之
      const range = document.createRange();
      range.setStart(q.node, q.at);
      range.setEnd(q.node, q.at + 1 + q.query.length);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    const tpl = document.createElement('template');
    tpl.innerHTML = tokHtml(m.kind, m.idx, m.item);
    insertAtCaret(el, tpl.content.firstChild);
    closeMenu();
    emit();
    resize();
    el.focus();
  };

  const onKeyDown = (e) => {
    if (menu && list.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => (i + 1) % list.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => (i - 1 + list.length) % list.length); return; }
      // Shift+Enter 是明确的「换行」，别被菜单吃掉——放行，顺手把菜单收了
      if (e.key === 'Enter' && e.shiftKey) { closeMenu(); return; }
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.nativeEvent.isComposing) {
        e.preventDefault(); pick(list[active]); return;
      }
    }
    if (menu && e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && onSubmit) {
      e.preventDefault(); onSubmit();
    }
  };

  return (
    <div className="composer-editor-wrap">
      <div
        ref={ref}
        className="composer-input composer-input--rich"
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        style={{ maxHeight }}
        onInput={() => { emit(); resize(); refreshMenu(); }}
        onKeyDown={onKeyDown}
        onKeyUp={e => { if (e.key.startsWith('Arrow')) refreshMenu(); }}
        onBlur={() => setTimeout(closeMenu, 120)}   // 等菜单的 click 先跑完
        onPaste={e => {                              // 只收纯文本，别把外部样式粘进来
          e.preventDefault();
          const t = (e.clipboardData || window.clipboardData).getData('text/plain');
          document.execCommand('insertText', false, t);
        }}
      />
      {menu && (
        <AtMenu
          x={menu.x} y={menu.y} top={menu.top}
          list={list} active={active} query={menu.query}
          onPick={pick} onSetActive={setActive}
          onPickMore={() => { closeMenu(); onPickMore?.(); }}
        />
      )}
    </div>
  );
}

/* @ 菜单：列已挂载的素材，选谁就插谁的 chip。
   没挂素材（或过滤没命中）时不留空菜单——直接把「去挂素材」这条路摆出来。 */
function AtMenu({ x, y, top, list, active, query, onPick, onSetActive, onPickMore }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y + 6, ready: false });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const left = Math.min(Math.max(8, x), window.innerWidth - w - 8);
    // 下方放不下就翻到光标上方
    const t = (y + 6 + h > window.innerHeight - 8) ? Math.max(8, top - h - 6) : y + 6;
    setPos({ left, top: t, ready: true });
  }, [x, y, top, list.length]);

  return (
    <div
      ref={ref} className="at-menu" role="listbox"
      style={{ left: pos.left, top: pos.top, visibility: pos.ready ? 'visible' : 'hidden' }}
      onMouseDown={e => e.preventDefault()}   // 别让编辑器失焦，光标要留在原地
    >
      {list.length > 0 ? (
        <div className="at-menu-list">
          {list.map((m, i) => (
            <button
              type="button" key={`${m.kind}-${m.idx}`} role="option" aria-selected={i === active}
              className={`at-menu-item ${i === active ? 'active' : ''}`}
              onMouseEnter={() => onSetActive(i)}
              onClick={() => onPick(m)}
            >
              {m.kind === 'image'
                ? <img className="at-menu-thumb" src={m.item.url} alt="" />
                : <span className="at-menu-thumb at-menu-thumb--icon">
                  {m.kind === 'video' ? <Film size={13} strokeWidth={1.8} /> : <Music size={13} strokeWidth={1.8} />}
                </span>}
              <span className="at-menu-text">
                <b>{m.label}</b>
                <em>{m.name}</em>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="at-menu-empty">
          {query ? `没有匹配「${query}」的素材` : '还没有挂载参考素材'}
        </div>
      )}
      <button type="button" className="at-menu-more" onClick={onPickMore}>
        <Plus size={13} strokeWidth={2} /> 添加参考素材…
      </button>
    </div>
  );
}

/* ════ 主组件 ════ */
export function VideoGenModal({
  onClose, onRestart, visible = true, embedded = false,
  onSubmitTask = null, initialVideoUrl = null, initialTaskId = null,
  onOpenLibrary = null, onStartClone = null, onStartFanout = null,
  // 「重新编辑」注入：把用户上次写的输入和出参设置原样摆回去
  initialSourceText = '', initialImages = null, initialCount = 0,
  initialVideos = null, initialAudios = null,
  initialModel = null, initialAspect = null, initialDuration = null, initialMagic = null,
}) {
  const [promptText, setPromptText] = useState(initialSourceText || '');
  // 内部统一存 { url, name }；任务里的 images 历来是纯 url 数组，「重新编辑」带回来时补齐
  const [attachedImages, setAttachedImages] = useState(() => toRefItems(initialImages));
  const [attachedVideos, setAttachedVideos] = useState(() => toRefItems(initialVideos));
  const [attachedAudios, setAttachedAudios] = useState(() => toRefItems(initialAudios));
  // 老任务里存的是已下线的模型名，「重新编辑」回来时落回默认档，不能把不存在的模型摆出来
  const [videoModel, setVideoModel] = useState(() => (VIDEO_MODEL_CONFIG[initialModel] ? initialModel : DEFAULT_MODEL));
  const [aspect, setAspect] = useState(initialAspect || '9:16');
  const [duration, setDuration] = useState(() => {
    const ds = modelCfg(VIDEO_MODEL_CONFIG[initialModel] ? initialModel : DEFAULT_MODEL).durations;
    return ds.includes(initialDuration) ? initialDuration : ds[0];
  });
  const [count, setCount] = useState(() => Math.min(COUNT_MAX, Math.max(1, initialCount || 4)));
  const [magic, setMagic] = useState(initialMagic || 'auto');   // Magic Prompt：auto | on | off
  /* 输入框是非受控的 contenteditable（受控会毁光标）。只有「外部把文字塞回去」时
     才需要重写它的 DOM——把这些时刻记成一个计数，用户自己打字时一次都不碰。 */
  const [injectSeed, setInjectSeed] = useState(0);
  const injectText = (t) => { setPromptText(t); setInjectSeed(s => s + 1); };
  const [toast, setToast] = useState(null);                     // 提交后的顶部轻提示 { msg, warn }
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const showToast = (msg, warn = false) => {
    setToast({ msg, warn });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const [libraryTag, setLibraryTag] = useState(null);   // 非 null = 全屏爆款库开着（值＝进来时选中的行业）
  const [librarySource, setLibrarySource] = useState('TikTok');
  const [submitting, setSubmitting] = useState(false);  // 点生成→提交任务中心的短暂过渡

  const refs = { image: attachedImages, video: attachedVideos, audio: attachedAudios };
  const setRefs = { image: setAttachedImages, video: setAttachedVideos, audio: setAttachedAudios };
  const refCount = attachedImages.length + attachedVideos.length + attachedAudios.length;
  const issues = genIssues(videoModel, refs, promptText);

  const hasProgress = submitting || refCount > 0 || promptText.trim().length > 0;
  const exit = () => onClose(hasProgress);

  const [resumeAsk, setResumeAsk] = useState(false);
  const rootRef = useRef(null);
  const prevVisibleRef = useRef(visible);
  const urlsRef = useRef([]);
  const handedRef = useRef([]);   // 已随任务移交出去的图，卸载时不能 revoke（否则详情页参考图全裂）
  useEffect(() => () => urlsRef.current.forEach(u => {
    if (!handedRef.current.includes(u)) URL.revokeObjectURL(u);
  }), []);

  useEffect(() => {
    if (!visible) rootRef.current?.querySelectorAll('video').forEach(v => v.pause());
    else if (!prevVisibleRef.current && hasProgress) setResumeAsk(true);
    prevVisibleRef.current = visible;
  }, [visible, hasProgress]);

  useEffect(() => {
    if (!resumeAsk) return;
    notifyHostModal(true);
    const onKey = (e) => { if (e.key === 'Escape') setResumeAsk(false); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); notifyHostModal(false); };
  }, [resumeAsk]);

  /* 本地上传：一个文件框收全部类型，参考图/视频/音频按 file.type 自己归类——
     「上传」这件事不该让用户先替系统分好类。放不进去的（模型不收这类、或那类已满）
     不静默丢掉，数清楚在顶部说一声。 */
  const handleAddLocalFiles = (fileList) => {
    const cfg = modelCfg(videoModel);
    const room = { image: 0, video: 0, audio: 0 };
    REF_KINDS.forEach(({ key }) => { room[key] = cfg.limits[key] - refs[key].length; });
    const added = { image: [], video: [], audio: [] };
    const dropped = [];
    Array.from(fileList).forEach(file => {
      const kind = kindOfFile(file);
      if (!kind || cfg.limits[kind] === 0) { dropped.push(`${videoModel} 不收这类文件`); return; }
      if (added[kind].length >= room[kind]) { dropped.push(`${kindLabel(videoModel, kind)}已满`); return; }
      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);
      added[kind].push({ url, name: file.name });
    });
    REF_KINDS.forEach(({ key }) => {
      if (added[key].length) setRefs[key](prev => [...prev, ...added[key]]);
    });
    if (dropped.length) showToast(`${dropped.length} 个文件没能添加：${dropped[0]}`, true);
  };
  /* 从资源库选：弹窗里已经按剩余名额拦过一遍，这里直接落。
     角色和图片都是参考图，视频是参考视频——分类归分类，配额还是按素材类型走。 */
  const handleAddLibraryItems = (picked) => {
    const byKind = { image: [], video: [], audio: [] };
    picked.forEach(p => byKind[p.kind].push({ url: p.url, name: p.name }));
    REF_KINDS.forEach(({ key }) => {
      if (byKind[key].length) setRefs[key](prev => [...prev, ...byKind[key]]);
    });
    if (picked.length) showToast(`已从资源库添加 ${picked.length} 个素材`);
  };
  const handleRemoveRef = (kind, index) => setRefs[kind](prev => prev.filter((_, i) => i !== index));
  /* 换模型只动时长（新模型不认旧档位就落回它的第一档）。
     已挂的素材一律留着不替用户删——超了就把生成按钮锁住、在底栏上方说清楚要删几个，
     删哪张是用户的事，替他删等于毁他上传的东西。 */
  const handleModelChange = (m) => {
    setVideoModel(m);
    const ds = modelCfg(m).durations;
    setDuration(d => (ds.includes(d) ? d : ds[0]));
  };
  // 展示区「做相似」才灌提示词（封面是成片截图不是参考素材，不自动挂图）
  const handleApplyTemplate = (item) => {
    injectText(item.prompt);
    requestAnimationFrame(() => rootRef.current?.querySelector('.composer-input--rich')?.focus());
  };
  const handleOpenLibrary = (source = 'TikTok') => {
    const nextSource = SOURCES.includes(source) ? source : 'TikTok';
    if (onOpenLibrary) onOpenLibrary('全部', handleApplyTemplate, nextSource);
    else {
      setLibraryTag('全部');
      setLibrarySource(nextSource);
    }
  };

  /* 生成：脚本在这里一次性配好直接进任务中心，不再让用户过一道预览。
     裂变规则（Magic Prompt 三档怎么影响 N 条的差异性）全在 buildVariantScripts 里，
     这里只负责把输入递过去——原先这段把同一套规则又抄了一遍，加「维度取值也要存」
     的时候就得改两处，正是那句注释预言的分叉。 */
  const handleGenerate = () => {
    if (issues.length) return;   // 按钮此时是灰的，这里兜底防回车直发
    const list = buildVariantScripts(promptText, attachedImages.map(a => a.url), magic, count);
    submitTask(list, count);
  };

  // 短暂过渡后上报任务（生成中）。提交完【留在原地】——画面不变，只在顶部给一条轻提示，
  // 用户想接着改一版直接改了再发，不用重新进一次工具。
  // 裂变是一对多：每条变体各带自己的脚本，详情页要能逐条看，不能拼成一坨字符串。
  const submitTask = (list, n) => {
    if (submitting) return;
    setSubmitting(true);
    // 图归任务所有了，本组件卸载时别再回收。要累计不能覆盖——提交后弹窗不关，
    // 用户可能删掉某张再发一次，那张图仍归上一条任务持有
    handedRef.current = [...new Set([
      ...handedRef.current,
      ...attachedImages.map(a => a.url), ...attachedVideos.map(a => a.url), ...attachedAudios.map(a => a.url),
    ])];
    setTimeout(() => {
      if (onSubmitTask) onSubmitTask({
        taskId: initialTaskId,
        name: n > 1 ? `视频生成 · ${n} 条` : '视频生成',
        videoUrl: initialVideoUrl || 'test-clip.mp4',
        variants: list,                       // [{ promptHtml }]
        promptHtml: list[0].promptHtml,       // 兼容只取一条的旧调用
        promptText: list.map(v => v.promptHtml.replace(/<[^>]+>/g, '')).join('\n---\n'),
        sourceText: promptText,               // 原始输入，详情页里可展开对照
        images: attachedImages.map(a => a.url),   // 参考图历来是纯 url 数组，详情页按这个渲染
        refVideos: attachedVideos, refAudios: attachedAudios,   // 参考视频/音频：{url,name}，详情页只报名字
        model: videoModel, aspect, outDuration: duration, magic,   // 设置，「重新编辑」回第一步时要带回
        region: 'pt-BR', toolName: '视频生成', status: 'generating',
      });
      setSubmitting(false);
      // 输入已经交出去了，框子清空好接着写下一条；参数（模型/画幅/时长/条数/Magic）留着不动
      setPromptText('');
      setInjectSeed(s => s + 1);   // 框子清空要落到 DOM 上
      setAttachedImages([]);
      setAttachedVideos([]);
      setAttachedAudios([]);
      showToast(n > 1 ? `${n} 条视频已提交至任务中心` : '视频已提交至任务中心');
    }, 1200);
  };

  return (
    <div className="clone-page" ref={rootRef} style={visible ? undefined : { display: 'none' }}>
      {!embedded && <CloneSidebar onHome={exit} />}
      <div className="clone-main">
        <div className="clone-topbar">
          <div className="clone-topbar-left">
            <button className="icon-btn" onClick={exit} title="返回"><ArrowLeft size={18} /></button>
            <span className="clone-topbar-title">视频生成</span>
          </div>
          <button className="icon-btn" onClick={exit} title="关闭"><X size={18} /></button>
        </div>

        <div className="clone-page-body">
          <div className="clone-page-inner">
            <Step1InputIdea
              promptText={promptText} setPromptText={setPromptText} injectSeed={injectSeed}
              refs={refs} onAddLocalFiles={handleAddLocalFiles} onAddLibraryItems={handleAddLibraryItems}
              onRemoveRef={handleRemoveRef} issues={issues}
              onApplyTemplate={handleApplyTemplate}
              onOpenLibrary={handleOpenLibrary}
              videoModel={videoModel} setVideoModel={handleModelChange}
              aspect={aspect} setAspect={setAspect} duration={duration} setDuration={setDuration}
              magic={magic} setMagic={setMagic}
              count={count} setCount={setCount} onNext={handleGenerate} submitting={submitting}
            />
          </div>
        </div>

        {/* 全屏爆款库：盖住内容区（含顶栏），侧栏保留 */}
        {libraryTag !== null && (
          <ViralLibraryPage
            initialTag={libraryTag}
            initialSource={librarySource}
            onUse={handleApplyTemplate}
            onClose={() => setLibraryTag(null)}
            onClone={onStartClone}
            onFanout={onStartFanout}
          />
        )}
      </div>

      {toast && (
        <div className={`ctd-toast ctd-toast--lg ${toast.warn ? 'ctd-toast--warn' : ''}`}>
          {toast.warn ? <AlertCircle size={17} strokeWidth={2.2} /> : <Check size={17} strokeWidth={2.2} />} {toast.msg}
        </div>
      )}

      {resumeAsk && (
        <div className="resume-overlay" onClick={() => setResumeAsk(false)}>
          <div className="resume-dialog" role="alertdialog" aria-modal="true" aria-label="检测到未完成的操作" onClick={e => e.stopPropagation()}>
            <h3 className="resume-title">检测到未完成的操作</h3>
            {/* 只剩一步之后，能"未完成"的就只有那份还没提交的输入了 */}
            <p className="resume-desc">您上次写的内容还留着，是否继续？</p>
            <div className="resume-actions">
              <button className="btn-outline" onClick={() => { setResumeAsk(false); onRestart(); }}>重新开始</button>
              <button className="btn-primary" autoFocus onClick={() => setResumeAsk(false)}>继续操作</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Magic Prompt 开关：底栏一颗药丸，点开是标题 + 一句解释 + 三档。
   解释里必须写明「你写死的不会被改」——不然用户不敢开。 ── */
function MagicSwitch({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className={`magic ${open ? 'open' : ''}`} ref={ref}>
      {/* 悬停提示：原生 title 又慢又丑，按参考件做成按钮正上方的深色小标签 */}
      <span className="magic-tip" aria-hidden="true">Magic Prompt</span>
      <button
        type="button" className={`magic-btn ${value !== 'off' ? 'on' : ''}`}
        onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label="Magic Prompt"
      >
        <Wand2 size={14} strokeWidth={1.8} />
        <span>{MAGIC_LABEL[value]}</span>
      </button>
      {open && (
        <div className="magic-pop" role="menu">
          <div className="magic-pop-title">Magic Prompt</div>
          <p className="magic-pop-desc">扩充你写的提示词，让多条视频的画面更丰富、彼此更不一样。你明确写了的内容不会改动。</p>
          <div className="magic-pop-opts">
            {MAGIC_OPTIONS.map(o => (
              <button
                key={o.value} type="button" role="menuitemradio" aria-checked={value === o.value}
                className={`magic-opt ${value === o.value ? 'sel' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                <span>{o.label}</span>
                {value === o.value && <Check size={16} strokeWidth={2} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 条数步进器：数量就是数量，别再叫「裂变 N 条」——差异性归 Magic Prompt 管 ── */
export function Stepper({ value, onChange, min = 1, max = COUNT_MAX, title }) {
  return (
    <div className="vg-stepper" title={title}>
      <span className="vg-stepper-val">{value}</span>
      <span className="vg-stepper-arrows">
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="加一条">
          <ChevronUp size={12} strokeWidth={2.4} />
        </button>
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="减一条">
          <ChevronDown size={12} strokeWidth={2.4} />
        </button>
      </span>
    </div>
  );
}

/* ── 加素材：只分「素材从哪来」两个入口——本地上传 / 资源库。
   参考图、参考视频、参考音频不再各开一个上传口（那是让用户替系统分类）：
   本地上传一个文件框收全部类型，按 file.type 自己归类；资源库则按角色/图片/视频三类去挑。
   模型的配额约束不变，摆在菜单底部一行看完，满了的入口直接灰掉。 ── */
export function AddRefButton({ model, refs, onAddFiles, onOpenLibrary, disabled = false }) {
  const cfg = modelCfg(model);
  const displayModel = modelLabel(model);
  const kinds = REF_KINDS.filter(k => cfg.limits[k.key] > 0);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const away = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [model, disabled]);   // 换模型或禁用后，这张单子就过期了

  const allFull = kinds.every(k => refs[k.key].length >= cfg.limits[k.key]);
  // 资源库只有角色/图片/视频；音频只能本地上传，所以只收音频的模型不给资源库入口
  const libKinds = LIB_TABS.filter(t => cfg.limits[t.kind] > 0);
  const libFull = libKinds.every(t => refs[t.kind].length >= cfg.limits[t.kind]);

  return (
    <div className="add-ref" ref={wrapRef}>
      <input
        ref={inputRef} type="file" hidden multiple
        accept={kinds.map(k => k.accept).join(',')}
        onChange={e => { if (e.target.files?.length) onAddFiles(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button" className="composer-icon-btn" disabled={disabled || allFull} aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        title={disabled ? '自动模式下不支持添加参考素材' : allFull ? `${displayModel} 的参考素材已达上限` : '添加参考素材'}
      >
        <Plus size={18} />
      </button>
      {open && (
        <div className="add-ref-pop" role="menu">
          <button
            type="button" role="menuitem" className="add-ref-src"
            onClick={() => { setOpen(false); inputRef.current?.click(); }}
          >
            <Upload size={16} strokeWidth={1.7} />
            <span className="add-ref-src-text">
              <b>本地上传</b>
              <em>{kinds.map(k => kindLabel(model, k.key)).join(' / ')}，可多选</em>
            </span>
          </button>
          <button
            type="button" role="menuitem" className="add-ref-src" disabled={libKinds.length === 0 || libFull}
            onClick={() => { setOpen(false); onOpenLibrary(); }}
            title={libFull ? '资源库能挂的素材已达上限' : ''}
          >
            <FolderOpen size={16} strokeWidth={1.7} />
            <span className="add-ref-src-text">
              <b>从资源库选择</b>
              <em>{libKinds.length ? libKinds.map(t => t.label).join(' / ') : '当前模型不支持'}</em>
            </span>
          </button>
          <div className="add-ref-quota">
            {kinds.map(({ key }) => {
              const used = refs[key].length;
              const max = cfg.limits[key];
              return (
                <span key={key} className={`add-ref-q ${used >= max ? 'full' : ''}`}>
                  {kindLabel(model, key)} {used}/{max}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 从资源库选择：角色 / 图片 / 视频三个 tab，先勾选再确定（取消＝这次挑的都不算）。
   名额按素材类型算不按 tab 算：角色和图片共用参考图的名额，勾满了另一个 tab 也点不动。 ── */
export function LibraryPickDialog({ model, refs, onConfirm, onClose }) {
  const cfg = modelCfg(model);
  const tabs = LIB_TABS.filter(t => cfg.limits[t.kind] > 0);
  const [tab, setTab] = useState(tabs[0].key);
  const [picked, setPicked] = useState([]);   // [{ id, kind, url, name }]

  useEffect(() => {
    notifyHostModal(true);
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('keydown', esc); notifyHostModal(false); };
  }, [onClose]);

  const active = tabs.find(t => t.key === tab) || tabs[0];
  // 每类素材还剩几个名额：已挂的 + 这次勾的
  const roomLeft = (kind) => cfg.limits[kind] - refs[kind].length - picked.filter(p => p.kind === kind).length;
  const toggle = (item) => setPicked(prev => (
    prev.some(p => p.id === item.id)
      ? prev.filter(p => p.id !== item.id)
      : [...prev, { id: item.id, kind: active.kind, url: item.url, name: item.name }]
  ));

  return (
    <div className="up-dialog-overlay" onClick={onClose}>
      <div className="up-dialog up-dialog--lib" role="dialog" aria-modal="true" aria-label="从资源库选择" onClick={e => e.stopPropagation()}>
        <div className="up-dialog-head">
          <span className="up-dialog-title">从资源库选择 <em>我的资源库</em></span>
          <button className="up-dialog-x" onClick={onClose} aria-label="关闭"><X size={16} /></button>
        </div>
        <div className="up-tabs" role="tablist">
          {tabs.map(t => (
            <button
              key={t.key} role="tab" aria-selected={tab === t.key}
              className={`up-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}
            >
              <t.icon size={14} /> {t.label}
              <span className="up-tab-n">{t.items.length}</span>
            </button>
          ))}
        </div>
        <div className="up-body up-body--lib">
          <div className="up-lib up-lib--named">
            {active.items.map(item => {
              const sel = picked.some(p => p.id === item.id);
              const blocked = !sel && roomLeft(active.kind) <= 0;
              return (
                <button
                  key={item.id} type="button" disabled={blocked}
                  className={`up-lib-item up-lib-item--named ${sel ? 'picked' : ''}`}
                  style={{ aspectRatio: active.ratio }}
                  title={blocked ? `${kindLabel(model, active.kind)}名额已满` : item.name}
                  onClick={() => toggle(item)}
                >
                  <img src={item.cover || item.url} alt="" />
                  {active.key === 'video' && <span className="up-lib-play"><Film size={12} strokeWidth={2} /></span>}
                  {sel && <span className="up-lib-check"><Check size={12} /></span>}
                  <span className="up-lib-cap">
                    <b>{item.name}</b>
                    <em>{item.meta}</em>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="up-foot">
          <span className="up-foot-hint">
            {tabs.map(t => t.kind).filter((k, i, a) => a.indexOf(k) === i).map(kind => (
              <span key={kind} className="up-foot-q">
                {kindLabel(model, kind)} {cfg.limits[kind] - roomLeft(kind)}/{cfg.limits[kind]}
              </span>
            ))}
          </span>
          <span className="up-foot-btns">
            <button className="btn-outline" onClick={onClose}>取消</button>
            <button className="btn-primary" disabled={!picked.length} onClick={() => { onConfirm(picked); onClose(); }}>
              确定{picked.length ? ` (${picked.length})` : ''}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── 视频模型选择器：左边模型族、右边该族的具体版本 + 能力标签。
   每个模型族的版本数量由共享配置决定，单版本的族右边就一行。 ── */
const MP_PANEL_W = 560;   // = .mp-panel 宽度，翻转判定要用，改样式记得同步
export function ModelPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [famName, setFamName] = useState(() => familyOf(value).name);
  const [flip, setFlip] = useState(false);   // 右边放不下就翻回左展开（嵌入模式内容区窄 240px）
  const [mobileBottom, setMobileBottom] = useState(null);
  const ref = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setFamName(familyOf(value).name);   // 每次开都从当前选中的那一族落脚
    const box = btnRef.current?.getBoundingClientRect();
    if (box) {
      const narrow = window.innerWidth < MP_PANEL_W + 24;
      setFlip(!narrow && box.left + MP_PANEL_W + 16 > window.innerWidth);
      setMobileBottom(narrow ? window.innerHeight - box.top + 8 : null);
    }
    const away = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open, value]);

  const fam = MODEL_FAMILIES.find(f => f.name === famName) || MODEL_FAMILIES[0];

  return (
    <div className={`idea-pick mp ${open ? 'open' : ''}`} ref={ref}>
      <button ref={btnRef} type="button" className="idea-pick-btn" onClick={() => setOpen(o => !o)} aria-expanded={open} title="视频模型">
        <span className="idea-pick-val">{modelLabel(value)}</span>
        <ChevronDown size={13} className="idea-pick-chev" />
      </button>
      {open && (
        <div
          className={`mp-panel mp-panel--model ${flip ? 'mp-panel--flip' : ''}`}
          role="dialog" aria-label="视频模型"
          style={mobileBottom === null ? undefined : { '--mp-mobile-bottom': `${mobileBottom}px` }}
        >
          <div className="mp-fams" role="listbox">
            {MODEL_FAMILIES.map(f => (
              <button
                key={f.name} type="button" role="option" aria-selected={f.name === fam.name}
                className={`mp-fam ${f.name === fam.name ? 'active' : ''} ${f.versions.includes(value) ? 'cur' : ''}`}
                onMouseEnter={() => setFamName(f.name)} onClick={() => setFamName(f.name)}
              >
                <span className="mp-fam-text">
                  <b>{f.name}</b>
                  <em>{f.desc}</em>
                </span>
                {f.versions.length > 1 && <span className="mp-fam-n">{f.versions.length}</span>}
                <ChevronRight size={14} className="mp-fam-chev" />
              </button>
            ))}
          </div>
          {/* 所有族的版本列表都渲染，堆在同一个网格格子里只显示当前族 ——
              这样面板高度恒等于「最长的那一族」，切族不会忽长忽短，也不用写死一个高度 */}
          <div className="mp-vers">
            {MODEL_FAMILIES.map(f => (
              <div key={f.name} className={`mp-verlist ${f.name === fam.name ? 'on' : ''}`} aria-hidden={f.name !== fam.name}>
                {f.versions.map(v => {
                  const c = modelCfg(v);
                  return (
                    <button
                      key={v} type="button" className={`mp-ver ${v === value ? 'sel' : ''}`}
                      tabIndex={f.name === fam.name ? 0 : -1}
                      onClick={() => { onChange(v); setOpen(false); }}
                    >
                      <span className="mp-ver-top">
                        <b className="mp-ver-name">{modelLabel(v)}</b>
                        <span className="mp-ver-credit">{c.credits} 额度/条</span>
                        {v === value && <Check size={14} className="mp-ver-check" />}
                      </span>
                      <span className="mp-ver-desc">{c.tagline}</span>
                      <span className="mp-ver-chips">
                        {modelChips(v).map(t => <span key={t} className="mp-chip">{t}</span>)}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════ 输入卡：整个视频生成就这一步，写完直接进任务中心 ════ */
function Step1InputIdea({
  promptText, setPromptText, injectSeed, refs, onAddLocalFiles, onAddLibraryItems, onRemoveRef, issues,
  onApplyTemplate, onOpenLibrary,
  videoModel, setVideoModel, submitting, magic, setMagic,
  aspect, setAspect, duration, setDuration, count, setCount, onNext,
}) {
  const cfg = modelCfg(videoModel);
  const refCount = REF_KINDS.reduce((n, k) => n + refs[k.key].length, 0);
  const canProceed = promptText.trim().length > 0 || refCount > 0;
  const blocked = !canProceed || submitting || issues.length > 0;
  // 字数上限跟着模型走。换到更短的一档时已写的字不截断——照实报真实字数并标红，
  // 用 Math.min 夹到上限会把"超了"这件事藏起来（底栏还灰着，用户找不到原因）
  const CHAR_MAX = cfg.maxChars;
  const chars = promptText.length;
  const overChars = chars > CHAR_MAX;
  const displayModel = modelLabel(videoModel);
  const [assetLibOpen, setAssetLibOpen] = useState(false);

  return (
    <div className="step-content idea-step1">
      <div className="idea-hero-head">
        <h1 className="idea-title">一句话，<span className="accent-text">裂变多条广告视频</span></h1>
        <p className="idea-sub">用你选的视频模型，把一个创意自动裂变成多条不同脚本的成片</p>
      </div>

      <div className="composer">
        {/* 已挂载素材。超出当前模型上限的那几个描红，用户一眼知道该删哪个 */}
        {refCount > 0 && (
          <div className="idea-dock">
            <div className="idea-dock-imgs">
              {REF_KINDS.map(({ key }) => refs[key].map((item, idx) => {
                const over = idx >= cfg.limits[key];
                const lbl = kindLabel(videoModel, key);
                const tip = over ? `超出 ${displayModel} 的${lbl}上限，请删除` : (item.name || lbl);
                if (key === 'image') return (
                  <div key={`${key}-${idx}`} className={`idea-img-chip ${over ? 'over' : ''}`} title={tip}>
                    <img src={item.url} alt="" className="idea-chip-thumb" />
                    <button type="button" className="idea-chip-close" onClick={() => onRemoveRef(key, idx)} title="删除"><X size={10} /></button>
                  </div>
                );
                return (
                  <div key={`${key}-${idx}`} className={`idea-file-chip ${over ? 'over' : ''}`} title={tip}>
                    {key === 'video' ? <Film size={13} strokeWidth={1.8} /> : <Music size={13} strokeWidth={1.8} />}
                    <span className="idea-file-name">{item.name || lbl}</span>
                    <button type="button" className="idea-chip-close" onClick={() => onRemoveRef(key, idx)} title="删除"><X size={10} /></button>
                  </div>
                );
              }))}
            </div>
            {/* 图怎么用由模型定，不劳用户选：这一档的图就是视频第一帧，说明一下即可 */}
            {refs.image.length > 0 && cfg.imageRequired && (
              <span className="idea-dock-tag" title={`${displayModel} 的图就是视频第一帧`}>首帧图</span>
            )}
          </div>
        )}

        {/* 输入 @ 可引用已挂载的素材，插进去的是带缩略图的 chip（和第二步脚本里那套一致）。
            这里不设硬性 maxLength：超了照实报字数并标红，由底栏拦住，别替用户砍字。 */}
        <ComposerEditor
          value={promptText}
          onChange={setPromptText}
          onSubmit={() => { if (!blocked) onNext(); }}
          refs={refs}
          seed={injectSeed}
          maxHeight={240}
          placeholder="描述你想生成的视频，输入 @ 引用参考素材…"
          onPickMore={() => setAssetLibOpen(true)}
        />

        {/* 字数：超了照实报并标红，由底栏拦住 */}
        <div className="composer-meta">
          <span className={`composer-count ${overChars ? 'over' : ''}`}>{chars}/{CHAR_MAX}</span>
        </div>

        {/* 拦截提示：紧贴底栏上方，说清楚差什么、要删几个（按钮同时是灰的） */}
        {issues.length > 0 && (
          <div className="composer-warn">
            <AlertCircle size={13} strokeWidth={2} />
            <span>{issues.join('；')}</span>
          </div>
        )}

        {/* 唯一一条底栏：左＝加料，右＝参数 + 发送 */}
        <div className="composer-bar">
          <div className="composer-bar-left">
            <AddRefButton
              model={videoModel} refs={refs}
              onAddFiles={onAddLocalFiles} onOpenLibrary={() => setAssetLibOpen(true)}
            />
            <MagicSwitch value={magic} onChange={setMagic} />
          </div>
          <div className="composer-bar-right">
            <ModelPicker value={videoModel} onChange={setVideoModel} />
            <Picker value={aspect} options={ASPECTS} onChange={setAspect} align="right" up title="画幅" />
            {cfg.durations.length > 1
              ? <Picker value={duration} options={cfg.durations} onChange={setDuration} align="right" up title="时长" />
              : (
                <span className="idea-pick idea-pick--locked" title={`${displayModel} 时长固定 ${cfg.durations[0]}，不可调整`}>
                  <span className="idea-pick-btn">
                    <span className="idea-pick-val">{cfg.durations[0]}</span>
                    <Lock size={11} className="idea-pick-chev" />
                  </span>
                </span>
              )}
            <Stepper value={count} onChange={setCount} title="生成条数" />
            <button
              type="button" className="composer-send"
              disabled={blocked} onClick={onNext}
              title={issues.length ? issues[0] : (count === 1 ? '生成视频' : `生成 ${count} 条视频`)}
            >
              {submitting ? <Loader2 size={16} className="spinner" /> : <ArrowUp size={17} strokeWidth={2.2} />}
            </button>
          </div>
        </div>
      </div>

      {/* 爆款视频库 · 热度从高到低 */}
      <HotShowcase onUse={onApplyTemplate} onOpenLibrary={onOpenLibrary} />

      {assetLibOpen && (
        <LibraryPickDialog
          model={videoModel} refs={refs}
          onConfirm={onAddLibraryItems} onClose={() => setAssetLibOpen(false)}
        />
      )}
    </div>
  );
}

function FilterPills({ label, options, value, onChange }) {
  return (
    <div className="lib-filter-row">
      <span className="lib-filter-label">{label}</span>
      <div className="lib-filter-pills" role="group" aria-label={label}>
        {options.map(item => (
          <button key={item} type="button" className={`hot-tag ${item === value ? 'active' : ''}`}
            aria-pressed={item === value} onClick={() => onChange(item)}>{item}</button>
        ))}
      </div>
    </div>
  );
}

function useCalendarPanelStyle(open, anchorRef) {
  const [style, setStyle] = useState({});
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const box = anchorRef.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(280, window.innerWidth - 24);
      const panelH = 320;
      let left = box.left;
      if (left + width > window.innerWidth - 12) left = Math.max(12, window.innerWidth - 12 - width);
      if (left < 12) left = 12;
      const spaceBelow = window.innerHeight - box.bottom - 12;
      const spaceAbove = box.top - 12;
      const openBelow = spaceBelow >= 280 || spaceBelow >= spaceAbove;
      const top = openBelow
        ? box.bottom + 6
        : Math.max(12, box.top - 6 - Math.min(panelH, spaceAbove));
      setStyle({
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        width: `${Math.round(width)}px`,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef]);
  return style;
}

function monthCursorFromIso(iso, fallbackIso) {
  const date = parseIsoDate(iso) || parseIsoDate(fallbackIso) || new Date();
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/* 时间跨度：自定义深色月历，点快捷档会清掉，避免档位和日历各筛一套。 */
function DateRangeField({ from, to, max, onChange }) {
  const hasValue = Boolean(from || to);
  const [editing, setEditing] = useState(null);
  const [cursor, setCursor] = useState(() => monthCursorFromIso(from || to, max));
  const wrapRef = useRef(null);
  const open = Boolean(editing);
  const panelStyle = useCalendarPanelStyle(open, wrapRef);

  useEffect(() => {
    if (!editing) return;
    const seed = editing === 'to' ? (to || from) : (from || to);
    setCursor(monthCursorFromIso(seed, max));
  }, [editing]);

  useEffect(() => {
    if (!open) return undefined;
    const away = event => { if (!wrapRef.current?.contains(event.target)) setEditing(null); };
    const escape = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setEditing(null);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const cells = monthGrid(cursor.year, cursor.month);
  const rangeStart = from && to && from > to ? to : from;
  const rangeEnd = from && to && from > to ? from : to;

  const pickDay = iso => {
    if (editing === 'from') {
      onChange(iso, to);
      setEditing(to ? null : 'to');
      return;
    }
    onChange(from, iso);
    setEditing(from ? null : 'from');
  };

  const shiftMonth = delta => {
    const next = new Date(cursor.year, cursor.month - 1 + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() + 1 });
  };

  return (
    <div ref={wrapRef} className={`lib-daterange ${hasValue ? 'has-value' : ''} ${open ? 'is-open' : ''}`}
      role="group" aria-label="自定义时间跨度">
      <Calendar size={14} strokeWidth={1.8} aria-hidden="true" />
      <button type="button" className={`lib-daterange-field ${from ? '' : 'is-empty'}`}
        aria-label="开始日期" aria-expanded={editing === 'from'} aria-haspopup="dialog"
        onClick={() => setEditing(current => current === 'from' ? null : 'from')}>
        {from || '开始日期'}
      </button>
      <span className="lib-daterange-sep" aria-hidden="true">→</span>
      <button type="button" className={`lib-daterange-field ${to ? '' : 'is-empty'}`}
        aria-label="结束日期" aria-expanded={editing === 'to'} aria-haspopup="dialog"
        onClick={() => setEditing(current => current === 'to' ? null : 'to')}>
        {to || '结束日期'}
      </button>
      {hasValue && (
        <button type="button" className="lib-daterange-clear" onClick={() => { onChange('', ''); setEditing(null); }}
          title="清除时间跨度" aria-label="清除时间跨度">
          <X size={12} />
        </button>
      )}
      {open && (
        <div className="lib-cal lib-daterange-cal" role="dialog" aria-label="选择日期" style={panelStyle}>
          <div className="lib-cal-head">
            <button type="button" className="lib-cal-nav" aria-label="上个月" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={14} />
            </button>
            <span className="lib-cal-title">{cursor.year}年{cursor.month}月</span>
            <button type="button" className="lib-cal-nav" aria-label="下个月" onClick={() => shiftMonth(1)}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="lib-cal-week" aria-hidden="true">
            {CAL_WEEKDAYS.map(day => <span key={day}>{day}</span>)}
          </div>
          <div className="lib-cal-days">
            {cells.map(cell => {
              const disabled = !cell.inMonth || (max && cell.iso > max);
              const selected = cell.iso === from || cell.iso === to;
              const inRange = Boolean(cell.inMonth && rangeStart && rangeEnd && cell.iso > rangeStart && cell.iso < rangeEnd);
              const today = cell.iso === max;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabled}
                  className={[
                    'lib-cal-day',
                    cell.inMonth ? '' : 'is-out',
                    selected ? 'is-selected' : '',
                    inRange ? 'is-in-range' : '',
                    today && !selected ? 'is-today' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => pickDay(cell.iso)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SpendRangeField({ min, max, onChange }) {
  const hasValue = Boolean(min || max);
  return (
    <div className={`lib-spendrange ${hasValue ? 'has-value' : ''}`}>
      <DollarSign size={14} strokeWidth={1.8} aria-hidden="true" />
      <input
        type="text"
        className={`lib-spendrange-field ${min ? '' : 'is-empty'}`}
        value={min}
        onChange={e => onChange(e.target.value, max)}
        placeholder="最低"
        aria-label="最低消耗美金"
        inputMode="decimal"
        autoComplete="off"
      />
      <span className="lib-spendrange-sep" aria-hidden="true">→</span>
      <input
        type="text"
        className={`lib-spendrange-field ${max ? '' : 'is-empty'}`}
        value={max}
        onChange={e => onChange(min, e.target.value)}
        placeholder="最高"
        aria-label="最高消耗美金"
        inputMode="decimal"
        autoComplete="off"
      />
      {hasValue && (
        <button type="button" className="lib-spendrange-clear"
          onClick={() => onChange('', '')}
          title="清除消耗范围" aria-label="清除消耗范围">
          <X size={12} />
        </button>
      )}
    </div>
  );
}

function itemAspect(item) {
  if (item.size === '1:1') return '1 / 1';
  if (item.size === '16:9') return '16 / 9';
  return '9 / 16';
}

function downloadLibraryClip(item) {
  const a = document.createElement('a');
  a.href = DEMO_CLIP;
  a.download = `${item.product || 'viral-video'}.mp4`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function displayField(value) {
  const text = String(value ?? '').trim();
  return text || '暂无数据';
}

/* 只列库数据里真实有的字段，不编 CID / 版权 / 制作团队。 */
function libraryInfoRows(item) {
  return [
    { label: '产品名称', value: item.product },
    { label: '行业分类', value: item.industry },
    { label: '视频类型', value: item.type },
    { label: '来源平台', value: item.source },
    { label: '投放地区', value: item.region },
    { label: '视频尺寸', value: item.size },
    { label: '时长', value: item.duration ? `${item.duration}s` : '' },
    { label: '近 7 日消耗', value: formatSpend(item.spend) },
    { label: '创建时间', value: `${item.days} 天前` },
  ];
}

const PROMPT_COLLAPSE_CHARS = 100;

/* 爆款库详情 · 提示词卡片：折叠预览、复制、灌进视频生成输入框。 */
function LibraryPreviewPromptCard({ prompt, onUse, disabled = false }) {
  const text = String(prompt ?? '').trim();
  const display = text || '暂无数据';
  const bodyRef = useRef(null);
  const collapsibleRef = useRef(text.length > PROMPT_COLLAPSE_CHARS);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canCollapse, setCanCollapse] = useState(collapsibleRef.current);

  useEffect(() => {
    setExpanded(false);
    setCopied(false);
    collapsibleRef.current = text.length > PROMPT_COLLAPSE_CHARS;
    setCanCollapse(collapsibleRef.current);
  }, [text]);

  /* 用真实行高判断是否溢出 3 行，比纯字数阈值更准（含中英文混排、换行分镜）。 */
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) return;
    const overflows = el.scrollHeight > el.clientHeight + 1;
    collapsibleRef.current = overflows || text.length > PROMPT_COLLAPSE_CHARS;
    setCanCollapse(collapsibleRef.current);
  }, [text, expanded]);

  const showToggle = expanded || canCollapse;

  const copyPrompt = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    }).catch(() => {});
  };

  return (
    <div className="lib-preview-prompt-card">
      <div className="lib-preview-prompt-head">
        <span className="lib-preview-prompt-title">提示词</span>
        <button
          type="button"
          className={`lib-preview-prompt-copy${copied ? ' lib-preview-prompt-copy--ok' : ''}`}
          onClick={copyPrompt}
          disabled={!text}
          title="复制提示词"
          aria-label="复制提示词"
        >
          {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={2} />}
        </button>
      </div>
      <p
        ref={bodyRef}
        className={`lib-preview-prompt-body${canCollapse && !expanded ? ' is-collapsed' : ''}`}
        id="lib-preview-prompt-text"
      >
        {display}
      </p>
      <div className="lib-preview-prompt-foot">
        {showToggle ? (
          <button
            type="button"
            className="lib-preview-prompt-toggle"
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-controls="lib-preview-prompt-text"
          >
            {expanded ? '收起' : '展开'}
            {expanded ? <ChevronUp size={14} strokeWidth={2.2} /> : <ChevronDown size={14} strokeWidth={2.2} />}
          </button>
        ) : <span aria-hidden="true" />}
        <button
          type="button"
          className="lib-preview-prompt-use"
          onClick={onUse}
          disabled={disabled || !text}
        >
          使用提示词
        </button>
      </div>
    </div>
  );
}

/* 一级菜单库页：点卡片后右侧详情（预览 + 基础信息 / 提示词 tab），不改卡片样式、不跳进制作同款。
   克隆 / 裂变快捷入口钉在详情底部：点了就进现有工具，把这条片子当成刚上传的基准。 */
function LibraryPreview({ item, onClose, onPrev, onNext, onUse = null, onClone = null, onFanout = null }) {
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [detailTab, setDetailTab] = useState('info');

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    setPlaying(false);
    setDetailTab('info');
    const video = videoRef.current;
    if (!video) return undefined;
    video.pause();
    try { video.currentTime = 0; } catch { /* demo clip may not be seekable yet */ }
    return undefined;
  }, [item.id]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return (
    <aside className="lib-preview" aria-label={`${item.product} 详情`}>
      <div className="lib-preview-panel">
        <div className="lib-preview-bar">
          <button ref={closeRef} type="button" className="lib-preview-icon" onClick={onClose}
            aria-label="关闭详情" title="关闭">
            <X size={20} />
          </button>
          <div className="lib-preview-acts">
            <button type="button" className="lib-preview-icon" onClick={() => downloadLibraryClip(item)}
              aria-label="下载视频" title="下载">
              <Download size={18} />
            </button>
            <button type="button" className="lib-preview-icon" onClick={onPrev}
              aria-label="上一条" title="上一条">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="lib-preview-icon" onClick={onNext}
              aria-label="下一条" title="下一条">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div className="lib-preview-body">
          <div className="lib-preview-stage">
            <div
              className="lib-preview-frame"
              style={{ aspectRatio: itemAspect(item) }}
              onClick={toggle}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
              role="button"
              tabIndex={0}
              aria-label={playing ? `暂停 ${item.product}` : `播放 ${item.product}`}
            >
              <video
                ref={videoRef}
                src={DEMO_CLIP}
                poster={item.cover}
                playsInline
                preload="metadata"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              {!playing && (
                <span className="lib-preview-play" aria-hidden="true">
                  <Play size={28} fill="currentColor" strokeWidth={0} />
                </span>
              )}
            </div>
          </div>
          <section className="lib-preview-info" aria-labelledby="lib-preview-detail-tabs">
            <div id="lib-preview-detail-tabs" className="lib-preview-tabs" role="tablist" aria-label="视频详情">
              <button
                type="button"
                role="tab"
                id="lib-preview-tab-info"
                aria-selected={detailTab === 'info'}
                aria-controls="lib-preview-panel-info"
                className={`lib-preview-tab${detailTab === 'info' ? ' on' : ''}`}
                onClick={() => setDetailTab('info')}
              >
                基础信息
              </button>
              <button
                type="button"
                role="tab"
                id="lib-preview-tab-prompt"
                aria-selected={detailTab === 'prompt'}
                aria-controls="lib-preview-panel-prompt"
                className={`lib-preview-tab${detailTab === 'prompt' ? ' on' : ''}`}
                onClick={() => setDetailTab('prompt')}
              >
                提示词
              </button>
            </div>
            {detailTab === 'info' ? (
              <div
                id="lib-preview-panel-info"
                role="tabpanel"
                aria-labelledby="lib-preview-tab-info"
                className="lib-preview-tabpanel"
              >
                <dl className="lib-preview-dl">
                  {libraryInfoRows(item).map(row => (
                    <div key={row.label} className="lib-preview-row">
                      <dt>{row.label}</dt>
                      <dd>
                        <span>{displayField(row.value)}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <div
                id="lib-preview-panel-prompt"
                role="tabpanel"
                aria-labelledby="lib-preview-tab-prompt"
                className="lib-preview-tabpanel"
              >
                <LibraryPreviewPromptCard
                  prompt={item.prompt}
                  disabled={!onUse}
                  onUse={() => onUse && onUse(item)}
                />
              </div>
            )}
          </section>
        </div>
        {(onClone || onFanout) && (
          <div className="lib-preview-ctas" role="group" aria-label="用这条视频继续创作">
            {onClone && (
              <button type="button" className="btn-primary"
                onClick={() => onClone(item)}
                aria-label={`用「${item.product}」开始视频克隆`}>
                <Copy size={16} strokeWidth={2} />
                视频克隆
              </button>
            )}
            {onFanout && (
              <button type="button" className="btn-outline"
                onClick={() => onFanout(item)}
                aria-label={`用「${item.product}」开始视频裂变`}>
                <GitBranch size={15} strokeWidth={2} />
                视频裂变
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

/* ── 爆款卡片
   库页：来源 + 产品名 + 行业，缩略图，三列消耗数据；点卡片看详情。
   视频生成下方：全铺画面，只标近 7 日消耗；悬停才出「做相似」灌提示词。── */
function HotCard({
  item, onUse, onOpen, selected = false, actionLabel = '制作同款', layout = 'action',
  favorited = false, onToggleFavorite = null,
}) {
  const inspect = typeof onOpen === 'function';
  const immersive = layout === 'immersive';
  const videoRef = useRef(null);
  const [hovering, setHovering] = useState(false);

  const handleEnter = () => {
    setHovering(true);
    const video = videoRef.current;
    if (!video) return;
    try { video.currentTime = 0; } catch { /* demo clip may not be seekable yet */ }
    video.play().catch(() => {});
  };
  const handleLeave = () => {
    setHovering(false);
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    try { video.currentTime = 0; } catch { /* noop */ }
  };
  const applyPrompt = (e) => {
    e.stopPropagation();
    onUse?.(item);
  };

  return (
    <div
      role={immersive ? undefined : 'button'}
      tabIndex={immersive ? undefined : 0}
      className={`hot-card${immersive ? ' hot-card--immersive' : ''}${selected ? ' selected' : ''}`}
      onClick={immersive ? undefined : () => (inspect ? onOpen(item) : onUse(item))}
      onKeyDown={immersive ? undefined : (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          inspect ? onOpen(item) : onUse(item);
        }
      }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) handleLeave();
      }}
      title={item.title}
      aria-pressed={inspect ? selected : undefined}
      aria-label={immersive
        ? undefined
        : inspect
          ? `${item.product}，${item.source}，消耗 ${formatSpend(item.spend)}，查看详情`
          : `${item.product}，${item.source}，消耗 ${formatSpend(item.spend)}，${actionLabel}`}>
      {!immersive && (
        <span className="hot-card-head">
          <span className="hot-src">{item.source === 'TikTok' ? 'TK' : 'Kwai'}</span>
          <span className="hot-card-product">{item.product}</span>
          <span className="hot-card-industry">{item.industry}</span>
        </span>
      )}
      <span className="hot-card-media">
        <img src={item.cover} alt="" className={`hot-card-cover${hovering ? ' is-hidden' : ''}`} loading="lazy" />
        <video
          ref={videoRef}
          src={DEMO_CLIP}
          poster={item.cover}
          muted
          playsInline
          preload="none"
          loop
          className={`hot-card-video${hovering ? ' is-visible' : ''}`}
          aria-hidden="true"
        />
        {immersive ? (
          <>
            <span className="hot-chip-row" aria-hidden="true">
              <span className="hot-chip hot-chip--heat">
                <Flame size={10} strokeWidth={2.4} aria-hidden="true" />
                {formatSpend(item.spend)}
              </span>
            </span>
            <span className="hot-card-tr">
              <span className="hot-chip hot-chip--src" aria-hidden="true">
                <Share2 size={9} strokeWidth={2.2} aria-hidden="true" />
                {item.source}
              </span>
              {onToggleFavorite && (
                <button type="button"
                  className={`hot-fav-btn hot-fav-btn--immersive${favorited ? ' is-faved' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
                  aria-pressed={favorited}
                  aria-label={favorited ? `取消收藏 ${item.product}` : `收藏 ${item.product}`}
                  title={favorited ? '取消收藏' : '收藏'}>
                  <Bookmark size={12} strokeWidth={2} fill={favorited ? 'currentColor' : 'none'} />
                </button>
              )}
            </span>
          </>
        ) : null}
        {onToggleFavorite && !immersive && (
          <button type="button"
            className={`hot-fav-btn${favorited ? ' is-faved' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            aria-pressed={favorited}
            aria-label={favorited ? `取消收藏 ${item.product}` : `收藏 ${item.product}`}
            title={favorited ? '取消收藏' : '收藏'}>
            <Bookmark size={12} strokeWidth={2} fill={favorited ? 'currentColor' : 'none'} />
          </button>
        )}
        {!immersive && <span className="hot-type">{item.type}</span>}
        {!immersive && (
          <span className="hot-dur-center" aria-hidden="true">
            <Play size={11} fill="currentColor" strokeWidth={0} />
            {item.duration}s
          </span>
        )}
        {immersive && (
          <>
            <span className="hot-card-scrim" aria-hidden="true" />
            <button type="button" className="hot-card-pick" onClick={applyPrompt}
              aria-label={`用「${item.product}」的提示词做相似`}>
              做相似
            </button>
          </>
        )}
      </span>
      {layout === 'stats' ? (
        <div className="hot-card-stats">
          <div className="hot-stat">
            <span className="hot-stat-label">今日消耗</span>
            <span className="hot-stat-val">{formatSpend(deriveTodaySpend(item.spend))}</span>
          </div>
          <div className="hot-stat">
            <span className="hot-stat-label">近7日消耗</span>
            <span className="hot-stat-val">{formatSpend(item.spend)}</span>
          </div>
          <div className="hot-stat">
            <span className="hot-stat-label">上传时间</span>
            <span className="hot-stat-val">{formatUploadDate(item.days)}</span>
          </div>
        </div>
      ) : !immersive && (
        <>
          <span className="hot-card-meta">
            <span>{item.region}</span>
            <span className="hot-spend">{formatSpend(item.spend)}</span>
          </span>
          <span className="hot-card-use">{actionLabel} <ArrowUp size={11} strokeWidth={2.4} /></span>
        </>
      )}
    </div>
  );
}

/* ── 第一步下方的爆款区：一屏只露一排半，全部走「查看全部」进库页。
   只按 TikTok / Kwai 分渠道（两边统计口径不同）；卡片是全铺画面，和库页那套不一样。── */
const HOT_PREVIEW_COUNT = 14;
function HotShowcase({ onUse, onOpenLibrary }) {
  const [source, setSource] = useState('TikTok');
  const { toggleFavorite, isFavorited } = useViralFavorites();
  const list = sortLibrary(
    filterLibrary(SHOWCASE, { source, created: '近 7 天' }),
    'spend',
  ).slice(0, HOT_PREVIEW_COUNT);

  return (
    <div className="hot-sect">
      <div className="hot-sect-head">
        <div className="hot-sect-head-left">
          <h3 className="hot-sect-title">爆款视频库</h3>
          <p className="hot-sect-sub">近 7 日消耗最高的投放素材；悬停后点「做相似」，用这条的提示词去制作</p>
        </div>
        <button type="button" className="hot-seeall" onClick={() => onOpenLibrary(source)}>
          查看全部 <ChevronRight size={15} />
        </button>
      </div>

      <div className="hot-tagrow" role="group" aria-label="投放渠道">
        {SOURCES.map(item => (
          <button key={item} type="button" className={`hot-tag ${item === source ? 'active' : ''}`}
            aria-pressed={item === source} onClick={() => setSource(item)}>{item}</button>
        ))}
      </div>

      <div className="hot-grid">
        {list.map(item => (
          <HotCard key={item.id} item={item} onUse={onUse} layout="immersive"
            favorited={isFavorited(item.id)} onToggleFavorite={toggleFavorite} />
        ))}
      </div>

      <div className="hot-sect-foot">
        <button type="button" className="hot-viewall" onClick={() => onOpenLibrary(source)}>
          查看全部<b>爆款视频库</b>
        </button>
      </div>
    </div>
  );
}

/* ── 爆款库详情页：视频生成内与平台一级菜单共用搜索、排序、分类和卡片 ── */
export function ViralLibraryPage({
  initialTag = '全部', initialSource = 'TikTok', onUse: _onUse, onClose = null, standalone = false,
  onClone = null, onFanout = null,
}) {
  const [industry, setIndustry] = useState(initialTag);
  const [source, setSource] = useState(SOURCES.includes(initialSource) ? initialSource : 'TikTok');
  const [type, setType] = useState('全部');
  const [region, setRegion] = useState([]);
  const [duration, setDuration] = useState('全部时长');
  const [size, setSize] = useState('全部尺寸');
  const [created, setCreated] = useState('今天');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [spendMin, setSpendMin] = useState('');
  const [spendMax, setSpendMax] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('spend');
  const [view, setView] = useState('grid');
  const [page, setPage] = useState(1);
  const [previewId, setPreviewId] = useState(null);
  const { favoriteIds, toggleFavorite, isFavorited } = useViralFavorites();
  const bodyRef = useRef(null);
  const todayIso = toIsoDate();
  const customRange = Boolean(createdFrom || createdTo);

  useEffect(() => {
    setIndustry(initialTag);
  }, [initialTag]);

  useEffect(() => {
    setSource(SOURCES.includes(initialSource) ? initialSource : 'TikTok');
  }, [initialSource]);

  useEffect(() => {
    setPage(1);
  }, [industry, source, type, region, duration, size, created, createdFrom, createdTo, q, sort, spendMin, spendMax, favoriteIds]);

  const kw = q.trim();
  const filtered = filterLibrary(SHOWCASE, {
    q, industry, source, type, region, duration, size, created, createdFrom, createdTo, spendMin, spendMax,
  });
  const scoped = sort === 'fav' ? filterFavorites(filtered, favoriteIds) : filtered;
  const list = sortLibrary(scoped, sort === 'fav' ? 'spend' : sort);
  const previewIndex = previewId ? list.findIndex(item => item.id === previewId) : -1;
  const previewItem = previewIndex >= 0 ? list[previewIndex] : null;
  const totalPages = Math.max(1, Math.ceil(list.length / LIBRARY_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = list.slice((currentPage - 1) * LIBRARY_PAGE_SIZE, currentPage * LIBRARY_PAGE_SIZE);
  const previewIdRef = useRef(previewId);
  previewIdRef.current = previewId;
  const stepPreviewRef = useRef(null);

  useEffect(() => {
    if (previewId && previewIndex < 0) setPreviewId(null);
  }, [previewId, previewIndex]);

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    setPage(safePage);
    requestAnimationFrame(() => bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };
  const stepPreview = (dir) => {
    if (list.length === 0) return;
    const from = previewIndex >= 0 ? previewIndex : 0;
    const nextIndex = (from + dir + list.length) % list.length;
    setPreviewId(list[nextIndex].id);
    const nextPage = Math.floor(nextIndex / LIBRARY_PAGE_SIZE) + 1;
    if (nextPage !== currentPage) goToPage(nextPage);
  };
  stepPreviewRef.current = stepPreview;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (previewIdRef.current) setPreviewId(null);
        else if (onClose) onClose();
        return;
      }
      if (!previewIdRef.current) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepPreviewRef.current(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stepPreviewRef.current(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pickCreatedBand = (item) => {
    setCreated(item);
    setCreatedFrom('');
    setCreatedTo('');
  };
  const pickCreatedRange = (from, to) => {
    setCreatedFrom(from);
    setCreatedTo(to);
    if (from || to) setCreated('');
  };

  return (
    <main className={`lib-page${standalone ? ' lib-page--standalone' : ''}${previewItem ? ' lib-page--preview' : ''}`}>
      <div className="lib-topbar">
        <div className="lib-topbar-left">
          {onClose && <button className="icon-btn" onClick={onClose} title="返回" aria-label="返回视频生成"><ArrowLeft size={18} /></button>}
          <h1 className="lib-title">爆款视频库</h1>
        </div>
        {onClose && <button className="icon-btn" onClick={onClose} title="关闭" aria-label="关闭爆款视频库"><X size={18} /></button>}
      </div>

      <div className="lib-body" ref={bodyRef}>
        <form className="lib-search-bar" onSubmit={e => e.preventDefault()}>
          <Search size={15} className="lib-search-ic" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜产品名称，例如 mixreels"
            aria-label="搜索爆款视频" autoFocus />
          {kw && <button type="button" className="lib-search-clear" onClick={() => setQ('')} title="清空" aria-label="清空搜索"><X size={12} /></button>}
          <button type="submit" className="lib-search-go">搜索</button>
        </form>

        <div className="lib-filter-stack">
          <FilterPills label="行业分类" options={INDUSTRIES} value={industry} onChange={setIndustry} />
          <FilterPills label="视频来源" options={SOURCES} value={source} onChange={setSource} />
          <FilterPills label="视频类型" options={VIDEO_TYPES} value={type} onChange={setType} />
          <div className="lib-filter-row lib-filter-row--groups">
            <div className="lib-filter-group">
              <span className="lib-filter-label">广告信息</span>
              <div className="lib-filter-selects" role="group" aria-label="广告信息">
                <LibraryRegionPicker value={region} onChange={setRegion} title="投放地区" />
              </div>
            </div>
            <div className="lib-filter-group">
              <span className="lib-filter-label">消耗范围</span>
              <div className="lib-filter-selects" role="group" aria-label="消耗范围">
                <SpendRangeField min={spendMin} max={spendMax}
                  onChange={(nextMin, nextMax) => { setSpendMin(nextMin); setSpendMax(nextMax); }} />
              </div>
            </div>
            <div className="lib-filter-group">
              <span className="lib-filter-label">素材属性</span>
              <div className="lib-filter-selects" role="group" aria-label="素材属性">
                <Picker value={size} options={SIZES} onChange={setSize} title="视频尺寸" />
                <Picker value={duration} options={DURATION_BANDS} onChange={setDuration} title="视频时长" />
              </div>
            </div>
          </div>
        </div>

        <div className="lib-chrome">
          <div className="lib-toolbar">
            <div className="lib-time-filter">
              <div className="lib-segment" role="group" aria-label="创建时间">
                {CREATED_BANDS.map(item => (
                  <button key={item} type="button"
                    className={`lib-segment-btn ${item === created && !customRange ? 'active' : ''}`}
                    aria-pressed={item === created && !customRange}
                    onClick={() => pickCreatedBand(item)}>
                    {CREATED_SEGMENT_LABELS[item] || item}
                  </button>
                ))}
              </div>
              <DateRangeField from={createdFrom} to={createdTo} max={todayIso} onChange={pickCreatedRange} />
            </div>
            <span className="lib-count">找到 {list.length} 条相关视频 · 每页 {LIBRARY_PAGE_SIZE} 条</span>
          </div>
          <div className="lib-filters">
            <div className="lib-sort" role="group" aria-label="排序方式">
              {LIB_SORTS.map(item => (
                <button key={item.value} type="button" className={`lib-sort-btn ${sort === item.value ? 'active' : ''}`}
                  aria-pressed={sort === item.value} onClick={() => setSort(item.value)}>
                  {item.value === 'new' ? <Clock size={12} strokeWidth={2} /> : null}
                  {item.value === 'fav' ? <Bookmark size={12} strokeWidth={2} /> : null}
                  {item.label}
                </button>
              ))}
            </div>
            <div className="lib-view" role="group" aria-label="视图">
              <button type="button" className={`lib-view-btn ${view === 'grid' ? 'active' : ''}`}
                aria-pressed={view === 'grid'} onClick={() => setView('grid')} aria-label="宫格">
                <LayoutGrid size={14} strokeWidth={1.8} />
              </button>
              <button type="button" className={`lib-view-btn ${view === 'list' ? 'active' : ''}`}
                aria-pressed={view === 'list'} onClick={() => setView('list')} aria-label="列表">
                <List size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>

        {list.length === 0
          ? <div className="lib-empty" role="status">
              {sort === 'fav'
                ? '收藏夹还是空的，浏览视频时点右上角书签即可收藏'
                : '没有匹配的素材，换个产品名或把筛选重置为全部'}
            </div>
          : <>
            {view === 'list' ? (
              <div className="lib-list">
                {pageItems.map(item => (
                  <div key={item.id} role="button" tabIndex={0}
                    className={`lib-list-row${item.id === previewId ? ' selected' : ''}`}
                    onClick={() => setPreviewId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewId(item.id); }
                    }}
                    aria-pressed={item.id === previewId}
                    aria-label={`${item.product}，${item.source}，消耗 ${formatSpend(item.spend)}，查看详情`}>
                    <img src={item.cover} alt="" className="lib-list-thumb" loading="lazy" />
                    <span className="lib-list-main">
                      <b>{item.product}</b>
                      <em>{item.source} · {item.industry} · {item.type}</em>
                    </span>
                    <span className="lib-list-region">{item.region}</span>
                    <span className="lib-list-spec">{item.duration}s · {item.size}</span>
                    <span className="lib-list-spend hot-spend">{formatSpend(item.spend)}</span>
                    <span className="lib-list-date">创建 {item.days} 天前</span>
                    <span className="lib-list-actions">
                      <button type="button"
                        className={`hot-fav-btn hot-fav-btn--inline${isFavorited(item.id) ? ' is-faved' : ''}`}
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                        aria-pressed={isFavorited(item.id)}
                        aria-label={isFavorited(item.id) ? `取消收藏 ${item.product}` : `收藏 ${item.product}`}
                        title={isFavorited(item.id) ? '取消收藏' : '收藏'}>
                        <Bookmark size={12} strokeWidth={2} fill={isFavorited(item.id) ? 'currentColor' : 'none'} />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="hot-grid hot-grid--dense">
                {pageItems.map(item => (
                  <HotCard key={item.id} item={item} selected={item.id === previewId}
                    layout="stats" onOpen={() => setPreviewId(item.id)}
                    favorited={isFavorited(item.id)} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <nav className="lib-pagination" aria-label="爆款视频库分页">
                <button type="button" className="lib-page-btn" onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1} aria-label="上一页" title="上一页">
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map(pageNumber => (
                  <button type="button" key={pageNumber}
                    className={`lib-page-btn ${pageNumber === currentPage ? 'active' : ''}`}
                    aria-current={pageNumber === currentPage ? 'page' : undefined}
                    onClick={() => goToPage(pageNumber)}>
                    {pageNumber}
                  </button>
                ))}
                <button type="button" className="lib-page-btn" onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages} aria-label="下一页" title="下一页">
                  <ChevronRight size={16} />
                </button>
                <span className="lib-page-status">第 {currentPage} / {totalPages} 页</span>
              </nav>
            )}
          </>}
      </div>
      {previewItem && (
        <LibraryPreview
          item={previewItem}
          onClose={() => setPreviewId(null)}
          onPrev={() => stepPreview(-1)}
          onNext={() => stepPreview(1)}
          onUse={_onUse}
          onClone={onClone}
          onFanout={onFanout}
        />
      )}
    </main>
  );
}

/* ════ Step 2：裂变结果 · 变体卡片 ════
   一条一张卡，卡里就是这条的完整提示词，锁定项实底高亮、其余即本条裂变内容。
   不做解析回执之类的中间层——那些信息卡片里都有。 */
const CN_NUM = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 七: 6, 八: 7, 九: 8, 十: 9 };
