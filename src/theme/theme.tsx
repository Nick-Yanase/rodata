import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, useColorScheme, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { darkColors, lightColors, type Palette } from './tokens';

export type Scheme = 'light' | 'dark';
/** preferência da pessoa: seguir o celular, ou forçar claro/escuro */
export type ThemePreference = 'system' | Scheme;

type ThemeValue = {
  scheme: Scheme;
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
};

const PREF_KEY = 'rodata-theme';
const palettes: Record<Scheme, Palette> = { light: lightColors, dark: darkColors };

const ThemeContext = createContext<ThemeValue>({
  scheme: 'light',
  colors: lightColors,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v);
      })
      .catch(() => {});
  }, []);

  const scheme: Scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo<ThemeValue>(
    () => ({
      scheme,
      colors: palettes[scheme],
      preference,
      setPreference: (p) => {
        setPref(p);
        AsyncStorage.setItem(PREF_KEY, p).catch(() => {});
      },
    }),
    [scheme, preference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Estilos que dependem das cores. Uso:
 *   const useStyles = makeStyles((colors) => ({ card: { backgroundColor: colors.surface } }));
 *   function Card() { const styles = useStyles(); ... }
 * Cada paleta gera o StyleSheet uma única vez.
 */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T>>(factory: (colors: Palette) => T & NamedStyles<T>) {
  const cache: Partial<Record<Scheme, T>> = {};
  return function useStyles(): T {
    const { scheme, colors } = useTheme();
    return (cache[scheme] ??= StyleSheet.create(factory(colors)));
  };
}
