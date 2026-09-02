/**
 * FoundingSpotsLeft — port of ~/bldesy-web/components/supply/founding-spots.tsx.
 * Live "X of 200 founding spots left", driven by the real application count
 * (GET /api/supply/founding via lib/data/public-forms). Renders nothing until
 * at least FOUNDING_COUNTER_MIN_TAKEN spots are consumed (a full "200 of 200"
 * reads as nobody-joined), nothing on fetch failure, and nothing once the cap
 * is exhausted — never a broken or made-up number.
 */
import { useEffect, useState } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { fetchFoundingSpots } from '@/lib/data/public-forms';
import { FOUNDING_CAP } from '@/lib/web/founding-offer';

import { foundingSpotsToShow } from './supply-logic';

export { foundingSpotsToShow } from './supply-logic';

interface FoundingSpotsLeftProps {
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function FoundingSpotsLeft({ style, textStyle }: FoundingSpotsLeftProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFoundingSpots().then((spots) => {
      if (cancelled) return;
      setRemaining(foundingSpotsToShow(spots));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (remaining === null) return null;
  return (
    <View style={style}>
      <Text style={textStyle}>{`${remaining} of ${FOUNDING_CAP} founding spots left`}</Text>
    </View>
  );
}
