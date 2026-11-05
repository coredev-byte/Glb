import data from './timeline.json';

export type SceneId = 's01' | 's02' | 's03' | 's04' | 's05' | 's06' | 's07' | 's08' | 's09' | 's10';
export interface SceneDef { id: SceneId; name: string; start: number; end: number }

export const FPS = data.fps;
export const WIDTH = data.width;
export const HEIGHT = data.height;
export const DURATION = data.duration;
export const TOTAL_FRAMES = Math.round(DURATION * FPS);
export const scenes = data.scenes as SceneDef[];
export const vo = data.vo;
export const sfxCues = data.sfx;

export const scene = (id: SceneId) => scenes.find((s) => s.id === id)!;
export const sceneAt = (t: number) => scenes.find((s) => t >= s.start && t < s.end) ?? scenes[scenes.length - 1];
