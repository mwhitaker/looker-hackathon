import { defineConfig } from 'vite';
import { resolve } from 'path';
import path from 'path';

import { writeFileSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: {
      '@observablehq/runtime': path.resolve(__dirname, 'node_modules/@observablehq/runtime'),
      '@observablehq/inputs': path.resolve(__dirname, 'node_modules/@observablehq/inputs'),
      'd3': path.resolve(__dirname, 'node_modules/d3')
    }
  },
  optimizeDeps: {
    include: ['@observablehq/runtime', '@observablehq/inputs', 'd3']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'VizLib',
      fileName: 'index',
      formats: ['iife']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'index.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'index.css';
          return assetInfo.name;
        },
      }
    },
    minify: false, // Enable minification
    sourcemap: false, // Disable sourcemap generation
  },
  plugins: [
    {
      name: 'generate-index-json',
      closeBundle() {
        const indexJson = {
          "data": [
            {
              "id": "dimensions",
              "label": "Chart Data",
              "elements": [
                {
                  "id": "date",
                  "label": "Date",
                  "type": "DIMENSION",
                  "options": {
                    "min": 1,
                    "max": 1,
                    "supportedTypes": ["TIME"]
                  }
                },
                {
                  "id": "dim_old",
                  "label": "Dimensions",
                  "type": "DIMENSION",
                  "options": {
                    "min": 0,
                    "max": 3
                  }
                },
                {
                  "id": "dim",
                  "label": "Metric",
                  "type": "METRIC",
                  "options": {
                    "min": 1,
                    "max": 4
                  }
                }
              ]
            }
          ],
          "style": [
            {
              "id": "styleOptions",
              "label": "Chart Options",
              "elements": [
                
                {
                  "id": "lineType",
                  "label": "Line Type",
                  "type": "TEXTINPUT",
                  "defaultValue": "catmull-rom"
                }
               
              ]
            }
          ]
        };
        writeFileSync('dist/index.json', JSON.stringify(indexJson, null, 2));
      }
    }
  ],
  define: {
    'process.env.DEVMODE_BOOL': JSON.stringify(process.env.DEVMODE_BOOL),
  },
});