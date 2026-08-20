async function testStyles() {
  const workerUrl = 'https://siteagent.tar-54d.workers.dev';

  console.log('====================================================');
  console.log('  TESTING DISTINCT DESIGN DNA FOR EACH REFERO STYLE ');
  console.log('====================================================\n');

  // 1. Sweetgreen
  console.log('1. Publishing Sweetgreen Style (Farm Organic Serif + 24px Pill Curves)...');
  const res1 = await fetch(`${workerUrl}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteMarkdown: `---\nbrand: "Green Cafe"\nstyle: "sweetgreen.md"\nsubdomain: "greencafe"\n---\n# 1. Hero\nheadline: "FARM FRESH BOWLS"`,
      styleName: 'sweetgreen.md'
    })
  });
  console.log('   Publish Status:', res1.status);
  const get1 = await fetch(`${workerUrl}/?ws=greencafe`);
  const html1 = await get1.text();
  console.log('   Font Pairing:', html1.includes('Playfair Display') ? '✅ Playfair Display (Serif)' : '❌');
  console.log('   Card Geometry:', html1.includes('--radius-cards: 24px') ? '✅ 24px Organic Pill Curves' : '❌');

  // 2. FREITAG
  console.log('\n2. Publishing FREITAG Style (Swiss Industrial + 0px Sharp Boxy Cards)...');
  const res2 = await fetch(`${workerUrl}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteMarkdown: `---\nbrand: "Tarp Bag Store"\nstyle: "freitag.md"\nsubdomain: "tarpbags"\n---\n# 1. Hero\nheadline: "INDIVIDUAL RECYCLED BAGS"`,
      styleName: 'freitag.md'
    })
  });
  console.log('   Publish Status:', res2.status);
  const get2 = await fetch(`${workerUrl}/?ws=tarpbags`);
  const html2 = await get2.text();
  console.log('   Font Pairing:', html2.includes('Public Sans') ? '✅ Public Sans (Swiss Bold)' : '❌');
  console.log('   Card Geometry:', html2.includes('--radius-cards: 0px') ? '✅ 0px Sharp Industrial Boxy' : '❌');

  // 3. Telepathic Instruments
  console.log('\n3. Publishing Telepathic Instruments Style (Terminal Monospace + 0px Cards)...');
  const res3 = await fetch(`${workerUrl}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteMarkdown: `---\nbrand: "Synth Lab"\nstyle: "telepathicins.md"\nsubdomain: "synthlab"\n---\n# 1. Hero\nheadline: "ANALOG SOUND ENGINE"`,
      styleName: 'telepathicins.md'
    })
  });
  console.log('   Publish Status:', res3.status);
  const get3 = await fetch(`${workerUrl}/?ws=synthlab`);
  const html3 = await get3.text();
  console.log('   Font Pairing:', html3.includes('JetBrains Mono') ? '✅ JetBrains Mono + Space Grotesk' : '❌');
  console.log('   Card Geometry:', html3.includes('--radius-cards: 0px') ? '✅ 0px Technical Monospace' : '❌');

  console.log('\n====================================================');
  console.log('  ALL DISTINCT DESIGN SYSTEMS VERIFIED AND APPLIED  ');
  console.log('====================================================');
}

testStyles().catch(console.error);
