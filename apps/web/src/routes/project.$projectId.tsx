import { createRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { AudioEngine, DEFAULT_DRUM_KIT } from '@staves/audio-engine';
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
import { MetronomeTrack } from '@/components/tracks/MetronomeTrack';
import { Timeline } from '@/components/timeline/Timeline';
import { MetronomeLane } from '@/components/timeline/MetronomeLane';
import { MasterLane } from '@/components/timeline/MasterLane';
import { PreferencesWindow } from '@/components/layout/PreferencesWindow';
import { StepSequencer } from '@/components/sequencer/StepSequencer';
import { rootRoute } from './__root';

export const projectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/project/$projectId',
  component: DawEditorPage,
  validateSearch: (search: Record<string, unknown>) => ({
    roomId: typeof search.roomId === 'string' ? search.roomId : undefined,
  }),
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
  const drumPatterns = useProjectStore((s) => s.drumPatterns);
  const setDrumPatterns = useProjectStore((s) => s.setDrumPatterns);
  const addDrumPattern = useProjectStore((s) => s.addDrumPattern);
  const reset = useProjectStore((s) => s.reset);
  const setBpm = useTransportStore((s) => s.setBpm);
  const isPlaying = useTransportStore((s) => s.isPlaying);
  const selectedClipIds = useUiStore((s) => s.selectedClipIds);
  const deselectAll = useUiStore((s) => s.deselectAll);
  const selectClip = useUiStore((s) => s.selectClip);
  const zoom = useUiStore((s) => s.zoom);
  const setZoom = useUiStore((s) => s.setZoom);
  const editingDrumClipId = useUiStore((s) => s.editingDrumClipId);

  // Preferences window
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Sync / collaboration — auto-connect if roomId is in the URL (join flow)
  const { roomId: urlRoomId } = projectRoute.useSearch();
  const [roomId, setRoomId] = useState<string | null>(urlRoomId ?? null);
  const isJoining = !!urlRoomId;
  const { status: connectionStatus, peerCount, getProvider, getBlobTransfer } = useSync(roomId, isJoining);

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

  // Load project data from IndexedDB.
  // When joining via roomId, the local DB may not have this project yet —
  // create a placeholder so the editor can render while Yjs syncs the real data.
  useEffect(() => {
    const isJoining = !!roomId;

    async function load() {
      const p = await projectRepository.getProject(projectId);
      if (!p && !isJoining) {
        navigate({ to: '/' });
        return;
      }

      if (p) {
        setProject(p);
        setBpm(p.bpm);
        const loadedTracks = await projectRepository.getTracks(projectId);
        setTracks(loadedTracks);
        const loadedClips = await projectRepository.getClips(projectId);
        setClips(loadedClips);
        const loadedPatterns = await projectRepository.getDrumPatterns(projectId);
        setDrumPatterns(loadedPatterns);
      } else {
        // Joining a remote session — set a skeleton project so the UI renders.
        // Yjs sync (via projectSync hydration) will replace this with the real data.
        setProject({
          id: projectId,
          name: 'Joining...',
          bpm: 120,
          timeSignatureNumerator: 4,
          timeSignatureDenominator: 4,
          sampleRate: 48000,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setBpm(120);
      }
    }
    load();
    return () => reset();
  }, [projectId, navigate, setProject, setTracks, setClips, setDrumPatterns, setBpm, reset, roomId]);

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
      sourceDurationBeats: result.durationBeats,
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

  const handleAddDrumTrack = useCallback(async () => {
    if (!project) return;
    const currentTracks = useProjectStore.getState().tracks;
    const track = await projectRepository.createTrack(
      project.id,
      `Drums ${currentTracks.filter((t) => t.type === 'drum').length + 1}`,
      'drum',
    );
    addTrack(track);

    // Create a default 16-step drum pattern
    const pads = DEFAULT_DRUM_KIT.map((sound, i) => ({
      index: i,
      name: sound.name,
      sampleUrl: sound.url,
    }));
    const pattern = await projectRepository.createDrumPattern({
      projectId: project.id,
      steps: 16,
      stepsPerBeat: 4,
      activeSteps: [],
      pads,
    });
    addDrumPattern(pattern);

    // Create a clip at beat 0 referencing this pattern
    const durationBeats = 16 / 4; // 16 steps / 4 steps-per-beat = 4 beats
    const clip = await projectRepository.createClip({
      trackId: track.id,
      projectId: project.id,
      audioBlobId: '',
      name: 'Pattern 1',
      startBeat: 0,
      durationBeats,
      offsetBeats: 0,
      gainDb: 0,
      sourceDurationBeats: durationBeats,
      drumPatternId: pattern.id,
    });
    addClip(clip);
  }, [project, addTrack, addDrumPattern, addClip]);

  // --- Create drum clip on timeline double-click ---
  const handleCreateDrumClip = useCallback(async (trackId: string, startBeat: number) => {
    if (!project) return;
    const pads = DEFAULT_DRUM_KIT.map((sound, i) => ({
      index: i,
      name: sound.name,
      sampleUrl: sound.url,
    }));
    const pattern = await projectRepository.createDrumPattern({
      projectId: project.id,
      steps: 16,
      stepsPerBeat: 4,
      activeSteps: [],
      pads,
    });
    addDrumPattern(pattern);

    const durationBeats = 16 / 4;
    const currentClips = useProjectStore.getState().clips;
    const trackClipCount = currentClips.filter((c) => c.trackId === trackId && c.drumPatternId).length;
    const clip = await projectRepository.createClip({
      trackId,
      projectId: project.id,
      audioBlobId: '',
      name: `Pattern ${trackClipCount + 1}`,
      startBeat,
      durationBeats,
      offsetBeats: 0,
      gainDb: 0,
      sourceDurationBeats: durationBeats,
      drumPatternId: pattern.id,
    });
    addClip(clip);
  }, [project, addDrumPattern, addClip]);

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

  // --- Zoom ---
  const handleZoomIn = useCallback(() => setZoom(zoom * 1.25), [zoom, setZoom]);
  const handleZoomOut = useCallback(() => setZoom(zoom / 1.25), [zoom, setZoom]);

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
      onZoomIn: handleZoomIn,
      onZoomOut: handleZoomOut,
    }),
    [play, stop, isPlaying, handleRecord, handleStopRecord, isRecording, undo, redo, handleDeleteSelected, handleSelectAll, deselectAll, handleZoomIn, handleZoomOut],
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
        trackList={<TrackList onAddTrack={handleAddTrack} onAddDrumTrack={handleAddDrumTrack} recordingLevel={recordingLevel} audioInputs={inputs} trackLevels={trackLevels} />}
        metronomeTrack={<MetronomeTrack />}
        metronomeLane={<MetronomeLane />}
        masterTrack={<MasterTrack outputs={outputs} selectedOutputId={selectedOutputId} onSelectOutput={selectOutput} />}
        masterLane={<MasterLane />}
        timeline={<Timeline onCreateDrumClip={handleCreateDrumClip} />}
        bottomPanel={(() => {
          if (!editingDrumClipId) return undefined;
          const editClip = clips.find((c) => c.id === editingDrumClipId);
          const editPattern = editClip?.drumPatternId
            ? drumPatterns.find((p) => p.id === editClip.drumPatternId)
            : undefined;
          if (!editClip || !editPattern) return undefined;
          return <StepSequencer clip={editClip} pattern={editPattern} />;
        })()}
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
        onImported={(id) => navigate({ to: '/project/$projectId', params: { projectId: id }, search: { roomId: undefined } })}
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
