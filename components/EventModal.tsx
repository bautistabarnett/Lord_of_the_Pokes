
import React from 'react';
import { ExplorationEvent, EventType } from '../types';
import { BaseModal } from './BaseModal';

interface EventModalProps {
  event: ExplorationEvent;
  onClose: () => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose }) => {
  
  let borderColor = 'border-stone-500';
  let titleColor = 'text-stone-300';
  let bgGlow = 'from-stone-900/50';

  switch(event.type) {
    case EventType.SHRINE:
      borderColor = 'border-blue-500';
      titleColor = 'text-blue-400';
      bgGlow = 'from-blue-900/20';
      break;
    case EventType.TREASURE:
      borderColor = 'border-amber-500';
      titleColor = 'text-amber-400';
      bgGlow = 'from-amber-900/20';
      break;
    case EventType.TRAP:
      borderColor = 'border-red-600';
      titleColor = 'text-red-500';
      bgGlow = 'from-red-900/20';
      break;
    case EventType.ENCOUNTER:
      borderColor = 'border-purple-500';
      titleColor = 'text-purple-400';
      bgGlow = 'from-purple-900/20';
      break;
  }

  return (
    <BaseModal.Container zIndex="z-[95]" maxWidth="max-w-md" className={borderColor}>
        <div className={`absolute top-0 left-0 w-full h-full bg-gradient-to-b ${bgGlow} to-transparent pointer-events-none`}></div>
        
        <BaseModal.Body className="flex flex-col items-center pt-3 pb-2 lg:pt-8 lg:pb-4">
            <div className="text-4xl lg:text-6xl mb-2 lg:mb-4 filter drop-shadow-lg animate-bounce">{event.icon}</div>
            
            <h2 className={`text-lg lg:text-2xl diablo-font ${titleColor} mb-1.5 lg:mb-2 tracking-widest text-center`}>
                {event.title}
            </h2>
            
            <div className="w-16 h-0.5 bg-stone-700 mb-2 lg:mb-4"></div>

            <p className="text-center text-stone-300 text-xs lg:text-base mb-3 lg:mb-6 italic leading-relaxed">
              {event.description}
            </p>
            
            <div className="bg-black/40 border border-stone-800 p-2 lg:p-3 rounded w-full text-center mb-1 lg:mb-2">
              <span className="text-[10px] lg:text-xs text-stone-500 uppercase tracking-widest">Effect Applied</span>
              <div className="text-stone-200 text-xs lg:text-base font-bold mt-0.5 lg:mt-1">
                {event.type === EventType.SHRINE && "Stats Increased (Temporary)"}
                {event.type === EventType.TRAP && "Damage Taken / Stats Reduced"}
                {event.type === EventType.TREASURE && "Loot Discovered"}
                {event.type === EventType.ENCOUNTER && "Knowledge Gained"}
              </div>
            </div>
        </BaseModal.Body>

        <BaseModal.Footer className="bg-transparent border-none pt-1 pb-2.5 lg:p-4">
            <button 
              onClick={onClose}
              className={`w-full py-2 lg:py-3 bg-stone-800 hover:bg-stone-700 border ${borderColor} text-white text-xs lg:text-base font-bold tracking-widest uppercase transition-all shadow-lg`}
            >
              Continue
            </button>
        </BaseModal.Footer>
    </BaseModal.Container>
  );
};

export default React.memo(EventModal);
