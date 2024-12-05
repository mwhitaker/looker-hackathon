# Looker Hackathon 2024. Studio Community Visualization - Linked Charts

A Looker Studio community visualization component featuring linked line charts with brushing capabilities and modern CSS styling. The visualization shows data with interactive time period selection and comparison metrics. Heavily inspired by examples from ObservableHQ.

## Features

- Interactive linked line charts
- Time period brushing and zooming
- Comparative metrics display (daily/weekly/monthly changes)
- Responsive design with modern CSS
- Support for multiple dimensions (1-4)

## Development Setup

### Prerequisites

- Node.js > 18
- npm
- Google Cloud Platform account (for deployment)
- Vite for dev and bundling

### Local Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

### Project Structure

```
├── data/                  # Sample data files
│   ├── DGS2.csv
│   ├── DGS5.csv
│   └── ...
├── public/               # Static assets
│   ├── index.css
│   └── manifest.json
├── src/                 # Source code
│   ├── index.css
│   ├── index.js        # Main visualization code
│   ├── mutable.js      # State management
│   └── resize.js       # Responsive handling
├── package.json
├── vite.config.js
└── upload_to_gcp.sh    # Deployment script
```

### Building

1. Configure your GCP username and bucket in `upload_to_gcp.sh`
2. Update the data in `public/manifest.json`.
3. To build the visualization for production:

```bash
npm run build
```

This will generate the distribution files in the `dist` directory.

### Deployment

Run the upload script:
```bash
./upload_to_gcp.sh
```

This will upload the necessary files to your GCP bucket.

## In Looker Studio

Add the custom viz in the form `gs://BUCKET/FOLDER` - just as you entered it in `./upload_to_gcp.sh`

## Dependencies

- @observablehq/plot: Data visualization library
- @observablehq/inputs: Input components
- d3-dsv: CSV parsing (only needed for local dev)
- htl: HTML templating
- @google/dscc: Looker Studio community visualization SDK

## Local Testing

Place your test data in a CSV file named `output.csv` in the project root. The development server will set the `LOCAL` flag with `npm run dev`.

## Configuration

The visualization can be configured in Looker Studio to accept between 1 and 4 dimensions, with the first field being a date field.

## License

MIT
