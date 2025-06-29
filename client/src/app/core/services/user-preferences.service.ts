import { Injectable, signal } from '@angular/core';

export interface UserPreferences {
  'recent-activities-sidebar': boolean;
  'table-of-contents-sidebar': boolean;
  'show-course-images': boolean;
}

export type PreferenceKey = keyof UserPreferences;

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_PREFIX = 'mooodle-user-pref-';
  
  private readonly defaultPreferences: UserPreferences = {
    'recent-activities-sidebar': true,
    'table-of-contents-sidebar': true,
    'show-course-images': true
  };

  private isLocalStorageAvailable(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private getStorageKey(key: PreferenceKey): string {
    return this.STORAGE_PREFIX + key;
  }

  getPreference<K extends PreferenceKey>(key: K): UserPreferences[K] {
    if (!this.isLocalStorageAvailable()) {
      return this.defaultPreferences[key];
    }

    const storageKey = this.getStorageKey(key);
    const storedValue = localStorage.getItem(storageKey);
    
    if (storedValue === null) {
      console.log(`📥 Using default preference: ${key} = ${this.defaultPreferences[key]}`);
      return this.defaultPreferences[key];
    }

    try {
      const value = JSON.parse(storedValue);
      console.log(`📥 Loaded preference: ${key} = ${value}`);
      return value;
    } catch {
      return this.defaultPreferences[key];
    }
  }

  setPreference<K extends PreferenceKey>(key: K, value: UserPreferences[K]): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    const storageKey = this.getStorageKey(key);
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      console.log(`🔧 Preference saved: ${key} = ${value}`);
    } catch (error) {
      console.warn('Failed to save preference to localStorage:', error);
    }
  }

  createPreferenceSignal<K extends PreferenceKey>(key: K) {
    const preferenceSignal = signal<UserPreferences[K]>(this.getPreference(key));
    
    return {
      signal: preferenceSignal.asReadonly(),
      set: (value: UserPreferences[K]) => {
        preferenceSignal.set(value);
        this.setPreference(key, value);
      },
      update: (updateFn: (current: UserPreferences[K]) => UserPreferences[K]) => {
        const newValue = updateFn(preferenceSignal());
        preferenceSignal.set(newValue);
        this.setPreference(key, newValue);
      }
    };
  }

  getAllPreferences(): UserPreferences {
    return {
      'recent-activities-sidebar': this.getPreference('recent-activities-sidebar'),
      'table-of-contents-sidebar': this.getPreference('table-of-contents-sidebar'),
      'show-course-images': this.getPreference('show-course-images')
    };
  }

  resetPreferences(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    Object.keys(this.defaultPreferences).forEach(key => {
      const storageKey = this.getStorageKey(key as PreferenceKey);
      localStorage.removeItem(storageKey);
    });
  }
}