/* ══ Brief 解析器 ══
   一条规则：**用户写了的一律锁死，只在用户留白的地方裂变。**

   产出三类 + 一个兜底：
     locked   用户写死了具体值       → 全部变体逐字沿用
     pools    用户写了「范围 + 随机」 → 范围固定，逐条取不同值（随机本身也是遵循指令）
     open     用户没写               → 这才是裂变空间
     unparsed 没归类的原话           → 如实列出，不假装全部识别

   每一项都带 [start, end) 原文区间，界面上点条目即可回指高亮到输入的那一句。 */

/* 维度全集。fanoutable=true 表示「用户没写时，这个维度可以拿来裂变」；
   false 的（产品名/地区/语言）没写就是缺信息，不能靠瞎编来制造差异。 */
export const DIMENSIONS = [
  { key: 'product',    label: '产品',      fanoutable: false },
  { key: 'category',   label: '产品类型',  fanoutable: false },
  { key: 'region',     label: '地区',      fanoutable: false },
  { key: 'language',   label: '语言',      fanoutable: false },
  { key: 'elementLang',label: '画面元素语言', fanoutable: false },
  { key: 'logo',       label: 'Logo',      fanoutable: false },
  { key: 'redline',    label: '红线',      fanoutable: false, multi: true },
  { key: 'selling',    label: '卖点池',    fanoutable: false, multi: true },
  { key: 'visual',     label: '视觉类型',  fanoutable: false },
  { key: 'style',      label: '风格',      fanoutable: false, multi: true },
  { key: 'duration',   label: '时长',      fanoutable: false },
  { key: 'subRule',    label: '字幕规范',  fanoutable: false, multi: true },
  { key: 'shots',      label: '分镜结构',  fanoutable: false, multi: true },
  { key: 'element',    label: '必需元素',  fanoutable: false, multi: true },
  { key: 'lines',      label: '台词原文',  fanoutable: false, multi: true },
  { key: 'brand',      label: '品牌',      fanoutable: false },
  { key: 'asset',      label: '参考素材',  fanoutable: false, multi: true },
  /* ↓ 裂变维度。粒度要够细：写「美国女子」只锁死了族裔和性别，
     年龄/造型/气质仍是空的，照样能裂变；写「居家」也只锁了大场景，
     具体位置、时段、光线还空着。weight 越大越优先占对照表的列。 */
  { key: 'character',  label: '人物设定',  fanoutable: true, weight: 90 },
  { key: 'age',        label: '年龄段',    fanoutable: true, weight: 40 },
  { key: 'outfit',     label: '造型服装',  fanoutable: true, weight: 55 },
  { key: 'vibe',       label: '人物气质',  fanoutable: true, weight: 35 },
  { key: 'setting',    label: '背景环境',  fanoutable: true, weight: 88 },
  { key: 'spot',       label: '具体位置',  fanoutable: true, weight: 62 },
  { key: 'timeOfDay',  label: '时段',      fanoutable: true, weight: 30 },
  { key: 'lighting',   label: '光线氛围',  fanoutable: true, weight: 45 },
  { key: 'format',     label: '主要形式',  fanoutable: true, weight: 86 },
  { key: 'shotSize',   label: '景别',      fanoutable: true, weight: 80 },
  { key: 'angle',      label: '机位角度',  fanoutable: true, weight: 50 },
  { key: 'camera',     label: '运镜',      fanoutable: true, weight: 65 },
  { key: 'hook',       label: '开场钩子',  fanoutable: true, weight: 95 },
  { key: 'firstLine',  label: '开场首句',  fanoutable: true, weight: 70 },
  { key: 'script',     label: '台词风格',  fanoutable: true, weight: 75 },
  { key: 'pace',       label: '语速节奏',  fanoutable: true, weight: 33 },
  { key: 'emotion',    label: '情绪基调',  fanoutable: true, weight: 48 },
  { key: 'music',      label: '音乐',      fanoutable: true, weight: 25 },
  { key: 'transition', label: '转场',      fanoutable: true, weight: 20 },
  { key: 'cta',        label: '结尾号召',  fanoutable: true, weight: 58 },
  { key: 'subAnim',    label: '字幕动画',  fanoutable: true, weight: 15 },
  { key: 'subPos',     label: '字幕位置',  fanoutable: true, weight: 14 },
  { key: 'subColor',   label: '字幕颜色',  fanoutable: true, weight: 13 },
];
const DIM = Object.fromEntries(DIMENSIONS.map(d => [d.key, d]));

/* 把文本切成带 offset 的行，顺便剥掉行首的项目符号 */
function toLines(text) {
  const out = [];
  let at = 0;
  for (const raw of text.split('\n')) {
    const lead = raw.length - raw.replace(/^[\s\-–—*·•]+/, '').length;
    const body = raw.slice(lead).trim();
    if (body) out.push({ body, start: at + lead, end: at + lead + body.length });
    at += raw.length + 1;
  }
  return out;
}

/* 「节标题」= 短、且以冒号收尾或本身就是一个已知栏目名。节内的列表行归属这一节。 */
const SECTION_OF = [
  { key: 'selling', re: /^核心卖点[：:]?$|^卖点[：:]?$/ },
  { key: 'subRule', re: /^字幕形式[：:]?$|^字幕要求[：:]?$|^特效字幕[：:]?$/ },
  { key: 'style',   re: /^风格[：:]?$/ },
  { key: 'basic',   re: /^基础要求[：:]?$/ },
  { key: 'shots',   re: /^分镜[脚本]*[：:]?$|^脚本[：:]?$/ },
];
function sectionOf(line) {
  if (line.length > 12) return null;
  const hit = SECTION_OF.find(s => s.re.test(line));
  return hit ? hit.key : null;
}

/* 「键: 值」这类单行声明 */
const KV_RULES = [
  { key: 'product',     re: /^(?:产品名称|产品名|名称)\s*[：:]\s*(.+)$/ },
  { key: 'category',    re: /^(?:产品类型|类型|品类)\s*[：:]\s*(.+)$/ },
  { key: 'region',      re: /^(?:地区|国家|市场)\s*[：:]\s*(.+)$/ },
  { key: 'language',    re: /^(?:视频语言|语言|口播语言)\s*[：:]\s*(.+)$/ },
  { key: 'style',       re: /^(?:视频风格|风格)\s*[：:]\s*(.+)$/ },
  { key: 'visual',      re: /^(?:视觉类型|视觉|画面类型)\s*[：:]\s*(.+)$/ },
  { key: 'duration',    re: /^(?:时长|视频时长)\s*[：:]\s*(.+)$/ },
  { key: 'character',   re: /^(?:人物形象|人物|主播|出镜人)\s*[：:]\s*(.+)$/ },
  { key: 'setting',     re: /^(?:背景环境|背景|场景)\s*[：:]\s*(.+)$/ },
  { key: 'format',      re: /^(?:主要形式|形式|表现形式)\s*[：:]\s*(.+)$/ },
  { key: 'hook',        re: /^(?:开场|钩子|开场钩子)\s*[：:]\s*(.+)$/ },
];

/* 散落在长句里的声明（用户不一定写成「键: 值」）。val 可为函数。 */
const INLINE_RULES = [
  { key: 'product',  re: /名为\s*([A-Za-z][A-Za-z0-9 ]{2,40}?)\s*的/, val: m => m[1].trim() },
  { key: 'category', re: /的([一-龥]{2,8}类?(?:游戏|应用|工具|App|软件))\s*(?:手机\s*)?(?:App|应用)?/, val: m => m[1].trim() },
  { key: 'logo',     re: /logo[^。\n]{0,12}(?:与|和)[^。\n]{0,10}参考图[^。\n]{0,8}(?:保持)?一致/i, val: () => '与参考图保持一致' },
  { key: 'language', re: /(?:人物语言|口播)[^。\n]{0,4}(?:要)?为([A-Za-z一-龥]{2,12})/, val: m => m[1].trim() },
  { key: 'elementLang', re: /所有的?元素[^。\n]{0,4}(?:都)?要?为([A-Za-z一-龥]{2,8})元素/, val: m => `全部为${m[1].trim()}元素` },
  { key: 'style',    re: /风格[^。\n]{0,4}符合\s*(T\d\s*国家地区特点|[^。\n，,]{2,24})/, val: m => `符合${m[1].trim()}` },
  // 产品名常常只在台词里出现一次（「赶紧试试这个 SofaDrama」），得在挖空引号前对全文抓
  { key: 'product',  re: /(?:试试|下载|叫做|叫|名为)\s*(?:这个|一个)?\s*([A-Z][A-Za-z0-9]{3,24})/, val: m => m[1] },
];
/* 风格用户可能写两处（「符合 T1 国家地区特点」+「美国 TikTok 网赚游戏风格」），两条都得留 */
const MULTI_INLINE = new Set(['style']);

