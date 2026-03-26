import { createRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { AudioEngine } from '@staves/audio-engine';
import { projectRepository } from '@staves/storage';
import { useProjectStore } from '@/stores/projectStore';
import { useTransportStore } from '@/stores/transportStore';
import { useUiStore } from '@/stores/uiStore';
import { useAudioEngine } from '@/hooks/useAudioEngine';
import { usePlayheadPosition } from '@/hooks/usePlayheadPosition';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useEngineSync } from '@/hooks/useEngineSync';
import { useSync } from '@/hooks/useSync';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useRecorder } from '@/hooks/useRecorder';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAudioDevices } from '@/hooks/useAudioDevices';
import { useTrackLevels } from '@/hooks/useTrackLevels';
import { AppShell } from '@/components/layout/AppShell';
import { Toolbar } from '@/components/layout/Toolbar';
import { TrackList } from '@/components/tracks/TrackList';
import { MasterTrack } from '@/components/tracks/MasterTrack';
import { Timeline } from '@/components/timeline/Timeline';
import { PreferencesWindow } from '@/components/layout/PreferencesWindow';
import { rootRoute } from './__root';

export const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/project/$projectId',
  component: DawEditorPage,
});

function DawEditorPage() {
  const { projectId } = projectRoute.useParams();
  const navigate = useNavigate();
  const project = useProjectStore((s) => s.project);
  const setProject = useProjectStore((s) => s.setProject);
  const setTracks = useProjectStore((s) => s.setTracks);
  const setClips = useProjectStore((s) => s.setClips);
  const addTrack = useProjectStore((s) => s.addTrack);
  const addClip = useProjectStore((s) => s.addClip);
  const removeClip = useProjectStore((s) => s.removeClip);
  const tracks = useProjectStore((s) => s.tracks);
  const clips = useProjectStore((s) => s.clips);
  const reset = useProjectStore((s) => s.reset);
  const setBpm = useTransportStore((s) => s.setBpm);
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const selectedClipIds = useUiStore((s) => s.selectedClipIds);
  const deselectAll = useUiStore((s) => s.deselectAll);
  const selectClip = useUiStore((s) => s.selectClip);

  // Preferences window
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Sync / collaboration
  const [roomId, setRoomId] = useState<string | null>(null);
  const { status: connectionStatus, peerCount, getProvider, getBlobTransfer } = useSync(roomId);

  // Audio devices
  const {
    inputs, outputs,
    selectedInputId, selectedOutputId,
    selectInput, selectOutput,
    permissionGranted, requestPermission,
  } = useAudioDevices();

  // Core hooks
  useAudioEngine();
  usePlayheadPosition();
  useAutoSave();
  const { trackNodesRef } = useEngineSync();
  const trackLevels = useTrackLevels(trackNodesRef);
  const { undo, redo } = useUndoRedo(getProvider);
  const { startRecording, stopRecording, level: recordingLevel } = useRecorder();
  const isRecording = useTransportStore((s) => s.isRecording);
  const hasArmedTrack = tracks.some((t) => t.isArmed);

  // Apply output device on change
  useEffect(() => {
    if (!selectedOutputId) return;
    try {
      const engine = AudioEngine.getInstance();
      engine.setOutputDevice(selectedOutputId);
    } catch {
      // Engine not ready
    }
  }, [selectedOutputId]);

  // Load project data from IndexedDB
  useEffect(() => {
    async function load() {
      const p = await projectRepository.getProject(projectId);
      if (!p) {
        navigate({ to: '/' });
        return;
      }
      setProject(p);
      setBpm(p.bpm);
      const loadedTracks = await projectRepository.getTracks(projectId);
      setTracks(loadedTracks);
      const loadedClips = await projectRepository.getClips(projectId);
      setClips(loadedClips);
    }
    load();
    return () => reset();
  }, [projectId, navigate, setProject, setTracks, setClips, setBpm, reset]);

  // --- Transport handlers ---
  const { play, stop } = useTransportHooks();

  // --- Recording ---
  const handleRecord = useCallback(async () => {
    const armedTrack = tracks.find((t) => t.isArmed);
    if (!armedTrack) return;
    const deviceId = armedTrack.inputDeviceId || selectedInputId || undefined;
    await startRecording(armedTrack.id, deviceId);
  }, [tracks, startRecording, selectedInputId]);

  const handleStopRecord = useCallback(async () => {
    const result = await stopRecording();
    if (!result) return;

    const armedTrack = tracks.find((t) => t.isArmed);
    if (!armedTrack || !project) return;

    const clip = await projectRepository.createClip({
      trackId: armedTrack.id,
      projectId: project.id,
      audioBlobId: result.audioBlobId,
      name: `Recording ${clips.length + 1}`,
      startBeat: result.startBeat,
      durationBeats: result.durationBeats,
      offsetBeats: 0,
      gainDb: 0,
    });
    addClip(clip);

    // Send the recorded audio blob to connected peers
    const blobTransfer = getBlobTransfer();
    if (blobTransfer) {
      const arrayBuffer = await result.blob.arrayBuffer();
      blobTransfer.sendBlob(
        result.audioBlobId,
        arrayBuffer,
        result.format,
        result.sampleRate,
        result.durationSeconds,
        project.id,
      );
    }
  }, [stopRecording, tracks, project, clips.length, addClip, getBlobTransfer]);

  // --- Track management ---
  const handleAddTrack = useCallback(async () => {
    if (!project) return;
    const currentTracks = useProjectStore.getState().tracks;
    const track = await projectRepository.createTrack(project.id, `Track ${currentTracks.length + 1}`);
    addTrack(track);
  }, [project, addTrack]);

  // --- Clip deletion ---
  const handleDeleteSelected = useCallback(() => {
    for (const clipId of selectedClipIds) {
      removeClip(clipId);
      projectRepository.deleteClip(clipId);
    }
    deselectAll();
  }, [selectedClipIds, removeClip, deselectAll]);

  // --- Select all ---
  const handleSelectAll = useCallback(() => {
    for (const clip of clips) {
      selectClip(clip.id, true);
    }
  }, [clips, selectClip]);

  // --- Session management ---
  const handleCreateSession = useCallback(() => {
    setRoomId(crypto.randomUUID());
  }, []);

  const handleJoinSession = useCallback((id: string) => {
    setRoomId(id);
  }, []);

  const handleShareRoom = useCallback(() => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
    }
  }, [roomId]);

  // --- Keyboard shortcuts ---
  const shortcutHandlers = useMemo(
    () => ({
      onPlay: play,
      onStop: stop,
      isPlaying,
      onRecord: handleRecord,
      onStopRecord: handleStopRecord,
      isRecording,
      onUndo: undo,
      onRedo: redo,
      onDelete: handleDeleteSelected,
      onSelectAll: handleSelectAll,
      onDeselectAll: deselectAll,
    }),
    [play, stop, isPlaying, handleRecord, handleStopRecord, isRecording, undo, redo, handleDeleteSelected, handleSelectAll, deselectAll],
  );
  useKeyboardShortcuts(shortcutHandlers);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <span className="text-zinc-500">Loading...</span>
      </div>
    );
  }

  return (
    <>
      <AppShell
        toolbar={
          <Toolbar
            projectName={project.name}
            isRecording={isRecording}
            hasArmedTrack={hasArmedTrack}
            onRecord={handleRecord}
            onStopRecord={handleStopRecord}
            onOpenPreferences={() => setPrefsOpen(true)}
            onNavigateHome={() => navigate({ to: '/' })}
          />
        }
        trackList={<TrackList onAddTrack={handleAddTrack} recordingLevel={recordingLevel} audioInputs={inputs} trackLevels={trackLevels} />}
        masterTrack={<MasterTrack outputs={outputs} selectedOutputId={selectedOutputId} onSelectOutput={selectOutput} />}
        timeline={<Timeline />}
        connectionStatus={connectionStatus}
        peerCount={peerCount}
        roomId={roomId}
        onShareRoom={handleShareRoom}
      />

      <PreferencesWindow
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        initialTab="audio"
        inputs={inputs}
        outputs={outputs}
        selectedInputId={selectedInputId}
        selectedOutputId={selectedOutputId}
        onSelectInput={selectInput}
        onSelectOutput={selectOutput}
        permissionGranted={permissionGranted}
        onRequestPermission={requestPermission}
        currentRoomId={roomId}
        onCreateSession={handleCreateSession}
        onJoinSession={handleJoinSession}
        connectionStatus={connectionStatus}
        peerCount={peerCount}
        projectId={project.id}
        projectName={project.name}
        onImported={(id) => navigate({ to: '/project/$projectId', params: { projectId: id } })}
      />
    </>
  );
}

/** Extract play/stop to avoid re-importing useTransport hook (which has its own state). */
function useTransportHooks() {
  const play = useCallback(() => {
    const engine = AudioEngine.getInstance();
    engine.init().then(() => {
      engine.transport.play();
      useTransportStore.getState().setPlayOrigin(engine.transport.playOrigin);
      useTransportStore.getState().setPlaying(true);
    });
  }, []);

  const stop = useCallback(() => {
    const engine = AudioEngine.getInstance();
    engine.transport.stop();
    // Sync the beat back to play origin
    useTransportStore.getState().setCurrentBeat(engine.transport.currentBeat);
    useTransportStore.getState().setPlaying(false);
    useTransportStore.getState().setRecording(false);
  }, []);

  return { play, stop };
}
