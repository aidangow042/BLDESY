/**
 * CoverageMap — port of ~/bldesy-web/components/coverage/coverage-map.tsx with
 * react-native-svg. Real ABS suburb geometry (./geo.ts), zone membership
 * straight from FOUNDING_ZONES via lib/web/coverage-map/config.
 *
 * Interaction model (the web's touch path — there is no hover on a phone):
 * - tapping a zone (on the map or its chip) pins a panel below the map listing
 *   every suburb in the zone, and dims the other zones to the muted fill
 * - a resolved search highlights the suburb's zone (amber ring) and drops a pin
 * - the legend's "Coming later" chip toggles the outside-the-zones explainer
 * - "✕ Clear" clears everything, including the search (via onClear)
 *
 * The zone chip row under the map is the app's accessible twin of the web's
 * focusable SVG groups: RN SVG paths aren't reachable by screen readers, so
 * every zone is also a real button.
 */
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText, TSpan } from 'react-native-svg';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { COVERAGE_ZONES, type CoverageZone } from '@/lib/web/coverage-map/config';
import { COVERAGE } from '@/lib/web/service-areas';

import { useCoverage } from './coverage-context';
import {
  LEGEND_FOUNDING_FILL,
  MAP_COLORS,
  isZoneDimmed,
  ringLabelNames,
  ringNames,
  zoneAnchors,
  zoneBySlug,
  zoneGeoMembers,
} from './coverage-logic';
import { BRIDGE, MAP_H, MAP_W, RIVER_PATHS, SUBURB_GEO, WATER_LABELS } from './geo';

type Locked = string | '__outside' | null;

/** Web: dots hide below 480px; zone labels are 30px there, 26px above. */
const DOTS_MIN_WIDTH = 480;

