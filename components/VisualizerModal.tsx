
import React, { useState } from 'react';
import GameIcon from './GameIcon';
import { Item } from '../types';
import { generateImage, editImage } from '../services/geminiService';
import { BaseModal } from './BaseModal';

interface VisualizerModalProps {
  target: Item | { name: string, type: string, imageUrl?: string, icon: string } | null;
  onSave: (imageUrl: string) => void;
  onClose: () => void;
}

const VisualizerModal: React.FC<VisualizerModalProps> = ({ target, onSave, onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!target) return null;

  const isHero = target.type === 'Hero';
  const hasExistingImage = !!(target.imageUrl || generatedImage);
  
  const placeholder = hasExistingImage 
    ? "Describe changes (e.g., 'Add retro filter')..."
    : "Describe item (e.g., 'Glowing sword')...";

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (hasExistingImage && prompt.trim().length > 0) {
          const source = generatedImage || target.imageUrl!;
          const result = await editImage(source, prompt);
          if (result) {
              setGeneratedImage(result);
              setPrompt('');
          } else {
              setError("The transformation failed.");
          }
      } else {
          const p = prompt || `A fantasy ${target.name}, ${target.type}, high quality, 8k`;
          const result = await generateImage(p);
          if (result) setGeneratedImage(result);
          else setError("The void yielded nothing.");
      }
    } catch (e) {
      setError("The void resisted your call.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseModal.Container zIndex="z-[100]" maxWidth="max-w-2xl" className="border-purple-500 shadow-[0_0_60px_rgba(168,85,247,0.3)]">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-900/20 blur-3xl rounded-full pointer-events-none"></div>

        <BaseModal.Header 
            title="Nano Banana Artificer" 
            subtitle={hasExistingImage ? "Modify Visual" : "Conjure Visual"} 
            icon="🔮" 
            onClose={onClose} 
            textColor="text-purple-400"
        />

        <BaseModal.Body>
             {/* Preview Area */}
            <div className="flex flex-col items-center justify-center gap-4 min-h-[200px] bg-black/40 rounded border border-stone-800 relative p-6 shrink-0 mb-6">
            {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-purple-400 font-mono text-sm animate-pulse">Weaving reality...</span>
                </div>
            ) : (
                <div className="relative group">
                    {generatedImage ? (
                        <img src={generatedImage} alt="Generated" className="w-48 h-48 object-cover rounded border-2 border-purple-500 shadow-lg" />
                    ) : (
                        <div className="w-48 h-48 flex items-center justify-center bg-stone-900 rounded border border-stone-700">
                            <GameIcon name={target.icon} imageUrl={target.imageUrl} className="w-32 h-32 text-stone-500" />
                        </div>
                    )}
                </div>
            )}
            <div className="text-stone-400 font-bold text-lg text-center">{target.name}</div>
            {error && <div className="text-red-500 text-xs font-mono text-center">{error}</div>}
            </div>

            {/* Controls */}
            <div className="flex flex-col gap-2 relative z-10 shrink-0">
                <label className="text-stone-500 text-xs uppercase font-bold">
                    {hasExistingImage ? "Visual Instructions (Edit)" : "Visual Description (Generate)"}
                </label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={placeholder}
                        className="flex-grow bg-stone-950 border border-stone-700 text-stone-300 p-3 rounded focus:border-purple-500 focus:outline-none font-mono text-base md:text-sm placeholder-stone-600"
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                </div>
                
                <div className="button-group md:flex md:flex-row md:gap-4 mt-2">
                    <button 
                        onClick={handleGenerate}
                        disabled={isLoading}
                        className={`flex-1 py-3 font-bold uppercase tracking-widest rounded transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed
                            ${hasExistingImage ? 'bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300' : 'bg-purple-900/50 hover:bg-purple-800 border border-purple-700 text-purple-200'}
                        `}
                    >
                        {hasExistingImage ? '✨ Apply Changes' : '⚡ Generate'}
                    </button>

                    {generatedImage && (
                        <button 
                            onClick={() => onSave(generatedImage)}
                            className="flex-1 bg-green-900/50 hover:bg-green-800 border border-green-700 text-green-200 py-3 font-bold uppercase tracking-widest rounded transition-all shadow-lg"
                        >
                            Accept Result
                        </button>
                    )}
                </div>
            </div>
        </BaseModal.Body>
    </BaseModal.Container>
  );
};

export default React.memo(VisualizerModal);
