/**
 * ClusterMarker — the brand-styled cluster badge from
 * ~/bldesy-web/components/map/map-view.tsx createClusterIcon: a primary circle
 * with a 3px white ring and the point count, sized 34/40/46 by count.
 */
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { clusterSize } from '@/components/map/map-logic';
import { Colors, FontFamily } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The shape react-native-map-clustering hands to `renderCluster`. */
export interface ClusterFeature {
  id: string | number;
  geometry: { coordinates: [number, number] };
  properties: { point_count: number };
  onPress: () => void;
}

export function ClusterMarker({ cluster }: { cluster: ClusterFeature }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const count = cluster.properties.point_count;
  const size = clusterSize(count);
  const [longitude, latitude] = cluster.geometry.coordinates;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={cluster.onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.primary }]}>
        <Text style={styles.count}>{count}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  count: {
    color: '#ffffff',
    fontFamily: FontFamily.bodyBold,
    fontWeight: '700',
    fontSize: 12,
  },
});