/* 红线：逐条抓，一条一项（Google Play 和 iOS 是两回事，不能并成「无下载框」） */
const REDLINES = [
  // 「不用 / 不得用 / 不得使用 / 禁止使用」× 「logo 开场 / 开场用 logo」各种语序都要接住
  { re: /(?:开头|开场)[^。\n]{0,10}(?:不得|不能|禁止|别)[^。\n]{0,4}(?:用|使用)\s*logo/i, val: '不用 logo 开场' },
  { re: /(?:不得|不能|不用|禁止|别)(?:用|使用)?\s*(?:产品\s*)?logo\s*(?:进行|作为|做)?\s*开场/i, val: '不用 logo 开场' },
  { re: /不得出现[^。\n]{0,12}(?:谷歌|google)[^。\n]{0,8}下载框/i, val: '无 Google Play 下载框' },
  { re: /(?:以及|和|与)?\s*ios\s*的?下载框|不得出现[^。\n]{0,8}ios[^。\n]{0,8}下载框/i, val: '无 iOS 下载框' },
  { re: /无水印|不得[^。\n]{0,6}水印/, val: '无水印' },
];

/* 池子：用户明确写了「多样 / 随机 / 可选」+ 一串枚举 → 池子锁死、取值每条不同。
   这既不是锁死也不是自由发挥，硬塞进任一边都会错（塞锁死→N 条字幕全一样；塞裂变→冒出池子外的动画）。 */
const POOL_RULES = [
  { key: 'subAnim', label: '字幕动画', re: /动画(?:多样|随机|可选)?\s*[：:]\s*(.+)$/ },
  { key: 'subPos',  label: '字幕位置', re: /位置(?:随机|多样|可选)?\s*[：:]\s*(.+)$/ },
  { key: 'subColor',label: '字幕颜色', re: /颜色(?:随机|多样|可选)?\s*[：:]\s*(.+)$/ },
];
const splitPool = (s) => s.split(/[、,，/]|\s+或\s+|或/).map(x => x.trim()).filter(x => x.length >= 1 && x.length <= 16);

/* 「不同字幕可以随机选择动画、颜色、位置」这类元指令：它本身不是细则，
   而是在声明「这几个维度请随机」——没有配套枚举的那些（颜色）也要落进池子桶，
   否则会被当成「用户没写」而混进裂变空间，归桶就不诚实了。 */
const META_RANDOM_RE = /随机选择([^，。\n]+)/;
const META_DIM = [
  { key: 'subAnim', label: '字幕动画', kw: '动画' },
  { key: 'subColor', label: '字幕颜色', kw: '颜色' },
  { key: 'subPos', label: '字幕位置', kw: '位置' },
];

/* 「要求 N 条文案/风格均不相同」= 用户在下裂变指令，不是内容约束。
   识别出来单独展示成「你要的裂变目标」，别混进字幕规范里。 */
const FANOUT_INTENT_RE = /[^，。\n]{0,24}(?:文案|风格|脚本|内容)[^，。\n]{0,24}均?不相同/;

/* 切掉红线/裂变指令后，长句常剩下「并且要求且视频中」这种连接词碎片。
   按连接词再分一次，只留有实质内容的分句。 */
const CONNECTORS = /并且|而且|同时|以及|且|，|,|。/;

/* 纯承接的过渡语，没有实质内容，不该报成「未识别」 */
const FILLER_RE = /^(?:具体内容是|内容如下|如下|包括|其中|另外|此外|以及|并且|然后|要求|说明|备注|注意|视频中|生成的?视频)[:：]?$/;
function cleanFragment(s) {
  return s.split(CONNECTORS)
    .map(x => x.trim())
    .filter(x => x.length >= 5 && !/^(要求|视频中|生成的?视频|其中)$/.test(x))
    .join('，');
}

/* 分镜行：镜头 1（0:00-0:03）… / 1. 0:00-0:03 … */
const SHOT_RE = /^(?:镜头|shot)\s*\d+|^\d+\s*[.、)]\s*\d{1,2}:\d{2}|^\d{1,2}:\d{2}\s*[-–~]\s*\d{1,2}:\d{2}/i;

/* 引号里的整段话＝用户逐字写好的台词。这是最强的锁定信号：
   写了台词就绝不能再「裂变台词风格」，只能一字不改地照搬。 */
const QUOTE_RE = /["“”「『]([^"“”」』]{6,})["“”」』]/g;

/* ══ 流水句解析 ══
   真实输入常常没有「键: 值」结构，而是空格/逗号分隔的一长串要求：
   「开头有自我介绍名字 来自CashApp 有提现页面 弹窗奖励 … 不要出现其他logo和产品」
   这里把长句切成子句，再逐句按语义归类。规则从具体到宽泛，先匹配先归类。 */

/* 切子句：中英文空格、逗号、分号都算分隔；括号内内容先保护，避免被切碎 */
function toClauses(line) {
  const holds = [];
  // 「要求：」「注意：」这类引导词会把后面第一个子句挡住（「要求:开头有自我介绍」读不出「有…」）
  const lead = line.match(/^(?:要求|需求|注意|说明|备注)\s*[:：]\s*/);
  const body = lead ? line.slice(lead[0].length) : line;
  const shift = lead ? lead[0].length : 0;
  const masked = body.replace(/[（(][^）)]*[）)]/g, (m) => {
    holds.push(m);
    return ` ${holds.length - 1} `;
  });
  const out = [];
  let at = 0;
  for (const piece of masked.split(/[\s，,；;、]+/)) {
    if (!piece) { at += 1; continue; }
    const real = piece.replace(/ (\d+) /g, (_, i) => holds[+i]);
    const idx = masked.indexOf(piece, at);
    out.push({ text: real, offset: (idx < 0 ? at : idx) + shift });
    at = (idx < 0 ? at : idx) + piece.length;
  }
  return out;
}

/* 子句语义规则。bucket=locked 的进锁定项；redline 进红线。
   顺序即优先级：否定式（红线）必须排在「必需元素」前面，否则「不要出现X」会被当成「要有X」。 */
/* exclusive: 命中后本子句不再往下匹配（避免「有提现页面」既算必需元素又算卖点）。
   人物/场景/形式不设 exclusive——「美国女子居家对着镜头宣传」一句里三者同时成立。 */
