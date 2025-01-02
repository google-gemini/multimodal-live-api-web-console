/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

const map: Map<string, AudioContext> = new Map();
let interacted = false;

/**
 * Waits for a user interfaction and then resumes an audio context.
 * The web-browser prevents audio context from being used before user interaction
 * to stop web sites abusing auto play, or auto record.
 * @param audioCtx the audio context to unlock
 */
function unlockAudioContext(audioCtx:AudioContext) {
  if (audioCtx.state !== 'suspended') {
    return;
  }
  if(interacted) {
    audioCtx.resume();
    return;
  }
  const events = ['touchstart','touchend', 'mousedown','keydown', 'pointerdown'];
  events.forEach(e => window.addEventListener(e, unlock, false));
  function unlock() { interacted=true;audioCtx.resume().then(clean); }
  function clean() { events.forEach(e => window.removeEventListener(e, unlock)); }
}

export async function audioContext(options?: GetAudioContextOptions) : Promise<AudioContext> {
    try {
      if (options?.id && map.has(options.id)) {
        const ctx = map.get(options.id);
        if (ctx) {
          unlockAudioContext(ctx);
          return ctx;
        }
      }
      const ctx = new AudioContext(options);
      console.log('new audio context 1', options);
      if (options?.id) {
        map.set(options.id, ctx);
      }
      unlockAudioContext(ctx);
      return ctx;
    } catch (e) {
      console.log(e);
      throw e;
    }
}

export const blobToJSON = (blob: Blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        const json = JSON.parse(reader.result as string);
        resolve(json);
      } else {
        reject("oops");
      }
    };
    reader.readAsText(blob);
  });

export function base64ToArrayBuffer(base64: string) {
  var binaryString = atob(base64);
  var bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}