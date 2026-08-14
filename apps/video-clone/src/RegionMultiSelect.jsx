import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X, MapPin } from 'lucide-react';
import { VIDEO_REGIONS, regionByValue, normalizeRegions } from './videoRegionConfig.mjs';

export function RegionMultiSelect({ value, onChange, max = Infinity }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const regions = normalizeRegions(value);

  useEffect(() => {
    if (!open) return undefined;
    const away = event => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = event => { if (event.key === 'Escape') setOpen(false); };
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
      onChange(regions.filter(value => value !== region.value));
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
          {regions.map(value => {
            const region = regionByValue(value);
            return (
              <span className="region-chip" key={value}>
                {region.label}
                <button type="button" onClick={() => toggle(region)} disabled={regions.length === 1}
                  title={regions.length === 1 ? '至少保留一个目标地区' : `移除${region.label}`} aria-label={`移除${region.label}`}>
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
        <button type="button" className="region-select-trigger" onClick={() => setOpen(v => !v)}
          aria-expanded={open} aria-haspopup="listbox" title="选择目标地区">
          <ChevronDown size={14} />
        </button>
      </div>
      {open && (
        <div className="region-select-menu" role="listbox" aria-label="目标地区">
          {VIDEO_REGIONS.map(region => {
            const selected = regions.includes(region.value);
            const disabled = !selected && regions.length >= max;
            return (
              <button type="button" role="option" aria-selected={selected} key={region.value}
                className={`region-select-option ${selected ? 'selected' : ''}`} disabled={disabled}
                onClick={() => toggle(region)}>
                <span><b>{region.label}</b><small>{region.value.toUpperCase()}</small></span>
                {selected && <Check size={14} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
