import type React from 'react';
import {SOUND_DRAG_TYPE} from './sounds';
import type {TextPreset} from './videoText';
export const ASSET_DRAG_TYPE='application/cutroom-asset';
export const ASSET_KIND_PREFIX='application/cutroom-asset-kind-';
export const TEXT_PRESET_DRAG_TYPE='application/cutroom-text-preset';
export const TEXT_DRAG_TYPE='application/cutroom-text';
export const CAPTION_DRAG_TYPE='application/cutroom-caption';
export const isLibraryDrag=(types:readonly string[])=>[ASSET_DRAG_TYPE,SOUND_DRAG_TYPE,TEXT_PRESET_DRAG_TYPE,TEXT_DRAG_TYPE,CAPTION_DRAG_TYPE].some(type=>types.includes(type));
export const movingLibraryItem=(types:readonly string[])=>types.includes(TEXT_DRAG_TYPE)||types.includes(CAPTION_DRAG_TYPE);
export const isTextPreset=(value:string):value is TextPreset=>['heading','subtitle','body'].includes(value);
export function startLibraryDrag(event:React.DragEvent,type:string,value:string){event.dataTransfer.setData(type,value);event.dataTransfer.effectAllowed=movingLibraryItem([type])?'move':'copy';}
