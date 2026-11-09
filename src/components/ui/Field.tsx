import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, font, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

export type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
};

/** Rótulo sempre visível acima do campo + erro dizendo o que fazer (RNF-08). */
export function Field({ label, error, hint, optional, children }: FieldProps) {
  return (
    <View style={styles.field}>
      <AppText variant="label">
        {label}
        {optional ? <AppText variant="small" color={colors.textSubtle}> (opcional)</AppText> : null}
      </AppText>
      {children}
      {error ? (
        <AppText variant="small" color={colors.negative} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="small" color={colors.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  prefix?: string;
  right?: ReactNode;
  /**
   * Campo de uma linha que cresce para baixo quando o texto não cabe
   * (ex.: nome da viagem longo), em vez de esconder o começo do texto.
   */
  autoGrow?: boolean;
};

export function TextField({ label, error, hint, optional, prefix, right, style, autoGrow, ...input }: TextFieldProps) {
  const [height, setHeight] = useState<number>();
  const growProps = autoGrow
    ? {
        multiline: true,
        scrollEnabled: false,
        // Enter confirma em vez de quebrar linha
        submitBehavior: 'blurAndSubmit' as const,
        onChangeText: (t: string) => input.onChangeText?.(t.replace(/\n/g, ' ')),
        onContentSizeChange: (e: { nativeEvent: { contentSize: { height: number } } }) =>
          setHeight(Math.ceil(e.nativeEvent.contentSize.height)),
      }
    : {};
  return (
    <Field label={label} error={error} hint={hint} optional={optional}>
      <View style={[styles.box, error ? styles.boxError : null]}>
        {prefix ? (
          <AppText variant="label" color={colors.textMuted} style={styles.prefix}>
            {prefix}
          </AppText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.textSubtle}
          maxFontSizeMultiplier={1.6}
          {...input}
          {...growProps}
          style={[styles.input, autoGrow && styles.grow, autoGrow && height ? { height: Math.max(52, height + 4) } : null, style]}
        />
        {right}
      </View>
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
  },
  boxError: { borderColor: colors.negative, borderWidth: 2 },
  prefix: { marginRight: space.xs, fontSize: font.input },
  input: {
    flex: 1,
    fontSize: font.input,
    color: colors.text,
    paddingVertical: space.md,
    minHeight: 52,
  },
  grow: { textAlignVertical: 'center' },
});
