/**
 * Step 4 "Projects" of ~/bldesy-web/app/portal/edit-profile/page.tsx: title,
 * description, photos (builder-media + moderation queue) and up to three
 * videos (builder-videos) per project. Saved with "Save All Changes".
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  addProjectVideo,
  emptyProject,
  ERR_MAX_PROJECT_VIDEOS,
  MAX_PROJECT_VIDEOS,
  removeProjectVideo,
  uploadBuilderImage,
  uploadProjectVideo,
} from '@/lib/data/profile-edit';
import type { ProjectItem } from '@/types/database';
import {
  DashedTile,
  EmptyNote,
  FieldLabel,
  FormInput,
  FormTextarea,
  HelperText,
  RemoveButton,
  SoftPillButton,
  ThumbRemoveButton,
} from './form-primitives';
import { pickImage, pickVideo, UPLOAD_FAILED } from './pick-media';
import type { StepProps } from './types';

export function ProjectsStep({ form, update, setForm, userId, setError }: StepProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState<number | null>(null);

  function addProject() {
    update('projects', [...form.projects, emptyProject()]);
  }

  function updateProject(index: number, field: 'title' | 'description', value: string) {
    setForm((prev) => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: value } as ProjectItem;
      return { ...prev, projects: updated };
    });
  }

  function removeProject(index: number) {
    update('projects', form.projects.filter((_, i) => i !== index));
  }

  async function handlePhotoUpload(projectIndex: number) {
    const uri = await pickImage();
    if (!uri) return;
    setUploadingPhoto(projectIndex);
    try {
      const res = await uploadBuilderImage(uri, userId, 'projects');
      if (!res) {
        setError(UPLOAD_FAILED);
        return;
      }
      setForm((prev) => {
        const updated = [...prev.projects];
        updated[projectIndex] = { ...updated[projectIndex], images: [...(updated[projectIndex].images || []), res.url] };
        return { ...prev, projects: updated };
      });
    } finally {
      setUploadingPhoto(null);
    }
  }

  function removePhoto(projectIndex: number, photoIndex: number) {
    setForm((prev) => {
      const updated = [...prev.projects];
      updated[projectIndex] = { ...updated[projectIndex], images: updated[projectIndex].images.filter((_, i) => i !== photoIndex) };
      return { ...prev, projects: updated };
    });
  }

  async function handleVideoUpload(projectIndex: number) {
    if ((form.projects[projectIndex]?.videos || []).length >= MAX_PROJECT_VIDEOS) {
      setError(ERR_MAX_PROJECT_VIDEOS);
      return;
    }
    const uri = await pickVideo();
    if (!uri) return;
    setUploadingVideo(projectIndex);
    try {
      const video = await uploadProjectVideo(uri, userId, projectIndex);
      if (!video) {
        setError(UPLOAD_FAILED);
        return;
      }
      const res = addProjectVideo(form.projects, projectIndex, video);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      update('projects', res.projects);
    } finally {
      setUploadingVideo(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={[styles.lead, { color: c.textSecondary }]}>Showcase your best work to attract clients.</Text>
        <SoftPillButton label="+ Add Project" onPress={addProject} />
      </View>

      {form.projects.length === 0 ? (
        <EmptyNote>No projects added yet. Showcase your best work to attract clients.</EmptyNote>
      ) : (
        <View style={styles.list}>
          {form.projects.map((project, idx) => (
            <View key={idx} style={[styles.projectCard, { borderColor: c.border }]}>
              <RemoveButton
                onPress={() => removeProject(idx)}
                accessibilityLabel="Remove project"
                style={styles.removeProject}
              />
              <View style={styles.fields}>
                <View>
                  <FieldLabel>Project Title</FieldLabel>
                  <FormInput
                    value={project.title}
                    onChangeText={(v) => updateProject(idx, 'title', v)}
                    placeholder="e.g. Kitchen Renovation in Bondi"
                    accessibilityLabel="Project Title"
                  />
                </View>
                <View>
                  <FieldLabel>Description</FieldLabel>
                  <FormTextarea
                    rows={3}
                    value={project.description}
                    onChangeText={(v) => updateProject(idx, 'description', v)}
                    placeholder="Describe the project, scope, and outcomes..."
                    accessibilityLabel="Description"
                  />
                </View>

                {/* Project photos */}
                <View>
                  <FieldLabel>Photos</FieldLabel>
                  <View style={styles.tiles}>
                    {(project.images || []).map((url, photoIdx) => (
                      <View key={`${url}-${photoIdx}`} style={[styles.thumb, { borderColor: c.border }]}>
                        <Image source={{ uri: url }} contentFit="cover" style={StyleSheet.absoluteFill} />
                        <ThumbRemoveButton onPress={() => removePhoto(idx, photoIdx)} accessibilityLabel="Remove photo" />
                      </View>
                    ))}
                    <DashedTile width={112} height={80} label="Add photo" busy={uploadingPhoto === idx} onPress={() => handlePhotoUpload(idx)} />
                  </View>
                </View>

                {/* Project videos */}
                <View>
                  <FieldLabel>Videos</FieldLabel>
                  <View style={styles.tiles}>
                    {(project.videos || []).map((video, videoIdx) => (
                      <View key={`${video.url}-${videoIdx}`} style={[styles.thumb, styles.videoThumb, { borderColor: c.border, backgroundColor: c.textPrimary + 'E6' }]}>
                        {video.poster ? (
                          <Image source={{ uri: video.poster }} contentFit="cover" style={[StyleSheet.absoluteFill, styles.poster]} />
                        ) : null}
                        {/* Play badge — makes it obvious this tile is a video */}
                        <View style={styles.playBadge}>
                          <MaterialIcons name="play-arrow" size={16} color="#fff" />
                        </View>
                        <ThumbRemoveButton
                          onPress={() => update('projects', removeProjectVideo(form.projects, idx, videoIdx))}
                          accessibilityLabel="Remove video"
                        />
                      </View>
                    ))}
                    {(project.videos || []).length < MAX_PROJECT_VIDEOS ? (
                      <DashedTile
                        width={112}
                        height={80}
                        label="Add video"
                        icon="videocam"
                        busy={uploadingVideo === idx}
                        busyLabel="Uploading…"
                        onPress={() => handleVideoUpload(idx)}
                      />
                    ) : null}
                  </View>
                  <HelperText style={styles.videoHelp}>
                    MP4, MOV or WebM, up to 100MB — max {MAX_PROJECT_VIDEOS} per project.
                  </HelperText>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing['2xl'] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  lead: { flex: 1, fontSize: 14, lineHeight: 20, fontFamily: FontFamily.body },
  list: { gap: Spacing['2xl'] },
  projectCard: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, position: 'relative' },
  removeProject: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  fields: { gap: 12, paddingRight: 32 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumb: { width: 112, height: 80, borderRadius: Radius.md, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  videoThumb: { alignItems: 'center', justifyContent: 'center' },
  poster: { opacity: 0.8 },
  playBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  videoHelp: { marginTop: 6 },
});
