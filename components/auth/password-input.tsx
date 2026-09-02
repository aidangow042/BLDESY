/**
 * PasswordInput — `Input` with a show/hide toggle in the trailing slot.
 */
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable } from 'react-native';

import { Input, type InputProps } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = Omit<InputProps, 'secureTextEntry' | 'trailing'>;

export function PasswordInput(props: Props) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [visible, setVisible] = useState(false);

  return (
    <Input
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={8}
          onPress={() => setVisible((v) => !v)}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color={c.textSecondary} />
        </Pressable>
      }
    />
  );
}
