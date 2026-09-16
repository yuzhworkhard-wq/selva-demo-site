/* 批量混剪的组合引擎：素材池 + 规则 → 一批不同顺序的成片。
   与视频裂变的分工：裂变改一条片子的细节产出素材；混剪把几段素材拼成整条广告。

   组合是**排列**不是组合：素材 1→2→3 和 3→2→1 是两条不同的广告，顺序本身就是差异来源。
   单条成片内一条素材至多出现一次，于是排列天然互不相同，不需要再做去重。

   片头 / 片尾锁定：勾选池排序第一条可锁为片头、最后一条可锁为片尾，二者可同开。
   此时片段数仍是**成片总段数**（含被锁的头尾），可变的位置是 segments - 锁定位数。 */

// 排列数 P(n, k)
export function permutations(n, k) {
  if (n < 0 || k < 0 || k > n) return 0;
  let count = 1;
  for (let i = 0; i < k; i += 1) count *= n - i;
  return count;
}

/** 当前配置能生成多少条成片（数学上限，不受「限制产出」截断） */
export function countMixes(materialCount, segments, leadLock = false, tailLock = false) {
  if (!materialCount || !segments) return 0;
  const reserved = (leadLock ? 1 : 0) + (tailLock ? 1 : 0);
  if (reserved > segments) return 0;
  if (leadLock && tailLock && materialCount < 2) return 0;
  const free = materialCount - reserved;
  const slots = segments - reserved;
  if (slots < 0 || free < slots) return 0;
  return permutations(free, slots);
}

/** 生成所需的最少素材条数：两种模式都是「有几段就至少要几条」 */
export function minMaterials(segments) {
  return segments;
}

/** 列举全部成片；limit > 0 时按上限截断（0 = 不限制） */
export function buildMixes(materials, segments, leadLock = false, limit = 0, tailLock = false) {
  if (!materials?.length || !segments) return [];
  const lead = leadLock ? materials[0] : null;
  const tail = tailLock ? materials[materials.length - 1] : null;
  if (lead && tail && lead.id === tail.id) return [];

  const reservedIds = new Set([lead?.id, tail?.id].filter(Boolean));
  const pool = materials.filter(m => !reservedIds.has(m.id));
  const slots = segments - reservedIds.size;
  if (slots < 0 || pool.length < slots) return [];

  const out = [];
  const cap = limit > 0 ? limit : Infinity;
  const used = new Set();
  const picked = [];

  const durationOf = ids => ids.reduce((sum, id) => {
    const mat = materials.find(m => m.id === id);
    return sum + (mat ? mat.duration || 0 : 0);
  }, 0);

  const walk = () => {
    if (out.length >= cap) return;
    if (picked.length === slots) {
      const seq = [
        ...(lead ? [lead.id] : []),
        ...picked,
        ...(tail ? [tail.id] : []),
      ];
      out.push({ id: seq.join('>'), seq, duration: durationOf(seq) });
      return;
    }
    for (const mat of pool) {
      if (out.length >= cap) return;
      if (used.has(mat.id)) continue;
      used.add(mat.id);
      picked.push(mat.id);
      walk();
      picked.pop();
      used.delete(mat.id);
    }
  };
  walk();
  return out;
}

/** 结果区的时长筛选档位：按这一批成片的真实时长分布切 5 秒一档，没有空档 */
export function durationBands(mixes) {
  if (!mixes || !mixes.length) return [];
  const seen = new Map();
  mixes.forEach(mix => {
    const lo = Math.floor(mix.duration / 5) * 5;
    if (!seen.has(lo)) seen.set(lo, 0);
    seen.set(lo, seen.get(lo) + 1);
  });
  return [...seen.keys()].sort((a, b) => a - b).map(lo => ({
    key: String(lo),
    label: `${lo}-${lo + 5}s`,
    min: lo,
    max: lo + 5,
  }));
}

/** 秒 → mm:ss */
export function fmtTime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

/** 资源库那边的时长是 "00:15" 这种文本，取回秒数 */
export function parseClock(text) {
  const matched = String(text || '').match(/(\d+):(\d+)/);
  return matched ? Number(matched[1]) * 60 + Number(matched[2]) : 0;
}
