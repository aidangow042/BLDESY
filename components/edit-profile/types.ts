import type { Dispatch, SetStateAction } from 'react';

import type { EditProfileForm } from '@/lib/data/profile-edit';
import type { OwnBuilderProfile } from '@/lib/data/portal';

/** What every edit-profile step receives from the page. */
export interface StepProps {
  form: EditProfileForm;
  update: <K extends keyof EditProfileForm>(key: K, value: EditProfileForm[K]) => void;
  setForm: Dispatch<SetStateAction<EditProfileForm>>;
  profile: OwnBuilderProfile;
  userId: string;
  setError: (message: string | null) => void;
  refreshProfile: () => Promise<void>;
}