const CLAUSE_RULES = [
  // —— 红线（否定）：必须排在「必需元素」之前，否则「不要出现X」会被读成「要有X」——
  { key: 'redline', exclusive: true, re: /(?:不要|不得|不能|禁止|别)出现[^]{0,20}(?:我给的)?(?:图片|图|素材)/,
    val: () => '开场不出现参考图' },
  { key: 'redline', exclusive: true, re: /(?:不要|不得|不能|禁止|别)出现((?:其他|其它)?.{1,16}?)(?:元素)?$/,
    val: (t, m) => `不出现${m[1]}` },
  { key: 'redline', exclusive: true, re: /(?:不要|不得|不能|禁止|别)(?:使用|用)(.{1,16})/, val: (t, m) => `不使用${m[1]}` },

  // —— 时长 / 语言 / 地区 / 字幕 ——
  { key: 'duration', re: /(\d{1,3})\s*秒/, val: (t, m) => `${m[1]} 秒内` },
  { key: 'language', re: /(英语|中文|葡语|西语|印尼语|日语|韩语|法语|德语|阿拉伯语)/, val: (t, m) => m[1] },
  { key: 'region', re: /(印尼|巴西|美国|印度|越南|泰国|菲律宾|墨西哥|哥伦比亚|埃及|尼日利亚)/, val: (t, m) => m[1] },
  { key: 'subRule', re: /(?:有|带|加|配)字幕|字幕/, val: (t) => (/对应|相对应|说话.{0,4}内容/.test(t) ? '字幕与台词逐句对应' : '全程配字幕') },

  // —— 必需元素：画面里必须出现的东西，优先于卖点识别 ——
  { key: 'element', exclusive: true, re: /^(?:开头|开场|结尾)?(?:要)?有(.{1,24})/, val: (t) => t.replace(/^要/, '') },
  { key: 'element', exclusive: true, re: /(?:展示|弹出|弹窗|点击|显示)(.{0,24})/, val: (t) => t },
  { key: 'element', exclusive: true, re: /(?:人物|主角|主播)?(?:拿出|掏出|举起|打开|指向|翻出)(.{0,16})/, val: (t) => t },

  // —— 人物 / 场景 / 形式 / 情绪：用户写了就锁死，不再参与裂变（可同句共存）——
  { key: 'character', re: /((?:美国|中国|日本|韩国|巴西|印尼|印度|越南|泰国|英国|法国|德国|拉丁裔|亚裔|白人|黑人)?(?:家庭妇女|家庭主妇|主妇|妇女|女子|女生|女性|男子|男生|男性|少女|大叔|大妈|阿姨|妈妈|爸爸|素人|主播|模特|老人|年轻人))/,
    val: (t, m) => m[1] },
  { key: 'setting', re: /(居家|家里|室内|室外|户外|客厅|卧室|厨房|阳台|院子|门口|河边|街边|车内|地铁|办公室|店内|工地|市场)/, val: (t, m) => m[1] },
  { key: 'format', re: /(对着?镜头[^]{0,4}?(?:宣传|介绍|讲解|口播)|一边[^]{0,6}一边说|口播|自拍|跟拍|开箱|测评|演示)/,
    val: (t, m) => m[1].replace(/的?版本?$/, '') },
  { key: 'emotion', re: /(?:情绪|表情|状态)[^]{0,2}?(开心激动|开心|激动|兴奋|惊喜|焦虑|平静|真诚|自然)/, val: (t, m) => m[1] },
  { key: 'vibe', re: /(?:动作表情|表情动作|神态)[^]{0,4}(自然|真实|放松|夸张)/, val: (t, m) => `${m[1]}不做作` },

  // —— 产品 / 品牌 / 素材 / 风格 ——
  { key: 'category', re: /((?:看剧|短剧|看视频|游戏|购物|阅读|走路)[^]{0,4}赚钱(?:的)?(?:软件|应用|App|平台)?)/i, val: (t, m) => m[1] },
  { key: 'product', re: /(?:这个|叫|名为|试试)\s*([A-Z][A-Za-z0-9]{3,24})/, val: (t, m) => m[1] },
  { key: 'brand', re: /来自\s*([A-Za-z][A-Za-z0-9 ]{1,20})/, val: (t, m) => m[1].trim() },
  { key: 'asset', re: /(?:手机画面|画面|界面)[^]{0,4}以[^]{0,6}图片?[^]{0,4}为准/, val: () => '手机画面以参考图为准' },
  { key: 'style', re: /(场景真实|环境简陋破旧|简陋破旧|确保真实|真实感|本土化|符合[^]{0,12}(?:本土化|实际情况))/, val: (t, m) => m[1] },

  // —— 卖点：兜底，带金额或收益表述 ——
  { key: 'selling', exclusive: true, re: /\d+\s*(?:美金|美元|元|块|\$)/, val: (t) => t },
  { key: 'selling', exclusive: true, re: /(?:随时|24小时|秒)?提现|到账|赚得越多|奖励/, val: (t) => t },
];

