import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { LineChart } from 'react-native-gifted-charts';

import { fromISODate, type Grain } from '@/domain/dates';
import { formatBRL, formatBRLCompact } from '@/domain/money';
import { swipeLock } from '@/lib/swipeLock';
import type { TimelinePoint } from '@/features/dashboard/api';
import { radius } from '@/theme/tokens';

import { AppText } from './ui';
import { makeStyles, useTheme } from '@/theme/theme';

/** Métricas que o gráfico sabe desenhar. */
export type ChartMetric = 'revenue' | 'net' | 'cost';

type MetricDef = {
  /** "receita total" — usado em "Sua receita total" */
  label: string;
  /** artigo para o título: "Sua" receita / "Seus" custos */
  article: 'Sua' | 'Seus';
  colorKey: 'chartRevenue' | 'chartNet' | 'chartCost';
  value: (p: TimelinePoint) => number;
};

export const METRICS: Record<ChartMetric, MetricDef> = {
  revenue: { label: 'receita total', article: 'Sua', colorKey: 'chartRevenue', value: (p) => p.revenue },
  net: { label: 'receita faturada', article: 'Sua', colorKey: 'chartNet', value: (p) => p.revenue - p.cost },
  cost: { label: 'custos', article: 'Seus', colorKey: 'chartCost', value: (p) => p.cost },
};

export const METRIC_ORDER: ChartMetric[] = ['revenue', 'net', 'cost'];

function capitalizeLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const HEIGHT = 200;
const SECTIONS = 4;
const Y_AXIS_WIDTH = 64;

