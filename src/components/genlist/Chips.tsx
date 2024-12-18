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
// Chips.tsx
import React, { useState } from "react";
import "./Chips.scss";

interface ChipProps {
  label: string;
  message: string;
  onChipClick: (message: string) => void;
  onChipRemove: (label: string) => void;
}

const Chip: React.FC<ChipProps> = ({
  label,
  message,
  onChipClick,
  onChipRemove,
}) => {
  const handleClick = () => {
    onChipClick(message);
    onChipRemove(label);
  };

  return (
    <button className="chip" onClick={handleClick}>
      {label}
    </button>
  );
};

interface ChipData {
  label: string;
  message: string;
}

interface ChipsProps {
  title: string;
  chips: ChipData[];
  onChipClick: (message: string) => void;
}

export const Chips: React.FC<ChipsProps> = ({ title, chips, onChipClick }) => {
  const [visibleChips, setVisibleChips] = useState<ChipData[]>(chips);

  const handleChipRemove = (label: string) => {
    setVisibleChips((prevChips) =>
      prevChips.filter((chip) => chip.label !== label)
    );
  };

  return (
    <div className="chips-container">
      {visibleChips.length > 0 && <p>{title}</p>}
      {visibleChips.map((chip) => (
        <Chip
          key={chip.label}
          label={chip.label}
          message={chip.message}
          onChipClick={onChipClick}
          onChipRemove={handleChipRemove}
        />
      ))}
    </div>
  );
};
