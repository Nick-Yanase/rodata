import { router, type Href } from 'expo-router';

/** Volta para a tela anterior; se a tela foi aberta direto por link, vai para `fallback`. */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
