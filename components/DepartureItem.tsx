
import React, { useState } from 'react';
import { Departure } from '../types.ts';

interface Props {
  departure: Departure;
  mode?: string;
}

const DepartureItem: React.FC<Props> = ({ departure, mode }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: Departure['status']) => {
    switch (status) {
      case 'delayed': return 'text-orange-600 bg-orange-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getStatusLabel = (status: Departure['status']) => {
    switch (status) {
      case 'delayed': return 'Retardé';
      case 'cancelled': return 'Supprimé';
      default: return 'À l\'heure';
    }
  };

  const hasLegs = departure.legs && departure.legs.length > 1;

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 ${expanded ? 'ring-2 ring-blue-100 shadow-lg' : 'hover:border-blue-200'}`}>
      <div 
        className={`flex items-center justify-between p-4 cursor-pointer ${hasLegs ? 'hover:bg-slate-50' : ''}`}
        onClick={() => hasLegs && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center min-w-[3.5rem] h-14 bg-slate-50 rounded-xl">
            <span className="text-xl font-bold text-slate-800 tracking-tight">{departure.time}</span>
            {departure.delay && (
              <span className="text-[10px] font-black text-orange-600 leading-none">{departure.delay}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {departure.destination}
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 text-[10px] font-black rounded uppercase tracking-wider bg-blue-600 text-white">
                {departure.line}
              </span>
              {departure.platform && (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voie {departure.platform}</span>
              )}
              {departure.arrivalTime && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">• Arrivée {departure.arrivalTime}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${getStatusColor(departure.status)}`}>
            {getStatusLabel(departure.status)}
          </span>
          {hasLegs && (
            <svg className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {expanded && hasLegs && (
        <div className="bg-slate-50/50 p-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-300">
          <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 before:border-l before:border-dashed before:border-slate-300">
            {departure.legs!.map((leg, idx) => (
              <div key={idx} className="relative">
                <div className="absolute -left-[21px] top-1.5 w-4 h-4 rounded-full bg-white border-4 border-blue-600 z-10"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{leg.departureTime} • {leg.departureStation}</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded uppercase">{leg.line}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>Vers {leg.arrivalStation} • Arrivée {leg.arrivalTime}</span>
                    {leg.platform && <span>Voie {leg.platform}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartureItem;
