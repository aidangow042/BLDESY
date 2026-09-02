/**
 * BuilderMarker — ~/bldesy-web/components/map/builder-marker.tsx: the
 * trade-coloured teardrop pin (28×36, white ring, coloured core) with the
 * availability dot top-right; scales to 1.2× with a drop shadow when selected.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';

import { AVAIL_DOT_HEX } from '@/components/map/map-logic';

type AvailDot = 'available' | 'limited' | 'unavailable' | 'none';

interface BuilderMarkerProps {
  id: string;
  latitude: number;
  longitude: number;
  colour: string;
  availability: AvailDot;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const PIN_W = 28;
const PIN_H = 36;

/** The pin glyph on its own — the detail panel and legend reuse it. */
export function PinGlyph({ colour, size = PIN_W }: { colour: string; size?: number }) {
  const h = (size * PIN_H) / PIN_W;
  return (
    <Svg width={size} height={h} viewBox="0 0 28 36" fill="none">
      <Path
        d="M14 0C6.268 0 0 6.268 0 14c0 9.941 12.335 20.64 12.87 21.11a1.75 1.75 0 002.26 0C15.665 34.64 28 23.941 28 14 28 6.268 21.732 0 14 0z"
        fill={colour}
        stroke="#ffffff"
        strokeWidth={1.5}
      />
      <Circle cx={14} cy={13} r={5.5} fill="#ffffff" />
      <Circle cx={14} cy={13} r={2.5} fill={colour} />
    </Svg>
  );
}

function BuilderMarkerInner({ id, latitude, longitude, colour, availability, isSelected, onSelect }: BuilderMarkerProps) {
  return (
    <Marker
      identifier={id}
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={(e) => {
        e.stopPropagation();
        onSelect(id);
      }}
      // Re-rasterise only while the selection state changes.
      tracksViewChanges={isSelected}
      zIndex={isSelected ? 1000 : 0}
    >
      <View style={[styles.wrap, isSelected && styles.selected]}>
        <PinGlyph colour={colour} />
        {availability !== 'none' ? <View style={[styles.dot, { backgroundColor: AVAIL_DOT_HEX[availability] }]} /> : null}
      </View>
    </Marker>
  );
}

export const BuilderMarker = memo(BuilderMarkerInner);

const styles = StyleSheet.create({
  wrap: {
    width: PIN_W,
    height: PIN_H,
    // Padding so the 1.2× scale and the dot don't clip inside the marker view.
    margin: 6,
  },
  selected: {
    transform: [{ scale: 1.2 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
});
