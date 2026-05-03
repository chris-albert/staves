import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { projectRepository } from '../projectRepository';

beforeEach(async () => {
  await db.projects.clear();
  await db.tracks.clear();
  await db.clips.clear();
  await db.audioBlobs.clear();
  await db.waveformCache.clear();
});

describe('projectRepository', () => {
  describe('projects', () => {
    it('creates a project', async () => {
      const project = await projectRepository.createProject('Test Song', 140);
      expect(project.name).toBe('Test Song');
      expect(project.bpm).toBe(140);
      expect(project.timeSignatureNumerator).toBe(4);
      expect(project.id).toBeDefined();
    });

    it('lists projects in reverse updated order', async () => {
      const p1 = await projectRepository.createProject('First');
      const p2 = await projectRepository.createProject('Second');
      const list = await projectRepository.listProjects();
      expect(list.map((p) => p.id)).toEqual([p2.id, p1.id]);
    });

    it('gets a project by id', async () => {
      const created = await projectRepository.createProject('Test');
      const found = await projectRepository.getProject(created.id);
      expect(found?.name).toBe('Test');
    });

    it('updates a project', async () => {
      const project = await projectRepository.createProject('Old Name');
      await projectRepository.updateProject(project.id, { name: 'New Name' });
      const updated = await projectRepository.getProject(project.id);
      expect(updated?.name).toBe('New Name');
    });

    it('deletes a project and associated data', async () => {
      const project = await projectRepository.createProject('To Delete');
      const track = await projectRepository.createTrack(project.id, 'Track 1');
      expect(track).toBeDefined();
      await projectRepository.deleteProject(project.id);
      const found = await projectRepository.getProject(project.id);
      expect(found).toBeUndefined();
      const tracks = await projectRepository.getTracks(project.id);
      expect(tracks).toHaveLength(0);
    });
  });

  describe('tracks', () => {
    it('creates a track with auto-incrementing order', async () => {
      const project = await projectRepository.createProject('Test');
      const t1 = await projectRepository.createTrack(project.id, 'Track 1');
      const t2 = await projectRepository.createTrack(project.id, 'Track 2');
      expect(t1.order).toBe(0);
      expect(t2.order).toBe(1);
    });

    it('assigns different colors to tracks', async () => {
      const project = await projectRepository.createProject('Test');
      const t1 = await projectRepository.createTrack(project.id, 'A');
      const t2 = await projectRepository.createTrack(project.id, 'B');
      expect(t1.color).not.toBe(t2.color);
    });

    it('gets tracks for a project sorted by order', async () => {
      const project = await projectRepository.createProject('Test');
      await projectRepository.createTrack(project.id, 'B');
      await projectRepository.createTrack(project.id, 'A');
      const tracks = await projectRepository.getTracks(project.id);
      expect(tracks.map((t) => t.name)).toEqual(['B', 'A']);
      expect(tracks[0]!.order).toBe(0);
      expect(tracks[1]!.order).toBe(1);
    });

    it('deletes a track and its clips', async () => {
      const project = await projectRepository.createProject('Test');
      const track = await projectRepository.createTrack(project.id, 'Track 1');
      await projectRepository.createClip({
        trackId: track.id,
        projectId: project.id,
        audioBlobId: 'blob-1',
        name: 'Clip 1',
        startBeat: 0,
        durationBeats: 4,
        offsetBeats: 0,
        gainDb: 0,
        fadeInBeats: 0,
        fadeOutBeats: 0,
        sourceDurationBeats: 4,
      });
      await projectRepository.deleteTrack(track.id);
      const tracks = await projectRepository.getTracks(project.id);
      expect(tracks).toHaveLength(0);
      const clips = await projectRepository.getClipsForTrack(track.id);
      expect(clips).toHaveLength(0);
    });
  });

  describe('clips', () => {
    it('creates and retrieves clips', async () => {
      const project = await projectRepository.createProject('Test');
      const track = await projectRepository.createTrack(project.id, 'Track 1');
      const clip = await projectRepository.createClip({
        trackId: track.id,
        projectId: project.id,
        audioBlobId: 'blob-1',
        name: 'Clip 1',
        startBeat: 4,
        durationBeats: 8,
        offsetBeats: 0,
        gainDb: -3,
        fadeInBeats: 0,
        fadeOutBeats: 0,
        sourceDurationBeats: 8,
      });
      expect(clip.startBeat).toBe(4);

      const clips = await projectRepository.getClips(project.id);
      expect(clips).toHaveLength(1);
      expect(clips[0]!.name).toBe('Clip 1');
    });

    it('updates a clip', async () => {
      const project = await projectRepository.createProject('Test');
      const track = await projectRepository.createTrack(project.id, 'Track 1');
      const clip = await projectRepository.createClip({
        trackId: track.id,
        projectId: project.id,
        audioBlobId: 'blob-1',
        name: 'Clip 1',
        startBeat: 0,
        durationBeats: 4,
        offsetBeats: 0,
        gainDb: 0,
        fadeInBeats: 0,
        fadeOutBeats: 0,
        sourceDurationBeats: 4,
      });
      await projectRepository.updateClip(clip.id, { startBeat: 8 });
      const clips = await projectRepository.getClipsForTrack(track.id);
      expect(clips[0]!.startBeat).toBe(8);
    });
  });
});
