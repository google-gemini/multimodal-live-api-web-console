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

import { useState, useEffect, useRef } from "react";
import { UseMediaStreamResult } from "./use-media-stream-mux";
import { DesktopCapturerSource } from 'electron';
const { ipcRenderer } = window.require('electron');

export function useScreenCapture(): UseMediaStreamResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const isPickerOpenRef = useRef(false);

  useEffect(() => {
    const handleStreamEnded = () => {
      // console.log('🎥 Stream ended event triggered');
      setIsStreaming(false);
      setStream(null);
    };
    if (stream) {
      // console.log('🎥 Setting up stream end listeners');
      stream
        .getTracks()
        .forEach((track) => track.addEventListener("ended", handleStreamEnded));
      return () => {
        console.log('🎥 Cleaning up stream end listeners');
        stream
          .getTracks()
          .forEach((track) =>
            track.removeEventListener("ended", handleStreamEnded),
          );
      };
    }
  }, [stream]);

  const cleanupPicker = () => {
    // console.log('🎯 Attempting to clean up picker dialog');
    // console.log('🎯 Current picker ref:', pickerRef.current);
    // console.log('🎯 Picker in DOM:', pickerRef.current && document.body.contains(pickerRef.current));
    // console.log('🎯 isPickerOpen:', isPickerOpenRef.current);

    try {
      // Try to find picker by a unique class if ref is stale
      const existingPicker = document.querySelector('.screen-picker-dialog');
      if (existingPicker) {
        // console.log('🎯 Found existing picker by class');
        document.body.removeChild(existingPicker);
      }

      if (pickerRef.current) {
        // console.log('🎯 Found picker by ref');
        if (document.body.contains(pickerRef.current)) {
          // console.log('🎯 Picker ref exists in DOM, removing');
          document.body.removeChild(pickerRef.current);
        } else {
          // console.log('🎯 Picker ref exists but not in DOM');
        }
        pickerRef.current = null;
      }
    } catch (error) {
      console.error('🎯 Error during picker cleanup:', error);
    }
    
    if (isPickerOpenRef.current) {
      // console.log('🎯 Resetting picker open state');
      isPickerOpenRef.current = false;
    }
  };

  const start = async () => {
    // console.log('🚀 Starting screen capture process');
    try {
      // If picker is already open, don't open another one
      if (isPickerOpenRef.current) {
        // console.log('⚠️ Screen picker is already open, preventing duplicate');
        throw new Error('Screen picker is already open');
      }

      // Clean up any existing picker
      cleanupPicker();

      console.log('📋 Fetching available screen sources');
      const sources = await ipcRenderer.invoke('get-sources');
      console.log(`📋 Found ${sources.length} available sources`);

      // Create source selection dialog
      const selectedSource = await new Promise<string>((resolve, reject) => {
        // console.log('🎯 Creating screen picker dialog');
        const picker = document.createElement('div');
        picker.className = 'screen-picker-dialog'; // Add a unique class for querying
        pickerRef.current = picker;
        isPickerOpenRef.current = true;

        picker.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.8);
          z-index: 99999;
          display: flex;
          flex-wrap: wrap;
          padding: 20px;
          overflow: auto;
          justify-content: center;
          align-items: flex-start;
        `;

        sources.forEach((source: DesktopCapturerSource) => {
          const button = document.createElement('div');
          button.style.cssText = `
            margin: 10px;
            cursor: pointer;
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            transition: transform 0.2s;
          `;
          button.innerHTML = `
            <img src="${source.thumbnail.toDataURL()}" style="width: 150px; height: 150px; object-fit: contain; margin-bottom: 10px;"><br>
            <span style="color: black; font-weight: bold;">${source.name}</span>
          `;
          button.onmouseover = () => {
            button.style.transform = 'scale(1.05)';
          };
          button.onmouseout = () => {
            button.style.transform = 'scale(1)';
          };
          button.onclick = () => {
            // console.log(`🎯 Source selected: ${source.name}`);
            // console.log('🎯 Picker state before cleanup:', {
            //   pickerRef: pickerRef.current,
            //   isPickerOpen: isPickerOpenRef.current,
            //   inDOM: pickerRef.current && document.body.contains(pickerRef.current)
            // });
            cleanupPicker();
            // console.log('🎯 Picker state after cleanup:', {
            //   pickerRef: pickerRef.current,
            //   isPickerOpen: isPickerOpenRef.current,
            //   inDOM: pickerRef.current && document.body.contains(pickerRef.current)
            // });
            resolve(source.id);
          };
          picker.appendChild(button);
        });

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          padding: 10px 20px;
          background: #ff4444;
          color: white;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: bold;
        `;
        cancelBtn.onclick = () => {
          // console.log('🎯 Screen selection cancelled');
          // console.log('🎯 Picker state before cleanup:', {
          //   pickerRef: pickerRef.current,
          //   isPickerOpen: isPickerOpenRef.current,
          //   inDOM: pickerRef.current && document.body.contains(pickerRef.current)
          // });
          cleanupPicker();
          // console.log('🎯 Picker state after cleanup:', {
          //   pickerRef: pickerRef.current,
          //   isPickerOpen: isPickerOpenRef.current,
          //   inDOM: pickerRef.current && document.body.contains(pickerRef.current)
          // });
          reject(new Error('Selection cancelled'));
        };
        picker.appendChild(cancelBtn);

        document.body.appendChild(picker);
        // console.log('🎯 Screen picker dialog mounted', {
        //   pickerRef: pickerRef.current,
        //   isPickerOpen: isPickerOpenRef.current,
        //   inDOM: pickerRef.current && document.body.contains(pickerRef.current)
        // });
      });

      // If stream already exists, clean it up before creating a new one
      if (stream) {
        // console.log('🎥 Cleaning up existing stream before starting new one');
        stop();
      }

      const constraints = {
        audio: false,  // Start with just video to avoid audio issues
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource
          }
        }
      };

      // console.log('🎥 Requesting media stream with constraints');
      const newStream = await navigator.mediaDevices.getUserMedia(constraints as any);
      // console.log('🎥 Media stream obtained successfully');
      setStream(newStream);
      setIsStreaming(true);
      return newStream;
    } catch (error) {
      cleanupPicker();
      if (error instanceof Error && error.message === 'Selection cancelled') {
        // console.log('❌ Screen selection was cancelled');
        setStream(null);
        setIsStreaming(false);
        throw error;
      }
      console.error('❌ Error starting screen capture:', error);
      throw error;
    }
  };

  const stop = () => {
    // console.log('🛑 Stopping screen capture');
    cleanupPicker();
    if (stream) {
      // console.log('🎥 Stopping all stream tracks');
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
      setIsStreaming(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // console.log('🧹 Component unmounting, cleaning up resources');
      cleanupPicker();
      stop();
    };
  }, []);

  const result: UseMediaStreamResult = {
    type: "screen",
    start,
    stop,
    isStreaming,
    stream,
  };

  return result;
}
