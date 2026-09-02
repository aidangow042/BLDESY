/**
 * In-memory draft for the Post a Job wizard.
 *
 * The website's wizard is auth-gated ("Sign in to post a job"); the app lets a
 * guest fill the wizard and only asks them to sign in on submit. The draft
 * lives here (module scope — survives the login round-trip, not an app
 * restart) and the wizard restores it on mount, so nothing typed is lost.
 */
import type { BuilderSpecialisations } from '@/lib/web/trade-specialisations';

import type { WhenAndHowFields } from './when-and-how-step';
import type { FormFields } from './wizard-model';

export interface JobDraft {
  form: FormFields;
  whenAndHow: WhenAndHowFields;
  specialisations: BuilderSpecialisations;
  jobPhotos: string[];
  jobDocs: string[];
  isEnterprise: boolean;
  step: number;
}

let draft: JobDraft | null = null;

export function saveJobDraft(next: JobDraft): void {
  draft = next;
}

/** Returns the pending draft (if any) and clears it. */
export function takeJobDraft(): JobDraft | null {
  const current = draft;
  draft = null;
  return current;
}

export function peekJobDraft(): JobDraft | null {
  return draft;
}

export function clearJobDraft(): void {
  draft = null;
}
