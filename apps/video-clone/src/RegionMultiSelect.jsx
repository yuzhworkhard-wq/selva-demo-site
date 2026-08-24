import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, MapPin } from 'lucide-react';
import { regionByValue, normalizeRegions } from './videoRegionConfig.mjs';
import { RegionPickerPanel, useAnchoredPanelStyle } from './RegionPickerPanel';

export function RegionMultiSelect({ value, onChange, max = Infinity }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const regions = normalizeRegions(value);
  const panelStyle = useAnchoredPanelStyle(open, triggerRef);

  useEffect(() => {
    if (!open) return undefined;
    const away = event => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = event => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  const toggle = region => {
    if (regions.includes(region.value)) {
      if (regions.length === 1) return;
      onChange(regions.filter(item => item !== region.value));
      return;
    }
    if (regions.length >= max) return;
    onChange([...regions, region.value]);
  };

  return (
    <div className="region-select" ref={ref}>
      <div className="region-select-label"><MapPin size={13} /> 目标地区</div>
      <div className="region-select-control">
        <div className="region-select-chips">
          {regions.map(item => {
            const region = regionByValue(item);
            return (
              <span className="region-chip" key={item}>
                {region.label}
                <button type="button" onClick={() => toggle(region)} disabled={regions.length === 1}
                  title={regions.length === 1 ? '至少保留一个目标地区' : `移除${region.label}`} aria-label={`移除${region.label}`}>
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
        <button type="button" className="region-select-trigger" ref={triggerRef} onClick={() => setOpen(v => !v)}
          aria-expanded={open} aria-haspopup="dialog" title="选择目标地区">
          <ChevronDown size={14} />
        </button>
      </div>
      {open && (
        <RegionPickerPanel
          value={regions}
          onChange={onChange}
          allowEmpty={false}
          max={max}
          deferCommit
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          ariaLabel="目标地区"
          style={panelStyle}
        />
      )}
    </div>
  );
}
