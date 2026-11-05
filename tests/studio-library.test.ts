import assert from 'node:assert/strict';
import test from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {StudioElement} from '../src/studio/StudioElement';
import {studioDefaults, studioTemplates} from '../src/studio/registry';

test('all Studio library previews render outside the Remotion player', () => {
  for (const template of studioTemplates) {
    const html = renderToStaticMarkup(createElement(StudioElement, {
      instance: {template: template.id, props: studioDefaults(template.id)},
      frame: template.duration - 1,
      libraryPreview: true,
    }));
    assert.ok(html.length > 0, template.id);
  }
});
