import { Mutable } from './mutable';
import { resize } from './resize';
import { html } from 'htl'
import * as d3 from 'd3';
import * as Plot from '@observablehq/plot';


import {
  subscribeToData,
  getHeight,
  getWidth,
  objectTransform
} from '@google/dscc'


const LOCAL = import.meta.env.DEV;

const parseDate = d3.utcParse("%Y%m%d");

let chartStyle;

function transformLookerInput(input) {
  const { tables, fields, style } = input;
  chartStyle = style
  const data = tables.DEFAULT;

  // Create a mapping of field indices to their names
  const fieldMapping = {};
  for (const [key, fieldArray] of Object.entries(fields)) {
    fieldMapping[key] = fieldArray.map(field => field.name);
  }
  // console.log(`fieldMapping ${JSON.stringify(fieldMapping, null, 2)}`);

  return data.map(item => {
    const result = {};

    for (const [key, values] of Object.entries(item)) {
      if (Array.isArray(values)) {
        values.forEach((value, index) => {
          const fieldName = fieldMapping[key][index];
          if (fieldName) {
            if (fieldName.toLowerCase() === 'date') {
              result["date"] = LOCAL ? value : parseDate(value);
            } else {
              // Store both the dimension index and name
              result[`dimension${index}`] = value;
              result[`dimensionName${index}`] = fieldName;
            }
          }
        });
      }
    }
    return result;
  }).sort((a, b) => a.date - b.date);
}

function getDefaultDateRange(dataset) {
  if (!dataset || dataset.length === 0) return [new Date(), new Date()];

  // Get the earliest and latest dates
  const lastIndex = dataset.length - 1;
  const lookbackIndex = Math.min(52, lastIndex); // Use either 52 weeks or max available

  return [dataset.at(-lookbackIndex).date, dataset.at(-1).date];
}

function getDimensionNames(dataset) {
  if (!dataset || dataset.length === 0) return [];
  const firstRow = dataset[0];
  return Object.keys(firstRow)
    .filter(key => key.startsWith('dimensionName'))
    .map(key => firstRow[key]);
}

function tidyData(dataset) {
  const dimensionCount = Object.keys(dataset[0])
    .filter(key => key.startsWith('dimension') && !key.includes('Name')).length;

  return dataset.flatMap(row => {
    return Array.from({ length: dimensionCount }, (_, i) => ({
      date: row.date,
      rate: row[`dimension${i}`],
      type: row[`dimensionName${i}`]
    }));
  }).sort((a, b) => a.date - b.date);
}

function createColorScale(dataset) {
  const types = [...new Set(dataset.map(d => d.type))];
  return Plot.scale({ color: { domain: types } });
}

function formatPercent(value, format) {
  return value == null
    ? "N/A"
    : (value / 100).toLocaleString("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "percent",
      ...format
    });
}

function trend(v) {
  return v >= 0.005 ? html`<span class="green">↗︎</span>`
    : v <= -0.005 ? html`<span class="red">↘︎</span>`
      : "→";
}

