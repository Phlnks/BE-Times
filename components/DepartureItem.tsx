
import React from 'react';
import { Departure } from '../types';

interface Props {
  departure: Departure;
  mode?: string;
}

const DepartureItem: React.FC<Props> = ({ departure, mode }) => {
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

  const getLineBadgeStyle = () => {
    if (mode === 'SNCB') return 'bg-blue-600 text-white';
    if (mode === 'STIB') return 'bg-red-700 text-white';
    if (mode === 'De Lijn') return 'bg-yellow-400 text-slate-900';
    return 'bg-slate-200 text-slate-600';
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all duration-200 group">
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center justify-center min-w-[3.5rem] h-14 bg-slate-50 rounded-lg group-hover:bg-blue-50 transition-colors">
          <span className="text-xl font-bold text-slate-700">{departure.time}</span>
          {departure.delay && (
            <span className="text-[10px] font-black text-orange-600 leading-none">{departure.delay}</span>
          )}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800 leading-tight">
            {departure.destination}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 text-xs font-black rounded ${getLineBadgeStyle()}`}>
              {departure.line}
            </span>
            {departure.platform && (
              <span className="text-xs font-medium text-slate-400">Quai {departure.platform}</span>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${getStatusColor(departure.status)}`}>
          {getStatusLabel(departure.status)}
        </span>
      </div>
    </div>
  );
};

export default DepartureItem;
