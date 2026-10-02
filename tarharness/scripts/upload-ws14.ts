import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const workspaceId = 'ws_ae08c15d-6222-4882-bc29-e62a9dcd3891';
const siteId = 'site_f355e4d3-292e-4537-a221-bd023ac67647';
const manifestPath = path.join(process.cwd(), 'out_ws14', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
const releaseId = manifest.id;
const hash = manifest.hash;

console.log(`Uploading release ${releaseId} for workspace ${workspaceId}, site ${siteId}...`);

const prefix = `workspaces/${workspaceId}/sites/${siteId}/releases/${releaseId}`;

const uploads = [
  { local: 'index.html', key: `${prefix}/index.html`, mime: 'text/html; charset=utf-8' },
  { local: 'style.css', key: `${prefix}/style.css`, mime: 'text/css; charset=utf-8' },
  { local: 'sitemap.xml', key: `${prefix}/sitemap.xml`, mime: 'application/xml; charset=utf-8' },
  { local: 'robots.txt', key: `${prefix}/robots.txt`, mime: 'text/plain; charset=utf-8' },
  { local: 'manifest.json', key: `${prefix}/manifest.json`, mime: 'application/json; charset=utf-8' },
  { local: 'source.json', key: `${prefix}/source.json`, mime: 'application/json; charset=utf-8' },
  { local: 'report.json', key: `${prefix}/report.json`, mime: 'application/json; charset=utf-8' },
];

for (const upload of uploads) {
  const localFile = path.join(process.cwd(), 'out_ws14', upload.local);
  console.log(`Putting ${upload.key}...`);
  execSync(`npx wrangler r2 object put "tar-site-releases/${upload.key}" --file="${localFile}" --content-type="${upload.mime}" --remote`, { stdio: 'inherit' });
}

console.log('Updating D1 CONTROL sites table...');
const at = Date.now();
const d1Query = `UPDATE sites SET release='${releaseId}', hash='${hash}', epoch=epoch+1, updated=${at}, status='active' WHERE workspace='${workspaceId}' AND site='${siteId}';`;
execSync(`npx wrangler d1 execute tarharness-control --remote --command="${d1Query}"`, { stdio: 'inherit' });

console.log('Updating Turso site record...');
// Done!
console.log('ws14 successfully published!');