export function parseBrief(text) {
  const src = text || '';
  const lines = toLines(src);
  const locked = [];
  const pools = [];
  const shots = [];
  const fanoutIntent = [];   // 用户自己下的裂变指令（「N 条文案/风格均不相同」）
  /* 命中过的原文区间。同一个值可能在文中出现两次（开头叙述一次 + 「产品名称：」再写一次），
     只有先到的那次会产出 locked 项，但两处区间都要登记，否则另一处会被当成未识别报出来。 */
  const coveredRanges = [];
  const cover = (start, end) => coveredRanges.push({ start, end });
  const claimed = new Set();          // 已归桶的行 index
  const seen = new Set();             // 已产出的维度 key（先到先得，避免重复项）

  const push = (key, value, l) => {
    const d = DIM[key];
    if (!d) return;
    if (!d.multi && seen.has(key)) return;
    seen.add(key);
    locked.push({ key, label: d.label, value, start: l.start, end: l.end });
  };

  // ── 1) 分节：节标题之后的列表行归属该节 ──
  let section = null;
  const lineSection = [];
  lines.forEach((l, i) => {
    lineSection[i] = section;
    const sec = sectionOf(l.body);
    if (sec) { section = sec; claimed.add(i); return; }
    // 「…文案使用特效字幕表达：」这类以冒号收尾的长句，后续行都是字幕细则
    if (/字幕[^：:\n]{0,8}[：:]\s*$/.test(l.body)) { section = 'subRule'; return; }

    // 「核心卖点：」下面的每一行 = 一条卖点
    if (section === 'selling' && !/[：:]/.test(l.body) && l.body.length <= 40) {
      locked.push({ key: 'selling', label: '卖点', value: l.body, start: l.start, end: l.end });
      claimed.add(i);
      return;
    }
    // 「基础要求」节里仍然是 key: value，交给下面的 KV 规则
    if (section === 'basic') section = 'basic';
  });

  // ── 2) 逐行：分镜 / 池子 / KV / 字幕细则 ──
  lines.forEach((l, i) => {
    if (claimed.has(i)) return;
    const b = l.body;

    // 分镜：用户给了就整段锁死，只换他没写的变量
    if (SHOT_RE.test(b)) {
      shots.push({ text: b, start: l.start, end: l.end });
      claimed.add(i);
      return;
    }

    // 池内随机
    const pool = POOL_RULES.find(p => p.re.test(b));
    if (pool) {
      const opts = splitPool(b.match(pool.re)[1]);
      if (opts.length >= 2) {
        pools.push({ key: pool.key, label: pool.label, options: opts, start: l.start, end: l.end });
        seen.add(pool.key);
        claimed.add(i);
        return;
      }
    }

    // 键: 值
    const kv = KV_RULES.find(r => r.re.test(b));
    if (kv) {
      push(kv.key, b.match(kv.re)[1].trim(), l);
      claimed.add(i);
      return;
    }

    // 元指令「随机选择动画、颜色、位置」：把点到名的维度补进池子桶
    const meta = b.match(META_RANDOM_RE);
    if (meta) {
      for (const md of META_DIM) {
        if (!meta[1].includes(md.kw) || seen.has(md.key)) continue;
        pools.push({ key: md.key, label: md.label, options: ['随机'], start: l.start, end: l.end });
        seen.add(md.key);
      }
      claimed.add(i);
      return;
    }

    // 字幕细则：只收「字幕节内的行」或「本身就提到字幕的行」。
    // 不能只看含不含「金额/提现」——「每看一集获得 5 美金」是卖点不是字幕规范。
    if ((lineSection[i] === 'subRule' || /字幕/.test(b)) && b.length <= 120) {
      // 长句常是大杂烩：先把红线和裂变指令切走，剩下的才是真正的字幕规范，
      // 否则同一条红线会既出现在「红线」又整句复读一遍。
      let rest = b;
      for (const r of REDLINES) rest = rest.replace(r.re, '');
      const fi = rest.match(FANOUT_INTENT_RE);
      if (fi) {
        const dims = ['文案', '风格', '脚本', '内容'].filter(k => fi[0].includes(k));
        fanoutIntent.push({ text: `${dims.join(' · ')} 逐条不同`, raw: fi[0].trim(), start: l.start, end: l.end });
        rest = rest.replace(FANOUT_INTENT_RE, '');
      }
      rest = cleanFragment(rest);
      if (rest.length >= 4) locked.push({ key: 'subRule', label: '字幕规范', value: rest, start: l.start, end: l.end });
      claimed.add(i);
      return;
    }
  });

  // ── 3) 长句内联声明（跨行的整段话）──
  for (const r of INLINE_RULES) {
    const m = src.match(r.re);
    if (!m) continue;
    cover(m.index, m.index + m[0].length);
    const d = DIM[r.key];
    if (!d || (!d.multi && !MULTI_INLINE.has(r.key) && seen.has(r.key))) continue;
    const value = r.val(m);
    if (locked.some(x => x.key === r.key && x.value === value)) continue;
    seen.add(r.key);
    locked.push({ key: r.key, label: d.label, value, start: m.index, end: m.index + m[0].length });
  }
  for (const r of REDLINES) {
    const m = src.match(r.re);
    if (!m) continue;
    cover(m.index, m.index + m[0].length);
    if (locked.some(x => x.key === 'redline' && x.value === r.val)) continue;
    locked.push({ key: 'redline', label: '红线', value: r.val, start: m.index, end: m.index + m[0].length });
  }
  if (locked.some(x => x.key === 'redline')) seen.add('redline');

  // ── 3.4) 引号台词：优先于一切子句规则，且直接封掉「台词风格」这个裂变维度 ──
  const quoted = [];
  for (const m of src.matchAll(QUOTE_RE)) {
    quoted.push({ text: m[1].trim(), start: m.index + 1, end: m.index + 1 + m[1].length });
  }
  if (quoted.length) {
    quoted.forEach(q => locked.push({ key: 'lines', label: '台词原文', value: q.text, start: q.start, end: q.end }));
    seen.add('lines');
    // 台词逐字给定后，这几个维度都已经被台词本身决定了，再裂变就会和台词打架：
    // 开场首句＝台词第一句，结尾号召＝台词最后一句，钩子＝台词开头的说法，风格＝台词写法
    ['script', 'firstLine', 'cta', 'hook'].forEach(k => seen.add(k));
  }

  // ── 3.5) 流水句兜底：剩下的整行按子句拆开逐句归类 ──
  // 结构化 brief 走上面的 KV 就够了；这一层专门吃「空格分隔一长串要求」这种自然写法。
  // 引号台词已单独锁定，切子句前先把它整段挖空，否则台词会被切碎、
  // 再被卖点/必需元素规则捡走（「看一集就赚1万5」本是台词，不是又一条卖点）
  const maskQuoted = (l) => {
    let t = l.body;
    for (const q of quoted) {
      const s = Math.max(0, q.start - 1 - l.start);
      const e = Math.min(t.length, q.end + 1 - l.start);
      if (e > s) t = t.slice(0, s) + ' '.repeat(e - s) + t.slice(e);
    }
    return t;
  };

  const clauseMissed = [];   // 行内没归类的子句：不能因为同一行有别的子句命中就当整行都读懂了
  lines.forEach((l, i) => {
    if (claimed.has(i)) return;
    const clauses = toClauses(maskQuoted(l));
    if (clauses.length === 0) return;
    let hit = 0;
    for (const c of clauses) {
      const t = c.text.trim();
      if (t.length < 2) continue;
      const start = l.start + c.offset;
      const end = start + t.length;
      // 前面几层（KV / 长句声明 / 红线 / 引号台词）已经吃下的区间不再重复处理，
      // 否则「Gold Merge Mania的消除类游戏手机」会被空格切碎、再当成未识别报一遍
      if (quoted.some(q => q.start <= start && q.end >= end)) continue;
      if (locked.some(x => x.start < end && x.end > start)) continue;
      if (coveredRanges.some(x => x.start < end && x.end > start)) continue;
      if (pools.some(x => x.start < end && x.end > start)) continue;
      if (FILLER_RE.test(t)) continue;   // 承接词，没有实质内容
      let matched = false;
      const usedKeys = new Set();
      for (const r of CLAUSE_RULES) {
        if (usedKeys.has(r.key)) continue;
        const m = t.match(r.re);
        if (!m) continue;
        const value = r.val(t, m);
        if (!value) continue;
        if (r.key === 'redline') {
          if (!locked.some(x => x.key === 'redline' && x.value === value)) {
            locked.push({ key: 'redline', label: '红线', value, start, end });
          }
        } else {
          const d = DIM[r.key];
          if (!d) continue;
          if (!d.multi && seen.has(r.key)) continue;       // 单值维度先到先得
          if (locked.some(x => x.key === r.key && x.value === value)) continue;
          if (!d.multi) seen.add(r.key);
          locked.push({ key: r.key, label: d.label, value, start, end });
        }
        usedKeys.add(r.key);
        matched = true;
        hit++;
        if (r.exclusive) break;   // 强规则命中即封口，同句不再归别的类
      }
      // 有实质内容却一条规则都没匹配上 → 如实记为未识别
      if (!matched && t.length >= 5) clauseMissed.push({ text: t, start, end });
    }
    if (hit) claimed.add(i);
  });

  // ── 4) 没接住的原话：既没归桶、又不是节标题的行 ──
  const covered = (l) => locked.some(x => x.start < l.end && x.end > l.start)
    || pools.some(x => x.start < l.end && x.end > l.start)
    || shots.some(x => x.start < l.end && x.end > l.start);
  const unparsed = [
    ...lines
      .filter((l, i) => !claimed.has(i) && !covered(l) && !sectionOf(l.body))
      .map(l => ({ text: l.body, start: l.start, end: l.end })),
    ...clauseMissed,
  ];

  // ── 5) 裂变空间 = 可裂变维度里、用户没写过的那些 ──
  if (shots.length) seen.add('shots');
  // 按 weight 降序：感知差异最大的维度排在前面，对照表优先用它们当列
  const open = DIMENSIONS
    .filter(d => d.fanoutable && !seen.has(d.key))
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .map(d => ({ key: d.key, label: d.label, weight: d.weight || 0 }));

  // 用户没写、但也不能靠编来制造差异的（产品名/地区/语言这类）
  const missing = DIMENSIONS.filter(d => !d.fanoutable && !d.multi && !seen.has(d.key) && ['product', 'region', 'language'].includes(d.key))
    .map(d => ({ key: d.key, label: d.label }));

  return { locked, pools, open, missing, shots, unparsed, fanoutIntent, srcLength: src.length };
}

/* ══ 裂变取值库 ══
   只在「用户没写」的维度上取值。每维备 10 个，够一次裂 10 条不重样。 */
const BANK = {
  character: ['亚裔女生', '白人男生', '拉丁裔女生', '黑人男生', '亚裔男生',
    '白人女生', '混血女生', '中东男生', '东南亚女生', '黑人女生'],
  age: ['20 岁出头', '25 岁左右', '28 岁左右', '30 岁出头', '35 岁左右',
    '40 岁左右', '45 岁左右', '大学生年纪', '职场新人年纪', '中年'],
  outfit: ['休闲卫衣', '家居服', '连衣裙', '职场通勤装', '街头运动风',
    '素色 T 恤', '针织开衫', '牛仔外套', '睡衣居家风', '简约衬衫'],
  vibe: ['亲和邻家', '干练专业', '活泼元气', '冷静可信', '热情外放',
    '温柔耐心', '幽默俏皮', '真诚朴实', '成熟稳重', '好奇探究'],
  setting: ['居家客厅', '卧室', '厨房', '阳台', '书房',
    '户外街边', '车内', '咖啡馆', '公园', '商场门口'],
  spot: ['沙发上', '餐桌旁', '窗边', '书桌前', '床边',
    '料理台前', '门口玄关', '楼梯口', '地毯上', '阳台栏杆边'],
  timeOfDay: ['清晨', '上午', '正午', '午后', '傍晚',
    '入夜', '深夜', '周末白天', '下班后', '睡前'],
  lighting: ['自然窗光', '暖色台灯', '柔光箱正面光', '冷白顶光', '侧逆光轮廓',
    '环形补光灯', '傍晚金色光', '室内混合光', '硬光高对比', '低照度氛围光'],
  format: ['手持自拍 + 屏录插入', '第三人称跟拍 + UI 叠加', '对镜口播 + 全屏屏录', '边玩边讲 + 画中画',
    '桌面俯拍手机 + 特写切换', '走动中口播 + 屏录穿插', '双人对话 + 屏录佐证', '开场特写 + 全屏演示',
    '过肩视角看屏幕 + 反应镜头', '静坐口播 + 数据条动画'],
  shotSize: ['特写', '近景', '中景', '半身景', '全景',
    '大特写（眼神/手部）', '中近景', '过肩景', '俯拍全景', '手机屏幕特写'],
  angle: ['正面平角', '微仰角', '微俯角', '45° 侧切', '过肩视角',
    '低机位仰拍', '高机位俯拍', '侧面 90°', '手持自拍视角', '桌面俯视'],
  camera: ['固定机位', '缓慢前推', '快速前推', '手持轻晃跟随', '环绕半圈',
    '横移跟拍', '拉远收尾', '变焦弹跳', '推近切特写', '跟随走动'],
  hook: ['痛点反问开场', '福利式「立即领取」开场', '好奇式悬念开场', '演示式直接上手', '数字冲击开场',
    '否定式「别再…」开场', '实测口吻开场', '身份代入「我也是…」开场', '倒计时紧迫开场', '结果前置「我已经…」开场'],
  firstLine: ['直接报出到手金额', '先自我介绍再抛问题', '以一句反问开场', '用一个数字开场',
    '先展示结果画面再解释', '以「你敢信吗」类感叹开场', '先说自己踩过的坑', '用一句口令式召唤',
    '以时间紧迫感开场', '用身份共鸣「和你一样」开场'],
  script: ['情绪化口语', '利益点前置', '朋友分享口吻', '快节奏罗列', '疑问引导式',
    '实测复盘式', '对比式（之前 / 现在）', '教学步骤式', '第一人称叙事', '短句冲击式'],
  pace: ['慢速清晰', '中速自然', '偏快紧凑', '快语速高信息密度', '前慢后快',
    '前快后慢收尾', '匀速平稳', '停顿制造悬念', '句句短促', '带呼吸感'],
  emotion: ['兴奋惊喜', '亲和放松', '急切紧张', '冷静可信', '好奇探究',
    '怀疑到相信', '轻松幽默', '真诚恳切', '自信笃定', '惊讶发现'],
  music: ['轻快电子', '流行节拍', '无背景music（纯人声）', '悬念鼓点', '温暖原声吉他',
    '嘻哈节奏', '低频律动', '清新钢琴', '游戏音效为主', '节奏渐强'],
  transition: ['硬切', '闪白切', '推镜转场', '手遮镜头转场', '屏幕划过转场',
    '缩放切入', '匹配剪辑', '黑场闪现', '甩镜转场', '画中画弹入'],
  cta: ['直接说下载链接在下方', '重复金额并催促', '倒计时式限时召唤', '反问式「你还等什么」',
    '展示到账截图收尾', '邀请评论区留言', '手指指向屏幕下方', '重复品牌名收尾',
    '以一句承诺收尾', '用结果画面定格收尾'],
};

