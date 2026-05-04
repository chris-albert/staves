import { db } from './db';
import { zipSync, strToU8 } from 'fflate';

/** Export a project + all its audio as a .staves ZIP file. */
export async function exportProject(projectId: string): Promise<Blob> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error(`Project ${projectId} not found`);

  const tracks = await db.tracks.where('projectId').equals(projectId).toArray();
  const clips = await db.clips.where('projectId').equals(projectId).toArray();
  const audioBlobs = await db.audioBlobs.where('projectId').equals(projectId).toArray();
  const drumPatterns = await db.drumPatterns.where('projectId').equals(projectId).toArray();
  const midiPatterns = await db.midiPatterns.where('projectId').equals(projectId).toArray();

  // Build manifest (everything except binary audio data)
  const manifest = {
    version: 2,
    project,
    tracks,
    clips,
    audioBlobs: audioBlobs.map(({ data: _, ...rest }) => rest),
    drumPatterns,
    midiPatterns,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const files: Record<string, Uint8Array<any>> = {
    'manifest.json': strToU8(JSON.stringify(manifest, null, 2)),
  };

  // Add audio blobs as separate files
  for (const blob of audioBlobs) {
    const ext = blob.format === 'webm-opus' ? 'webm' : 'm4a';
    const buffer = await blob.data.arrayBuffer();
    files[`audio/${blob.id}.${ext}`] = new Uint8Array(buffer);
  }

  const zipped = zipSync(files);
  return new Blob([zipped.buffer as ArrayBuffer], { type: 'application/zip' });
}
