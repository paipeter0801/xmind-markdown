import { describe, it } from 'vitest';
import JSZip from 'jszip';
import { MarkdownToXmindConverter } from './markdown-to-xmind';
import { XMLParser } from 'fast-xml-parser';
describe('dbg', async () => {
  const x = await new MarkdownToXmindConverter().convert(`# Root\n\n- 🚩 A #important\n  - 📝 note\n  - [L](https://e.com)`);
  const zip = await JSZip.loadAsync(await x.blob!.arrayBuffer());
  const xml = await zip.file('content.xml')!.async('string');
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', isArray: (n:string)=>['topic','marker-ref'].includes(n) }).parse(xml);
  const sheet = parsed['xmap-content']?.sheet;
  const topic = Array.isArray(sheet?.topic) ? sheet.topic[0] : sheet?.topic;
  console.log('===TOPIC KEYS===', Object.keys(topic || {}));
  console.log('===TOPIC[marker-refs]===', JSON.stringify(topic?.['marker-refs']));
  console.log('===CHILD topic keys===', JSON.stringify(Object.keys(topic?.children?.topics?.topic?.[0] || {})));
  it('ok', () => {});
});
