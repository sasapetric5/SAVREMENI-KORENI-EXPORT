import React, { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, ShieldCheck, Check, AlertCircle, RefreshCw, X } from 'lucide-react';
import { getAdminPin, setAdminPin, verifyAdminPin, resetAdminPinToDefault, isUsingDefaultPin } from '../utils/adminAuth';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (message: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // 1. Provera trenutne lozinke
    if (!verifyAdminPin(currentPassword)) {
      setErrorMessage('Trenutna lozinka nije ispravna.');
      return;
    }

    // 2. Provera dužine nove lozinke
    if (newPassword.trim().length < 6) {
      setErrorMessage('Nova lozinka mora sadržati najmanje 6 karaktera.');
      return;
    }

    // 3. Provera poklapanja
    if (newPassword !== confirmPassword) {
      setErrorMessage('Nova lozinka i potvrda se ne poklapaju.');
      return;
    }

    // 4. Provera da li je ista
    if (newPassword.trim() === currentPassword.trim()) {
      setErrorMessage('Nova lozinka mora biti različita od trenutne.');
      return;
    }

    // Sačuvaj novu lozinku
    const saved = setAdminPin(newPassword.trim());
    if (saved) {
      showToast('✨ Administratorska lozinka je uspešno promenjena!');
      setSuccessMessage('Lozinka je uspešno ažurirana.');
      setTimeout(() => {
        handleClose();
      }, 1200);
    } else {
      setErrorMessage('Greška pri čuvanju lozinke.');
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Da li ste sigurni da želite da vratite lozinku na podrazumevanu fabričku vrednost?')) {
      resetAdminPinToDefault();
      showToast('Lozinka je vraćena na podrazumevanu vrednost.');
      handleClose();
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  };

  const isDefault = isUsingDefaultPin();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1C1613] border border-[#C2872A]/40 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col text-stone-200">
        
        {/* Header */}
        <div className="bg-[#241D19] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#C2872A]/20 border border-[#C2872A]/40 flex items-center justify-center text-[#E8D0A9]">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif text-[#E8D0A9]">Promena Lozinke</h2>
              <p className="text-xs text-stone-400">Sigurnost pristupa Admin panelu</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Status trenutne lozinke */}
          <div className="flex items-center justify-between bg-black/30 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <ShieldCheck className="w-4 h-4 text-[#C2872A]" />
              <span>Status zaštite:</span>
            </div>
            <span className={`font-medium px-2 py-0.5 rounded text-[11px] ${
              isDefault 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              {isDefault ? 'Podrazumevana lozinka' : 'Prilagođena lozinka'}
            </span>
          </div>

          {/* Trenutna lozinka */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
              Trenutna lozinka *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Unesite dosadašnju lozinku"
                className="w-full bg-[#121212] border border-stone-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nova lozinka */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
              Nova lozinka (min. 6 karaktera) *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#C2872A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Unesite novu lozinku"
                className="w-full bg-[#121212] border border-stone-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Potvrda nove lozinke */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-stone-300 mb-1.5 font-medium">
              Potvrda nove lozinke *
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-[#C2872A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ponovite novu lozinku"
                className="w-full bg-[#121212] border border-stone-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-stone-100 placeholder-stone-600 focus:border-[#C2872A] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 p-1 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Greška / Uspeh */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Dugmad */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {!isDefault && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[11px] text-stone-500 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
                title="Vrati na fabričku lozinku"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resetuj na fabričku</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-stone-300 text-xs rounded-xl font-medium transition-colors cursor-pointer"
              >
                Otkaži
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#C2872A] hover:bg-[#a87422] text-stone-950 text-xs font-semibold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer font-serif tracking-wide"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Sačuvaj Lozinku</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
