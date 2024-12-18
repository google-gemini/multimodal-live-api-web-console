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
import "./GenList.scss";
import { type Tool, SchemaType } from "@google/generative-ai";
import { useEffect, useState, useCallback, memo } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import {
  ToolCall,
  ToolResponse,
  LiveFunctionResponse,
} from "../../multimodal-live-types";
import { List, ListProps } from "./List";
import { Chips } from "./Chips";

// Types
interface CreateListArgs {
  id: string;
  heading: string;
  list_array: string[];
}
interface EditListArgs extends CreateListArgs {}
interface RemoveListArgs {
  id: string;
}
interface ResponseObject extends LiveFunctionResponse {
  name: string;
  response: { result: object };
}

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "look_at_lists",
        description:
          "Returns all current lists. Called immediately before calling `edit_list`, to ensure latest version is being edited.",
      },
      {
        name: "edit_list",
        description:
          "Edits list with specified id. Requires `id`, `heading`, and `list_array`. You must provide the complete new list array. May be called multiple times, once for each list requiring edit.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: {
              type: SchemaType.STRING,
            },
            heading: {
              type: SchemaType.STRING,
            },
            list_array: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.STRING,
              },
            },
          },
          required: ["id", "heading", "list_array"],
        },
      },
      {
        name: "remove_list",
        description:
          "Removes the list with specified id. Requires `id`. May be called multiple times, once for each list you want to remove.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: {
              type: SchemaType.STRING,
            },
          },
          required: ["id"],
        },
      },
      {
        name: "create_list",
        description:
          "Creates new list. Requires `id`, `heading`, and `list_array`. May be called multiple times, once for each list you want to create.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            id: {
              type: SchemaType.STRING,
            },
            heading: {
              type: SchemaType.STRING,
            },
            list_array: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.STRING,
              },
            },
          },
          required: ["id", "heading", "list_array"],
        },
      },
    ],
  },
];

const systemInstructionObject = {
  parts: [
    {
      text: `In this conversation you will help the user with making a checklist or multiple checklists. Use the tools provided to fulfil requests to help create and modify lists. Always call any relevant tools *before* speaking. 

# Checklist guidance:
- Give each list an appropriate title with emoji (eg. "🎬 My Favorite Movies")
- Give each list an id for identification (eg. "favorite-movies")
- Give list items as an array of markdown-formatted strings
- Use extended markdown for checkboxes: "- [ ] unchecked item" and "- [x] checked item"
- Help me by checking off items when requested
- Add headings eg. "## Heading" when requested to sort/organise/structure lists
- Bias towards creating new lists for new topics
- If I don't specify what to put on the list, let me know you've added some examples
- Use existing examples, if any, as a reference for your new list
- Do not return the list in your conversational response, only via tools
- There is no need to ask if there is anything else you can help with
- Combine lists by removing relevant existing lists and creating a new one when requested
- Note that the user can also check off and reorder items using the UI

The user will now start the conversation, probably by asking you to "start a list about: {my request}". Create the checklist for the user, then you two can co-create checklists together. Speak as helpfully and concisely as possible. Always call any relevant tools *before* speaking.`,
    },
  ],
};

// Chips
const INITIAL_SCREEN_CHIPS = [
  { label: "🇫🇷 Paris packing list", message: "Paris packing list" },
  {
    label: "🎬 Top 10 cult classics",
    message: "Top 10 cult classics",
  },
  {
    label: "📚 Sci-fi reading list",
    message: "Sci-fi reading list",
  },
  { label: "🍪 Cookie ingredients", message: "Cookie ingredients" },
];

const LIST_SCREEN_CHIPS = [
  {
    label: "😊 Add more emojis",
    message: "Add more emojis to list items",
  },
  {
    label: "✨ Organise into categories",
    message: "Organise it into categories",
  },
  {
    label: "💫 Break into separate lists",
    message: "Break it down into separate lists",
  },
  { label: "🪄 Clear and start again", message: "Clear and start again" },
];

