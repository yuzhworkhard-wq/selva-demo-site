import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import {
  ALL_REGION_VALUES, DEFAULT_VIDEO_REGION, REGION_GROUPS, VIDEO_REGIONS,
  isAllRegionsSelected, matchRegionQuery, normalizeRegionSelection,
  regionFlagCode, regionTriggerLabel,
} from './videoRegionConfig.mjs';

function uniqueValues(values) {
  return [...new Set(values)];
}

function groupCheckState(regions, selectedSet) {
  if (!regions.length) return 'none';
  const hit = regions.filter(region => selectedSet.has(region.value)).length;
  if (hit === 0) return 'none';
  if (hit === regions.length) return 'all';
  return 'some';
}

function RegionFlag({ region }) {
  const code = regionFlagCode(region.value);
  return (
    <img
      className="region-picker-flag"
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      width="18"
      height="12"
      alt=""
      loading="lazy"
    />
  );
}

export function useAnchoredPanelStyle(open, anchorRef) {
  const [style, setStyle] = useState({});
  useLayoutEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const box = anchorRef.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(720, window.innerWidth - 48);
      const maxHeight = Math.min(560, window.innerHeight - 24);
      let left = box.left;
      if (left + width > window.innerWidth - 24) left = Math.max(24, window.innerWidth - 24 - width);
      if (left < 24) left = 24;
      const spaceBelow = window.innerHeight - box.bottom - 12;
      const spaceAbove = box.top - 12;
      const openBelow = spaceBelow >= 280 || spaceBelow >= spaceAbove;
      const avail = Math.max(0, openBelow ? spaceBelow : spaceAbove);
      const height = Math.min(maxHeight, avail);
      const top = openBelow
        ? box.bottom + 6
        : Math.max(12, box.top - 6 - height);
      setStyle({
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        width: `${Math.round(width)}px`,
        maxHeight: `${Math.round(height)}px`,
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

export function RegionPickerPanel({
  value,
  onChange,
  allowEmpty = true,
  max = Infinity,
  style,
  ariaLabel = '选择地区',
  deferCommit = false,
  onConfirm,
  onCancel,
}) {
  const committed = normalizeRegionSelection(value, {
    allowEmpty,
    fallback: allowEmpty ? [] : [DEFAULT_VIDEO_REGION],
  });
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState(committed);

  useEffect(() => {
    setDraft(committed);
  }, [committed.join('|')]);

  const selected = deferCommit ? draft : committed;
  const selectedSet = useMemo(() => new Set(selected), [selected.join('|')]);

  const groups = useMemo(() => (
    REGION_GROUPS.map(group => ({
      ...group,
      regions: group.values
        .map(item => VIDEO_REGIONS.find(region => region.value === item))
        .filter(region => region && matchRegionQuery(region, query)),
    })).filter(group => group.regions.length)
  ), [query]);

  const visibleValues = uniqueValues(groups.flatMap(group => group.regions.map(region => region.value)));

  const normalizeNext = next => {
    let values = uniqueValues(next);
    if (max < Infinity) values = values.slice(0, max);
    if (!allowEmpty && values.length === 0) {
      values = selected.length ? selected : [DEFAULT_VIDEO_REGION];
    }
    return values;
  };

  const commit = next => {
    const values = normalizeNext(next);
    if (deferCommit) setDraft(values);
    else onChange(values);
  };

  const toggleValue = regionValue => {
    if (selectedSet.has(regionValue)) {
      if (!allowEmpty && selected.length === 1) return;
      commit(selected.filter(item => item !== regionValue));
      return;
    }
    if (selected.length >= max) return;
    commit([...selected, regionValue]);
  };

  const toggleGroup = group => {
    const members = group.regions.map(region => region.value);
    const allOn = members.every(item => selectedSet.has(item));
    if (allOn) {
      commit(selected.filter(item => !members.includes(item)));
      return;
    }
    const room = max === Infinity ? members.length : Math.max(0, max - selected.length);
    const added = members.filter(item => !selectedSet.has(item)).slice(0, room);
    commit([...selected, ...added]);
  };

  const selectAllVisible = () => {
    if (!query.trim() && visibleValues.length === VIDEO_REGIONS.length) {
      commit(allowEmpty ? ALL_REGION_VALUES : ALL_REGION_VALUES.slice(0, max));
      return;
    }
    const room = max === Infinity ? visibleValues.length : Math.max(0, max - selected.length);
    const added = visibleValues.filter(item => !selectedSet.has(item)).slice(0, room);
    commit([...selected, ...added]);
  };

  const apply = () => {
    onChange(normalizeNext(selected));
    onConfirm?.();
  };

  const allSelected = isAllRegionsSelected(selected);

  return (
    <div className="region-picker-panel" role="dialog" aria-label={ariaLabel} style={style}>
      <div className="region-picker-search">
        <label className="region-picker-search-field">
          <Search size={14} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="快速检索国家与地区"
            aria-label="快速检索国家与地区"
            autoFocus
          />
        </label>
        <button type="button" className="region-picker-all" onClick={selectAllVisible}>全部</button>
      </div>
      <div className="region-picker-body">
        {groups.length === 0 ? (
          <div className="region-picker-empty" role="status">没有匹配的国家或地区</div>
        ) : groups.map(group => {
          const state = groupCheckState(group.regions, selectedSet);
          return (
            <section key={group.id} className="region-picker-group">
              <label className="region-picker-group-head">
                <input
                  type="checkbox"
                  checked={state === 'all'}
                  ref={el => { if (el) el.indeterminate = state === 'some'; }}
                  onChange={() => toggleGroup(group)}
                  aria-label={`选择${group.label}`}
                />
                <span>{group.label}</span>
              </label>
              <div className="region-picker-grid">
                {group.regions.map(region => {
                  const on = selectedSet.has(region.value);
                  const disabled = !on && selected.length >= max;
                  return (
                    <label
                      key={`${group.id}-${region.value}`}
                      className={`region-picker-item${on ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        disabled={disabled}
                        onChange={() => toggleValue(region.value)}
                      />
                      <RegionFlag region={region} />
                      <span className="region-picker-name">{region.label}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {deferCommit && (
        <div className="region-picker-foot">
          <span className="region-picker-foot-hint">
            {allSelected ? '全部地区' : `已选 ${selected.length} 个`}
          </span>
          <span className="region-picker-foot-btns">
            <button type="button" className="btn-outline" onClick={() => onCancel?.()}>取消</button>
            <button type="button" className="btn-primary" onClick={apply}>
              确定{!allSelected && selected.length ? ` (${selected.length})` : ''}
            </button>
          </span>
        </div>
      )}
    </div>
  );
}

export function LibraryRegionPicker({ value, onChange, title = '投放地区' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
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

  return (
    <div className={`idea-pick ${open ? 'open' : ''}`} ref={ref} title={title}>
      <button
        type="button"
        className="idea-pick-btn"
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(current => !current)}
      >
        <span className="idea-pick-val">{regionTriggerLabel(value)}</span>
        <ChevronDown size={13} className="idea-pick-chev" />
      </button>
      {open && (
        <RegionPickerPanel
          value={value}
          onChange={onChange}
          allowEmpty
          deferCommit
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
          ariaLabel={title}
          style={panelStyle}
        />
      )}
    </div>
  );
}
