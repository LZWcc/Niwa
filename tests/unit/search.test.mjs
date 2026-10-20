// 搜索引擎网址模板（utils/search/template.ts）的单元测试：pnpm test:unit
import { searchUrl, isTemplate, toUrl, templateFromResult, templateFromOpenSearch } from '../../utils/search/template.ts';
let pass = 0,
  fail = 0;
const ok = (cond, msg) => {
  if (cond) pass++;
  else {
    fail++;
    console.log('FAIL', msg);
  }
};
const eq = (got, want, msg) => ok(got === want, `${msg}: ${got} (want ${want})`);

// 拼搜索网址：中文、空格、& 都要编码
eq(searchUrl('https://www.bing.com/search?q=%s', '庭 & niwa'), 'https://www.bing.com/search?q=%E5%BA%AD%20%26%20niwa', 'encode query');
eq(searchUrl('https://example.com/s/%s/page', 'a/b'), 'https://example.com/s/a%2Fb/page', 'query in path');

ok(isTemplate('https://yandex.com/search/?text=%s'), 'valid template');
ok(!isTemplate('https://yandex.com/search/'), 'template without %s');
ok(!isTemplate('javascript:alert(%s)'), 'non-http template');

eq(toUrl('yandex.com')?.href, 'https://yandex.com/', 'add https');
eq(toUrl('http://a.example/x')?.href, 'https://a.example/x', 'http to https');
eq(toUrl('not a url'), null, 'not a url');
eq(toUrl('localhost'), null, 'no dot');

// 搜索结果的网址
const result = (u) => templateFromResult(new URL(u));
eq(result('https://yandex.com/search/?text=niwa&lr=213'), 'https://yandex.com/search/?text=%s&lr=213', 'yandex result');
eq(
  result('https://www.google.com/search?q=niwa&oq=niwa&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8'),
  'https://www.google.com/search?q=%s&gs_lcrp=EgZjaHJvbWU&sourceid=chrome&ie=UTF-8',
  'google result drops oq',
);
eq(result('https://github.com/search?q=NIWA&type=code#top'), 'https://github.com/search?q=%s&type=code', 'case-insensitive, drop hash');
eq(result('https://example.com/search/niwa'), 'https://example.com/search/%s', 'probe in path');
eq(result('https://niwa.example/search?q=hello'), null, 'probe only in host');

// OpenSearch 模板
eq(templateFromOpenSearch('https://os.example/s?q={searchTerms}&p={startPage?}'), 'https://os.example/s?q=%s', 'drop optional params');
eq(templateFromOpenSearch('https://os.example/s?q={searchTerms}&ie={inputEncoding}'), 'https://os.example/s?q=%s&ie=UTF-8', 'encoding');
eq(templateFromOpenSearch('https://os.example/s/{searchTerms}'), 'https://os.example/s/%s', 'path template');
eq(templateFromOpenSearch('https://os.example/s?q={searchTerms}&n={count}'), null, 'unknown required param');
eq(templateFromOpenSearch('https://os.example/s'), null, 'no searchTerms');

console.log(`${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
