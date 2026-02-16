
import React, { useState, useEffect, useRef } from 'react';
import { SearchIcon } from './icons';
import { TransportMode } from '../types';
import { searchStops } from '../services/transportService';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  mode: TransportMode;
  borderColor: string;
  icon?: React.ReactNode;
}

const AutocompleteInput: React.FC<Props> = ({ value, onChange, placeholder, mode, borderColor, icon }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value.trim().length >= 2) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      
      setLoading(true);
      // Increased debounce to 800ms to be safer with quotas
      timeoutRef.current = setTimeout(async () => {
        try {
          const results = await searchStops(value, mode);
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }, 800); 
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      setLoading(false);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [value, mode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (suggestions.length > 0) setShowSuggestions(true);
        }}
        placeholder={placeholder}
        className={`w-full h-14 pl-12 pr-12 rounded-xl border-2 bg-white text-slate-900 placeholder-slate-400 text-base font-medium shadow-md focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all ${borderColor}`}
      />
      
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {icon || <SearchIcon className="w-5 h-5" />}
      </div>

      {loading && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
        </div>
      )}

      {showSuggestions && (
        <ul className="absolute z-[100] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {suggestions.map((suggestion, index) => (
            <li key={index}>
              <button
                type="button"
                className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors border-b border-slate-50 last:border-0"
                onClick={() => {
                  onChange(suggestion);
                  setShowSuggestions(false);
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;
