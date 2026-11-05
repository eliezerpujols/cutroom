import React from 'react';
import {getRemotionEnvironment, Img, staticFile} from 'remotion';
import {studioDefaults, type StudioInstance} from './registry';

// Original silhouette and 30 fps timing from Tom Windeknecht's GIPHY sticker
// https://giphy.com/stickers/hW3hPhtquUKtMeMy8n
// The atlas preserves all 143 transparent frames, including the pop and bounce.
export function HeartPop({instance, frame, libraryPreview}: {
  instance: StudioInstance;
  frame: number;
  libraryPreview: boolean;
}) {
  const props = {...studioDefaults(instance.template), ...instance.props};
  const index = ((Math.floor(frame) % 143) + 143) % 143;
  const file = '/studio/heart-pop-frames.png';
  const src = !libraryPreview && getRemotionEnvironment().isRendering
    ? staticFile(file.slice(1))
    : file;
  const ImageComponent = libraryPreview ? 'img' : Img;
  return <div style={{position: 'relative', width: '100%', height: '100%'}}>
    <ImageComponent alt="" src={src} style={{position: 'absolute', width: 1, height: 1, opacity: 0}}/>
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: String(props.color),
      maskImage: `url("${src}")`,
      maskMode: 'alpha',
      maskSize: '1200% 1200%',
      maskPosition: `${(index % 12) / 11 * 100}% ${Math.floor(index / 12) / 11 * 100}%`,
      maskRepeat: 'no-repeat',
    }}/>
  </div>;
}
