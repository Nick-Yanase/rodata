import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
// ScrollView do gesture-handler: o arrasto do carrossel não dispara a troca de aba
import { ScrollView } from 'react-native-gesture-handler';

import { useSession, type MyOrganization } from '@/features/auth/session';
import { swipeLock } from '@/lib/swipeLock';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './ui';

const GAP = 12;
/** quanto do card vizinho aparece, para mostrar que dá para deslizar */
const PEEK = 36;

type Props = {
  /** último card com "Criar organização / Entrar com código" */
  showAddCard?: boolean;
};

/**
 * Carrossel deslizante das organizações. O card no centro é a organização ativa:
 * deslizar (ou tocar num card) troca a organização da tela.
 */
export function OrgCarousel({ showAddCard = false }: Props) {
  const { organizations, activeOrg, setActiveOrgId } = useSession();
  const scroller = useRef<{ scrollTo: (o: { x: number; animated?: boolean }) => void } | null>(null);
  const [width, setWidth] = useState(0);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const count = organizations.length + (showAddCard ? 1 : 0);
  const cardWidth = count > 1 ? Math.max(200, width - PEEK) : width;
  const interval = cardWidth + GAP;
  const activeIndex = Math.max(0, organizations.findIndex((o) => o.id === activeOrg?.id));

  // posiciona no card da organização ativa (ao abrir e quando ela muda por fora)
  useEffect(() => {
    if (width > 0) scroller.current?.scrollTo({ x: activeIndex * interval, animated: false });
  }, [width, activeIndex, interval]);

  if (organizations.length === 0) return null;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    // decide quando a rolagem para (a web não avisa o fim do "momentum")
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      swipeLock.off();
      const i = Math.round(x / interval);
      const org = organizations[i];
      if (org && org.id !== activeOrg?.id) setActiveOrgId(org.id);
    }, 140);
  }

  function goTo(i: number) {
    scroller.current?.scrollTo({ x: i * interval, animated: true });
    const org = organizations[i];
    if (org) setActiveOrgId(org.id);
  }

  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      {width > 0 ? (
        <ScrollView
          ref={scroller as never}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={interval}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          contentContainerStyle={{ gap: GAP, paddingRight: count > 1 ? PEEK - GAP : 0 }}
          onScrollBeginDrag={swipeLock.on}
          onScroll={onScroll}
          scrollEventThrottle={32}
          accessibilityRole="adjustable"
          accessibilityLabel={`Organização: ${activeOrg?.name ?? ''}. Deslize para trocar.`}>
          {organizations.map((o, i) => (
            <OrgCard key={o.id} org={o} active={o.id === activeOrg?.id} width={cardWidth} onPress={() => goTo(i)} />
          ))}
          {showAddCard ? <AddCard width={cardWidth} /> : null}
        </ScrollView>
      ) : null}
      {count > 1 ? (
        <View style={styles.dots} accessible={false}>
          {Array.from({ length: count }, (_, i) => (
            <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function OrgCard({ org, active, width, onPress }: { org: MyOrganization; active: boolean; width: number; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${org.name}${active ? ', selecionada' : ''}`}
      onPress={onPress}
      style={[styles.card, { width }, active && styles.cardActive]}>
      <View style={[styles.icon, active && styles.iconActive]}>
        <Ionicons name="business" size={24} color={active ? '#FFFFFF' : colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">{org.name}</AppText>
        <AppText variant="small" color={colors.textMuted}>
          {org.role === 'owner' ? 'Você criou' : 'Você participa'}
        </AppText>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={26} color={colors.primaryStrong} /> : null}
    </Pressable>
  );
}

function AddCard({ width }: { width: number }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Criar organização ou entrar com código"
      onPress={() => router.push({ pathname: '/comecar', params: { nova: '1' } })}
      style={[styles.card, styles.addCard, { width }]}>
      <View style={styles.icon}>
        <Ionicons name="add" size={26} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="label">Criar ou entrar</AppText>
        <AppText variant="small" color={colors.textMuted}>
          Nova organização ou código de convite
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    minHeight: 76,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addCard: { borderStyle: 'dashed' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconActive: { backgroundColor: colors.primaryStrong },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 20, backgroundColor: colors.primaryStrong },
});
