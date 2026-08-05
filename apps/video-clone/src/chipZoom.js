/* 提示词内 @chip 小图 hover 放大预览：单例浮层挂 body，容器级事件委托。
   contenteditable 编辑器与只读详情共用；返回解绑函数。
   关键帧图不走浮层（hover 是操作按钮：编辑器=重生成/上传，详情=放大/下载）。 */
let box = null;

function ensureBox() {
  if (box) return box;
  box = document.createElement('div');
  box.className = 'chip-zoom';
  box.innerHTML = '<img alt="">';
  document.body.appendChild(box);
  return box;
}

export function hideChipZoom() {
  if (box) box.style.display = 'none';
}

export function bindChipZoom(container, selector = '.sb-tok img') {
  if (!container) return () => {};
  const pick = (e) => {
    const img = e.target && e.target.closest && e.target.closest(selector);
    return img && container.contains(img) ? img : null;
  };
  const onOver = (e) => {
    const img = pick(e);
    if (!img) return;
    const b = ensureBox();
    const pic = b.querySelector('img');
    if (pic.getAttribute('src') !== img.getAttribute('src')) pic.src = img.src;
    b.style.display = 'block';
    const r = img.getBoundingClientRect();
    // 等浮层拿到自身尺寸后定位：chip 下方优先，越界翻上方；水平夹在视口内
    requestAnimationFrame(() => {
      if (b.style.display === 'none') return;
      const bw = b.offsetWidth, bh = b.offsetHeight;
      const x = Math.min(Math.max(8, r.left - 10), window.innerWidth - bw - 8);
      let y = r.bottom + 10;
      if (y + bh > window.innerHeight - 8) y = r.top - bh - 10;
      if (y < 8) y = 8;
      b.style.left = `${x}px`;
      b.style.top = `${y}px`;
    });
  };
  const onOut = (e) => { if (pick(e)) hideChipZoom(); };
  const onClick = () => hideChipZoom();   // 点击（如打开大图查看）时收起 hover 浮层
  container.addEventListener('mouseover', onOver);
  container.addEventListener('mouseout', onOut);
  container.addEventListener('click', onClick);
  return () => {
    container.removeEventListener('mouseover', onOver);
    container.removeEventListener('mouseout', onOut);
    container.removeEventListener('click', onClick);
    hideChipZoom();
  };
}
