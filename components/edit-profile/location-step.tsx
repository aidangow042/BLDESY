/**
 * Step 1 "Location" of ~/bldesy-web/app/portal/edit-profile/page.tsx: home
 * suburb (typeahead) + postcode, availability, response time, service radius,
 * and the founding-zone coverage picker. The base suburb is a scalar and never
 * a coverage claim; picking it seeds the matching zone as a Primary area when
 * no coverage is set yet.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FoundingZonePicker } from '@/components/profile/founding-zone-picker';
import { SuburbTypeahead } from '@/components/profile/suburb-typeahead';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RESPONSE_TIMES } from '@/lib/data/profile-edit';
import { FOUNDING_ZONES, type AuState } from '@/lib/web/service-areas';
import type { AvailabilityStatus } from '@/types/database';
import { FieldLabel, FormInput, HelperText } from './form-primitives';
import { SelectField } from './select-field';
import type { StepProps } from './types';

const AVAILABILITY: AvailabilityStatus[] = ['available', 'limited', 'unavailable'];
const RADII = [10, 20, 30, 50, 75, 100];

/** The founding zone whose suburb list contains `suburb` (case-insensitive), if any. */
export function zoneForSuburb(suburb: string): string | null {
  const lower = suburb.trim().toLowerCase();
  if (!lower) return null;
  const zone = FOUNDING_ZONES.find((z) => z.suburbs.some((s) => s.toLowerCase() === lower));
  return zone?.name ?? null;
}

export function LocationStep({ form, update, setForm }: StepProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  function selectSuburb(val: string) {
    const zone = zoneForSuburb(val);
    setForm((prev) => {
      const next = { ...prev, suburb: val };
      const alreadyCovered =
        prev.primaryZones.length > 0 ||
        prev.legacyRegions.length > 0 ||
        prev.coverageStates.length > 0 ||
        (zone != null && prev.coverZones.some((z) => z.toLowerCase() === zone.toLowerCase()));
      if (zone && !alreadyCovered) next.primaryZones = [zone];
      return next;
    });
  }

  const availabilityTone = (status: AvailabilityStatus, active: boolean) => {
    switch (status) {
      case 'available':
        return active ? { bg: c.success, fg: '#fff' } : { bg: c.successBg, fg: c.success };
      case 'limited':
        return active ? { bg: c.warning, fg: '#fff' } : { bg: c.warning + '1A', fg: c.warning };
      case 'unavailable':
      default:
        return active ? { bg: c.error, fg: '#fff' } : { bg: c.error + '1A', fg: c.error };
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.suburbField}>
        <FieldLabel>Suburb *</FieldLabel>
        <SuburbTypeahead
          value={form.suburb}
          onChangeText={(v) => update('suburb', v)}
          onSelect={selectSuburb}
          placeholder="Start typing suburb..."
          accessibilityLabel="Suburb"
        />
        <HelperText style={styles.suburbHelper}>
          Your home suburb — anywhere around Sydney is fine, including the Central Coast, Blue
          Mountains, Illawarra and Newcastle. It anchors your pin on the map and the distance
          homeowners see. Where you take work is the next question.
        </HelperText>
      </View>

      <View>
        <FieldLabel>Postcode *</FieldLabel>
        <FormInput
          value={form.postcode}
          onChangeText={(v) => update('postcode', v)}
          placeholder="2000"
          maxLength={4}
          keyboardType="number-pad"
          accessibilityLabel="Postcode"
        />
      </View>

      <View>
        <FieldLabel>Availability</FieldLabel>
        <View style={styles.pillRow}>
          {AVAILABILITY.map((status) => {
            const isActive = form.availability === status;
            const tone = availabilityTone(status, isActive);
            return (
              <Pressable
                key={status}
                onPress={() => update('availability', status)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[styles.availPill, { backgroundColor: tone.bg }]}
              >
                <Text style={[styles.availText, { color: tone.fg }]}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View>
        <FieldLabel>Response Time</FieldLabel>
        <SelectField
          value={form.responseTime}
          options={[{ value: '', label: 'Select response time' }, ...RESPONSE_TIMES.map((rt) => ({ value: rt, label: rt }))]}
          onChange={(v) => update('responseTime', v)}
          accessibilityLabel="Response Time"
        />
      </View>

      {/* Values are plain km numbers — whole-state coverage is a `state:` entry this control cannot emit. */}
      <View>
        <FieldLabel>Service Radius</FieldLabel>
        <SelectField
          value={form.serviceRadius}
          options={[{ value: '', label: 'Select radius' }, ...RADII.map((km) => ({ value: String(km), label: `${km}km` }))]}
          onChange={(v) => update('serviceRadius', v)}
          accessibilityLabel="Service Radius"
        />
      </View>

      {/* Zone coverage — launch zones only; pre-restriction region/state entries stay as removable chips. */}
      <View>
        <FieldLabel>Where do you want work?</FieldLabel>
        <FoundingZonePicker
          primaryZones={form.primaryZones}
          onPrimaryZonesChange={(next) => update('primaryZones', next)}
          coverZones={form.coverZones}
          onCoverZonesChange={(next) => update('coverZones', next)}
          legacyRegions={form.legacyRegions}
          onLegacyRegionsChange={(next) => update('legacyRegions', next)}
          states={form.coverageStates}
          onStatesChange={(next) => update('coverageStates', next as AuState[])}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xl },
  suburbField: { zIndex: 10 },
  suburbHelper: { marginTop: 6 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  availPill: { borderRadius: Radius.full, paddingHorizontal: Spacing.lg, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  availText: { fontSize: 14, fontFamily: FontFamily.bodySemiBold, fontWeight: '600' },
});