function processDataset(dataset) {
  // console.log(JSON.stringify(dataset.slice(0, 5), null, 2));
  const dimensionNames = getDimensionNames(dataset);
  const tidy = tidyData(dataset);
  const color = createColorScale(tidy);

  // console.log(JSON.stringify(tidy.slice(0, 5), null, 2));

  const existingControlsContainer = document.getElementById('mainsite-center');
  if (existingControlsContainer) {
    existingControlsContainer.remove();
  }

  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'mainsite-center';
  document.body.appendChild(controlsContainer);

  // const width = LOCAL ? 800 : getWidth();
  // const height = LOCAL ? 600 : getHeight();

  const defaultStartEnd = getDefaultDateRange(dataset);
  const startEnd = Mutable(defaultStartEnd);

  const getStartEnd = () => startEnd.value;

  const createOverviewChart = (dataset) => {
    const color = createColorScale(dataset);

    const plot = resize((width) => Plot.plot({
      width,
      y: { grid: true, label: "Rate (%)", tickFormat: d => d.toFixed(1) + "%" },
      x: {
        label: "Date",
        tickFormat: d => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      },
      color,
      marks: [
        Plot.ruleY([0]),
        Plot.lineY(dataset, { x: "date", y: "rate", stroke: "type", strokeWidth: 2, curve: chartStyle?.lineType.value || "catmull-rom", tip: true }),
        (index, scales, channels, dimensions, context) => {
          const x1 = dimensions.marginLeft;
          const y1 = 0;
          const x2 = dimensions.width - dimensions.marginRight;
          const y2 = dimensions.height;
          const brushed = (event) => {
            if (!event.sourceEvent) return;
            let { selection } = event;
            if (!selection) {
              const r = 10; // radius of point-based selection
              let [px] = d3.pointer(event, context.ownerSVGElement);
              px = Math.max(x1 + r, Math.min(x2 - r, px));
              selection = [px - r, px + r];
              g.call(brush.move, selection);
            }
            setStartEnd(selection.map(scales.x.invert));
          };
          const pointerdowned = (event) => {
            const pointerleave = new PointerEvent("pointerleave", { bubbles: true, pointerType: "mouse" });
            event.target.dispatchEvent(pointerleave);
          };
          const brush = d3.brushX().extent([[x1, y1], [x2, y2]]).on("brush end", brushed);
          const g = d3.create("svg:g").call(brush);
          const currentStartEnd = getStartEnd();
          // console.log('Current startEnd:', currentStartEnd);
          if (Array.isArray(currentStartEnd) && currentStartEnd.length === 2) {
            g.call(brush.move, currentStartEnd.map(scales.x));
          } else {
            console.error('startEnd is not in the expected format:', currentStartEnd);
          }
          g.on("pointerdown", pointerdowned);
          return g.node();
        }
      ]
    }))
    return plot
  };


  const createDetailChart = (dataset) => {

    let chartContainer;

    function createPlot(startEnd) {
      const filteredDataset = Array.isArray(startEnd) && startEnd.length === 2
        ? dataset.filter((d) => startEnd[0] <= d.date && d.date < startEnd[1])
        : dataset;

      return resize((width, height) => {
        return Plot.plot({
          width,
          height,
          y: { grid: true, label: "rate (%)" },
          color,
          marks: [
            Plot.lineY(filteredDataset, { x: "date", y: "rate", stroke: "type", curve: chartStyle.lineType.value || "catmull-rom", tip: true, markerEnd: true })
          ]
        })
      })

    }

    return {
      initialize(container) {
        if (!dataset || dataset.length === 0) {
          throw new Error("Dataset is empty or not provided");
        }

        chartContainer = container;
        const initialPlot = createPlot(defaultStartEnd);
        chartContainer.appendChild(initialPlot);
      },
      update(date) {
        if (!chartContainer) {
          throw new Error("Chart has not been initialized");
        }
        const newPlot = createPlot(date);
        chartContainer.innerHTML = '';
        chartContainer.appendChild(newPlot);
      }
    };
  }

  function createMetricCard(dimensionName, dimension, color) {
    const dimensionKey = Object.keys(dimension[0])
      .find(key => key.startsWith('dimension') &&
        !key.includes('Name') &&
        dimension[0][`dimensionName${key.slice(-1)}`] === dimensionName);

    if (!dimensionKey) return null;

    // Get current and previous day values
    const currentValue = dimension.at(-1)[dimensionKey];
    const previousValue = dimension.at(-2)?.[dimensionKey];
    const dayChange = previousValue !== undefined ? currentValue - previousValue : null;

    // For monthly comparison (30 days)
    const monthAgoIndex = Math.min(30, dimension.length - 1);
    const monthAgoValue = dimension.at(-monthAgoIndex)?.[dimensionKey];
    const monthChange = monthAgoValue !== undefined ? currentValue - monthAgoValue : null;

    // For moving averages, use daily periods
    const weekData = dimension.slice(-Math.min(7, dimension.length));
    const monthData = dimension.slice(-Math.min(30, dimension.length));

    // Calculate ranges from available data
    const range = d3.extent(monthData, (d) => d[dimensionKey]);
    const stroke = color.apply(dimensionName);

    return html.fragment`
      <h2 style="color: ${stroke}">${dimensionName}</h2>
      <h1>${formatPercent(currentValue)}</h1>
      <table>
        <tr>
          <td>1-day change</td>
          <td align="right">${dayChange !== null ? formatPercent(dayChange, { signDisplay: "always" }) : "N/A"}</td>
          <td>${dayChange !== null ? trend(dayChange) : "→"}</td>
        </tr>
        <tr>
          <td>${monthData.length < 30 ? `${monthData.length}-day` : '30-day'} change</td>
          <td align="right">${monthChange !== null ? formatPercent(monthChange, { signDisplay: "always" }) : "N/A"}</td>
          <td>${monthChange !== null ? trend(monthChange) : "→"}</td>
        </tr>
        <tr>
          <td>7-day average</td>
          <td align="right">${formatPercent(d3.mean(weekData, (d) => d[dimensionKey]))}</td>
        </tr>
        <tr>
          <td>30-day average</td>
          <td align="right">${formatPercent(d3.mean(monthData, (d) => d[dimensionKey]))}</td>
        </tr>
      </table>
      ${resize((width) =>
      Plot.plot({
        width,
        height: 40,
        axis: null,
        x: { inset: 40 },
        marks: [
          Plot.tickX(monthData, {
            x: dimensionKey,
            stroke,
            insetTop: 10,
            insetBottom: 10,
            title: (d) => `${d.date?.toLocaleDateString("en-us")}: ${d[dimensionKey]}%`,
            tip: { anchor: "bottom" }
          }),
          Plot.tickX(dimension.slice(-1), { x: dimensionKey, strokeWidth: 2 }),
          Plot.text([`${formatPercent(range[0])}%`], { frameAnchor: "left" }),
          Plot.text([`${formatPercent(range[1])}%`], { frameAnchor: "right" })
        ]
      })
    )}
      <span class="small muted">${monthData.length}-day range</span>
    `;
  }

  const updateMetricExtent = function () {
    let spanContainer;
    function currentRate(startEnd) {
      return Array.isArray(startEnd) && startEnd.length === 2 && startEnd === defaultStartEnd ? "..."
        : startEnd.map((d) => d.toLocaleDateString("en-US")).join("–");
    }
    return {
      initialize(container) {
        spanContainer = container;
        const init = currentRate(defaultStartEnd)
        spanContainer.innerText = init;
      },
      update(date) {
        if (!spanContainer) {
          throw new Error("Chart has not been initialized");
        }
        const updated = currentRate(date)
        spanContainer.innerText = updated

      }
    }
  }

  // styling
  const main = html`
  <style>
 
      @container (min-width: 560px) {
        .grid-cols-2-3 {
          grid-template-columns: 1fr 1fr;
        }
        .grid-cols-2-3 .grid-colspan-2 {
          grid-column: span 2;
        }
      }
      
      @container (min-width: 840px) {
        .grid-cols-2-3 {
          grid-template-columns: 1fr 2fr;
          grid-auto-flow: column;
        }
      }
        
</style>
<main id="mainsite-main" class="mainsite">
  <div class="grid grid-cols-2-3" style="margin-top: 2rem;" id="card-container">
    
    <div class="card grid-colspan-2 grid-rowspan-2" style="display: flex; flex-direction: column;">
           <h2>Rates <span id="date-extent"></span></h2><br>
          <span style="flex-grow: 1;" id="mainLineChart"></span>
    </div>
</div>
<div class="grid" style="margin-top: 1rem;">
      <div class="card">
        <h2>All dates (${d3.extent(dataset, (d) => d.date.getUTCFullYear()).join("–")})</h2>
        <h3>Click/drag to zoom</h3>
        <div>${createOverviewChart(tidy)}</div>
      </div>
    </div>
  </main>
  `

  controlsContainer.appendChild(main);

  const cardContainer = document.getElementById('card-container');
  dimensionNames.forEach(dimensionName => {
    cardContainer.appendChild(html.fragment`
      <div class="card">${createMetricCard(dimensionName, dataset, color)}</div>
    `);
  });

  const mainLineChart = document.getElementById('mainLineChart');
  const newChart = createDetailChart(tidy);
  newChart.initialize(mainLineChart);

  const liveOutput = document.getElementById('date-extent');
  const updateMetric = updateMetricExtent()
  updateMetric.initialize(liveOutput);


  const setStartEnd = (se) => {
    startEnd.value = (se ?? defaultStartEnd);
    // console.log('startEnd.value:', startEnd.value);
    updateMetric.update(startEnd.value);
    newChart.update(startEnd.value);

  };


}

