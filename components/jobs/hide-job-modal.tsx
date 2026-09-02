/**
 * The feeds' hide / remove confirmation — copy per feed from
 * ~/bldesy-web/app/portal/jobs/{residential,commercial,contracts}/page.tsx.
 * Hiding is device-local and, when the tradie had applied, withdraws the
 * application; the job itself is never touched.
 */
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FeedKind } from '@/lib/data/tradie-jobs';
import { ConfirmModal } from './confirm-modal';

interface HideJobModalProps {
  visible: boolean;
  kind: FeedKind;
  /** The tradie has an application on this job (changes the body copy). */
  applied: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function HideJobModal({ visible, kind, applied, busy, onCancel, onConfirm }: HideJobModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  if (kind === 'home') {
    return (
      <ConfirmModal
        visible={visible}
        icon={<MaterialIcons name="visibility-off" size={24} color={c.textSecondary} />}
        iconBg={c.border + '66'}
        title="Hide this job?"
        body={
          applied
            ? 'This withdraws your application and hides the job from your list. The job itself stays open.'
            : 'This hides the job from your list. The job itself stays open.'
        }
        confirmLabel="Hide"
        confirmBusyLabel="Hiding..."
        busy={busy}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  const noun = kind === 'contract' ? 'contract' : 'job';
  return (
    <ConfirmModal
      visible={visible}
      icon={<MaterialIcons name="delete-outline" size={24} color={c.error} />}
      iconBg={c.error + '1A'}
      title={`Remove this ${noun}?`}
      body={
        applied
          ? `This will withdraw your application and hide this ${noun} from your list.`
          : `This will hide this ${noun} from your list.`
      }
      confirmLabel="Remove"
      confirmBusyLabel="Removing..."
      busy={busy}
      destructive
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
