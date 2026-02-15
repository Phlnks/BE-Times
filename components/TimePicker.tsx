
import React from 'react';

interface Props {
  value: string; // HH:mm
  onChange: (time: string) => void;
  accentColor: string;
}

const TimePicker: React.FC<Props> = ({ value, onChange, accentColor }) => {
  const [currentHour, currentMinute] = value.split(':');

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const handleHourSelect = (h: string) => {
    onChange(`${h}:${currentMinute}`);
  };

  const handleMinuteSelect = (m: string) => {
    onChange(`${currentHour}:${m}`);
  };

  return (
    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-[320px] animate-in fade-in zoom-in-95 duration-200">
      <div className="mb-4">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Heures</label>
        <div className="grid grid-cols-6 gap-1">
          {hours.map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => handleHourSelect(h)}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                currentHour === h 
                  ? `${accentColor} text-white shadow-sm` 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Minutes</label>
        <div className="grid grid-cols-4 gap-1">
          {minutes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleMinuteSelect(m)}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                currentMinute === m 
                  ? `${accentColor} text-white shadow-sm` 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
        <span className="text-sm font-bold text-slate-400">Heure choisie:</span>
        <span className="text-lg font-black text-slate-800">{value}</span>
      </div>
    </div>
  );
};

export default TimePicker;
