import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { notifyHostModal } from './hostModal';

/** 提交/导出到任务中心前命名：与 up-dialog 同一套壳，混剪 / 套边框共用 */
export function ExportTaskDialog({
  open,
  onClose,
  onConfirm,
  defaultName = '',
  placeholder = '如：消除游戏-春季混剪',
  count = 0,
  toolLabel = '',
  submitting = false,
  dialogTitle = '导出到任务中心',
  confirmLabel = '确认导出',
  hint = '',
}) {
  const [name, setName] = useState(defaultName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setName(defaultName);
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(t);
  }, [open, defaultName]);

  useEffect(() => {
    if (!open) return undefined;
    notifyHostModal(true);
    return () => notifyHostModal(false);
  }, [open]);

  useEffect(() => {
    if (!open || submitting) return undefined;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const trimmed = name.trim();
  const canSubmit = !!trimmed && !submitting;
  const hintText = hint || `将为选中的 ${count} 条成片创建一条任务，请填写名称以便在任务中心区分不同批次。`;

  return (
    <div className="up-dialog-overlay" onClick={() => !submitting && onClose()}>
      <div
        className="up-dialog mix-export-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={dialogTitle}
        onClick={e => e.stopPropagation()}
      >
        <div className="up-dialog-head">
          <span className="up-dialog-title">{dialogTitle}</span>
          <button
            type="button"
            className="up-dialog-x"
            onClick={onClose}
            disabled={submitting}
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>
        <div className="up-body">
          <p className="mix-export-hint">{hintText}</p>
          <label className="form-field mix-export-field">
            <span>任务名称 <span className="required">*</span></span>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={placeholder}
              maxLength={40}
              disabled={submitting}
              aria-label="任务名称"
              onKeyDown={e => {
                if (e.key === 'Enter' && canSubmit) onConfirm(trimmed);
              }}
            />
          </label>
        </div>
        <div className="up-foot">
          <span className="up-foot-hint">{toolLabel}</span>
          <div className="up-foot-btns">
            <button type="button" className="btn-outline" onClick={onClose} disabled={submitting}>
              取消
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={!canSubmit}
              onClick={() => onConfirm(trimmed)}
            >
              {submitting
                ? <><Loader2 size={14} className="spinner" /> 提交中…</>
                : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
