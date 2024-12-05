gcloud config set account email@example.com
gcloud config set project your-project

BUCKET="gs://bucket/vizfolder"

# Upload files
gsutil cp -a public-read dist/index.js $BUCKET/index.js
gsutil cp -a public-read dist/index.css $BUCKET/index.css
gsutil cp -a public-read dist/index.json $BUCKET/index.json
gsutil cp -a public-read dist/manifest.json $BUCKET/manifest.json

echo "Upload complete!"