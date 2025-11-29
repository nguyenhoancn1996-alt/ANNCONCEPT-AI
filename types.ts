
export type EditSubMode = 'inpaint' | 'mergeHouse' | 'mergeMaterial' | 'mergeFurniture';
export type ActiveTab = 'create' | 'cameraAngle' | 'edit' | 'planTo3d' | 'video' | 'canva' | 'prompt' | 'utilities' | 'editorBeta' | 'library';
export type AspectRatio = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';
export type Utility = 'moodboard' | 'videoPrompt' | 'lighting' | 'virtualTour' | 'extendView' | 'changeStyle' | 'upscaleDetail';

export interface SourceImage {
  base64: string;
  mimeType: string;
}

export interface HistoryItem {
  id: string;
  tab: ActiveTab | 'utilities'; // Allow 'utilities' for history items from this section
  sourceImage: SourceImage | null;
  sourceImage2?: SourceImage | null;
  referenceImage: SourceImage | null;
  prompt: string;
  negativePrompt?: string;
  imageCount: number;
  generatedImages: string[];
  generatedPrompts?: string | null;
  videoModel?: string;
}

export interface LibraryItem {
  id: string;
  imageData: string; // data URL
}

// FIX: Added ObjectTransform interface to resolve import error in InteractiveCanvas.tsx
export interface ObjectTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}