async function testMultipleRapidPublishes() {
  const url = 'https://siteagent.tar-54d.workers.dev';
  const styles = [
    { name: 'Sweetgreen', file: 'sweetgreen.md', marker: 'Playfair Display' },
    { name: 'Hungry Tiger', file: 'eathungrytiger.md', marker: 'Antonio' },
    { name: 'Adanola', file: 'adanola.md', marker: 'Syne' }
  ];

  for (let i = 0; i < styles.length; i++) {
    const s = styles[i];
    const t = Date.now();
    console.log(`\n[Test ${i + 1}/3] Publishing ${s.name} (${s.file})...`);
    
    const pStart = Date.now();
    const pRes = await fetch(`${url}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteMarkdown: `---\nbrand: "Rapid Test ${s.name}"\nstyle: "${s.file}"\nsubdomain: "cafe"\n---\n# 1. Hero\nheadline: "RAPID_${s.name.toUpperCase()}_${t}"`,
        styleName: s.file,
        route: '/'
      })
    });
    console.log(`  -> Publish finished in ${Date.now() - pStart}ms (Status: ${pRes.status})`);

    // Immediate 0ms GET with cache-bust timestamp
    const gStart = Date.now();
    const gRes = await fetch(`${url}/?ws=cafe&t=${t}`);
    const html = await gRes.text();
    const edgeHit = gRes.headers.get('X-TAR-Edge-Hit');
    console.log(`  -> Immediate GET finished in ${Date.now() - gStart}ms (Edge Hit: ${edgeHit})`);
    
    const hasHeadline = html.includes(`RAPID_${s.name.toUpperCase()}_${t}`);
    const hasMarker = html.includes(s.marker);
    console.log(`  -> Verified Headline (${hasHeadline ? 'PASS ✅' : 'FAIL ❌'})`);
    console.log(`  -> Verified Typography / Style Marker '${s.marker}' (${hasMarker ? 'PASS ✅' : 'FAIL ❌'})`);
  }
}

testMultipleRapidPublishes().catch(console.error);
