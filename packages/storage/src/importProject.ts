import { db, type Project, type Track, type Clip, type AudioBlob } from './db';
import { unzipSync, strFromU8 } from 'fflate';

interface Manifest {
  version: number;
  project: Project;
  tracks: Track[];
  clips: Clip[];
  audioBlobs: Omit<AudioBlob, 'data'>[];
}

/** Import a .staves ZIP file into IndexedDB. */
export async function importProject(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const unzipped = unzipSync(new Uint8Array(buffer));

  const manifestBytes = unzipped['manifest.json'];
  if (!manifestBytes) throw new Error('Invalid .staves file: missing manifest.json');

  const manifest: Manifest = JSON.parse(strFromU8(manifestBytes));

  if (manifest.version !== 1) {
    throw new Error(`Unsupported .staves version: ${manifest.version}`);
  }

  await db.transaction('rw', [db.projects, db.tracks, db.clips, db.audioBlobs], async () => {
    await db.projects.put(manifest.project);

    for (const track of manifest.tracks) {
      await db.tracks.put(track);
    }

    for (const clip of manifest.clips) {
      await db.clips.put(clip);
    }

    for (const blobMeta of manifest.audioBlobs) {
      const ext = blobMeta.format === 'webm-opus' ? 'webm' : 'm4a';
      const audioBytes = unzipped[`audio/${blobMeta.id}.${ext}`];
      if (!audioBytes) {
        throw new Error(`Missing audio file: audio/${blobMeta.id}.${ext}`);
      }

      const mimeType = blobMeta.format === 'webm-opus' ? 'audio/webm' : 'audio/mp4';
      const data = new Blob([audioBytes.buffer as ArrayBuffer], { type: mimeType });

      await db.audioBlobs.put({ ...blobMeta, data });
    }
  });

  return manifest.project.id;
}
