/**
 * Unit tests for PremiereProTools
 */

import { PremiereProTools } from '../../tools/index.js';
import { PremiereProBridge } from '../../bridge/index.js';

jest.mock('../../bridge/index.js');

describe('PremiereProTools', () => {
  let tools: PremiereProTools;
  let mockBridge: jest.Mocked<PremiereProBridge>;

  beforeEach(() => {
    mockBridge = new PremiereProBridge() as jest.Mocked<PremiereProBridge>;
    tools = new PremiereProTools(mockBridge);
    jest.clearAllMocks();
  });

  describe('getAvailableTools()', () => {
    it('returns the current tool catalog', () => {
      const availableTools = tools.getAvailableTools();
      const toolNames = availableTools.map((tool) => tool.name);

      expect(availableTools.length).toBeGreaterThan(50);
      expect(toolNames).toContain('list_project_items');
      expect(toolNames).toContain('build_motion_graphics_demo');
      expect(toolNames).toContain('assemble_product_spot');
      expect(toolNames).toContain('build_brand_spot_from_mogrt_and_assets');
      expect(toolNames).toContain('import_media');
      expect(toolNames).toContain('add_to_timeline');
      expect(toolNames).toContain('place_clip_segment');
      expect(toolNames).toContain('ripple_delete_range');
      expect(toolNames).toContain('get_track_clips');
      expect(toolNames).toContain('import_mogrt');
      expect(toolNames).toContain('setup_ducking');
      expect(toolNames).not.toContain('create_nested_sequence');
      expect(toolNames).not.toContain('unnest_sequence');
    });

    it('returns valid tool metadata', () => {
      for (const tool of tools.getAvailableTools()) {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toBeDefined();
      }
    });
  });

  describe('executeTool()', () => {
    it('returns a clear error for unknown tools', async () => {
      const result = await tools.executeTool('unknown_tool', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('validates tool arguments with zod', async () => {
      const result = await tools.executeTool('create_project', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid arguments');
    });

    it('converts bridge exceptions into tool errors', async () => {
      mockBridge.executeScript.mockRejectedValue(new Error('Bridge error'));

      const result = await tools.executeTool('list_project_items', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Tool execution failed');
    });
  });

  describe('bridge-backed wrappers', () => {
    it('surfaces create_project bridge failures instead of claiming success', async () => {
      mockBridge.createProject = jest.fn().mockResolvedValue({
        success: false,
        error: 'Premiere Pro did not create or activate the requested project',
        projectPath: '/tmp/Test.prproj'
      } as any);

      const result = await tools.executeTool('create_project', {
        name: 'Test',
        location: '/tmp'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('did not create');
      expect(result.projectPath).toBe('/tmp/Test.prproj');
    });

    it('surfaces open_project bridge failures instead of claiming success', async () => {
      mockBridge.openProject = jest.fn().mockResolvedValue({
        success: false,
        error: 'Premiere Pro did not activate the requested project',
        projectPath: '/tmp/Target.prproj',
        actualPath: '/tmp/AlreadyOpen.prproj'
      } as any);

      const result = await tools.executeTool('open_project', {
        path: '/tmp/Target.prproj'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('did not activate');
      expect(result.actualPath).toBe('/tmp/AlreadyOpen.prproj');
    });

    it('does not run automatic create_sequence recovery after a bridge timeout', async () => {
      mockBridge.createSequence = jest.fn().mockRejectedValue(new Error('Bridge response timeout'));

      const result = await tools.executeTool('create_sequence', {
        name: 'Possibly Created Sequence'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bridge response timeout');
      expect(result.warning).toContain('does not run automatic recovery');
      expect(mockBridge.executeScript).not.toHaveBeenCalled();
    });

    it('surfaces create_sequence bridge failures without timeout recovery guidance', async () => {
      mockBridge.createSequence = jest.fn().mockRejectedValue(new Error('Premiere rejected the preset'));

      const result = await tools.executeTool('create_sequence', {
        name: 'Missing Sequence'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Premiere rejected the preset');
      expect(result.warning).toBeUndefined();
    });

    it('passes through successful imports', async () => {
      mockBridge.importMedia = jest.fn().mockResolvedValue({
        success: true,
        id: 'item-123',
        name: 'video.mp4',
        type: 'footage',
        mediaPath: '/path/to/video.mp4'
      });

      const result = await tools.executeTool('import_media', {
        filePath: '/path/to/video.mp4'
      });

      expect(mockBridge.importMedia).toHaveBeenCalledWith('/path/to/video.mp4');
      expect(result.success).toBe(true);
      expect(result.id).toBe('item-123');
    });

    it('surfaces import failures instead of claiming success', async () => {
      mockBridge.importMedia = jest.fn().mockResolvedValue({
        success: false,
        error: 'Import failed'
      } as any);

      const result = await tools.executeTool('import_media', {
        filePath: '/path/to/video.mp4'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import failed');
    });

    it('adds an actionable modal warning when import_media times out', async () => {
      mockBridge.importMedia = jest.fn().mockRejectedValue(new Error('Bridge response timeout'));

      const result = await tools.executeTool('import_media', {
        filePath: '/path/to/captions.ass'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Bridge response timeout');
      expect(result.warning).toContain('blocking modal dialog');
    });

    it('passes through successful timeline placement', async () => {
      mockBridge.addToTimeline = jest.fn().mockResolvedValue({
        success: true,
        id: 'clip-123',
        name: 'video.mp4'
      } as any);

      const result = await tools.executeTool('add_to_timeline', {
        sequenceId: 'seq-123',
        projectItemId: 'item-456',
        trackIndex: 0,
        time: 0
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe('clip-123');
    });

    it('surfaces timeline placement failures instead of claiming success', async () => {
      mockBridge.addToTimeline = jest.fn().mockResolvedValue({
        success: false,
        error: 'Track not found'
      } as any);

      const result = await tools.executeTool('add_to_timeline', {
        sequenceId: 'seq-123',
        projectItemId: 'item-456',
        trackIndex: 99,
        time: 0
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Track not found');
    });
  });

  describe('script-backed tools', () => {
    it('executes list_project_items', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        items: [],
        bins: [],
        totalItems: 0,
        totalBins: 0
      });

      const result = await tools.executeTool('list_project_items', {});

      expect(mockBridge.executeScript).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('uses current argument names for split_clip', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        clips: ['clip-a', 'clip-b']
      });

      const result = await tools.executeTool('split_clip', {
        clipId: 'clip-123',
        splitTime: 5.5
      });

      expect(mockBridge.executeScript).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('supports razoring a timeline across multiple tracks', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        sequenceId: 'seq-123',
        time: 12.5,
        timecode: '00:00:12:15',
        cutVideoTracks: [0, 1],
        cutAudioTracks: [0, 2, 3]
      });

      const result = await tools.executeTool('razor_timeline_at_time', {
        sequenceId: 'seq-123',
        time: 12.5,
        videoTrackIndices: [0, 1],
        audioTrackIndices: [0, 2, 3]
      });

      expect(mockBridge.executeScript).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.cutVideoTracks).toEqual([0, 1]);
      expect(result.cutAudioTracks).toEqual([0, 2, 3]);
    });

    it('does not razor audio tracks when only videoTrackIndices is provided', async () => {
      // Pre-fix: the omitted track-type array defaulted to "all tracks", so a caller
      // restricting the cut to one video track still razored every audio track
      // (live-confirmed June 11, 2026 as "razor ignores the track parameters").
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('razor_timeline_at_time', {
        sequenceId: 'seq-123',
        time: 5,
        videoTrackIndices: [1]
      });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var requestedVideo = [1];');
      expect(script).toContain('var requestedAudio = [];');
    });

    it('still razors all tracks when both index arrays are omitted', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('razor_timeline_at_time', {
        sequenceId: 'seq-123',
        time: 5
      });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var requestedVideo = null;');
      expect(script).toContain('var requestedAudio = null;');
      expect(script).toContain('if (requested === null)');
    });

    it('validates crop_clip bounds before calling the bridge', async () => {
      const result = await tools.executeTool('crop_clip', {
        clipId: 'clip-123',
        left: 101
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid arguments');
      expect(mockBridge.executeScript).not.toHaveBeenCalled();
    });

    it('returns an explicit unsupported result for caption track deletion', async () => {
      const result = await tools.executeTool('delete_track', {
        sequenceId: 'seq-123',
        trackType: 'caption',
        trackIndex: 0
      });

      expect(result.success).toBe(false);
      expect(result.unsupportedByPremiereApi).toBe(true);
      expect(result.error).toContain('Caption track deletion is not supported');
      expect(mockBridge.executeScript).not.toHaveBeenCalled();
    });

    it('executes crop_clip through the dedicated Crop implementation', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        effectName: 'Crop',
        effectAdded: true,
        paramResults: [
          { requestedName: 'Left', ok: true, valueAfter: 12 },
          { requestedName: 'Bottom', ok: true, valueAfter: 25 }
        ]
      });

      const result = await tools.executeTool('crop_clip', {
        clipId: 'clip-123',
        left: 12,
        bottom: 25,
        zoom: true
      });

      expect(result.success).toBe(true);
      expect(result.effectName).toBe('Crop');
      expect(mockBridge.executeScript).toHaveBeenCalledTimes(1);
      const script = mockBridge.executeScript.mock.calls[0][0];
      expect(script).toContain('getVideoEffectByName("Crop")');
      expect(script).toContain('findQeClipByTime');
      expect(script).toContain('"Left":12');
      expect(script).toContain('"Bottom":25');
      expect(script).toContain('"Zoom":true');
    });

    it('uses current argument names for add_transition', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        transitionId: 'trans-123'
      });

      const result = await tools.executeTool('add_transition', {
        clipId1: 'clip-1',
        clipId2: 'clip-2',
        transitionName: 'Cross Dissolve',
        duration: 0.75
      });

      expect(mockBridge.executeScript).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('looks up clip properties in the requested sequence', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true, properties: {} });

      const result = await tools.executeTool('get_clip_properties', {
        clipId: 'clip-123',
        sequenceId: 'seq-456'
      });

      expect(result.success).toBe(true);
      expect(mockBridge.executeScript).toHaveBeenCalledWith(expect.stringContaining('__findClip("clip-123", "seq-456")'));
    });

    it('removes clips from the requested sequence', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true, clipId: 'clip-123' });

      const result = await tools.executeTool('remove_from_timeline', {
        clipId: 'clip-123',
        sequenceId: 'seq-456',
        deleteMode: 'lift'
      });

      expect(result.success).toBe(true);
      expect(mockBridge.executeScript).toHaveBeenCalledWith(expect.stringContaining('__findClip("clip-123", "seq-456")'));
      expect(mockBridge.executeScript).toHaveBeenCalledWith(expect.stringContaining('var isRipple = "lift" === "ripple";'));
    });
  });

  describe('move_clip', () => {
    it('fails honestly when newTrackIndex differs from the current track instead of silently ignoring it', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: false,
        error: "move_clip cannot move clips across tracks: Premiere's scripting API has no track-move call (TrackItem.move only shifts in time). The clip stays on video track 1.",
        hint: 'Use place_clip_segment to place the same source range on the target track, then remove_from_timeline for the original clip.'
      });

      const result = await tools.executeTool('move_clip', {
        clipId: 'clip-123',
        newTime: 10,
        newTrackIndex: 3
      });

      expect(result.success).toBe(false);
      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('if (3 !== info.trackIndex)');
      expect(script).toContain('cannot move clips across tracks');
      expect(script).toContain('place_clip_segment');
    });

    it('omits the cross-track guard when no newTrackIndex is given', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('move_clip', {
        clipId: 'clip-123',
        newTime: 10
      });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).not.toContain('cannot move clips across tracks');
    });

    it('verifies the clip actually landed at the requested time', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('move_clip', {
        clipId: 'clip-123',
        newTime: 42.5
      });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var actualTime = clip.start.seconds;');
      expect(script).toContain('Math.abs(actualTime - 42.5) > 0.1');
      expect(script).toContain('did not move the clip');
    });
  });

  describe('place_clip_segment', () => {
    const baseArgs = {
      sequenceId: 'seq-1',
      projectItemId: 'item-9',
      trackIndex: 2,
      trackType: 'video',
      time: 12.5,
      sourceIn: 3,
      sourceOut: 7.25
    };

    it('rejects sourceOut <= sourceIn before calling the bridge', async () => {
      const result = await tools.executeTool('place_clip_segment', {
        ...baseArgs,
        sourceIn: 5,
        sourceOut: 5
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('sourceOut');
      expect(mockBridge.executeScript).not.toHaveBeenCalled();
    });

    it('sets temporary source in/out points and places via overwriteClip in one script', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('place_clip_segment', baseArgs);

      expect(mockBridge.executeScript).toHaveBeenCalledTimes(1);
      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('projectItem.setInPoint(__secondsToTicks(3), 4);');
      expect(script).toContain('projectItem.setOutPoint(__secondsToTicks(7.25), 4);');
      expect(script).toContain('track.overwriteClip(projectItem, 12.5);');
      expect(script).toContain('projectItem.clearInPoint(4);');
      expect(script).toContain('projectItem.clearOutPoint(4);');
    });

    it('restores the original panel in/out points when clearing is unavailable', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('place_clip_segment', baseArgs);

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('originalIn = projectItem.getInPoint(4).ticks;');
      expect(script).toContain('if (originalIn !== null) projectItem.setInPoint(originalIn, 4);');
    });

    it('uses insertClip when insertMode is insert', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('place_clip_segment', { ...baseArgs, insertMode: 'insert' });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('track.insertClip(projectItem, 12.5);');
    });

    it('verifies the placed track item and its source range instead of trusting the placement call', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('place_clip_segment', baseArgs);

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('did not produce a track item');
      expect(script).toContain('source range does not match');
      expect(script).toContain('Math.abs(placedClip.inPoint.seconds - 3) <= tolerance');
    });

    it('removes the auto-linked audio counterpart when linkAudio is false', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('place_clip_segment', { ...baseArgs, linkAudio: false });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var removeLinkedAudio = true;');
    });

    it('keeps the linked audio by default', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('place_clip_segment', baseArgs);

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var removeLinkedAudio = false;');
    });

    it('escapes quotes in injected ids', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('place_clip_segment', { ...baseArgs, sequenceId: 'seq-"quoted"' });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('seq-\\"quoted\\"');
    });

    it('passes through verified bridge failures', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: false,
        error: 'Track item was placed but its source range does not match the requested segment (the full clip may have been placed instead)',
        placed: true,
        clipId: 'clip-77'
      });

      const result = await tools.executeTool('place_clip_segment', baseArgs);

      expect(result.success).toBe(false);
      expect(result.placed).toBe(true);
      expect(result.clipId).toBe('clip-77');
    });
  });

  describe('ripple_delete_range', () => {
    const baseArgs = {
      sequenceId: 'seq-1',
      startTime: 10,
      endTime: 15
    };

    it('rejects endTime <= startTime before calling the bridge', async () => {
      const result = await tools.executeTool('ripple_delete_range', {
        ...baseArgs,
        endTime: 10
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('endTime');
      expect(mockBridge.executeScript).not.toHaveBeenCalled();
    });

    it('razors all tracks at both boundaries and shifts in a single bridge call', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('ripple_delete_range', baseArgs);

      expect(mockBridge.executeScript).toHaveBeenCalledTimes(1);
      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var startTime = 10;');
      expect(script).toContain('var endTime = 15;');
      expect(script).toContain('razorAll(toTimecode(startTime));');
      expect(script).toContain('razorAll(toTimecode(endTime));');
      expect(script).toContain('toShift.sort(function (x, y) { return x.start - y.start; });');
      expect(script).toContain('.move(-delta)');
      expect(script).toContain('processTracks(activeSequence.videoTracks, "V");');
      expect(script).toContain('processTracks(activeSequence.audioTracks, "A");');
    });

    it('shifts markers by default and can be disabled', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('ripple_delete_range', baseArgs);
      let script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var shiftMarkersEnabled = true;');

      mockBridge.executeScript.mockClear();
      mockBridge.executeScript.mockResolvedValue({ success: true });

      await tools.executeTool('ripple_delete_range', { ...baseArgs, shiftMarkers: false });
      script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var shiftMarkersEnabled = false;');
    });

    it('passes through partial-failure results with problem details', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: false,
        error: 'Ripple delete only partially applied — the timeline may be in an inconsistent state. Use the undo tool to roll back.',
        problems: [{ track: 'V1', start: 11, reason: 'remove failed: locked' }],
        removedClips: 3,
        shiftedClips: 40
      });

      const result = await tools.executeTool('ripple_delete_range', baseArgs);

      expect(result.success).toBe(false);
      expect(result.problems).toHaveLength(1);
      expect(result.error).toContain('undo');
    });

    it('passes through successful results', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        removedClips: 6,
        shiftedClips: 162,
        shiftedMarkers: 4,
        clampedMarkers: 1,
        delta: 5
      });

      const result = await tools.executeTool('ripple_delete_range', baseArgs);

      expect(result.success).toBe(true);
      expect(result.shiftedClips).toBe(162);
      expect(result.delta).toBe(5);
    });
  });

  describe('get_track_clips', () => {
    it('targets the requested track collection and returns source points per clip', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true, clips: [] });

      await tools.executeTool('get_track_clips', {
        sequenceId: 'seq-1',
        trackType: 'audio',
        trackIndex: 3
      });

      const script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('"audio" === "audio" ? sequence.audioTracks : sequence.videoTracks');
      expect(script).toContain('var tracks = ');
      expect(script).toContain('inPoint: clip.inPoint.seconds');
      expect(script).toContain('outPoint: clip.outPoint.seconds');
      expect(script).toContain('id: clip.nodeId');
    });

    it('injects the time window when provided and null when omitted', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true, clips: [] });

      await tools.executeTool('get_track_clips', {
        sequenceId: 'seq-1',
        trackType: 'video',
        trackIndex: 0,
        fromTime: 30,
        toTime: 90
      });
      let script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var fromTime = 30;');
      expect(script).toContain('var toTime = 90;');

      mockBridge.executeScript.mockClear();
      mockBridge.executeScript.mockResolvedValue({ success: true, clips: [] });

      await tools.executeTool('get_track_clips', {
        sequenceId: 'seq-1',
        trackType: 'video',
        trackIndex: 0
      });
      script = mockBridge.executeScript.mock.calls[0][0] as string;
      expect(script).toContain('var fromTime = null;');
      expect(script).toContain('var toTime = null;');
    });

    it('passes through the filtered clip list', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        trackType: 'video',
        trackIndex: 2,
        clipCount: 1,
        totalClipsOnTrack: 40,
        clips: [{ id: 'clip-5', name: 'broll.mp4', start: 30, end: 34, duration: 4, inPoint: 2, outPoint: 6 }]
      });

      const result = await tools.executeTool('get_track_clips', {
        sequenceId: 'seq-1',
        trackType: 'video',
        trackIndex: 2,
        fromTime: 29,
        toTime: 35
      });

      expect(result.success).toBe(true);
      expect(result.clips).toHaveLength(1);
      expect(result.totalClipsOnTrack).toBe(40);
    });
  });

  describe('high-level workflow tools', () => {
    it('builds a motion graphics demo sequence', async () => {
      mockBridge.createSequence = jest.fn().mockResolvedValue({
        id: 'seq-1',
        name: 'Demo Sequence'
      } as any);
      mockBridge.importMedia = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'item-1', name: '01_focus.png' } as any)
        .mockResolvedValueOnce({ success: true, id: 'item-2', name: '02_precision.png' } as any)
        .mockResolvedValueOnce({ success: true, id: 'item-3', name: '03_finish.png' } as any);
      mockBridge.addToTimeline = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'clip-1', name: '01_focus.png' } as any)
        .mockResolvedValueOnce({ success: true, id: 'clip-2', name: '02_precision.png' } as any)
        .mockResolvedValueOnce({ success: true, id: 'clip-3', name: '03_finish.png' } as any);
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        videoTracks: [],
        audioTracks: []
      });

      const result = await tools.executeTool('build_motion_graphics_demo', {
        sequenceName: 'Demo Sequence'
      });

      expect(result.success).toBe(true);
      expect(result.sequence.id).toBe('seq-1');
      expect(result.assets).toHaveLength(3);
      expect(mockBridge.importMedia).toHaveBeenCalledTimes(3);
      expect(mockBridge.addToTimeline).toHaveBeenCalledTimes(3);
    });

    it('assembles a product spot from provided assets', async () => {
      mockBridge.createSequence = jest.fn().mockResolvedValue({
        id: 'seq-2',
        name: 'Product Spot'
      } as any);
      mockBridge.importMedia = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'item-a', name: 'a.mp4' } as any)
        .mockResolvedValueOnce({ success: true, id: 'item-b', name: 'b.mp4' } as any);
      mockBridge.addToTimeline = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'clip-a', name: 'a.mp4', inPoint: 0, outPoint: 4 } as any)
        .mockResolvedValueOnce({ success: true, id: 'clip-b', name: 'b.mp4', inPoint: 4, outPoint: 8 } as any);
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        videoTracks: [],
        audioTracks: []
      });

      const result = await tools.executeTool('assemble_product_spot', {
        sequenceName: 'Product Spot',
        assetPaths: ['/a.mp4', '/b.mp4'],
        clipDuration: 4,
        motionStyle: 'alternate'
      });

      expect(result.success).toBe(true);
      expect(result.sequence.id).toBe('seq-2');
      expect(result.imported).toHaveLength(2);
      expect(result.placements).toHaveLength(2);
    });

    it('supports directed clip plans without forcing template transitions or motion', async () => {
      mockBridge.createSequence = jest.fn().mockResolvedValue({
        id: 'seq-2b',
        name: 'Directed Spot'
      } as any);
      mockBridge.importMedia = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'item-a', name: 'a.mp4' } as any)
        .mockResolvedValueOnce({ success: true, id: 'item-b', name: 'b.mp4' } as any);
      mockBridge.addToTimeline = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'clip-a', name: 'a.mp4', inPoint: 1.5, outPoint: 3.5 } as any)
        .mockResolvedValueOnce({ success: true, id: 'clip-b', name: 'b.mp4', inPoint: 3.6, outPoint: 6.6 } as any);
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        videoTracks: [],
        audioTracks: []
      });

      const result = await tools.executeTool('assemble_product_spot', {
        sequenceName: 'Directed Spot',
        assetPaths: ['/a.mp4', '/b.mp4'],
        clipPlan: [
          { assetIndex: 0, time: 1.5, trackIndex: 1, transitionAfter: { name: 'none' } },
          { assetIndex: 1, time: 3.6, trackIndex: 2 }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('directed clip plan');
      expect(result.transitions).toHaveLength(0);
      expect(result.animations).toHaveLength(0);
      expect(mockBridge.addToTimeline).toHaveBeenNthCalledWith(1, 'seq-2b', 'item-a', 1, 1.5, true);
      expect(mockBridge.addToTimeline).toHaveBeenNthCalledWith(2, 'seq-2b', 'item-b', 2, 3.6, true);
    });

    it('builds a brand spot from assets without requiring a mogrt', async () => {
      mockBridge.createSequence = jest.fn().mockResolvedValue({
        id: 'seq-3',
        name: 'Brand Spot'
      } as any);
      mockBridge.importMedia = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'item-a', name: 'a.mp4' } as any)
        .mockResolvedValueOnce({ success: true, id: 'item-b', name: 'b.mp4' } as any);
      mockBridge.addToTimeline = jest
        .fn()
        .mockResolvedValueOnce({ success: true, id: 'clip-a', name: 'a.mp4', inPoint: 0, outPoint: 4 } as any)
        .mockResolvedValueOnce({ success: true, id: 'clip-b', name: 'b.mp4', inPoint: 4, outPoint: 8 } as any);
      mockBridge.executeScript.mockResolvedValue({
        success: true,
        videoTracks: [],
        audioTracks: []
      });

      const result = await tools.executeTool('build_brand_spot_from_mogrt_and_assets', {
        sequenceName: 'Brand Spot',
        assetPaths: ['/a.mp4', '/b.mp4']
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Brand spot assembled successfully');
      expect(result.sequence.id).toBe('seq-3');
      expect(result.overlays[0].skipped).toBe(true);
      expect(result.polish[0].skipped).toBe(true);
    });
  });

  describe('setup_ducking', () => {
    it('emits 4 keyframes per duck window plus boundaries (sustained-base curve)', async () => {
      // Bridge.executeScript is what addAudioKeyframes ultimately invokes; capture and inspect.
      mockBridge.executeScript.mockResolvedValue({ success: true, addedKeyframes: [], failedKeyframes: [] });

      const result = await tools.executeTool('setup_ducking', {
        clipId: 'music-1',
        baseDb: -25,
        duckingWindows: [
          { startTime: 40.5, endTime: 41.4, duckedDb: -38 },
          { startTime: 60.0, endTime: 61.5, duckedDb: -38 },
        ],
        fadeSeconds: 0.2,
        clipStartTime: 0,
        clipEndTime: 132,
      });

      // Expected keyframe times (sorted, deduped): 0, 40.3, 40.5, 41.4, 41.6, 59.8, 60.0, 61.5, 61.7, 132
      // → 10 keyframes total: 2 boundaries + 4×2 duck windows = 10
      expect(result.keyframes_emitted).toBe(10);
      expect(result.ducking_windows).toBe(2);
      expect(result.fade_seconds).toBe(0.2);
      expect(result.base_db).toBe(-25);

      const computed = result.computed_keyframes as Array<{ time: number; level: number }>;
      const times = computed.map((k) => k.time);

      // Boundaries sit at baseDb
      expect(computed[0]).toEqual({ time: 0, level: -25 });
      expect(computed[computed.length - 1]).toEqual({ time: 132, level: -25 });

      // Duck-in/out points sit at duckedDb
      const at = (t: number) => computed.find((k) => Math.abs(k.time - t) < 1e-9);
      expect(at(40.5)?.level).toBe(-38);
      expect(at(41.4)?.level).toBe(-38);
      expect(at(60.0)?.level).toBe(-38);
      expect(at(61.5)?.level).toBe(-38);

      // Fade points sit at baseDb
      expect(at(40.3)?.level).toBe(-25);
      expect(at(41.6)?.level).toBe(-25);
      expect(at(59.8)?.level).toBe(-25);
      expect(at(61.7)?.level).toBe(-25);

      // Times are monotonic
      for (let i = 1; i < times.length; i++) {
        expect(times[i]).toBeGreaterThan(times[i - 1]!);
      }
    });

    it('handles empty duckingWindows (sustained baseDb only, 2 boundary keyframes)', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true, addedKeyframes: [], failedKeyframes: [] });

      const result = await tools.executeTool('setup_ducking', {
        clipId: 'music-empty',
        baseDb: -22,
        duckingWindows: [],
        clipStartTime: 0,
        clipEndTime: 60,
      });

      expect(result.keyframes_emitted).toBe(2);
      expect(result.computed_keyframes).toEqual([
        { time: 0, level: -22 },
        { time: 60, level: -22 },
      ]);
    });

    it('clamps pre-fade to clipStartTime when window starts before fadeSeconds', async () => {
      mockBridge.executeScript.mockResolvedValue({ success: true, addedKeyframes: [], failedKeyframes: [] });

      const result = await tools.executeTool('setup_ducking', {
        clipId: 'music-clamp',
        baseDb: -25,
        duckingWindows: [{ startTime: 0.1, endTime: 1.0, duckedDb: -38 }], // fade 0.2 would push pre-fade to -0.1
        fadeSeconds: 0.2,
        clipStartTime: 0,
        clipEndTime: 5,
      });

      const computed = result.computed_keyframes as Array<{ time: number; level: number }>;
      // The dedup map collapses pre-fade@0 with boundary@0 — both want baseDb so it's fine
      const at = (t: number) => computed.find((k) => Math.abs(k.time - t) < 1e-9);
      expect(at(0)?.level).toBe(-25); // boundary + pre-fade collapsed
      expect(at(0.1)?.level).toBe(-38); // duck-in
      expect(at(1.0)?.level).toBe(-38); // duck-out
      expect(at(1.2)?.level).toBe(-25); // post-fade
    });
  });

  describe('export_sequence', () => {
    // Pre-fix bugs (commit 6 of PR #14):
    //   1. Wrapper accepted no presetPath and silently substituted "H.264" / "ProRes"
    //      string literals — Adobe encodeSequence requires absolute .epr path.
    //   2. Wrapper unconditionally returned {success:true} even when bridge.renderSequence
    //      reported {success:false} — false-positive that hid AME-never-received errors.

    it('rejects calls without presetPath instead of substituting a string literal', async () => {
      const result = await tools.executeTool('export_sequence', {
        sequenceId: 'seq-1',
        outputPath: '/tmp/out.mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/presetPath required/);
      expect(result.hint).toMatch(/\.epr/);
      expect(mockBridge.renderSequence).not.toHaveBeenCalled();
    });

    it('rejects calls without presetPath even when format is "mp4" (no H.264 fallback)', async () => {
      // Pre-fix: format=mp4 → defaultPreset="H.264" string literal sent to encodeSequence.
      const result = await tools.executeTool('export_sequence', {
        sequenceId: 'seq-1',
        outputPath: '/tmp/out.mp4',
        format: 'mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/presetPath required/);
      expect(mockBridge.renderSequence).not.toHaveBeenCalled();
    });

    it('propagates bridge {success:false} response instead of claiming success', async () => {
      mockBridge.renderSequence.mockResolvedValue({
        success: false,
        error: 'encodeSequence returned no jobID — preset path may be invalid or AME not connected',
        outputPath: '/tmp/out.mp4',
        presetPath: '/path/that/does/not/exist.epr',
      });

      const result = await tools.executeTool('export_sequence', {
        sequenceId: 'seq-1',
        outputPath: '/tmp/out.mp4',
        presetPath: '/path/that/does/not/exist.epr',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/encodeSequence returned no jobID/);
      expect(result.sequenceId).toBe('seq-1');
    });

    it('returns success with jobID when bridge confirms AME queue accepted', async () => {
      mockBridge.renderSequence.mockResolvedValue({
        success: true,
        queued: true,
        jobID: 'job-abc-123',
        outputPath: '/tmp/out.mp4',
        presetPath: '/Users/me/preset.epr',
      });

      const result = await tools.executeTool('export_sequence', {
        sequenceId: 'seq-1',
        outputPath: '/tmp/out.mp4',
        presetPath: '/Users/me/preset.epr',
      });

      expect(result.success).toBe(true);
      expect(result.jobID).toBe('job-abc-123');
      expect(result.queued).toBe(true);
      expect(result.message).toMatch(/queued in Adobe Media Encoder/);
      expect(mockBridge.renderSequence).toHaveBeenCalledWith(
        'seq-1',
        '/tmp/out.mp4',
        '/Users/me/preset.epr',
      );
    });
  });

  describe('add_to_render_queue', () => {
    // add_to_render_queue delegates to exportSequence — same fixes apply transitively.
    it('rejects calls without presetPath (delegates to exportSequence guard)', async () => {
      const result = await tools.executeTool('add_to_render_queue', {
        sequenceId: 'seq-1',
        outputPath: '/tmp/out.mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/presetPath required/);
      expect(mockBridge.renderSequence).not.toHaveBeenCalled();
    });

    it('propagates bridge failure responses through the delegation', async () => {
      mockBridge.renderSequence.mockResolvedValue({
        success: false,
        error: 'app.encoder not available in this Premiere build',
      });

      const result = await tools.executeTool('add_to_render_queue', {
        sequenceId: 'seq-1',
        outputPath: '/tmp/out.mp4',
        presetPath: '/Users/me/preset.epr',
      });

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/app.encoder not available/);
    });
  });

  describe('export_frame', () => {
    const exportArgs = {
      sequenceId: 'seq-1',
      time: 30,
      outputPath: 'D:\\Videos\\Red Dead 2\\Review 2026\\frame.png',
      format: 'png',
    };

    async function generatedScript(args = exportArgs): Promise<string> {
      mockBridge.executeScript.mockResolvedValue({ success: true });
      await tools.executeTool('export_frame', args);

      expect(mockBridge.executeScript).toHaveBeenCalledTimes(1);
      return mockBridge.executeScript.mock.calls[0][0] as string;
    }

    it('escapes Windows path backslashes in the generated ExtendScript', async () => {
      const script = await generatedScript();

      // The script source must contain doubled backslashes; a raw single
      // backslash would be eaten as an escape sequence by ExtendScript
      // ("D:\Videos\..." would arrive as "D:Videos...").
      expect(script).toContain('D:\\\\Videos\\\\Red Dead 2\\\\Review 2026\\\\frame.png');
      expect(script).not.toContain('"D:\\Videos');
    });

    it('escapes quotes in the sequence id', async () => {
      const script = await generatedScript({
        ...exportArgs,
        sequenceId: 'seq-"quoted"',
      });

      expect(script).toContain('seq-\\"quoted\\"');
    });

    it('converts seconds to a sequence-format timecode string before exporting', async () => {
      const script = await generatedScript();

      expect(script).toContain('getFormatted(settings.videoFrameRate, settings.videoDisplayFormat)');
      expect(script).toContain('tryExport(timecode, outputPath)');
    });

    it('verifies the exported file on disk instead of trusting silent QE calls', async () => {
      const script = await generatedScript();

      expect(script).toContain('function fileWasWritten()');
      expect(script).toContain('check.exists && check.length > 0');
      expect(script).toContain('no file was written to');
      // every export attempt must be gated by the on-disk verification
      expect(script).toContain('return fileWasWritten();');
    });

    it('passes the bridge result through, including verified failures', async () => {
      mockBridge.executeScript.mockResolvedValue({
        success: false,
        error: 'Premiere reported no error, but no file was written to: D:\\out.png',
      });

      const result = await tools.executeTool('export_frame', exportArgs);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no file was written/);
    });
  });
});
