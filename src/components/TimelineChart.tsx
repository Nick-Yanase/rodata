import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import { fromISODate, type Grain } from '@/domain/dates';
import { formatBRL, formatBRLCompact } from '@/domain/money';
import type { TimelinePoint } from '@/features/dashboard/api';
import { colors } from '@/theme/tokens';

import { AppText } from './ui';

function label(bucket: string, grain: Grain) {
  const d = fromISODate(bucket);
  if (grain === 'month') return format(d, 'MMM', { locale: ptBR });
  return format(d, 'dd/MM');
}

/** Receita total × custo ao longo do tempo (RF-43). */
export function TimelineChart({ points, grain }: { points: TimelinePoint[]; grain: Grain }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const n = points.length;
  const yAxisWidth = 64;
  const chartWidth = Math.max(0, width - yAxisWidth - 16);
  const spacing = n > 1 ? Math.max(8, chartWidth / (n - 1)) : chartWidth;
  // mostra no máximo ~6 rótulos no eixo X para não embolar
  const every = Math.max(1, Math.ceil(n / 6));

  const toData = (key: 'revenue' | 'cost') =>
    points.map((p) => ({ value: p[key] / 100 }));

  // Rótulos do eixo X desenhados por nós: os da biblioteca ficam cortados quando os pontos são próximos.
  const xLabels = points
    .map((p, i) => ({ i, text: label(p.bucket, grain) }))
    .filter(({ i }) => i % every === 0);

  const totalRevenue = points.reduce((a, p) => a + p.revenue, 0);
  const totalCost = points.reduce((a, p) => a + p.cost, 0);

  return (
    <View
      onLayout={onLayout}
      style={styles.wrap}
      accessible
      accessibilityLabel={`Gráfico: receita total de ${formatBRL(totalRevenue)} e custos de ${formatBRL(totalCost)} no período`}>
      <View style={styles.legend}>
        <LegendItem color={colors.chartRevenue} text="Receita total" />
        <LegendItem color={colors.chartCost} text="Custos" />
      </View>
      {width > 0 && n > 0 ? (
        <LineChart
          data={toData('revenue')}
          data2={toData('cost')}
          areaChart
          height={200}
          width={chartWidth}
          spacing={spacing}
          initialSpacing={0}
          endSpacing={0}
          adjustToWidth
          color1={colors.chartRevenue}
          color2={colors.chartCost}
          startFillColor1={colors.chartRevenue}
          startFillColor2={colors.chartCost}
          endFillColor1="#FFFFFF"
          endFillColor2="#FFFFFF"
          startOpacity={0.25}
          endOpacity={0.02}
          thickness={3}
          hideDataPoints={n > 16}
          dataPointsColor1={colors.chartRevenue}
          dataPointsColor2={colors.chartCost}
          noOfSections={4}
          yAxisLabelWidth={yAxisWidth}
          formatYLabel={(v) => formatBRLCompact(Math.round(Number(v) * 100))}
          yAxisTextStyle={styles.axis}
          xAxisLabelTextStyle={styles.axis}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          rulesColor={colors.track}
          disableScroll
          xAxisLabelsHeight={0}
        />
      ) : null}
      {width > 0 && n > 0 ? (
        <View style={styles.xLabels} accessible={false}>
          {xLabels.map(({ i, text }) => (
            <AppText
              key={i}
              variant="caption"
              color={colors.textMuted}
              style={[styles.xLabel, { left: yAxisWidth + i * spacing - 26 }]}>
              {text}
            </AppText>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function LegendItem({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="small">{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 12 },
  legend: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  axis: { color: colors.textMuted, fontSize: 12 },
  xLabels: { height: 20, marginTop: -8 },
  xLabel: { position: 'absolute', width: 52, textAlign: 'center', fontSize: 12, textTransform: 'capitalize' },
});
