import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Unit system types
export type UnitSystem = 'imperial' | 'metric';

interface UnitSettingsContextType {
  unitSystem: UnitSystem;
  setUnitSystem: (system: UnitSystem) => void;
  // Convenience helpers
  volumeUnit: 'gal' | 'L';
  tempUnit: '°F' | '°C';
  lengthUnit: '"' | 'cm';
  // Conversion helpers
  convertVolume: (gallons: number) => number;
  convertTemp: (fahrenheit: number) => number;
  convertLength: (inches: number) => number;
  formatVolume: (gallons: number, withUnit?: boolean) => string;
  formatTemp: (fahrenheit: number, withUnit?: boolean) => string;
  formatLength: (inches: number, withUnit?: boolean) => string;
}

const UnitSettingsContext = createContext<UnitSettingsContextType | undefined>(undefined);

const STORAGE_KEY = '@tankguardian_unit_system';

// Conversion constants
const GALLONS_TO_LITERS = 3.78541;
const INCHES_TO_CM = 2.54;

function fahrenheitToCelsius(f: number): number {
  return (f - 32) * 5 / 9;
}

export function UnitSettingsProvider({ children }: { children: ReactNode }) {
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>('imperial');

  // Load saved preference on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value === 'metric' || value === 'imperial') {
        setUnitSystemState(value);
      }
    }).catch(() => {
      // Default to imperial if storage fails
    });
  }, []);

  const setUnitSystem = (system: UnitSystem) => {
    setUnitSystemState(system);
    AsyncStorage.setItem(STORAGE_KEY, system).catch(() => {
      // Ignore storage errors
    });
  };

  // Derived units based on system
  const volumeUnit = unitSystem === 'imperial' ? 'gal' : 'L';
  const tempUnit = unitSystem === 'imperial' ? '°F' : '°C';
  const lengthUnit = unitSystem === 'imperial' ? '"' : 'cm';

  // Conversion functions
  const convertVolume = (gallons: number): number => {
    if (unitSystem === 'metric') {
      return Math.round(gallons * GALLONS_TO_LITERS * 10) / 10;
    }
    return gallons;
  };

  const convertTemp = (fahrenheit: number): number => {
    if (unitSystem === 'metric') {
      return Math.round(fahrenheitToCelsius(fahrenheit));
    }
    return fahrenheit;
  };

  const convertLength = (inches: number): number => {
    if (unitSystem === 'metric') {
      return Math.round(inches * INCHES_TO_CM * 10) / 10;
    }
    return inches;
  };

  // Format helpers with units
  const formatVolume = (gallons: number, withUnit = true): string => {
    const value = convertVolume(gallons);
    return withUnit ? `${value}${volumeUnit}` : `${value}`;
  };

  const formatTemp = (fahrenheit: number, withUnit = true): string => {
    const value = convertTemp(fahrenheit);
    return withUnit ? `${value}${tempUnit}` : `${value}`;
  };

  const formatLength = (inches: number, withUnit = true): string => {
    const value = convertLength(inches);
    return withUnit ? `${value}${lengthUnit}` : `${value}`;
  };

  return (
    <UnitSettingsContext.Provider
      value={{
        unitSystem,
        setUnitSystem,
        volumeUnit,
        tempUnit,
        lengthUnit,
        convertVolume,
        convertTemp,
        convertLength,
        formatVolume,
        formatTemp,
        formatLength,
      }}
    >
      {children}
    </UnitSettingsContext.Provider>
  );
}

export function useUnitSettings() {
  const context = useContext(UnitSettingsContext);
  if (context === undefined) {
    throw new Error('useUnitSettings must be used within a UnitSettingsProvider');
  }
  return context;
}
