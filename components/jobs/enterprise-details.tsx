/**
 * "Project Job Details" / "Contract Details" box — the enterprise-only extras
 * under Step 1 in ~/bldesy-web/components/jobs/job-wizard.tsx: workers needed
 * (jobs) or the contract sub-type + roles editor (contracts), then Site Photos
 * & Plans and Documents. Pay, dates, hours and duration live on When & How.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Input } from '@/components/ui';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ContractRole, ContractType, PostingKind } from '@/types/database';

import { ContractRolesEditor } from './contract-roles-editor';
import { DocumentList, PhotoGrid } from './photo-uploader';

interface EnterpriseDetailsProps {
  postingKind: PostingKind;
  contractType: ContractType;
  contractRoles: ContractRole[];
  activeRoleIndex: number;
  workersNeeded: string;
  rolesError?: string;
  onChangeWorkers: (value: string) => void;
  onChangeContractType: (type: ContractType) => void;
  onUpdateRole: (index: number, patch: Partial<ContractRole>) => void;
  onAddRole: () => void;
  onRemoveRole: (index: number) => void;
  onSelectRoleTab: (index: number) => void;
  photos: string[];
  docs: string[];
  uploadingPhoto: boolean;
  uploadingDoc: boolean;
  onAddPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onAddDoc: () => void;
  onRemoveDoc: (index: number) => void;
}

export function EnterpriseDetails(props: EnterpriseDetailsProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const isContract = props.postingKind === 'contract';

  return (
    <View style={[styles.box, { borderColor: c.indigo + '33', backgroundColor: c.indigo + '0D' }]}>
      <Text style={[styles.title, { color: c.indigo }]}>
        {isContract ? 'Contract Details' : 'Project Job Details'}
      </Text>

      {isContract ? (
        <ContractRolesEditor
          contractType={props.contractType}
          roles={props.contractRoles}
          activeIndex={props.activeRoleIndex}
          onChangeType={props.onChangeContractType}
          onUpdateRole={props.onUpdateRole}
          onAddRole={props.onAddRole}
          onRemoveRole={props.onRemoveRole}
          onSelectTab={props.onSelectRoleTab}
          error={props.rolesError}
        />
      ) : (
        <View>
          <Text style={[styles.label, { color: c.textPrimary }]}>Workers Needed</Text>
          <Input
            value={props.workersNeeded}
            onChangeText={(t) => props.onChangeWorkers(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            accessibilityLabel="Workers Needed"
            containerStyle={styles.workers}
          />
          <Text style={[styles.hint, { color: c.textSecondary }]}>
            Pay, start date, hours and duration are set on the next step (When &amp; How).
          </Text>
        </View>
      )}

      {/* Site Photos */}
      <View>
        <Text style={[styles.label, { color: c.textPrimary }]}>Site Photos &amp; Plans</Text>
        <Text style={[styles.tinyHint, { color: c.textSecondary }]}>
          Upload photos of the site, plans, drawings, or anything that helps tradies understand the job.
        </Text>
        <PhotoGrid
          photos={props.photos}
          uploading={props.uploadingPhoto}
          onAdd={props.onAddPhoto}
          onRemove={props.onRemovePhoto}
          accent={c.indigo}
        />
      </View>

      {/* Documents */}
      <View>
        <Text style={[styles.label, { color: c.textPrimary }]}>Documents (PDF, plans, specs)</Text>
        <DocumentList
          docs={props.docs}
          uploading={props.uploadingDoc}
          onAdd={props.onAddDoc}
          onRemove={props.onRemoveDoc}
          accent={c.indigo}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  title: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
  label: { fontSize: 12, fontFamily: FontFamily.bodySemiBold, fontWeight: '600', marginBottom: 4 },
  hint: { fontSize: 11, lineHeight: 16, fontFamily: FontFamily.body, marginTop: 6 },
  tinyHint: { fontSize: 10, lineHeight: 14, fontFamily: FontFamily.body, marginBottom: Spacing.sm },
  workers: { maxWidth: 160 },
});
