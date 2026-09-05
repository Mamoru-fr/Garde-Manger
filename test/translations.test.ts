import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

describe('Translations', () => {
    describe('Structure validation', () => {
        it('should have the same top-level keys in both languages', () => {
            const enKeys = Object.keys(en).sort();
            const frKeys = Object.keys(fr).sort();
            
            expect(enKeys).toEqual(frKeys);
        });

        it('should have Authentication section in both languages', () => {
            expect(en.Authentication).toBeDefined();
            expect(fr.Authentication).toBeDefined();
        });

        it('should have errors section in both languages', () => {
            expect(en.errors).toBeDefined();
            expect(fr.errors).toBeDefined();
        });
    });

    describe('Authentication translations', () => {
        const authKeys = [
            'Title',
            'NamePlaceholder',
            'NameWarning',
            'EmailPlaceholder',
            'PasswordPlaceholder',
            'ConfirmPasswordPlaceholder',
            'LoginViewButton',
            'RegisterViewButton'
        ];

        authKeys.forEach(key => {
            it(`should have ${key} in both languages`, () => {
                expect(en.Authentication[key as keyof typeof en.Authentication]).toBeDefined();
                expect(fr.Authentication[key as keyof typeof fr.Authentication]).toBeDefined();
                expect(en.Authentication[key as keyof typeof en.Authentication]).not.toBe('');
                expect(fr.Authentication[key as keyof typeof fr.Authentication]).not.toBe('');
            });
        });

        it('should have Login.LoginButton in both languages', () => {
            expect(en.Authentication.Login.LoginButton).toBeDefined();
            expect(fr.Authentication.Login.LoginButton).toBeDefined();
            expect(en.Authentication.Login.LoginButton).not.toBe('');
            expect(fr.Authentication.Login.LoginButton).not.toBe('');
        });

        it('should have Register.RegisterButton in both languages', () => {
            expect(en.Authentication.Register.RegisterButton).toBeDefined();
            expect(fr.Authentication.Register.RegisterButton).toBeDefined();
            expect(en.Authentication.Register.RegisterButton).not.toBe('');
            expect(fr.Authentication.Register.RegisterButton).not.toBe('');
        });
    });

    describe('Error message translations', () => {
        const betterAuthErrorKeys = [
            'Session required',
            'Invalid credentials',
            'Failed to create user',
            'Email already in use',
            'Weak password',
            'Account banned',
            'Too many attempts',
            'Internal server error'
        ];

        const customErrorKeys = [
            'emailPasswordRequired',
            'allFieldsRequired',
            'passwordMismatch'
        ];

        betterAuthErrorKeys.forEach(key => {
            it(`should have errors["${key}"] in both languages`, () => {
                expect(en.errors[key as keyof typeof en.errors]).toBeDefined();
                expect(fr.errors[key as keyof typeof fr.errors]).toBeDefined();
                expect(en.errors[key as keyof typeof en.errors]).not.toBe('');
                expect(fr.errors[key as keyof typeof fr.errors]).not.toBe('');
            });
        });

        customErrorKeys.forEach(key => {
            it(`should have errors.${key} in both languages`, () => {
                expect(en.errors[key as keyof typeof en.errors]).toBeDefined();
                expect(fr.errors[key as keyof typeof fr.errors]).toBeDefined();
                expect(en.errors[key as keyof typeof en.errors]).not.toBe('');
                expect(fr.errors[key as keyof typeof fr.errors]).not.toBe('');
            });
        });

        it('should have same number of error messages in both languages', () => {
            expect(Object.keys(en.errors).length).toBe(Object.keys(fr.errors).length);
        });

        it('should have all better-auth error messages', () => {
            const requiredErrors = [
                'Session required',
                'Unauthorized',
                'Invalid credentials',
                'Account not found',
                'Session expired',
                'Failed to create user',
                'Email already in use',
                'Invalid email',
                'Weak password',
                'Account banned'
            ];

            requiredErrors.forEach(errorKey => {
                expect(en.errors[errorKey as keyof typeof en.errors]).toBeDefined();
                expect(fr.errors[errorKey as keyof typeof fr.errors]).toBeDefined();
            });
        });
    });

    describe('Translation content validation', () => {
        it('should have different translations for EN and FR', () => {
            // Title should be different
            expect(en.Authentication.Title).not.toBe(fr.Authentication.Title);
            
            // Login button should be different
            expect(en.Authentication.Login.LoginButton).not.toBe(fr.Authentication.Login.LoginButton);
            
            // Errors should be different
            expect(en.errors['Invalid credentials']).not.toBe(fr.errors['Invalid credentials']);
        });

        it('should not have placeholder text in translations', () => {
            const checkForPlaceholders = (obj: any, path = ''): void => {
                for (const [key, value] of Object.entries(obj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    
                    if (typeof value === 'string') {
                        expect(value).not.toContain('TODO');
                        expect(value).not.toContain('PLACEHOLDER');
                        expect(value).not.toContain('XXX');
                    } else if (typeof value === 'object' && value !== null) {
                        checkForPlaceholders(value, currentPath);
                    }
                }
            };

            checkForPlaceholders(en);
            checkForPlaceholders(fr);
        });

        it('should have proper capitalization for titles', () => {
            expect(en.Authentication.Title[0]).toMatch(/[A-Z]/);
            expect(fr.Authentication.Title[0]).toMatch(/[A-Z]/);
        });
    });

    describe('Missing translation detection', () => {
        it('should not have missing keys in English', () => {
            const getAllKeys = (obj: any, prefix = ''): string[] => {
                let keys: string[] = [];
                for (const [key, value] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        keys = keys.concat(getAllKeys(value, fullKey));
                    } else {
                        keys.push(fullKey);
                    }
                }
                return keys;
            };

            const enKeys = getAllKeys(en);
            const frKeys = getAllKeys(fr);

            enKeys.forEach(key => {
                expect(frKeys).toContain(key);
            });
        });

        it('should not have missing keys in French', () => {
            const getAllKeys = (obj: any, prefix = ''): string[] => {
                let keys: string[] = [];
                for (const [key, value] of Object.entries(obj)) {
                    const fullKey = prefix ? `${prefix}.${key}` : key;
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        keys = keys.concat(getAllKeys(value, fullKey));
                    } else {
                        keys.push(fullKey);
                    }
                }
                return keys;
            };

            const enKeys = getAllKeys(en);
            const frKeys = getAllKeys(fr);

            frKeys.forEach(key => {
                expect(enKeys).toContain(key);
            });
        });
    });

    describe('Used translations in app', () => {
        // These are the actual keys used in the connections page
        const usedKeys = [
            'Authentication.Title',
            'Authentication.EmailPlaceholder',
            'Authentication.PasswordPlaceholder',
            'Authentication.Login.LoginButton',
            'Authentication.NamePlaceholder',
            'Authentication.NameWarning',
            'Authentication.ConfirmPasswordPlaceholder',
            'Authentication.Register.RegisterButton',
            'Authentication.LoginViewButton',
            'Authentication.RegisterViewButton'
        ];

        const usedErrorKeys = [
            'emailPasswordRequired',
            'allFieldsRequired',
            'passwordMismatch'
        ];

        usedKeys.forEach(keyPath => {
            it(`should have ${keyPath} available in EN`, () => {
                const value = keyPath.split('.').reduce((obj, key) => obj[key], en as any);
                expect(value).toBeDefined();
                expect(value).not.toBe('');
            });

            it(`should have ${keyPath} available in FR`, () => {
                const value = keyPath.split('.').reduce((obj, key) => obj[key], fr as any);
                expect(value).toBeDefined();
                expect(value).not.toBe('');
            });
        });

        usedErrorKeys.forEach(errorKey => {
            it(`should have errors.${errorKey} available in EN`, () => {
                expect(en.errors[errorKey as keyof typeof en.errors]).toBeDefined();
                expect(en.errors[errorKey as keyof typeof en.errors]).not.toBe('');
            });

            it(`should have errors.${errorKey} available in FR`, () => {
                expect(fr.errors[errorKey as keyof typeof fr.errors]).toBeDefined();
                expect(fr.errors[errorKey as keyof typeof fr.errors]).not.toBe('');
            });
        });
    });

    describe('Special characters and formatting', () => {
        it('should not have leading/trailing spaces', () => {
            const checkSpaces = (obj: any): void => {
                for (const value of Object.values(obj)) {
                    if (typeof value === 'string') {
                        expect(value).toBe(value.trim());
                    } else if (typeof value === 'object' && value !== null) {
                        checkSpaces(value);
                    }
                }
            };

            checkSpaces(en);
            checkSpaces(fr);
        });

        it('should use proper French characters in FR translations', () => {
            // French should use proper accents
            const frString = JSON.stringify(fr);
            
            // Check for common French words that should have accents
            if (frString.includes('a ')) {
                // This is a simplified check - ideally you'd validate specific words
                expect(frString).toMatch(/[àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ]/);
            }
        });
    });
});
