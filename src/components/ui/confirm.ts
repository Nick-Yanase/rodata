import { Alert, Platform } from 'react-native';

/** Pergunta de confirmação que funciona no celular e na web (RNF-07). */
export function confirm(title: string, message: string, confirmLabel = 'Sim'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
