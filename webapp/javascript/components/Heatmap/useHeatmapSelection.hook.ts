import { useState, useEffect, RefObject } from 'react';

import type { Heatmap } from '@webapp/services/render';
import { HEATMAP_HEIGHT } from './constants';
import { clearRect, drawRect, getSelectionData } from './utils';

const DEFAULT_SELECTED_COORDINATES = { start: null, end: null };
let startCoords: SelectedAreaCoordsType | null = null;
let endCoords: SelectedAreaCoordsType | null = null;
let selectedAreaToHeatmapRatio = 1;

export type SelectedAreaCoordsType = Record<'x' | 'y', number>;
interface SelectedCoordinates {
  start: SelectedAreaCoordsType | null;
  end: SelectedAreaCoordsType | null;
}
interface UseHeatmapSelectionProps {
  canvasRef: RefObject<HTMLCanvasElement>;
  heatmapW: number;
  heatmap: Heatmap;
  onSelection: (
    minV: number,
    maxV: number,
    startT: number,
    endT: number
  ) => void;
}
interface UseHeatmapSelection {
  selectedCoordinates: SelectedCoordinates;
  hasSelectedArea: boolean;
  selectedAreaToHeatmapRatio: number;
  resetSelection: () => void;
}

export const useHeatmapSelection = ({
  canvasRef,
  heatmapW,
  heatmap,
  onSelection,
}: UseHeatmapSelectionProps): UseHeatmapSelection => {
  const [hasSelectedArea, setHasSelectedArea] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState<SelectedCoordinates>(DEFAULT_SELECTED_COORDINATES);

  const resetSelection = () => {
    setHasSelectedArea(false);
    setSelectedCoordinates(DEFAULT_SELECTED_COORDINATES);
    startCoords = null;
    endCoords = null;
  };

  const handleCellClick = (x: number, y: number) => {
    const cellW = heatmapW / heatmap.timeBuckets;
    const cellH = HEATMAP_HEIGHT / heatmap.valueBuckets;

    const matrixCoords = [
      Math.trunc(x / cellW),
      Math.trunc((HEATMAP_HEIGHT - y) / cellH),
    ];

    if (heatmap.values[matrixCoords[0]][matrixCoords[1]] === 0) {
      return;
    }

    // set startCoords and endCoords to draw selection rectangle for single cell
    startCoords = {
      x: (matrixCoords[0] + 1) * cellW,
      y: HEATMAP_HEIGHT - matrixCoords[1] * cellH,
    };
    endCoords = {
      x: matrixCoords[0] * cellW,
      y: HEATMAP_HEIGHT - (matrixCoords[1] + 1) * cellH,
    };

    const {
      selectionMinValue,
      selectionMaxValue,
      selectionStartTime,
      selectionEndTime,
    } = getSelectionData(
      heatmap,
      heatmapW,
      startCoords,
      endCoords,
      startCoords.y === HEATMAP_HEIGHT
    );

    onSelection(
      selectionMinValue,
      selectionMaxValue,
      selectionStartTime,
      selectionEndTime
    );
  };

  const startDrawing = (e: MouseEvent) => {
    window.addEventListener('mousemove', handleDrawingEvent);
    window.addEventListener('mouseup', endDrawing);

    const canvas = canvasRef.current as HTMLCanvasElement;
    const { left, top } = canvas.getBoundingClientRect();
    resetSelection();

    startCoords = { x: e.clientX - left, y: e.clientY - top };
  };

  const endDrawing = (e: MouseEvent) => {
    if (startCoords) {
      const canvas = canvasRef.current as HTMLCanvasElement;
      const { left, top, width, height } = canvas.getBoundingClientRect();
      setHasSelectedArea(true);
      clearRect(canvas);

      const xCursorPosition = e.clientX - left;
      const yCursorPosition = e.clientY - top;
      let xEnd;
      let yEnd;

      if (xCursorPosition < 0) {
        xEnd = 0;
      } else if (xCursorPosition > width) {
        xEnd = width;
      } else {
        xEnd = xCursorPosition;
      }

      if (yCursorPosition < 0) {
        yEnd = 0;
      } else if (yCursorPosition > height) {
        yEnd = parseInt(height.toFixed(0), 10);
      } else {
        yEnd = yCursorPosition;
      }

      endCoords = { x: xEnd, y: yEnd };
      const isClickEvent = startCoords.x === xEnd && startCoords.y === yEnd;

      if (isClickEvent) {
        handleCellClick(xEnd, yEnd);
      } else {
        const {
          selectionMinValue,
          selectionMaxValue,
          selectionStartTime,
          selectionEndTime,
        } = getSelectionData(heatmap, heatmapW, startCoords, endCoords);

        onSelection(
          selectionMinValue,
          selectionMaxValue,
          selectionStartTime,
          selectionEndTime
        );
      }

      window.removeEventListener('mousemove', handleDrawingEvent);
      window.removeEventListener('mouseup', endDrawing);

      const selectedAreaW = endCoords.x - startCoords.x;
      if (selectedAreaW) {
        selectedAreaToHeatmapRatio = Math.abs(width / selectedAreaW);
      } else {
        selectedAreaToHeatmapRatio = 1;
      }
    }
  };

  const handleDrawingEvent = (e: MouseEvent) => {
    const canvas = canvasRef.current as HTMLCanvasElement;

    if (canvas && startCoords) {
      const { left, top } = canvas.getBoundingClientRect();

      /**
       * Cursor coordinates inside canvas
       * @cursorXCoordinate - e.clientX - left
       * @cursorYCoordinate - e.clientY - top
       */
      const width = e.clientX - left - startCoords.x;
      const h = e.clientY - top - startCoords.y;

      drawRect(canvas, startCoords.x, startCoords.y, width, h);
    }
  };

  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.addEventListener('mousedown', startDrawing);
    }

    return () => {
      if (canvasRef.current) {
        canvasRef.current.removeEventListener('mousedown', startDrawing);
        window.removeEventListener('mousemove', handleDrawingEvent);
        window.removeEventListener('mouseup', endDrawing);
      }
    };
  }, [heatmap, heatmapW]);

  // set coordinates to display resizable selection rectangle (div element)
  useEffect(() => {
    if (startCoords && endCoords) {
      setSelectedCoordinates({
        start: { x: startCoords.x, y: startCoords.y },
        end: { x: endCoords.x, y: endCoords.y },
      });
    }
  }, [startCoords, endCoords]);

  return {
    selectedCoordinates,
    selectedAreaToHeatmapRatio,
    hasSelectedArea,
    resetSelection,
  };
};