/* 室外专用取值：锁定场景是室外时，具体位置和光线不能再从室内库里抽
   （「室外 · 沙发上 · 暖色台灯」这种自相矛盾的组合必须避免）。 */
const OUTDOOR_RE = /室外|户外|街|院|门口|河边|公园|工地|市场|路边|田|海|山/;
const BANK_OUTDOOR = {
  spot: ['院子里', '门口台阶上', '水池边', '晾衣绳旁', '屋檐下',
    '土路边', '街边摊位前', '树荫下', '楼梯口', '围墙边'],
  // 与 timeOfDay 同序对应：第 i 条的时段和光线必须是同一时刻，不能「清晨 + 正午强光」
  timeOfDay: ['清晨', '上午', '正午', '午后', '傍晚',
    '日落前', '阴天午后', '雨后', '上午', '黄昏'],
  lighting: ['清晨斜射光', '上午柔光', '正午强光', '午后斜光', '傍晚暖光',
    '日落金光', '阴天散射光', '雨后灰调光', '树影斑驳光', '黄昏余晖'],
};

/* 地区专用人物库：锁定地区后，人物设定从该国库里取，不会出现「哥伦比亚·亚裔男生」
   这种违和组合。每国 10 条（性别各半），带具象外貌描述让视频模型生成准确。
   美国（多种族社会）不设专用库，直接用全局 BANK.character。 */
const BANK_REGION = {
  '哥伦比亚': {
    character: [
      '哥伦比亚混血女生（橄榄肤色、深棕波浪长发、棕色大眼）',
      '哥伦比亚白人男生（浅肤色、深棕短发、棱角分明高鼻）',
      '哥伦比亚混血男生（小麦肤色、黑色短发、浓眉方脸）',
      '哥伦比亚非裔女生（深棕肤色、自然卷发、高颧骨大眼）',
      '哥伦比亚白人女生（浅肤色、栗色长直发、浅棕色眼）',
      '哥伦比亚非裔男生（深棕肤色、短卷发、宽下颌浓眉）',
      '哥伦比亚混血女生（蜜色皮肤、黑色卷发、圆脸酒窝）',
      '哥伦比亚白人男生（小麦肤色、棕色短发、窄脸高鼻）',
      '哥伦比亚混血男生（橄榄肤色、黑色卷发、浓密胡茬）',
      '哥伦比亚非裔女生（棕褐肤色、编发盘发、饱满嘴唇）',
    ],
  },
  '巴西': {
    character: [
      '巴西混血女生（蜜色皮肤、深棕卷发、棕色大眼）',
      '巴西白人男生（浅肤色、棕色短发、绿眼高鼻）',
      '巴西非裔女生（深棕肤色、自然卷发、饱满嘴唇大眼）',
      '巴西混血男生（小麦肤色、黑色短卷发、浓眉方脸）',
      '巴西白人女生（浅肤色、金棕色长发、蓝绿色眼）',
      '巴西非裔男生（深黑肤色、短卷发、宽鼻高颧骨）',
      '巴西混血女生（橄榄肤色、黑色波浪发、杏眼圆脸）',
      '巴西白人男生（小麦肤色、深棕发、棱角分明轮廓深邃）',
      '巴西混血男生（蜜色皮肤、卷发蓄短须、笑容阳光）',
      '巴西非裔女生（棕褐肤色、编发脏辫、高额头轮廓立体）',
    ],
  },
  '墨西哥': {
    character: [
      '墨西哥混血女生（小麦肤色、黑色长直发、深棕圆眼）',
      '墨西哥混血男生（棕褐肤色、黑短发、宽脸浓眉）',
      '墨西哥白人女生（浅肤色、深棕长发、窄脸高鼻）',
      '墨西哥混血男生（小麦肤色、黑色短发、方脸蓄短须）',
      '墨西哥原住民风女生（深棕肤色、黑长直发、圆脸高颧骨）',
      '墨西哥白人男生（浅肤色、棕色短发、轮廓深邃）',
      '墨西哥混血女生（橄榄肤色、黑色波浪发、杏眼酒窝）',
      '墨西哥混血男生（棕褐肤色、短发微卷、宽鼻浓眉）',
      '墨西哥混血女生（蜜色皮肤、深棕长卷发、大眼睛）',
      '墨西哥混血男生（小麦肤色、黑色利落短发、方下巴）',
    ],
  },
  '印尼': {
    character: [
      '印尼女生（棕褐肤色、黑色长直发、圆脸大眼）',
      '印尼男生（深棕肤色、黑色短发、宽鼻方脸）',
      '印尼女生（浅棕肤色、黑色长发微卷、杏眼圆润五官）',
      '印尼男生（棕褐肤色、利落短发、浓眉窄脸）',
      '印尼女生（深棕肤色、黑长直发戴头巾、柔和五官）',
      '印尼男生（棕肤色、黑短发、圆脸宽鼻、亲和笑容）',
      '印尼女生（浅棕肤色、黑色波浪发、瓜子脸）',
      '印尼男生（深棕肤色、短发偏分、方脸浓眉）',
      '印尼女生（棕褐肤色、黑色长发盘发、柔和气质）',
      '印尼男生（棕肤色、黑色短发、宽脸厚唇、朴实）',
    ],
  },
  '越南': {
    character: [
      '越南女生（浅麦肤色、黑色长直发、杏眼柳叶眉）',
      '越南男生（偏白肤色、黑色利落短发、窄脸单眼皮）',
      '越南女生（白皙肤色、黑长发齐刘海、圆脸大眼）',
      '越南男生（浅麦肤色、短发偏分、瘦长脸高鼻梁）',
      '越南女生（小麦肤色、黑色长发微卷、鹅蛋脸）',
      '越南男生（偏白肤色、黑色短发、方脸剑眉）',
      '越南女生（浅肤色、黑色直发过肩、弯眉杏眼）',
      '越南男生（浅麦肤色、利落短发、窄脸薄唇）',
      '越南女生（白皙肤色、黑色长直发、瓜子脸柔和五官）',
      '越南男生（小麦肤色、黑短发、圆脸浓眉）',
    ],
  },
  '泰国': {
    character: [
      '泰国女生（小麦肤色、黑色长发微卷、高颧骨深色瞳孔）',
      '泰国男生（棕褐肤色、黑色短发、宽脸浓眉厚唇）',
      '泰国女生（浅棕肤色、黑色长直发、圆脸大眼）',
      '泰国男生（小麦肤色、利落短发、棱角分明窄脸）',
      '泰国女生（棕肤色、黑色波浪长发、杏眼饱满嘴唇）',
      '泰国男生（深棕肤色、黑短发、方脸宽鼻）',
      '泰国女生（浅麦肤色、黑色齐肩发、小脸高鼻梁）',
      '泰国男生（小麦肤色、黑色短发偏分、瘦长脸）',
      '泰国女生（棕褐肤色、黑色长发、圆润五官温和气质）',
      '泰国男生（棕肤色、黑色短发、宽下颌浓眉）',
    ],
  },
  '菲律宾': {
    character: [
      '菲律宾女生（浅棕肤色、黑色波浪长发、圆脸大眼）',
      '菲律宾男生（棕褐肤色、黑色短发、宽鼻厚唇、体格壮实）',
      '菲律宾女生（小麦肤色、深棕色长发、杏眼高鼻梁）',
      '菲律宾男生（浅棕肤色、黑色短发偏分、方脸浓眉）',
      '菲律宾女生（棕肤色、黑色卷发、圆脸酒窝笑容甜）',
      '菲律宾男生（棕褐肤色、利落短发、宽脸高颧骨）',
      '菲律宾女生（浅棕肤色、黑色长直发、鹅蛋脸深色瞳）',
      '菲律宾男生（小麦肤色、黑短发、窄脸薄唇偏瘦）',
      '菲律宾女生（棕肤色、深棕波浪发、大眼高鼻混血感）',
      '菲律宾男生（浅棕肤色、黑色短发、圆脸浓眉亲和）',
    ],
  },
  '印度': {
    character: [
      '印度北方女生（浅麦肤色、黑色长发、浓眉大眼高鼻梁）',
      '印度南方男生（深棕肤色、黑色短发、浓密眉毛圆脸）',
      '印度北方男生（小麦肤色、黑短发蓄短须、棱角分明）',
      '印度南方女生（深棕肤色、黑色长发编辫、圆脸大眼）',
      '印度女生（橄榄肤色、黑色长直发、瓜子脸高鼻梁）',
      '印度男生（小麦肤色、黑色短发、浓眉宽脸蓄胡）',
      '印度女生（浅麦肤色、深棕色长发、杏眼柳叶眉）',
      '印度男生（棕褐肤色、黑短发、窄脸高鼻薄唇）',
      '印度女生（棕肤色、黑色波浪长发、圆润五官大眼）',
      '印度男生（深棕肤色、黑色短发微卷、方脸浓眉）',
    ],
  },
  '埃及': {
    character: [
      '埃及女生（橄榄肤色、深棕色长发、大眼高鼻）',
      '埃及男生（小麦肤色、黑色短发、浓眉高鼻蓄短须）',
      '埃及女生（浅麦肤色、黑色长直发戴头巾、深色大眼）',
      '埃及男生（橄榄肤色、黑短发、方脸棱角分明蓄胡茬）',
      '埃及女生（小麦肤色、深棕波浪发、鹅蛋脸浓眉）',
      '埃及男生（棕肤色、黑色短发、宽脸高鼻浓须）',
      '埃及女生（浅橄榄肤色、黑色长发、杏眼柳叶眉）',
      '埃及男生（小麦肤色、利落短发、窄脸深邃轮廓）',
      '埃及女生（橄榄肤色、深棕长卷发、大眼饱满嘴唇）',
      '埃及男生（棕肤色、黑色短发偏分、浓眉方下巴）',
    ],
  },
  '尼日利亚': {
    character: [
      '尼日利亚女生（深棕肤色、黑色编发脏辫、高额头大眼）',
      '尼日利亚男生（深黑肤色、短卷发、宽鼻方脸棱角分明）',
      '尼日利亚女生（深棕肤色、短发自然卷、圆脸饱满嘴唇）',
      '尼日利亚男生（深棕肤色、利落短发、高颧骨浓眉）',
      '尼日利亚女生（棕黑肤色、编发盘发、鹅蛋脸大眼）',
      '尼日利亚男生（深黑肤色、短卷发蓄短须、宽下颌）',
      '尼日利亚女生（深棕肤色、自然卷短发、高额头圆脸）',
      '尼日利亚男生（棕黑肤色、短发、宽鼻厚唇方脸）',
      '尼日利亚女生（深棕肤色、长编发、高颧骨杏眼）',
      '尼日利亚男生（深黑肤色、短卷发、棱角分明高鼻梁）',
    ],
  },
};

