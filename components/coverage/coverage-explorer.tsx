/**
 * CoverageExplorer — port of ~/bldesy-web/components/coverage/coverage-explorer.tsx:
 * search → CTA slot → map, sharing one resolved-suburb state (the context also
 * feeds the bottom waitlist form its prefill). The CTA renders BETWEEN the
 * search and the map so an answer never pushes the map out of view.
 */
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { useCoverage } from './coverage-context';
import { CoverageCta } from './coverage-cta';
import { CoverageMap } from './coverage-map';
import { CoverageSearch } from './coverage-search';

interface CoverageExplorerProps {
  /** Scrolls the screen to the waitlist form (the CTA's join button). */
  onJoin: () => void;
}

export function CoverageExplorer({ onJoin }: CoverageExplorerProps) {
  const { setResult } = useCoverage();
  const [resetSignal, setResetSignal] = useState(0);

  const clearAll = useCallback(() => {
    setResult(null);
    setResetSignal((n) => n + 1);
  }, [setResult]);

  return (
    <View>
      {/* key: a full clear (legend ✕) remounts the search, emptying it */}
      <CoverageSearch key={resetSignal} />
      <CoverageCta onClear={clearAll} onJoin={onJoin} />
      <CoverageMap onClear={clearAll} />
    </View>
  );
}