function ZoneInfo({ zone, onClose }: { zone: CoverageZone; onClose: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const half = Math.ceil(zone.suburbs.length / 2);
  const columns = [zone.suburbs.slice(0, half), zone.suburbs.slice(half)];
  return (
    <View>
      <View style={styles.panelHeader}>
        <View style={[styles.swatch, { backgroundColor: zone.fill }]} />
        <Text style={[styles.panelTitle, { color: c.textPrimary }]} accessibilityRole="header">
          {zone.name}
        </Text>
      </View>
      <Text style={[styles.panelSub, { color: c.textSecondary }]}>A founding neighbourhood</Text>
      <View style={styles.columns}>
        {columns.map((col, i) => (
          <View key={i} style={styles.column}>
            {col.map((s) => (
              <Text key={s} style={[styles.suburb, { color: c.textSecondary }]}>
                {s}
              </Text>
            ))}
          </View>
        ))}
      </View>
      <CloseButton onPress={onClose} />
    </View>
  );
}

function CloseButton({ onPress }: { onPress: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Close"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.close, pressed && { backgroundColor: c.textPrimary + '0D' }]}
    >
      <Text style={[styles.closeGlyph, { color: c.textSecondary }]}>✕</Text>
    </Pressable>
  );
}

export function CoverageMap({ onClear }: { onClear: () => void }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const m = MAP_COLORS[scheme];
  const { width } = useWindowDimensions();
  const showDots = width >= DOTS_MIN_WIDTH;
  const zoneLabelSize = width >= DOTS_MIN_WIDTH ? 26 : 30;
  const { result, setResult } = useCoverage();
  const [locked, setLocked] = useState<Locked>(null);

  // A resolved search takes over the selection. Derived during render — the
  // sanctioned adjust-state-on-prop-change pattern, not an effect.
  const [prevResult, setPrevResult] = useState(result);
  if (result !== prevResult) {
    setPrevResult(result);
    if (result) setLocked(result.zoneSlug);
  }

  const clearAll = useCallback(() => {
    setLocked(null);
    onClear();
  }, [onClear]);

  function toggleZone(slug: string) {
    // Zone taps replace any search result (the CTA clears, the input keeps its text).
    if (result) setResult(null);
    setLocked((cur) => (cur === slug ? null : slug));
  }

  function toggleOutside() {
    if (result) setResult(null);
    setLocked((cur) => (cur === '__outside' ? null : '__outside'));
  }

  const activeZone = locked && locked !== '__outside' ? locked : null;
  const outsideMode = !activeZone && (locked === '__outside' || (result !== null && !result.zoneSlug));
  const lockedZone = locked && locked !== '__outside' ? zoneBySlug.get(locked) : undefined;
  const pinGeo = result?.zoneSlug ? SUBURB_GEO[result.geoName] : undefined;
  const dimmed = (slug: string) => isZoneDimmed(slug, activeZone, outsideMode);

  return (
    <View>
      <View style={styles.mapWrap}>
        <Svg
          width="100%"
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          style={{ aspectRatio: MAP_W / MAP_H }}
          accessible
          accessibilityLabel={`Map of BLDESY's founding neighbourhoods: ${COVERAGE.zonesWord} zones across inner Sydney, surrounded by greyed-out suburbs outside the founding neighbourhoods`}
        >
          <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={m.water} />

          {/* Greyed context ring */}
          <G>
            {ringNames.map((n) => (
              <Path key={n} d={SUBURB_GEO[n].d} fill={m.land} stroke={m.land} strokeWidth={0.8} strokeLinejoin="round" />
            ))}
          </G>

          {/* Launch zones */}
          {COVERAGE_ZONES.map((zone) => {
            const members = zoneGeoMembers.get(zone.slug) ?? [];
            const selected = locked === zone.slug;
            const fill = dimmed(zone.slug) ? m.zoneMuted : zone.fill;
            return (
              <G key={zone.slug} onPress={() => toggleZone(zone.slug)}>
                {/* Halo: crisp boundary stroke; flips to the amber CTA ring when selected */}
                {members.map((s) => (
                  <Path
                    key={`halo-${s}`}
                    d={SUBURB_GEO[s].d}
                    fill="none"
                    stroke={selected ? c.cta : m.zoneBoundary}
                    strokeWidth={selected ? 4.5 : 3}
                    strokeLinejoin="round"
                  />
                ))}
                {members.map((s) => (
                  <Path key={s} d={SUBURB_GEO[s].d} fill={fill} stroke={fill} strokeWidth={0.8} strokeLinejoin="round" />
                ))}
              </G>
            );
          })}

          {/* Rivers — real shared-boundary arcs, stroked as water */}
          <G>
            {RIVER_PATHS.map((d) => (
              <Path key={d.slice(0, 24)} d={d} fill="none" stroke={m.water} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </G>

          {/* Harbour Bridge tick */}
          <Line x1={BRIDGE.x1} y1={BRIDGE.y1} x2={BRIDGE.x2} y2={BRIDGE.y2} stroke="#fff" strokeOpacity={0.9} strokeWidth={3.4} strokeLinecap="round" />

          {/* Water labels */}
          <G>
            {WATER_LABELS.map((l) => (
              <SvgText
                key={l.t}
                x={l.x}
                y={l.y}
                fontSize={l.s}
                fontStyle="italic"
                fontFamily={FontFamily.body}
                letterSpacing={l.s * 0.14}
                textAnchor="middle"
                fill={m.waterLabel}
                transform={l.r ? `rotate(${l.r} ${l.x} ${l.y})` : undefined}
              >
                {l.t}
              </SvgText>
            ))}
          </G>

          {/* Greyed context suburb labels */}
          <G>
            {ringLabelNames.map((n) => (
              <SvgText
                key={n}
                x={SUBURB_GEO[n].cx}
                y={SUBURB_GEO[n].cy}
                fontSize={14.5}
                fontWeight="600"
                fontFamily={FontFamily.bodySemiBold}
                letterSpacing={0.7}
                textAnchor="middle"
                fill={c.textSecondary}
                opacity={0.75}
              >
                {n}
              </SvgText>
            ))}
          </G>

          {/* Suburb dots (hidden on narrow screens) */}
          {showDots ? (
            <G>
              {COVERAGE_ZONES.flatMap((zone) => {
                const dim = dimmed(zone.slug);
                return zone.dots
                  .filter((s) => SUBURB_GEO[s])
                  .map((s) => {
                    const g = SUBURB_GEO[s];
                    const fill = dim ? c.textPrimary : '#fff';
                    return (
                      <G key={s}>
                        <Circle cx={g.cx} cy={g.cy} r={2.1} fill={fill} opacity={dim ? 0.5 : 0.92} />
                        {/* Stroke pass then fill pass — RN SVG has no paint-order. */}
                        <SvgText x={g.cx} y={g.cy + 16} fontSize={15} fontWeight="600" fontFamily={FontFamily.bodySemiBold} textAnchor="middle" stroke={dim ? m.zoneMuted : 'rgba(10, 20, 28, 0.42)'} strokeWidth={2.4} fill="none" opacity={dim ? 0.6 : 1}>
                          {s}
                        </SvgText>
                        <SvgText x={g.cx} y={g.cy + 16} fontSize={15} fontWeight="600" fontFamily={FontFamily.bodySemiBold} textAnchor="middle" fill={fill} opacity={dim ? 0.6 : 1}>
                          {s}
                        </SvgText>
                      </G>
                    );
                  });
              })}
            </G>
          ) : null}

          {/* Zone name labels */}
          <G>
            {COVERAGE_ZONES.map((zone) => {
              const anchor = zoneAnchors.get(zone.slug)!;
              const dim = dimmed(zone.slug);
              const y = anchor.y - (zone.lines.length > 1 ? 12 : 0);
              const common = {
                x: anchor.x,
                y,
                fontSize: zoneLabelSize,
                fontWeight: '800' as const,
                fontFamily: FontFamily.bodyBold,
                letterSpacing: zoneLabelSize * 0.04,
                textAnchor: 'middle' as const,
                opacity: dim ? 0.75 : 1,
              };
              const lines = zone.lines.map((line, i) => (
                <TSpan key={line} x={anchor.x} dy={i ? 28 : 0}>
                  {line}
                </TSpan>
              ));
              return (
                <G key={zone.slug}>
                  <SvgText {...common} fill="none" stroke={dim ? m.zoneMuted : 'rgba(10, 20, 28, 0.38)'} strokeWidth={3}>
                    {lines}
                  </SvgText>
                  <SvgText {...common} fill={dim ? c.textPrimary : '#fff'}>
                    {lines}
                  </SvgText>
                </G>
              );
            })}
          </G>

          {/* Searched-suburb pin */}
          {pinGeo ? (
            <G transform={`translate(${pinGeo.cx} ${pinGeo.cy})`}>
              <Circle r={8.4} fill="none" stroke={c.surface} strokeWidth={5.2} opacity={0.85} />
              <Circle r={6.5} fill="none" stroke={c.textPrimary} strokeWidth={2.4} />
              <Circle r={2.4} fill={c.textPrimary} />
            </G>
          ) : null}
        </Svg>
      </View>

      <Text style={[styles.caption, { color: c.textSecondary }]}>
        Schematic — zone shapes are indicative, not exact boundaries. Tap a zone to see its suburbs.
      </Text>

      {/* Zone chips — the accessible twin of the map's tappable groups */}
      <View style={styles.chips} accessibilityRole="list">
        {COVERAGE_ZONES.map((zone) => {
          const selected = locked === zone.slug;
          return (
            <Pressable
              key={zone.slug}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${zone.name} — a founding neighbourhood, ${zone.suburbs.length} suburbs`}
              onPress={() => toggleZone(zone.slug)}
              style={[
                styles.chip,
                { borderColor: selected ? c.cta : c.border, backgroundColor: c.surface },
                selected && { borderWidth: 2 },
              ]}
            >
              <View style={[styles.chipSwatch, { backgroundColor: zone.fill }]} />
              <Text style={[styles.chipLabel, { color: c.textPrimary }]}>{zone.name}</Text>
              <Text style={[styles.chipCount, { color: c.textSecondary }]}>{zone.suburbs.length} suburbs</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Pinned panel — zone details, or the outside-the-zones explainer */}
      {locked !== null ? (
        <View accessibilityLiveRegion="polite" style={[styles.panel, { backgroundColor: c.surface, borderColor: c.border }]}>
          {lockedZone ? (
            <ZoneInfo zone={lockedZone} onClose={() => setLocked(null)} />
          ) : (
            <View>
              <View style={styles.panelHeader}>
                <View style={[styles.swatch, { backgroundColor: m.land }]} />
                <Text style={[styles.panelTitle, { color: c.textPrimary }]} accessibilityRole="header">
                  Outside our founding neighbourhoods
                </Text>
              </View>
              <Text style={[styles.panelSub, { color: c.textSecondary }]}>
                Greyed suburbs aren’t in a founding neighbourhood yet — we expand area by area. Join the waitlist to
                hear when we reach yours.
              </Text>
              <CloseButton onPress={() => setLocked(null)} />
            </View>
          )}
        </View>
      ) : null}

      {/* Legend — two chips: the coverage story is covered vs not */}
      <View style={styles.legend} accessibilityRole="toolbar" accessibilityLabel="Coverage legend">
        <View style={[styles.legendChip, { borderColor: c.border }]}>
          <View style={[styles.legendSwatch, { backgroundColor: LEGEND_FOUNDING_FILL }]} />
          <Text style={[styles.legendLabel, { color: c.textPrimary }]}>First launch area</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: locked === '__outside' }}
          onPress={toggleOutside}
          style={[
            styles.legendChip,
            { borderColor: locked === '__outside' ? c.textPrimary : c.border },
            locked === '__outside' && { borderWidth: 2 },
          ]}
        >
          <View style={[styles.legendSwatch, { backgroundColor: m.land }]} />
          <Text style={[styles.legendLabel, { color: c.textPrimary }]}>Coming later — join the waitlist</Text>
        </Pressable>
        {locked !== null || result !== null ? (
          <Pressable accessibilityRole="button" onPress={clearAll} style={[styles.legendChip, { borderColor: c.border }]}>
            <Text style={[styles.legendLabel, { color: c.textSecondary }]}>✕ Clear</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapWrap: {
    marginTop: Spacing.lg,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  caption: {
    marginTop: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.75,
  },
  chips: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  chipLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
  chipCount: {
    fontFamily: FontFamily.body,
    fontSize: 11,
  },
  panel: {
    marginTop: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingRight: 36,
  },
  swatch: {
    width: 11,
    height: 11,
    borderRadius: 3,
  },
  panelTitle: {
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 15,
  },
  panelSub: {
    marginTop: 2,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 18,
  },
  columns: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  column: {
    flex: 1,
  },
  suburb: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    lineHeight: 21,
  },
  close: {
    position: 'absolute',
    right: -8,
    top: -8,
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    fontSize: 14,
  },
  legend: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    fontFamily: FontFamily.bodySemiBold,
    fontWeight: '600',
    fontSize: 12,
  },
});