/* 一个维度该从哪个库取值：地区专用库 > 室外专用库 > 全局库。
   三条联动规则（地区-人物、室内外互斥、时段-光线同序）全靠这个优先级实现，
   所以取值这件事只能从这里走一个口子——定向裂变也调它，不另抄一份。 */
function bankFor(parsed, key) {
  const fixedSetting = parsed.locked.find(x => x.key === 'setting')?.value || '';
  const outdoor = OUTDOOR_RE.test(fixedSetting);
  const fixedRegion = parsed.locked.find(x => x.key === 'region')?.value || '';
  const regionBank = BANK_REGION[fixedRegion];
  return (regionBank && regionBank[key]) || (outdoor && BANK_OUTDOOR[key]) || BANK[key] || null;
}

/* 一条变体在各裂变维度上的取值（确定性：第 i 条取第 i 个，看得见、可复现）。
   pools 是用户要求随机的维度，同样按序错开，保证 N 条各不相同又不出池子。 */
export function pickVariant(parsed, i) {
  const dims = [];
  for (const d of parsed.open) {
    const bank = bankFor(parsed, d.key);
    if (!bank) continue;
    dims.push({ key: d.key, label: d.label, value: bank[i % bank.length], kind: 'open' });
  }
  for (const p of parsed.pools) {
    dims.push({ key: p.key, label: p.label, value: p.options[i % p.options.length], kind: 'pool' });
  }
  return dims;
}

/* ══ 定向裂变 ══
   任务详情里的「裂变」按钮：以某一条已出片的变体为基准，只在用户点名的维度上变，
   其余逐字沿用。这跟首次生成的满盘裂变是两回事——控制变量，才知道差异是谁带来的。 */

/* 用户能点名的维度 = 有取值库的那些。字幕动画/位置/颜色三维没建库
   （pickVariant 遇到没库的维度本来就 continue），不摆出来让用户点了没反应。 */
export const FANOUT_DIMS = DIMENSIONS
  .filter(d => d.fanoutable && BANK[d.key])
  .sort((a, b) => (b.weight || 0) - (a.weight || 0))
  .map(d => ({ key: d.key, label: d.label, weight: d.weight || 0 }));

/* 「只换个男女角色长相」→ character。关键词表，先到先得，所以细粒度的排在前面：
   「开场首句」必须先于「开场」命中 firstLine，否则全被 hook 吃掉。 */
const STEER_HINTS = [
  { key: 'firstLine',  re: /首句|第一句|开口第一/ },
  { key: 'hook',       re: /钩子|开场|开头|前三秒|前 ?3 ?秒|抓人/ },
  { key: 'character',  re: /男女|性别|长相|外貌|样貌|脸|人脸|人物|演员|模特|主角|出镜|族裔|肤色|发型|换个人|换人/ },
  { key: 'outfit',     re: /服装|穿搭|穿着|造型|衣服|打扮/ },
  { key: 'age',        re: /年龄|岁数|年纪|老一点|年轻/ },
  { key: 'vibe',       re: /气质|感觉|调性|人设/ },
  { key: 'setting',    re: /场景|背景|环境|地方|室内|室外/ },
  { key: 'spot',       re: /位置|地点|位点|站在|坐在/ },
  { key: 'lighting',   re: /光线|打光|灯光|布光|光/ },
  { key: 'timeOfDay',  re: /时段|时间点|白天|晚上|早上|傍晚|夜里/ },
  { key: 'format',     re: /形式|拍法|玩法|呈现方式|表现形式/ },
  { key: 'shotSize',   re: /景别|特写|中景|近景|远景|全景/ },
  { key: 'angle',      re: /角度|机位|仰拍|俯拍/ },
  { key: 'camera',     re: /运镜|镜头运动|推拉摇移|运动方式/ },
  { key: 'script',     re: /台词|口播|说法|文案|话术|说话风格|讲法/ },
  { key: 'pace',       re: /语速|节奏|快一点|慢一点/ },
  { key: 'emotion',    re: /情绪|表情|状态|语气/ },
  { key: 'cta',        re: /结尾|收尾|号召|引导|CTA|cta|最后/ },
  { key: 'music',      re: /音乐|配乐|BGM|bgm|背景音/ },
  { key: 'transition', re: /转场|切换/ },
];
/* 把一句方向指令认成一组维度。认不出来就返回空——界面据此拦住提交，
   让用户自己点，而不是猜一个维度跑完 N 条才发现认错了。 */
