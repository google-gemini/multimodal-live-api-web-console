import React, { useState, useRef } from "react";
import cn from "classnames";
import { Canvas } from "@react-three/fiber";
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import Select from "react-select";
import Avatar from "../avatar/Avatar";
import AudioPulse from "../audio-pulse/AudioPulse";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import Logger, { LoggerFilterType } from "../logger/Logger";
import "./side-panel.scss";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { volume, connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true); // Toggle for the console
  const [logVisible, setLogVisible] = useState(true);
  const [selectedOption, setSelectedOption] = useState<{
    value: string;
    label: string;
  } | null>(null);

  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]); // Store messages
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (textInput.trim()) {
      client.send([{ text: textInput }]);
      setMessages((prevMessages) => [...prevMessages, textInput]); // Add to messages
      setTextInput("");
      if (inputRef.current) {
        inputRef.current.innerText = "";
      }
    }
  };

  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      {/* Canvas Overlay */}
      <div
        className={cn("canvas-overlay", {
          hidden: open, // Hide overlay when console is open
        })}
      >
        <Canvas
          style={{ width: "100%", height: "100%" }}
          camera={{
            position: [0, 0, 0.5],
            fov: 70,
          }}
        >
          <ambientLight intensity={0.9} />
          <pointLight position={[10, 10, 10]} intensity={0.5} />
          <Avatar
            url="https://models.readyplayer.me/6455ccbdb26b8e6407bc5257.glb?morphTargets=ARKit&textureAtlas=1024"
            volume={volume}
          />
        </Canvas>
      </div>

      {/* Sidebar Header */}
      <header className="top">
        <h2 style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>Console</h2>
        {open ? (
          <button className="opener" onClick={() => setOpen(false)}>
            <RiSidebarFoldLine color="#b4b8bb" />
          </button>
        ) : (
          <button className="opener" onClick={() => setOpen(true)}>
            <RiSidebarUnfoldLine color="#b4b8bb" />
          </button>
        )}
      </header>

      {/* Conditional Rendering for Console */}
      {open && (
        <>
          {/* Indicators Section */}
          <section className="indicators">
            <Select
              className="react-select"
              classNamePrefix="react-select"
              styles={{
                control: (baseStyles) => ({
                  ...baseStyles,
                  background: "var(--Neutral-15)",
                  color: "var(--Neutral-90)",
                  minHeight: "33px",
                  maxHeight: "33px",
                  border: 0,
                }),
                option: (styles, { isFocused, isSelected }) => ({
                  ...styles,
                  backgroundColor: isFocused
                    ? "var(--Neutral-30)"
                    : isSelected
                    ? "var(--Neutral-20)"
                    : undefined,
                }),
              }}
              defaultValue={selectedOption}
              options={filterOptions}
              onChange={(e) => setSelectedOption(e)}
            />
            <div
              style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
              className={cn("streaming-indicator", { connected })}
            >
              {connected
                ? `🔵${open ? " Streaming" : ""}`
                : `⏸️${open ? " Paused" : ""}`}
            </div>
          </section>

          {/* Main Content */}
          <div className="side-panel-container">
            <Logger
              filter={(selectedOption?.value as LoggerFilterType) || "none"}
            />
            <AudioPulse active={connected} volume={volume} />
          </div>

          {/* Message Box */}
          <div className="message-box">
            {messages.map((message, index) => (
              <div
                style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
                key={index}
                className="message"
              >
                {message}
              </div>
            ))}
          </div>

          {/* Input Section */}
          <div className={cn("input-container", { disabled: !connected })}>
            <div className="input-content">
              <textarea
                className="input-area"
                ref={inputRef}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSubmit();
                  }
                }}
                onChange={(e) => setTextInput(e.target.value)}
                value={textInput}
              ></textarea>
              <span
                style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}
                className={cn("input-content-placeholder", {
                  hidden: textInput.length,
                })}
              >
                Type&nbsp;something...
              </span>
              <button
                className="send-button material-symbols-outlined filled"
                onClick={handleSubmit}
              >
                send
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
