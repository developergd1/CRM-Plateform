'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlatformProfile } from './AdminPlatformGateway';
import {
  Users,
  Building2,
  Briefcase,
  ChevronDown,
  LayoutGrid,
  Check,
} from 'lucide-react';

interface PlatformSwitcherDropdownProps {
  currentPlatform: PlatformProfile;
  onSelectPlatform: (platform: PlatformProfile) => void;
  className?: string;
}

export const PlatformSwitcherDropdown: React.FC<PlatformSwitcherDropdownProps> = ({
  currentPlatform,
  onSelectPlatform,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPlatformMeta = (p: PlatformProfile) => {
    switch (p) {
      case 'CMS':
        return {
          title: 'CMS',
          fullTitle: 'CMS — Client Management',
          icon: Building2,
          badgeColor: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
          dot: 'bg-[#0D9488]',
        };
      case 'CRM':
        return {
          title: 'CRM Platform',
          fullTitle: 'CRM Platform',
          icon: Building2,
          badgeColor: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
          dot: 'bg-[#0D9488]',
        };
      case 'HRM':
        return {
          title: 'HRM Suite',
          fullTitle: 'Enterprise HRM',
          icon: Briefcase,
          badgeColor: 'bg-[#0D9488]/10 text-[#0D9488] border-[#0D9488]/20',
          dot: 'bg-[#0D9488]',
        };
      default:
        return {
          title: 'Platform Hub',
          fullTitle: 'Platform Hub',
          icon: LayoutGrid,
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
        };
    }
  };

  const current = getPlatformMeta(currentPlatform);
  const CurrentIcon = current.icon;

  const platforms: { id: PlatformProfile; title: string; icon: React.ElementType; color: string }[] = [
    {
      id: 'CMS',
      title: 'CMS — Client Management',
      icon: Building2,
      color: 'text-[#0D9488] bg-[#0D9488]/10',
    },
    {
      id: 'CRM',
      title: 'CRM Platform',
      icon: Building2,
      color: 'text-[#0D9488] bg-[#0D9488]/10',
    },
    {
      id: 'HRM',
      title: 'Enterprise HRM Suite',
      icon: Briefcase,
      color: 'text-[#0D9488] bg-[#0D9488]/10',
    },
  ];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Compact, clean trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs hover:border-[#0D9488] hover:bg-slate-50 transition-all text-xs font-semibold text-slate-800 cursor-pointer"
        title="Switch Platform"
      >
        <div className={`w-2 h-2 rounded-full ${current.dot} animate-pulse shrink-0`} />
        <CurrentIcon className="w-3.5 h-3.5 text-slate-600 shrink-0" />
        <span className="font-bold text-slate-900 hidden sm:inline">{current.title}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-xl border border-slate-200 p-1.5 z-50 animate-fadeIn divide-y divide-slate-100">
          <div className="px-2.5 py-1.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Switch Platform
            </p>
          </div>

          <div className="py-1 space-y-0.5">
            {platforms.map((p) => {
              const Icon = p.icon;
              const isSelected = currentPlatform === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onSelectPlatform(p.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0D9488]/10 text-slate-900 font-bold'
                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-1.5 rounded-lg ${p.color} shrink-0`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold truncate">{p.title}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                onSelectPlatform('GATEWAY');
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
              <span>Gateway Hub (All 3)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
