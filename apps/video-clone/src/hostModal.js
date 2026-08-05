/* 嵌入模式下弹窗开合同步宿主：宿主给自己的侧栏叠同款半透明遮罩，
   配合 .is-embed 下弹窗容器的右侧补偿 padding（240px 侧栏宽），
   弹窗视觉上=全视口遮罩+全视口居中（对齐独立产品的全局弹窗规范）。 */
export function notifyHostModal(open) {
  if (!document.documentElement.classList.contains('is-embed')) return;
  window.parent.postMessage({ type: 'selva-clone-modal', open: !!open }, '*');
}
