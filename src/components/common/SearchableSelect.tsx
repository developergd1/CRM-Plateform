'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Building2, ChevronDown, User } from 'lucide-react';

export interface SearchOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  icon?: 'building' | 'user';
}

interface SearchableSelectProps {
  options: SearchOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  allowClear?: boolean;
  defaultEmptyLabel?: string;
  iconType?: 'building' | 'user';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Type to search...',
  label,
  required = false,
  allowClear = true,
  defaultEmptyLabel = '-- Direct Internal Staff / HQ --',
  iconType = 'building',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredOptions = options.filter((opt) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const matchLabel = opt.label.toLowerCase().includes(q);
    const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(q) : false;
    const matchBadge = opt.badge ? opt.badge.toLowerCase().includes(q) : false;
    return matchLabel || matchSub || matchBadge;
  });

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(false);
  };

  const IconComponent = iconType === 'user' ? User : Building2;

  return (
    <div className="space-y-1.5 w-full relative" ref={containerRef}>
      {label && (
        <label className="block text-slate-700 font-bold text-xs flex items-center justify-between">
          <span>{label} {required && <span className="text-rose-500">*</span>}</span>
          {selectedOption && allowClear && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-growth-teal hover:underline font-semibold"
            >
              Clear selection
            </button>
          )}
        </label>
      )}

      {/* Selected Box View (when an option is selected and dropdown is closed) */}
      {!isOpen && selectedOption ? (
        <div
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="w-full p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-xl cursor-pointer flex items-center justify-between transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-100/80 text-growth-teal flex items-center justify-center shrink-0">
              <IconComponent className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-xs truncate">
                  {selectedOption.label}
                </span>
                {selectedOption.badge && (
                  <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 bg-teal-50 text-growth-teal border border-teal-200 rounded shrink-0">
                    {selectedOption.badge}
                  </span>
                )}
              </div>
              {selectedOption.subLabel && (
                <div className="text-[11px] text-slate-500 truncate">
                  {selectedOption.subLabel}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {allowClear && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700"
                title="Remove selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-xs text-growth-teal font-semibold px-2 py-0.5 bg-white border border-slate-200 rounded-lg group-hover:border-growth-teal">
              Change
            </span>
          </div>
        </div>
      ) : (
        /* Search Bar Input */
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={selectedOption ? `Current: ${selectedOption.label} — Type to search other...` : placeholder}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-growth-teal/40 focus:border-growth-teal shadow-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Suggestions Dropdown */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150">
              {defaultEmptyLabel && (
                <div
                  onClick={() => handleSelect('')}
                  className={`px-3.5 py-2.5 cursor-pointer text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors ${
                    value === '' ? 'bg-teal-50/70 text-growth-teal font-bold' : 'text-slate-600'
                  }`}
                >
                  <span>{defaultEmptyLabel}</span>
                  {value === '' && <Check className="w-4 h-4 text-growth-teal" />}
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching results found for &quot;<strong>{query}</strong>&quot;
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => handleSelect(opt.value)}
                      className={`px-3.5 py-2.5 cursor-pointer flex items-center justify-between hover:bg-teal-50/50 transition-colors ${
                        isSelected ? 'bg-teal-50 text-growth-teal font-bold' : 'text-slate-800'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs truncate text-slate-900">
                            {opt.label}
                          </span>
                          {opt.badge && (
                            <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-200 rounded shrink-0">
                              {opt.badge}
                            </span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <div className="text-[11px] text-slate-500 truncate">
                            {opt.subLabel}
                          </div>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-growth-teal text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
