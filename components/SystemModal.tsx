
import React from 'react';
import { BaseModal } from './BaseModal';

interface SystemModalProps {
  currentSlotId: number;
  onSave: () => void;
  onQuit: () => void;
  onOpenBalance: () => void;
  onClose: () => void;
}

const SystemModal: React.FC<SystemModalProps> = ({ currentSlotId, onSave, onQuit, onOpenBalance, onClose }) => {
  const [justSaved, setJustSaved] = React.useState(false);

  const handleSave = () => {
      onSave();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <BaseModal.Container zIndex="z-[100]" maxWidth="max-w-sm" className="border-stone-500">
        <BaseModal.Header 
            title="System" 
            icon="⚙️" 
            onClose={onClose} 
        />
        <BaseModal.Body className="flex flex-col gap-4 bg-stone-950">
            <div className="text-center text-stone-400 mb-2">
                Playing on Save Slot <span className="text-amber-500 font-bold">{currentSlotId}</span>
            </div>

            <button 
                onClick={handleSave}
                className="w-full py-3 bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-200 font-bold uppercase tracking-widest shadow-lg flex justify-center items-center gap-2"
            >
                {justSaved ? (
                    <span className="text-green-400 animate-pulse">✓ Saved!</span>
                ) : (
                    "Save Game"
                )}
            </button>

            <button 
                onClick={() => { onSave(); onQuit(); }}
                className="w-full py-3 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold uppercase tracking-widest"
            >
                Save & Quit
            </button>
            
            <button 
                onClick={() => { onClose(); onOpenBalance(); }}
                className="w-full py-2 bg-[#0c0a09] border border-cyan-900/50 text-cyan-600 hover:text-cyan-400 hover:border-cyan-500 text-xs font-bold uppercase tracking-widest mt-2"
            >
                Balance & Debug Tool
            </button>

            <div className="h-px bg-stone-800 w-full my-1"></div>

            <button 
                onClick={onQuit}
                className="w-full py-3 border border-red-900/50 text-red-900 hover:text-red-500 hover:border-red-500 hover:bg-red-950/20 font-bold uppercase tracking-widest"
            >
                Quit (Unsaved)
            </button>
        </BaseModal.Body>
    </BaseModal.Container>
  );
};

export default React.memo(SystemModal);
