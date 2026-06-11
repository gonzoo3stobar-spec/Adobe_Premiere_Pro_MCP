import type {
  PremiereProClip,
  PremiereProProject,
  PremiereProProjectItem,
  PremiereProSequence,
} from './index.js';

export interface PremiereProTransport {
  executeScript(script: string, timeoutMs?: number): Promise<any>;
  createProject(name: string, location: string): Promise<PremiereProProject>;
  openProject(path: string): Promise<PremiereProProject>;
  saveProject(): Promise<void>;
  importMedia(filePath: string): Promise<PremiereProProjectItem>;
  createSequence(name: string, presetPath?: string): Promise<PremiereProSequence>;
  addToTimeline(sequenceId: string, projectItemId: string, trackIndex: number, time: number, linkAudio?: boolean): Promise<PremiereProClip>;
  renderSequence(sequenceId: string, outputPath: string, presetPath: string, startImmediately?: boolean): Promise<{
    success: boolean;
    queued?: boolean;
    jobID?: string;
    batchStarted?: boolean;
    outputPath?: string;
    presetPath?: string;
    warning?: string;
    error?: string;
  }>;
  exportSequenceDirect(sequenceId: string, outputPath: string, presetPath: string, workAreaType?: number): Promise<{
    success: boolean;
    verified?: boolean;
    outputPath?: string;
    fileSizeBytes?: number;
    returnValue?: string;
    error?: string;
  }>;
}
