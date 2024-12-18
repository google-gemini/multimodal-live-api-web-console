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
// ListItem.tsx
import "./ListItem.scss";
import React, { memo } from "react";
import Markdown from "react-markdown";
import { ReactComponent as CheckedIcon } from "./svg/CheckedIcon.svg";
import { ReactComponent as UncheckedIcon } from "./svg/UncheckedIcon.svg";
import { ReactComponent as DragHandle } from "./svg/DragHandle.svg";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type ListItemProps = {
  item: string;
  index: number;
  id: string;
  onCheckboxChange: (index: number) => void;
  isGlowing: boolean;
};

const ListItemComponent: React.FC<ListItemProps> = ({
  item,
  index,
  id,
  onCheckboxChange,
  isGlowing,
}) => {
  // Make sortable item
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, transition: null });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Check if checkbox in markdown
  const isChecklistItem =
    item.startsWith("- [x] ") || item.startsWith("- [ ] ");
  const isChecked = item.startsWith("- [x] ");
  const listItemText = item.replace("- [x] ", "").replace("- [ ] ", "");
  const checkboxId = `checkbox-${id}-${index}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`list-item ${isGlowing ? "glow" : ""}`}
    >
      <Markdown
        components={{
          // All headers to H3
          h1: "h3",
          h2: "h3",
          h4: "h3",
          h5: "h3",
          h6: "h3",
          // Markdown checkbox to svg icon
          li: ({ node, ...props }) => {
            if (isChecklistItem) {
              return (
                <li {...props} onClick={() => onCheckboxChange(index)}>
                  <label
                    htmlFor={checkboxId}
                    style={{ display: "inline-block" }}
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      defaultChecked={isChecked}
                    />
                    {isChecked ? <CheckedIcon /> : <UncheckedIcon />}{" "}
                    <span>{listItemText}</span>
                  </label>
                </li>
              );
            } else {
              return <li {...props}></li>;
            }
          },
        }}
      >
        {item}
      </Markdown>
      <div className="drag-handle" {...listeners} {...attributes}>
        <DragHandle />
      </div>
    </div>
  );
};

export const ListItem = memo(ListItemComponent);