function transformCsvToLookerFormat(csvData) {
  // Create the fields mapping structure from Looker Studio
  const fields = {
    date: [{
      id: "date",
      name: "DATE",
      type: "YEAR_MONTH_DAY",
      concept: "DIMENSION"
    }],
    dim: [
      {
        id: "dim0",
        name: "15YR mortgage",
        type: "NUMBER",
        concept: "DIMENSION"
      },
      {
        id: "dim1",
        name: "30YR mortgage",
        type: "NUMBER",
        concept: "DIMENSION"
      }
    ],
    value: []
  };

  // Transform CSV rows to Looker Studio format
  const tables = {
    DEFAULT: csvData.map(row => ({
      date: [row.date],
      dim: [row.mortgage15y, row.mortgage30y]
    }))
  };

  const style = {
    lineType: {
        value: "step",
        defaultValue: "catmull-rom"
      },
  }

  return { tables, fields, style };
}

function renderVisualization(inputData) {
  if (LOCAL) {
    d3.csv('../data/mortgage.csv', d3.autoType).then(csvData => {
      // console.log(csvData)
      const lookerFormatData = transformCsvToLookerFormat(csvData);
      const dataset = transformLookerInput(lookerFormatData);
      processDataset(dataset);
    }).catch(error => {
      console.error("Error loading the CSV file:", error);
    });
  } else {
    // console.log(JSON.stringify(inputData, null, 2));
    const dataset = transformLookerInput(inputData);
    processDataset(dataset);
  }
}

// Call renderVisualization
if (LOCAL) {
  renderVisualization({});
} else {
  subscribeToData(renderVisualization, { transform: objectTransform });
}
