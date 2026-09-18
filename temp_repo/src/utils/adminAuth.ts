/**
 * Upravljanje administratorskom lozinkom (PIN-om) za Savremeni Koreni
 * Podrazumevana fabrička lozinka je "Koreni2026", ali se može menjati
 * kroz Admin Panel i čuva se u bezbednom lokalnom skladištu.
 */

const ADMIN_PIN_STORAGE_KEY = 'koreni_admin_pin';
export const DEFAULT_ADMIN_PIN = 'Koreni2026';

export const getAdminPin = (): string => {
  try {
    const saved = localStorage.getItem(ADMIN_PIN_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch (err) {
    console.warn('Greška pri čitanju administratorske lozinke:', err);
  }
  return DEFAULT_ADMIN_PIN;
};

export const setAdminPin = (newPin: string): boolean => {
  try {
    if (!newPin || newPin.trim().length < 4) {
      return false;
    }
    localStorage.setItem(ADMIN_PIN_STORAGE_KEY, newPin.trim());
    window.dispatchEvent(new CustomEvent('admin-pin-changed'));
    return true;
  } catch (err) {
    console.warn('Greška pri čuvanju nove administratorske lozinke:', err);
    return false;
  }
};

export const verifyAdminPin = (inputPin: string): boolean => {
  const currentPin = getAdminPin();
  return inputPin.trim() === currentPin;
};

export const resetAdminPinToDefault = (): void => {
  try {
    localStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('admin-pin-changed'));
  } catch (err) {
    console.warn('Greška pri resetovanju lozinke:', err);
  }
};

export const isUsingDefaultPin = (): boolean => {
  return getAdminPin() === DEFAULT_ADMIN_PIN;
};
