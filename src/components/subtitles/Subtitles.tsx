import { type Tool } from "@google/generative-ai";
import { useEffect, useState, useRef, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import vegaEmbed from "vega-embed";
import { trackEvent } from "../../configs/analytics";
const { ipcRenderer } = window.require('electron');

interface SubtitlesProps {
  tools: Tool[];
  systemInstruction: string;
  assistantMode: string;
}

// Default tool configuration
function SubtitlesComponent({ tools, systemInstruction, assistantMode }: SubtitlesProps) {
  const [subtitles, setSubtitles] = useState<string>("");
  const [graphJson, setGraphJson] = useState<string>("");
  const { client, setConfig } = useLiveAPIContext();
  const graphRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio",
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
        },
      },
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      tools: tools,
    });
  }, [setConfig, systemInstruction, tools, assistantMode]);

  useEffect(() => {
    const onToolCall = async (toolCall: ToolCall) => {
      console.log(`got toolcall`, toolCall);
      let hasResponded = false;
      for (const fc of toolCall.functionCalls) {
        console.log(`got toolcall`, toolCall);
        // Track the tool invocation
        trackEvent('tool_used', {
          tool_name: fc.name,
          args: fc.args
        });
        
        // Log tool usage to file
        ipcRenderer.send('log-to-file', `Tool used: ${fc.name} with args: ${JSON.stringify(fc.args)}`);

        if (fc.name === "render_subtitles") {
          const text = (fc.args as any).subtitles;
          setSubtitles(text);
        } else if (fc.name === "remove_subtitles") {
          setSubtitles("");
          ipcRenderer.send('remove-subtitles');
        } else if (fc.name === "render_graph") {
          const json = (fc.args as any).json_graph;
          setGraphJson(json);
        } else if (fc.name === "write_text") {
          const content = (fc.args as any).content;
          ipcRenderer.send('write-text', content);
        } else if (fc.name === "read_text") {
          const selectedText = await ipcRenderer.invoke('read-selection');
          console.log("selectedText received", selectedText);
          // Send an empty response to the tool call, and then send the selected text to the client as a user message
          // This is because Gemini often ignores the tool call response, or hallucinates the response
          client.sendToolResponse({
            functionResponses: toolCall.functionCalls.map((fc) => ({
              response: { output: { success: true } },
              id: fc.id,
            })),
          });
          client.send([{ text: `Found the following text: ${selectedText}` }]);
          ipcRenderer.send('log-to-file', `Read text: ${selectedText}`);
          hasResponded = true;
        }
      }

      if (toolCall.functionCalls.length && !hasResponded) {
        client.sendToolResponse({
          functionResponses: toolCall.functionCalls.map((fc) => ({
            response: { output: { success: true } },
            id: fc.id,
          })),
        });
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  // Separate useEffect to handle IPC communication when subtitles change
  useEffect(() => {
    if (subtitles) {
      ipcRenderer.send('update-subtitles', subtitles);
    }
  }, [subtitles]);

  useEffect(() => {
    if (graphRef.current && graphJson) {
      try {
        vegaEmbed(graphRef.current, JSON.parse(graphJson));
      } catch (error) {
        console.error('Failed to render graph:', error);
        // Log graph rendering errors
        ipcRenderer.send('log-to-file', `Error rendering graph: ${error}`);
      }
    }
  }, [graphRef, graphJson]);

  return <div className="vega-embed" ref={graphRef} />; // Only render the graph container
}

export const Subtitles = memo(SubtitlesComponent); 