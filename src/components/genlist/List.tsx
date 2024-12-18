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
// List.tsx
import "./List.scss";
import { ListItem } from "./ListItem";
import { useCallback, useEffect, useState, useRef, memo } from "react";
import { DndContext, PointerSensor, useSensor } from "@dnd-kit/core";
import { arrayMove, SortableContext } from "@dnd-kit/sortable";
import { verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToFirstScrollableAncestor } from "@dnd-kit/modifiers";

export type ListProps = {
  id: string;
  heading: string;
  list_array: string[];
  onListUpdate: (id: string, updatedList: string[]) => void;
  onCheckboxChange: (id: string, index: number) => void;
};

const ListComponent = ({
  id,
  heading,
  list_array: list,
  onListUpdate,
  onCheckboxChange,
}: ListProps) => {
  const prevListRef = useRef<string[]>([]);
  const prevHeaderRef = useRef<string>("");
  const [glowHeader, setGlowHeader] = useState<boolean>(false);
  const [glowList, setGlowList] = useState<{ [i: number]: boolean }>({});
  const [glowListContainer, setGlowListContainer] = useState<boolean>(false);
  const [isUserInteraction, setIsUserInteraction] = useState<boolean>(false);

  const sensors = [useSensor(PointerSensor)];

  // Handle user drag end
  const handleDragEnd = useCallback(
    (event: any) => {
      setIsUserInteraction(true);
      const { active, over } = event;
      if (active.id !== over?.id) {
        const oldIndex = parseInt(active.id, 10);
        const newIndex = over ? parseInt(over.id, 10) : list.length - 1;
        const updatedList = arrayMove(list, oldIndex, newIndex);
        onListUpdate(id, updatedList);
      }
      setTimeout(() => setIsUserInteraction(false), 0); // Reset after drag end
    },
    [id, onListUpdate, list]
  );

  // Handle user checkbox click
  const handleCheckboxClick = useCallback(
    (index: number) => {
      setIsUserInteraction(true);
      onCheckboxChange(id, index);
      setTimeout(() => setIsUserInteraction(false), 0); // Reset after checkbox click
    },
    [id, onCheckboxChange]
  );

  // Glow on header update (only if not user interaction)
  useEffect(() => {
    if (prevHeaderRef.current !== heading && !isUserInteraction) {
      setGlowHeader(true);
      setTimeout(() => setGlowHeader(false), 1500);
    }
    prevHeaderRef.current = heading;
  }, [heading, isUserInteraction]);

  // Check if whole list has changed
  function allItemsChanged(prevArray: string[], currentArray: string[]) {
    if (prevArray.length !== currentArray.length) {
      return true;
    }
    for (let i = 0; i < prevArray.length; i++) {
      if (prevArray[i] === currentArray[i]) {
        return false;
      }
    }
    return true;
  }

  // Glow on list update (only if not user interaction)
  useEffect(() => {
    if (!isUserInteraction) {
      if (allItemsChanged(prevListRef.current, list)) {
        setGlowListContainer(true);
        setTimeout(() => setGlowListContainer(false), 1500);
      } else {
        const updatedIndices: { [index: number]: boolean } = {};
        list.forEach((item, index) => {
          if (prevListRef.current[index] !== item) {
            updatedIndices[index] = true;
            setTimeout(() => {
              setGlowList((prev) => ({ ...prev, [index]: false }));
            }, 1500);
          }
        });
        if (Object.keys(updatedIndices).length) {
          setGlowList(updatedIndices);
        }
      }
    }
    prevListRef.current = list;
  }, [list, isUserInteraction]);

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToFirstScrollableAncestor]}
    >
      <div className="container" id={id}>
        <div className={`heading-container ${glowHeader ? "glow" : ""}`}>
          <h1>{heading}</h1>
        </div>
        <div className={`list-container ${glowListContainer ? "glow" : ""}`}>
          <SortableContext
            items={list.map((_, i) => i.toString())}
            strategy={verticalListSortingStrategy}
          >
            {list.map((item, index) => (
              <ListItem
                key={index}
                item={item}
                index={index}
                id={index.toString()}
                onCheckboxChange={handleCheckboxClick}
                isGlowing={glowList[index] || false}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </DndContext>
  );
};

export const List = memo(ListComponent);