export function steerToDims(text) {
  const s = String(text || '');
  if (!s.trim()) return [];
  const hit = new Set();
  for (const h of STEER_HINTS) if (h.re.test(s)) hit.add(h.key);
  return FANOUT_DIMS.filter(d => hit.has(d.key));
}

/* ══ 视频理解（反解基准）══
   magic=off 的批次里 N 条提示词逐字相同，历史任务连 dims 都没存过。这时用户想
   「以视频 3 为底裂变」，文字里读不出视频 3 长什么样——它跟视频 1 的差异只在成片像素里。
   所以要先看片，把成片反解成维度取值，再拿它当基准。

   demo 用确定性模拟代替真模型：以 baseIndex 错开取值，同一条片子每次读出来都一样
   （可复现、能对账）。真实接入时整个函数换成视频理解接口的返回，调用处不用改。

   已写死的维度不由模型说——用户写了「场景：街边 ATM」就是街边 ATM，
   模型看片看出「户外」也不该覆盖用户的原话。这是「用户写了的锁死」那条总规则的延续。 */
export function readVideoDims(task, index = 0) {
  const parsed = parseBrief((task && task.sourceText) || '');
  const variants = (task && task.variants) || [];
  const own = (variants[index] && variants[index].dims) || null;
  /* 这一条自己有取值、【而且不是全批共用的那份】才直接认。
     magic=off 的批次每条都挂着同一组 dims，照抄的话第 1 条和第 3 条会反解出一样的结果——
     那等于没看片，用户点哪条都一个样。共用时必须真去读画面。 */
  const shared = variants.length > 1
    && variants.every(v => v && v.dims && JSON.stringify(v.dims) === JSON.stringify(variants[0].dims));
  if (own && own.length && !shared) return own;
  const lockedKeys = new Set(parsed.locked.map(x => x.key));
  const seed = index + 1;   // 错开：同一批里第 1 条和第 3 条读出来的必须不同
  return FANOUT_DIMS.map(d => {
    if (lockedKeys.has(d.key)) return null;
    const bank = bankFor(parsed, d.key);
    if (!bank) return null;
    return { key: d.key, label: d.label, value: bank[(seed * 3 + d.weight) % bank.length], kind: 'open' };
  }).filter(Boolean);
}

/* 第 i 条定向变体的维度取值：基准条的取值原样端过来，只有 varyKeys 里的重新取。
   用户当初写死的维度也允许被点名（他看完片改主意了），这时基准条里没有这一项，
   现场从库里补一条进去，并由 buildScript 的 varyKeys 让它盖过 locked 值。 */
export function fanoutDims(parsed, baseDims, varyKeys, i) {
  const vary = new Set(varyKeys);
  const out = baseDims.map(d => {
    const bank = vary.has(d.key) && bankFor(parsed, d.key);
    return bank ? { ...d, value: bank[i % bank.length] } : d;
  });
  const have = new Set(baseDims.map(d => d.key));
  for (const k of varyKeys) {
    if (have.has(k)) continue;
    const bank = bankFor(parsed, k);
    if (!bank) continue;
    out.push({ key: k, label: DIM[k].label, value: bank[i % bank.length], kind: 'open' });
  }
  return out;
}

const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const lockMark = (s) => `<mark class="sb-lock">${esc(s)}</mark>`;
const openMark = (s) => `<em class="sb-var">${esc(s)}</em>`;
// 定向裂变里这次真正在变的那一维：一页取值里只有它是变量，其余都是沿用基准条
const fanMark = (s) => `<em class="sb-fan">${esc(s)}</em>`;

/* 组装一条完整脚本。
   锁死项逐字照抄并高亮；用户给了分镜就沿用他的镜头结构，只把变量填进去，绝不另编一套。 */
/* 素材 chip：和视频克隆里的 @chip 同一种形态（带缩略图的内联标签），
   引用素材就该看得见那张图，纯文字「参考图」没有指认力。 */
const assetChip = (img, i) =>
  `<span class="sb-tok sb-tok--locked" contenteditable="false"><img src="${img}" alt="">@参考图${i + 1}</span>`;

