import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  type: 'replay' | 'newGame';
  focus: 'confirm' | 'cancel';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type,
  focus,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200">
        <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-600 max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
                {type === 'replay' ? 'Replay Game?' : 'Start New Game?'}
            </h2>
            <p className="text-slate-400 mb-6">
                {type === 'replay'
                    ? 'Are you sure you want to restart this board? Current progress will be lost.'
                    : 'Are you sure you want to generate a new board? Current progress will be lost.'}
            </p>
            <div className="flex gap-4 justify-center">
                <button
                    id="confirmation-modal-confirm"
                    name="confirmation-modal-confirm"
                    onClick={onConfirm}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${focus === 'confirm' ? 'bg-blue-600 ring-2 ring-blue-400 scale-105' : 'bg-slate-700 text-slate-300'}`}
                >
                    Confirm
                </button>
                <button
                    id="confirmation-modal-cancel"
                    name="confirmation-modal-cancel"
                    onClick={onCancel}
                    className={`px-6 py-2 rounded-lg font-bold transition-all ${focus === 'cancel' ? 'bg-slate-600 ring-2 ring-slate-400 scale-105' : 'bg-slate-700 text-slate-300'}`}
                >
                    Cancel
                </button>
            </div>
            <p className="text-xs text-slate-500 mt-4">
                Use <span className="font-mono bg-slate-700 px-1 rounded">Tab</span> to select, <span className="font-mono bg-slate-700 px-1 rounded">Space</span> to confirm
            </p>
        </div>
    </div>
  );
};
