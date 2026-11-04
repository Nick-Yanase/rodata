import * as Crypto from 'expo-crypto';

/** ID gerado no aparelho: permite criar registros sem internet (RF-17). */
export function newId(): string {
  return Crypto.randomUUID();
}
