import React, { RefObject } from 'react';
import { renderHook } from '@testing-library/react-hooks';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import continuousReducer from '@webapp/redux/reducers/continuous';
import tracingReducer from '@webapp/redux/reducers/tracing';

import { useHeatmapSelection } from './useHeatmapSelection.hook';
import { heatmapMockData } from '../../services/exemplarsTestData';

const canvasEl = document.createElement('canvasEl');
const canvasRef = { current: canvasEl } as RefObject<HTMLCanvasElement>;

function createStore(preloadedState: any) {
  const store = configureStore({
    reducer: {
      continuous: continuousReducer,
      tracing: tracingReducer,
    },
    preloadedState,
  });

  return store;
}

describe('Hook: useHeatmapSelection', () => {
  const render = () =>
    renderHook(
      () =>
        useHeatmapSelection({
          canvasRef,
          heatmapW: 1234,
          heatmap: heatmapMockData,
          onSelection: () => ({}),
        }),
      {
        wrapper: ({ children }) => (
          <Provider
            store={createStore({
              continuous: {},
              tracing: {
                exemplarsSingleView: {},
              },
            })}
          >
            {children}
          </Provider>
        ),
      }
    ).result;

  it('should return initial selection values', () => {
    const { current } = render();

    expect(current).toMatchObject({
      selectedCoordinates: { start: null, end: null },
      selectedAreaToHeatmapRatio: 1,
      hasSelectedArea: false,
      resetSelection: expect.any(Function),
    });
  });
});