export function buildScript(parsed, dims, index, steer = '', images = [], total = 1, varyKeys = null) {
  const byKey = (k) => parsed.locked.filter(x => x.key === k);
  /* 定向裂变点名了的维度，即使用户当初写死过也让位给本条取值——
     他是看完成片才改的主意，新指令比旧输入新鲜。挡在 one() 这一个口子上，
     下游的「已指定」声明行、show()、分镜段全都自动跟着走。 */
  const fanned = new Set(varyKeys || []);
  const one = (k) => (fanned.has(k) ? '' : (byKey(k)[0]?.value || ''));
  const dim = (k) => dims.find(d => d.key === k)?.value || '';
  const out = [];

  const product = one('product') || one('brand');
  const region = one('region');
  const language = one('language');
  const duration = one('duration');
  const head = [
    product ? `为${lockMark(product)}` : '为该产品',
    one('category') ? `（${lockMark(one('category'))}）` : '',
    '制作第 ', index + 1, ' 条投放视频',
    region ? `，面向${lockMark(region)}` : '',
    language ? `，${lockMark(language)}口播` : '',
    duration ? `，时长${lockMark(duration)}` : '',
    '。',
  ].join('');
  out.push(head);

  // 用户点名要出现的画面元素：必须逐条落进脚本，否则等于没识别
  const elements = byKey('element');
  if (elements.length) out.push(`【必需元素 · 逐条出现】${elements.map(e => lockMark(e.value)).join(' · ')}`);

  // 人物 / 场景 / 形式：用户写死了就在这里声明（没写才由下面的「本条差异」裂变）
  const fixed = [
    one('character') && `人物：${lockMark(one('character'))}`,
    one('setting') && `场景：${lockMark(one('setting'))}`,
    one('format') && `形式：${lockMark(one('format'))}`,
  ].filter(Boolean);
  if (fixed.length) out.push(`【已指定 · 全条一致】${fixed.join('　')}`);

  const assets = byKey('asset');
  if (images.length || assets.length) {
    const chips = images.map((u, i) => assetChip(u, i)).join(' ');
    const rules = assets.map(a => lockMark(a.value)).join('；');
    out.push(`【参考素材】${[chips, rules].filter(Boolean).join('　')}`);
  }

  const lines = byKey('lines');   // 逐字台词（分镜首尾镜也要用，先取出来）
  const redlines = byKey('redline');
  if (redlines.length) out.push(`【红线 · 不可违反】${redlines.map(r => lockMark(r.value)).join(' · ')}`);

  const selling = byKey('selling');
  if (selling.length) out.push(`【卖点池 · 逐条一字不改】${selling.map(s => lockMark(s.value)).join(' / ')}`);

  // 同义重复去重（用户常把「符合印尼国家实际情况」写两遍，只差一个「的」）
  const norm = (s) => s.replace(/[的地得\s，,。]/g, '');
  const styles = [];
  for (const s of [...byKey('style'), ...byKey('visual')]) {
    if (!styles.some(x => norm(x.value) === norm(s.value))) styles.push(s);
  }
  if (styles.length) out.push(`【风格】${styles.map(s => lockMark(s.value)).join('；')}`);
  if (one('logo')) out.push(`【Logo】${lockMark(one('logo'))}`);
  if (one('elementLang')) out.push(`【画面元素】${lockMark(one('elementLang'))}`);

  // 本条差异：20 来个维度逐行罗列会读不动，按人物 / 场景 / 镜头 / 表达 / 收尾分组压成五行。
  // 用户写死的用锁定样式、系统裂变的用变量样式，同一行里就能看出哪些动了哪些没动。
  const show = (k) => {
    const fixedVal = one(k);
    if (fixedVal) return lockMark(fixedVal);
    const v = dim(k);
    if (!v) return '';
    // 定向裂变里，「这次在变的」必须一眼认出来——否则满页取值分不清哪个是变量哪个是沿用
    return fanned.has(k) ? fanMark(v) : openMark(v);
  };
  const row = (label, keys) => {
    const parts = keys.map(show).filter(Boolean);
    return parts.length ? `${label}：${parts.join(' · ')}` : '';
  };
  const openDims = dims.filter(d => d.kind === 'open');
  if (openDims.length) {
    // 只生成 1 条时不存在「差异」，这些只是把你没写的部分补全
    const title = total > 1 ? `【本条差异 · 变体 #${index + 1}】` : '【自动补全 · 你未指定的部分】';
    // 定向裂变要把「只有这一维在变」明说出来，否则用户看到满页取值以为哪儿都在变
    const fannedLabels = [...fanned].map(k => DIM[k] && DIM[k].label).filter(Boolean);
    const note = fannedLabels.length
      ? `（只变${fannedLabels.join(' / ')}，其余沿用基准条${steer ? `；你的指令：${esc(steer)}` : ''}）`
      : (steer ? `（已按你的方向：${esc(steer)}）` : '');
    out.push(title + note);
    out.push([
      row('人物', ['character', 'age', 'outfit', 'vibe']),
      row('场景', ['setting', 'spot', 'timeOfDay', 'lighting']),
      row('镜头', ['format', 'shotSize', 'angle', 'camera']),
      row('表达', ['hook', 'firstLine', 'script', 'pace', 'emotion']),
      row('收尾', ['cta', 'music', 'transition']),
    ].filter(Boolean).join('\n'));
  }

  // 分镜：用户给了就沿用他的，只把本条变量代入；没给才按形式生成两镜
  if (parsed.shots.length) {
    out.push('【分镜 · 沿用你给的结构，仅代入本条变量】');
    out.push(parsed.shots.map(s => lockMark(s.text)).join('\n'));
  } else {
    // 没给分镜：按时长切段（12 秒 → 3 镜 × 4 秒），必需元素按顺序摊到各镜，保证一条都不落下
    const total = parseInt(duration, 10) || 10;
    const shotCount = Math.max(2, Math.min(4, Math.round(total / 4)));
    const per = total / shotCount;
    const fmt = (s) => `0:${String(Math.round(s)).padStart(2, '0')}`;
    const mark = (v, k) => (one(k) ? lockMark(one(k)) : openMark(v));   // 用户写死的用锁定样式，系统裂变的用变量样式
    const character = one('character') || dim('character');
    const setting = one('setting') || dim('setting');
    const format = one('format') || dim('format');
    const perShot = Math.ceil(elements.length / shotCount);

    out.push('【分镜】');
    for (let s = 0; s < shotCount; s++) {
      const span = `（${fmt(s * per)}-${fmt((s + 1) * per)}）`;
      const mine = elements.slice(s * perShot, (s + 1) * perShot).map(e => lockMark(e.value));
      const lens = [show('shotSize'), show('angle'), show('camera')].filter(Boolean).join(' / ');
      // 给了逐字台词时，首尾镜的说什么已经定了——就是台词的第一句和最后一句
      const firstLine = lines.length ? lockMark(`「${lines[0].value}」`) : (dim('firstLine') || dim('hook'));
      const lastLine = lines.length ? lockMark(`「${lines[lines.length - 1].value.slice(-24)}」`) : '';
      let body;
      if (s === 0) {
        const who = [show('character'), show('age'), show('outfit')].filter(Boolean).join(' · ');
        const where = [show('setting'), show('spot'), show('lighting')].filter(Boolean).join(' · ');
        const opener = lines.length ? `开口即台词首句 ${firstLine}` : openMark(firstLine || '开场');
        body = `${opener}。${who ? who + '出镜' : ''}${where ? `，${where}` : ''}${format ? `，${mark(format, 'format')}` : ''}${redlines.length ? `；遵守红线（${lockMark(redlines[0].value)}）` : ''}。`;
      } else if (s === shotCount - 1) {
        const close = lines.length ? `落到台词收尾 ${lastLine}` : (selling.length ? `落到卖点（${lockMark(selling[selling.length - 1].value)}）` : '行动号召');
        body = `收束：${close}${show('cta') ? `，${show('cta')}` : ''}。`;
      } else {
        body = `产品演示，展示界面与收益${selling.length ? `，紧扣卖点（${lockMark(selling[0].value)}）` : ''}${show('transition') ? `；转场${show('transition')}` : ''}。`;
      }
      out.push(`镜头 ${s + 1}${span}${lens ? `［${lens}］` : ''}：${body}${mine.length ? ` 本镜须出现：${mine.join(' · ')}。` : ''}`);
    }
  }

  // 台词：用户给了逐字台词就照搬，此时不存在「台词风格」可裂变
  if (lines.length) {
    out.push(`【台词 · 逐字照搬，不得改写】${language ? `（${lockMark(language)}）` : ''}\n${lines.map(l => lockMark(`「${l.value}」`)).join('\n')}`);
  } else {
    const tone = [show('script'), show('pace'), show('emotion')].filter(Boolean).join(' · ');
    out.push(`【台词】${tone || '自然口语'}${language ? `，须为${lockMark(language)}` : ''}。`);
  }
  if (show('music')) out.push(`【音乐】${show('music')}`);

  const subRules = byKey('subRule');
  const poolDims = dims.filter(d => d.kind === 'pool');
  if (subRules.length || poolDims.length) {
    const parts = [];
    if (subRules.length) parts.push(subRules.map(s => lockMark(s.value)).join('；'));
    if (poolDims.length) parts.push('本条取值：' + poolDims.map(d => `${d.label} ${openMark(d.value)}`).join(' · '));
    out.push(`【特效字幕】${parts.join('。')}`);
  }

  // 每段包成 <p>：段间距交给 CSS，段内换行仍靠 pre-wrap。
  // 用 \n 拼成一整块的话，所有行会紧挨在一起，读起来很挤。
  return out.map(seg => `<p>${seg}</p>`).join('');
}

/* 一批 N 条各自的脚本。这条规则原来只写在 VideoGenModal 的 handleGenerate 里，
   但任务详情要展示「这条视频当初是按什么提示词跑的」，历史任务也得按同一套规则补出来——
   两处各写一遍迟早分叉，所以收在这里当唯一出处。

   Magic Prompt 决定这 N 条的 prompt 有多不一样：
     on   每条在「你没写死的维度」上各取一组值 → N 条各不相同
     off  N 条共用同一组值 → 只剩模型自身的随机
     auto 你留白多就变（等同 on），已经写得很细就别乱动（等同 off）
   无论哪一档，parsed.locked 里的东西逐字不动。

   auto 的判据用「锁死项条数」而不是 open.length：后者恒等于 23 个可裂变维度里没被认出来的
   那些，糙输入和磨过的长 brief 都是 20，区分不了。实测锁死项条数 糙=3 / 中=4 / 细=8，取 6。 */
const DETAILED_LOCK_COUNT = 6;
export function buildVariantScripts(sourceText, imageUrls = [], magic = 'auto', count = 1) {
  const parsed = parseBrief(sourceText || '');
  const vary = magic === 'on' || (magic === 'auto' && parsed.locked.length < DETAILED_LOCK_COUNT);
  return Array.from({ length: Math.max(1, count) }, (_, i) => {
    // 不变的时候连序号也固定，N 条逐字相同＝真正的「共用同一份提示词」；
    // total 传 1 会让脚本里那个小标题从「本条差异 · 变体 #N」换成「自动补全 · 你未指定的部分」
    const k = vary ? i : 0;
    const dims = pickVariant(parsed, k);
    // dims 一起存进 variant：任务详情的「裂变」按钮要拿它当基准，
    // 只有知道这条取了哪些值，才谈得上「其余逐字沿用」
    return { promptHtml: buildScript(parsed, dims, k, '', imageUrls, vary ? count : 1), dims };
  });
}

/* 定向裂变的 N 条脚本。跟 buildVariantScripts 的区别只有一个：
   取值不是从零抽，而是拿基准条的那一组，只把 varyKeys 换掉。 */
export function buildFanoutScripts({ sourceText, imageUrls = [], baseDims = [], varyKeys = [], steer = '', count = 1 }) {
  const parsed = parseBrief(sourceText || '');
  const n = Math.max(1, count);
  return Array.from({ length: n }, (_, i) => {
    const dims = fanoutDims(parsed, baseDims, varyKeys, i);
    return { promptHtml: buildScript(parsed, dims, i, steer, imageUrls, n, varyKeys), dims };
  });
}
