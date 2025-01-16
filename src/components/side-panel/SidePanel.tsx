import cn from "classnames";
import { useEffect, useRef, useState } from "react";
import { RiSidebarFoldLine, RiSidebarUnfoldLine } from "react-icons/ri";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";
import Logger, { LoggerFilterType } from "../logger/Logger";
import "./side-panel.scss";

const filterOptions = [
  { value: "conversations", label: "Conversations" },
  { value: "tools", label: "Tool Use" },
  { value: "none", label: "All" },
];

export default function SidePanel() {
  const { connected, client } = useLiveAPIContext();
  const [open, setOpen] = useState(true);
  const loggerRef = useRef<HTMLDivElement>(null);
  const loggerLastHeightRef = useRef<number>(-1);
  const { log, logs } = useLoggerStore();

  // Patient details (static data)
  const patientDetails = {
    name: "John Doe",
    age: 45,
    gender: "Male",
    medicalHistory: [
      "Hypertension",
      "Type 2 Diabetes",
      "Chronic Asthma",
      "Recent knee surgery",
    ],
  };

  // Scroll the log to the bottom when new logs come in
  useEffect(() => {
    if (loggerRef.current) {
      const el = loggerRef.current;
      const scrollHeight = el.scrollHeight;
      if (scrollHeight !== loggerLastHeightRef.current) {
        el.scrollTop = scrollHeight;
        loggerLastHeightRef.current = scrollHeight;
      }
    }
  }, [logs]);

  // Listen for log events and store them
  useEffect(() => {
    client.on("log", log);
    return () => {
      client.off("log", log);
    };
  }, [client, log]);

  return (
    <div className={`side-panel ${open ? "open" : ""}`}>
      <header className="top">
        <h2>Patient Details</h2>
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

      {/* Patient Information Section */}
      <div className="patient-info-container">
        <h3>Patient Information</h3>
        <p><strong>Name:</strong> {patientDetails.name}</p>
        <p><strong>Age:</strong> {patientDetails.age} years</p>
        <p><strong>Gender:</strong> {patientDetails.gender}</p>

        <h4>Medical History</h4>
        <ul>
          {patientDetails.medicalHistory.map((condition, index) => (
            <li key={index}>{condition}</li>
          ))}
        </ul>
      </div>

    </div>
  );
}