function GenListComponent() {
  const { client, setConfig, connect, connected } = useLiveAPIContext();

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "text", // switch to "audio" for audio out
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
        },
      },
      systemInstruction: systemInstructionObject,
      tools: toolObject,
    });
  }, [setConfig]);

  const [isAwaitingFirstResponse, setIsAwaitingFirstResponse] = useState(false);
  const [initialMessage, setInitialMessage] = useState("");
  const [listsState, setListsState] = useState<ListProps[]>([]);
  const [toolResponse, setToolResponse] = useState<ToolResponse | null>(null);

  // Update existing list
  const updateList = useCallback((listId: string, updatedList: string[]) => {
    setListsState((prevLists) =>
      prevLists.map((list) => {
        if (list.id === listId) {
          return { ...list, list_array: updatedList };
        } else {
          return list;
        }
      })
    );
  }, []);

  // Scroll to new list after timeout
  const scrollToList = (id: string) => {
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }, 100);
  };

  // Handle checkbox change from List component
  const handleCheckboxChange = useCallback((listId: string, index: number) => {
    setListsState((prevLists) =>
      prevLists.map((list) => {
        if (list.id === listId) {
          const updatedList = [...list.list_array];
          const item = updatedList[index];
          if (item.startsWith("- [ ] ")) {
            updatedList[index] = item.replace("- [ ] ", "- [x] ");
          } else if (item.startsWith("- [x] ")) {
            updatedList[index] = item.replace("- [x] ", "- [ ] ");
          }
          return { ...list, list_array: updatedList };
        }
        return list;
      })
    );
  }, []);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      const fCalls = toolCall.functionCalls;
      const functionResponses: ResponseObject[] = [];

      if (fCalls.length > 0) {
        fCalls.forEach((fCall) => {
          let functionResponse = {
            id: fCall.id,
            name: fCall.name,
            response: {
              result: { string_value: `${fCall.name} OK.` },
            },
          };
          switch (fCall.name) {
            case "look_at_lists": {
              break;
            }
            case "edit_list": {
              const args = fCall.args as EditListArgs;
              updateList(args.id, args.list_array);
              break;
            }
            case "remove_list": {
              const args = fCall.args as RemoveListArgs;
              setListsState((prevLists) =>
                prevLists.filter((list) => list.id !== args.id)
              );
              break;
            }
            case "create_list": {
              const args = fCall.args as EditListArgs;
              const newList: ListProps = {
                id: args.id,
                heading: args.heading,
                list_array: args.list_array,
                onListUpdate: updateList,
                onCheckboxChange: handleCheckboxChange,
              };
              setListsState((prevLists) => {
                const updatedLists = [...prevLists, newList];
                return updatedLists;
              });
              scrollToList(newList.id);
              break;
            }
          }
          if (functionResponse) {
            functionResponses.push(functionResponse);
          }
        });

        // Send tool responses back to the model
        const toolResponse: ToolResponse = {
          functionResponses: functionResponses,
        };
        setToolResponse(toolResponse);
      }
    };
    setIsAwaitingFirstResponse(false);
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, handleCheckboxChange, updateList]);

  useEffect(() => {
    if (toolResponse) {
      const updatedToolResponse: ToolResponse = {
        ...toolResponse,
        functionResponses: toolResponse.functionResponses.map(
          (functionResponse) => {
            const responseObject = functionResponse as ResponseObject;
            if (responseObject.name === "look_at_lists") {
              return {
                ...functionResponse,
                response: {
                  result: {
                    object_value: listsState,
                  },
                },
              };
            } else {
              return functionResponse;
            }
          }
        ),
      };
      client.sendToolResponse(updatedToolResponse);
      setToolResponse(null);
    }
  }, [toolResponse, listsState, client, setToolResponse]);

  const connectAndSend = async (message: string) => {
    setIsAwaitingFirstResponse(true);
    if (!connected) {
      try {
        await connect();
      } catch (error) {
        throw new Error("Could not connect to Websocket");
      }
    }
    client.send({
      text: `${message}`,
    });
  };

  //   Rendered if list length === 0
  const renderInitialScreen = () => {
    return (
      <>
        {/* Hide while connecting to API */}
        {!isAwaitingFirstResponse && (
          <div className="initial-screen">
            <div className="spacer"></div>
            <h1>📝 Start a list about:</h1>
            <input
              type="text"
              value={initialMessage}
              className="initialMessageInput"
              placeholder="type or say something..."
              onChange={(e) => setInitialMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  connectAndSend(`Start a list about: ${initialMessage}`);
                }
              }}
            />
            <div className="spacer"></div>
            <Chips
              title={"How about:"}
              chips={INITIAL_SCREEN_CHIPS}
              onChipClick={(message) => {
                connectAndSend(`Start a list about: ${message}`);
              }}
            />
            <div className="spacer"></div>
          </div>
        )}
      </>
    );
  };

  //   Rendered if list length > 0
  const renderListScreen = () => {
    return (
      <>
        <div className="list-screen">
          {listsState.map((listData) => (
            <List
              key={listData.id}
              id={listData.id}
              heading={listData.heading}
              list_array={listData.list_array}
              onListUpdate={updateList}
              onCheckboxChange={handleCheckboxChange}
            />
          ))}
          <Chips
            title={"Try saying:"}
            chips={LIST_SCREEN_CHIPS}
            onChipClick={(message) => {
              client.send({ text: message });
            }}
          />
        </div>
      </>
    );
  };

  return (
    <div className="app">
      {listsState.length === 0 ? renderInitialScreen() : renderListScreen()}
    </div>
  );
}

export const GenList = memo(GenListComponent);
