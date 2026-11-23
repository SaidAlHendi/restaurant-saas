import { t, assert, expectStatus, skip } from '../lib/runner.mjs';
import { Client, getPage } from '../lib/http.mjs';
import { config } from '../lib/config.mjs';

const R = 'Anonymous';

t(R, 'System health', 'API /v1/health is ok', async () => {
  const res = expectStatus(await new Client().get('/v1/health'), 200);
  assert.equal(res.body.status, 'ok');
});

t(R, 'System health', 'API /v1/ready reports dependencies ready', async () => {
  expectStatus(await new Client().get('/v1/ready'), 200);
});

t(R, 'System health', 'Unknown API route returns a JSON 404', async () => {
  const res = await new Client().get('/v1/does-not-exist');
  assert.equal(res.status, 404);
});

t(R, 'System health', 'Protected route without a token returns 401', async () => {
  expectStatus(await new Client().get('/v1/me'), 401);
});

t(R, 'System health', 'Garbage bearer token returns 401', async () => {
  expectStatus(await new Client('not.a.jwt').get('/v1/me'), 401);
});

t(R, 'System health', 'Security headers (helmet) are present', async () => {
  const res = await new Client().get('/v1/health');
  assert.ok(res.headers.get('x-content-type-options'), 'x-content-type-options missing');
});

for (const [name, url] of [['Staff web app', config.webUrl], ['Public site', config.siteUrl], ['Platform admin app', config.adminUrl]]) {
  t(R, 'Front-end apps', `${name} responds (${url})`, async () => {
    const page = await getPage(url);
    if (page.status === 0) skip(`not running (${page.text}); start it with pnpm dev`);
    expectStatus(page, 200);
    assert.match(page.text, /<html|<!doctype/i);
  });
}
