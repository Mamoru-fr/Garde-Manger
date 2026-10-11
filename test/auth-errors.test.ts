import { describe, it, expect } from 'vitest';
import { getAuthErrorMessage } from '../lib/utils/auth-errors';

// Test TDD — écrit AVANT l'implémentation de lib/utils/auth-errors.ts
// Codes et statuts documentés par Better-Auth :
// - 401 INVALID_EMAIL_OR_PASSWORD (identifiants incorrects)
// - 403 (email non vérifié)
// - USER_EXISTS / USER_ALREADY_EXISTS (inscription avec un email déjà pris)

describe('getAuthErrorMessage', () => {
  it('traduit un mauvais couple email/mot de passe (401 + code documenté)', () => {
    expect(
      getAuthErrorMessage({ status: 401, code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' })
    ).toBe('Email ou mot de passe incorrect.');
  });

  it('traduit un email non vérifié (403)', () => {
    expect(getAuthErrorMessage({ status: 403 })).toContain("n'est pas encore vérifiée");
  });

  it("traduit un compte déjà existant (code USER_EXISTS)", () => {
    expect(getAuthErrorMessage({ status: 409, code: 'USER_EXISTS' })).toBe(
      'Un compte existe déjà avec cet email.'
    );
  });

  it("traduit un compte déjà existant (code USER_ALREADY_EXISTS, sans statut)", () => {
    expect(getAuthErrorMessage({ code: 'USER_ALREADY_EXISTS' })).toBe(
      'Un compte existe déjà avec cet email.'
    );
  });

  it('retombe sur le message serveur quand le code est inconnu', () => {
    expect(getAuthErrorMessage({ status: 500, message: 'Something broke' })).toBe('Something broke');
  });

  it('retombe sur un message générique sans aucune information', () => {
    expect(getAuthErrorMessage({})).toBe('Une erreur est survenue. Réessaie dans un instant.');
  });

  it('ignore un message serveur vide ou blanc (fallback générique)', () => {
    expect(getAuthErrorMessage({ status: 500, message: '   ' })).toBe(
      'Une erreur est survenue. Réessaie dans un instant.'
    );
  });
});
