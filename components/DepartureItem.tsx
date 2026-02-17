
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
        className={`flex items-start justify-between p-4 cursor-pointer gap-3 ${hasLegs ? 'hover:bg-slate-50' : ''}`}
        onClick={() => hasLegs && setExpanded(!expanded)}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Bloc Heure - Fixe sur mobile pour l'alignement */}
          <div className="flex flex-col items-center justify-center min-w-[3.5rem] w-14 h-14 bg-slate-50 rounded-xl shrink-0">
            <span className="text-lg font-bold text-slate-800 tracking-tight">{departure.time}</span>
            {departure.delay && (
              <span className="text-[9px] font-black text-orange-600 leading-none">{departure.delay}</span>
            )}
          </div>

          {/* Bloc Infos - Flexible et tronquable si trop long */}
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-slate-900 leading-tight truncate pr-1">
              {departure.destination}
            </h3>
            
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              <span className="px-1.5 py-0.5 text-[9px] font-black rounded uppercase tracking-wider bg-blue-600 text-white shrink-0">
                {departure.line}
              </span>
              {departure.platform && (
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest shrink-0">Voie {departure.platform}</span>
              )}
              {departure.arrivalTime && (
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest shrink-0">• Arr. {departure.arrivalTime}</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Statut - Aligné à droite */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-full whitespace-nowrap ${getStatusColor(departure.status)}`}>
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
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black text-slate-900 truncate">{leg.departureTime} • {leg.departureStation}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded uppercase shrink-0">{leg.line}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span className="truncate pr-2">Vers {leg.arrivalStation} • {leg.arrivalTime}</span>
                    {leg.platform && <span className="shrink-0">Voie {leg.platform}</span>}
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
