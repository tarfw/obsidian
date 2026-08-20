async function testFastPublish() {
  const url = 'https://siteagent.tar-54d.workers.dev';
  const timestamp = Date.now();
  console.log('Testing fast publish and immediate read...');

  const publishStart = Date.now();
  const res = await fetch(`${url}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteMarkdown: `---\nbrand: "Cafe Live"\nstyle: "sweetgreen.md"\nsubdomain: "cafe"\n---\n# 1. Hero\nheadline: "FRESH_TEST_${timestamp}"`,
      styleName: 'sweetgreen.md',
      route: '/'
    })
  });
  console.log(`Publish completed in ${Date.now() - publishStart}ms with status: ${res.status}`);

  // Immediate GET (0ms wait)
  const getStart = Date.now();
  const getRes = await fetch(`${url}/?ws=cafe&t=${timestamp}`);
  const html = await getRes.text();
  console.log(`GET completed in ${Date.now() - getStart}ms`);
  console.log(`Contains FRESH_TEST_${timestamp}:`, html.includes(`FRESH_TEST_${timestamp}`));
  console.log(`Contains Sweetgreen Playfair Display:`, html.includes('Playfair Display'));
}

testFastPublish().catch(console.error);
