import { db, type Project, type Track, type Clip, type DrumPattern, type TrackType, type Marker } from './db';

function generateId(): string {
  return crypto.randomUUID();
}

const TRACK_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

export const projectRepository = {
  // --- Projects ---

  async createProject(name: string, bpm = 120): Promise<Project> {
    const now = Date.now();
    const project: Project = {
      id: generateId(),
      name,
      bpm,
      timeSignatureNumerator: 4,
      timeSignatureDenominator: 4,
      sampleRate: 48000,
      createdAt: now,
      updatedAt: now,
      tempoEvents: [
        { id: generateId(), beat: 0, bpm, curveType: 'constant' as const },
      ],
      timeSignatureEvents: [
        { id: generateId(), beat: 0, numerator: 4, denominator: 4 },
      ],
    };
    await db.projects.add(project);
    return project;
  },

  async getProject(id: string): Promise<Project | undefined> {
    return db.projects.get(id);
  },

  async listProjects(): Promise<Project[]> {
    return db.projects.orderBy('updatedAt').reverse().toArray();
  },

  async updateProject(id: string, changes: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<void> {
    await db.projects.update(id, { ...changes, updatedAt: Date.now() });
  },

  async deleteProject(id: string): Promise<void> {
    await db.transaction('rw', [db.projects, db.tracks, db.clips, db.audioBlobs, db.waveformCache, db.drumPatterns, db.markers], async () => {
      const clips = await db.clips.where('projectId').equals(id).toArray();
      const audioBlobIds = [...new Set(clips.map((c) => c.audioBlobId).filter(Boolean))];

      await db.clips.where('projectId').equals(id).delete();
      await db.tracks.where('projectId').equals(id).delete();
      await db.drumPatterns.where('projectId').equals(id).delete();
      await db.markers.where('projectId').equals(id).delete();
      await db.audioBlobs.where('projectId').equals(id).delete();
      for (const blobId of audioBlobIds) {
        await db.waveformCache.delete(blobId);
      }
      await db.projects.delete(id);
    });
  },

  // --- Tracks ---

  async createTrack(projectId: string, name: string, type: TrackType = 'audio'): Promise<Track> {
    const existing = await db.tracks.where('projectId').equals(projectId).count();
    const track: Track = {
      id: generateId(),
      projectId,
      name,
      order: existing,
      volume: 1,
      pan: 0,
      isMuted: false,
      isSolo: false,
      isArmed: false,
      color: TRACK_COLORS[existing % TRACK_COLORS.length]!,
      inputDeviceId: '',
      inputChannel: -1,
      type,
    };
    await db.tracks.add(track);
    await db.projects.update(projectId, { updatedAt: Date.now() });
    return track;
  },

  async getTracks(projectId: string): Promise<Track[]> {
    return db.tracks.where('projectId').equals(projectId).sortBy('order');
  },

  async updateTrack(id: string, changes: Partial<Omit<Track, 'id' | 'projectId'>>): Promise<void> {
    await db.tracks.update(id, changes);
  },

  async deleteTrack(id: string): Promise<void> {
    await db.transaction('rw', [db.tracks, db.clips], async () => {
      await db.clips.where('trackId').equals(id).delete();
      await db.tracks.delete(id);
    });
  },

  // --- Clips ---

  async createClip(clip: Omit<Clip, 'id'>): Promise<Clip> {
    const full: Clip = { id: generateId(), ...clip };
    await db.clips.add(full);
    return full;
  },

  async getClips(projectId: string): Promise<Clip[]> {
    return db.clips.where('projectId').equals(projectId).toArray();
  },

  async getClipsForTrack(trackId: string): Promise<Clip[]> {
    return db.clips.where('trackId').equals(trackId).toArray();
  },

  async updateClip(id: string, changes: Partial<Omit<Clip, 'id'>>): Promise<void> {
    await db.clips.update(id, changes);
  },

  async deleteClip(id: string): Promise<void> {
    await db.clips.delete(id);
  },

  // --- Drum Patterns ---

  async createDrumPattern(pattern: Omit<DrumPattern, 'id'>): Promise<DrumPattern> {
    const full: DrumPattern = { id: generateId(), ...pattern };
    await db.drumPatterns.add(full);
    return full;
  },

  async getDrumPatterns(projectId: string): Promise<DrumPattern[]> {
    return db.drumPatterns.where('projectId').equals(projectId).toArray();
  },

  async getDrumPattern(id: string): Promise<DrumPattern | undefined> {
    return db.drumPatterns.get(id);
  },

  async updateDrumPattern(id: string, changes: Partial<Omit<DrumPattern, 'id'>>): Promise<void> {
    await db.drumPatterns.update(id, changes);
  },

  async deleteDrumPattern(id: string): Promise<void> {
    await db.drumPatterns.delete(id);
  },

  // --- Markers ---

  async createMarker(marker: Omit<Marker, 'id'>): Promise<Marker> {
    const full: Marker = { id: generateId(), ...marker };
    await db.markers.add(full);
    return full;
  },

  async getMarkers(projectId: string): Promise<Marker[]> {
    return db.markers.where('projectId').equals(projectId).sortBy('beat');
  },

  async updateMarker(id: string, changes: Partial<Omit<Marker, 'id'>>): Promise<void> {
    await db.markers.update(id, changes);
  },

  async deleteMarker(id: string): Promise<void> {
    await db.markers.delete(id);
  },
};
