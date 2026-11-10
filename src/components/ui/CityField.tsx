import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { parseCities, searchCities, type City } from '@/domain/cities';
import { radius, space, TOUCH } from '@/theme/tokens';

import { AppText } from './AppText';
import { TextField } from './Field';
import { makeStyles, useTheme } from '@/theme/theme';

// A lista (≈ 100 KB) só é carregada quando um campo de cidade aparece pela primeira vez.
let cache: City[] | null = null;
function useCities() {
  const [cities, setCities] = useState<City[] | null>(cache);
  useEffect(() => {
    if (cache) return;
    let alive = true;
    import('@/data/cities').then(({ CITIES_RAW }) => {
      cache = parseCities(CITIES_RAW);
      if (alive) setCities(cache);
    });
    return () => {
      alive = false;
    };
  }, []);
  return cities;
}

type Props = {
  label: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  optional?: boolean;
  hint?: string;
  editable?: boolean;
};

/**
 * Campo de cidade com sugestões dos municípios do IBGE, atualizadas a cada letra.
 * Aceita texto livre (ex.: "Porto de Santos") se a cidade não estiver na lista.
 */
export function CityField({ label, value, onChange, placeholder = 'Digite a cidade', optional, hint, editable = true }: Props) {
  const { colors } = useTheme();
  const styles = useStyles();
  const cities = useCities();
  const [focused, setFocused] = useState(false);
  const results = useMemo(() => (cities && focused ? searchCities(cities, value) : []), [cities, focused, value]);
  // já escolheu exatamente uma sugestão: não precisa mostrar a lista
  const exact = results.length > 0 && results[0].label === value;

  return (
    <View>
      <TextField
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        optional={optional}
        hint={hint}
        editable={editable}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="off"
        onFocus={() => setFocused(true)}
        // atraso para o toque na sugestão ser registrado antes de esconder a lista
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        right={
          value && editable ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Limpar ${label}`} onPress={() => onChange('')} style={styles.clear}>
              <Ionicons name="close-circle" size={22} color={colors.textSubtle} />
            </Pressable>
          ) : undefined
        }
      />
      {results.length > 0 && !exact ? (
        <View style={styles.list} accessibilityRole="list">
          {results.map((c, i) => (
            <Pressable
              key={c.label}
              accessibilityRole="button"
              accessibilityLabel={c.label}
              onPress={() => {
                onChange(c.label);
                setFocused(false);
              }}
              style={({ pressed }) => [styles.item, i > 0 && styles.itemBorder, pressed && styles.pressed]}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <AppText style={{ flex: 1 }}>
                {c.name} <AppText color={colors.textMuted}>- {c.uf}</AppText>
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  clear: { padding: space.sm },
  list: {
    marginTop: space.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: TOUCH, paddingHorizontal: space.md },
  itemBorder: { borderTopWidth: 1, borderTopColor: colors.track },
  pressed: { backgroundColor: colors.primarySoft },
}));