/** Só a primeira letra maiúscula ("Junho de 2026", não "Junho De 2026"). */
function capitalizeFirst(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function shortLabel(bucket: string, grain: Grain) {
  const d = fromISODate(bucket);
  if (grain === 'month') return capitalizeFirst(format(d, 'MMM', { locale: ptBR }));
  return format(d, 'dd/MM');
}

function longLabel(bucket: string, grain: Grain) {
  const d = fromISODate(bucket);
  if (grain === 'month') return capitalizeFirst(format(d, "MMMM 'de' yyyy", { locale: ptBR }));
  if (grain === 'week') return `Semana de ${format(d, 'dd/MM')}`;
  return capitalizeFirst(format(d, 'EEEE, dd/MM', { locale: ptBR }));
}

/** Escala "redonda" para o eixo Y (em reais), cobrindo o maior valor. */
function niceStep(maxReais: number) {
  if (maxReais <= 0) return 1;
  const raw = maxReais / SECTIONS;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const nice = [1, 2, 2.5, 5, 10].find((m) => m * pow >= raw) ?? 10;
  return nice * pow;
}

/** Linha do tempo (RF-43) com tooltip ao passar o mouse ou arrastar o dedo. */
export function TimelineChart({
  points,
  grain,
  metrics,
}: {
  points: TimelinePoint[];
  grain: Grain;
  /** as duas séries comparadas, ex.: ['revenue', 'cost'] */
  metrics: [ChartMetric, ChartMetric];
}) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const [s1, s2] = metrics.map((m) => {
    const d = METRICS[m];
    return { label: capitalizeLabel(d.label), color: colors[d.colorKey], value: d.value };
  });
  const n = points.length;
  const chartWidth = Math.max(0, width - Y_AXIS_WIDTH - 16);
  const spacing = n > 1 ? Math.max(8, chartWidth / (n - 1)) : chartWidth;
  // mostra no máximo ~6 rótulos no eixo X para não embolar
  const every = Math.max(1, Math.ceil(n / 6));

  const v1 = points.map((p) => s1.value(p) / 100);
  const v2 = points.map((p) => s2.value(p) / 100);
  const step = niceStep(Math.max(0, ...v1, ...v2));
  const min = Math.min(0, ...v1, ...v2);
  // receita faturada pode ficar negativa (gastos maiores que o frete): abre seções abaixo do zero
  const sectionsBelow = min < 0 ? Math.ceil(-min / step) : 0;
  const plotHeight = HEIGHT + sectionsBelow * (HEIGHT / SECTIONS);

  const xLabels = points
    .map((p, i) => ({ i, text: shortLabel(p.bucket, grain) }))
    .filter(({ i }) => i % every === 0);

  /** x (relativo à área do gráfico) → índice do ponto mais próximo */
  function pickAt(x: number) {
    if (n === 0) return;
    const i = Math.round(x / (spacing || 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  // Arrastar o dedo no gráfico mostra os valores. É um gesto do gesture-handler, o mesmo
  // sistema da troca de aba: como ele ativa já nos primeiros pixels na horizontal, a troca
  // de aba (que só ativa após 30 px) não começa enquanto o dedo está no gráfico.
  // Movimento vertical cancela o gesto e a página rola normalmente.
  const scrub = usePanGesture({
    // web: o navegador continua rolando a página na vertical sobre o gráfico.
    // @ts-expect-error a v3 do gesture-handler lê touchAction da config, mas não o expõe nos tipos
    touchAction: 'pan-y',
    runOnJS: true,
    activeOffsetX: [-4, 4],
    failOffsetY: [-12, 12],
    onBegin: (e) => pickAt(e.x),
    onActivate: (e) => {
      swipeLock.on();
      pickAt(e.x);
    },
    onUpdate: (e) => pickAt(e.x),
    onFinalize: () => {
      swipeLock.off();
      setActive(null);
    },
  });

  const total1 = points.reduce((a, p) => a + s1.value(p), 0);
  const total2 = points.reduce((a, p) => a + s2.value(p), 0);
  const activePoint = active !== null ? points[active] : null;
  const tooltipLeft = active !== null ? Math.min(Math.max(active * spacing - 90, 0), Math.max(0, chartWidth - 180)) : 0;

  return (
    <View
      onLayout={onLayout}
      style={styles.wrap}
      accessible
      accessibilityLabel={`Gráfico: ${s1.label} de ${formatBRL(total1)} e ${s2.label} de ${formatBRL(total2)} no período`}>
      <View style={styles.legend}>
        <LegendItem color={s1.color} text={s1.label} />
        <LegendItem color={s2.color} text={s2.label} />
      </View>
      {width > 0 && n > 0 ? (
        <View>
          <LineChart
            key={metrics.join('-')}
            data={v1.map((value) => ({ value }))}
            data2={v2.map((value) => ({ value }))}
            areaChart
            height={HEIGHT}
            width={chartWidth}
            spacing={spacing}
            initialSpacing={0}
            endSpacing={0}
            adjustToWidth
            maxValue={step * SECTIONS}
            stepValue={step}
            noOfSections={SECTIONS}
            noOfSectionsBelowXAxis={sectionsBelow}
            mostNegativeValue={sectionsBelow ? -sectionsBelow * step : undefined}
            color1={s1.color}
            color2={s2.color}
            startFillColor1={s1.color}
            startFillColor2={s2.color}
            endFillColor1={colors.surface}
            endFillColor2={colors.surface}
            startOpacity={0.25}
            endOpacity={0.02}
            thickness={3}
            hideDataPoints={n > 16}
            dataPointsColor1={s1.color}
            dataPointsColor2={s2.color}
            yAxisLabelWidth={Y_AXIS_WIDTH}
            formatYLabel={(v) => formatBRLCompact(Math.round(Number(v) * 100))}
            yAxisTextStyle={styles.axis}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            rulesColor={colors.track}
            disableScroll
            xAxisLabelsHeight={0}
            isAnimated
            animationDuration={500}
          />
          {/* Camada que captura mouse/dedo sobre a área do gráfico */}
          <GestureDetector gesture={scrub}>
            <View
              style={[styles.touch, { left: Y_AXIS_WIDTH, width: chartWidth, height: plotHeight }]}
              // no computador, basta passar o mouse
              onPointerMove={(e) => (e.nativeEvent.pointerType === 'mouse' ? pickAt(e.nativeEvent.offsetX) : undefined)}
              onPointerLeave={() => setActive(null)}>
              {activePoint ? (
                <>
                  <View style={[styles.cursor, { left: active! * spacing }]} pointerEvents="none" />
                  <View style={[styles.tooltip, { left: tooltipLeft }]} pointerEvents="none">
                    <AppText variant="caption" weight="700">
                      {longLabel(activePoint.bucket, grain)}
                    </AppText>
                    {[s1, s2].map((s) => (
                      <View key={s.label} style={styles.tooltipRow}>
                        <View style={[styles.dotSmall, { backgroundColor: s.color }]} />
                        <AppText variant="caption" style={{ flex: 1 }}>
                          {s.label}
                        </AppText>
                        <AppText variant="caption" weight="700" color={s.value(activePoint) < 0 ? colors.negative : colors.text}>
                          {formatBRL(s.value(activePoint))}
                        </AppText>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}
            </View>
          </GestureDetector>
        </View>
      ) : null}
      {width > 0 && n > 0 ? (
        <View style={styles.xLabels} accessible={false}>
          {xLabels.map(({ i, text }) => (
            <AppText
              key={i}
              variant="caption"
              color={colors.textMuted}
              style={[styles.xLabel, { left: Y_AXIS_WIDTH + i * spacing - 26 }]}>
              {text}
            </AppText>
          ))}
        </View>
      ) : null}
      <AppText variant="caption" color={colors.textMuted}>
        Toque e arraste no gráfico para ver os valores.
      </AppText>
    </View>
  );
}

function LegendItem({ color, text }: { color: string; text: string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="small">{text}</AppText>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { width: '100%', gap: 12 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotSmall: { width: 10, height: 10, borderRadius: 5 },
  axis: { color: colors.textMuted, fontSize: 12 },
  xLabels: { height: 20, marginTop: -8 },
  xLabel: { position: 'absolute', width: 52, textAlign: 'center', fontSize: 12 },
  touch: { position: 'absolute', top: 0 },
  cursor: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: colors.textSubtle },
  tooltip: {
    position: 'absolute',
    top: 0,
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 8,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
}));
