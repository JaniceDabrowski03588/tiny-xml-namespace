import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  NamespaceResolver,
  ReservedPrefixError,
  UnboundPrefixError,
  XML_NAMESPACE,
  XMLNS_NAMESPACE,
} from '../src/index.js';

test('unprefixed name resolves to the default namespace', () => {
  const resolver = new NamespaceResolver([{ '': 'urn:default' }]);
  assert.equal(resolver.resolve('rect'), 'urn:default');
});

test('unprefixed name with no default namespace resolves to undefined', () => {
  const resolver = new NamespaceResolver();
  assert.equal(resolver.resolve('rect'), undefined);
});

test('prefixed name resolves through the stack', () => {
  const resolver = new NamespaceResolver([
    { svg: 'http://www.w3.org/2000/svg' },
  ]);
  assert.equal(resolver.resolve('svg:rect'), 'http://www.w3.org/2000/svg');
});

test('inner scope shadows outer scope', () => {
  const resolver = new NamespaceResolver([{ p: 'urn:outer' }]);
  resolver.push({ p: 'urn:inner' });
  assert.equal(resolver.resolve('p:thing'), 'urn:inner');
  resolver.pop();
  assert.equal(resolver.resolve('p:thing'), 'urn:outer');
});

test('a prefix introduced in an inner scope is not visible after pop', () => {
  const resolver = new NamespaceResolver();
  resolver.push({ q: 'urn:q' });
  assert.equal(resolver.resolve('q:x'), 'urn:q');
  resolver.pop();
  assert.throws(() => resolver.resolve('q:x'), UnboundPrefixError);
});

test('empty URI undeclares the default namespace', () => {
  const resolver = new NamespaceResolver([{ '': 'urn:default' }]);
  resolver.push({ '': '' });
  assert.equal(resolver.resolve('rect'), undefined);
  resolver.pop();
  assert.equal(resolver.resolve('rect'), 'urn:default');
});

test('empty URI for a non-empty prefix is treated as unbound', () => {
  const resolver = new NamespaceResolver([{ p: 'urn:p' }]);
  resolver.push({ p: '' });
  assert.throws(() => resolver.resolve('p:thing'), UnboundPrefixError);
});

test('reserved xml prefix is always bound', () => {
  const resolver = new NamespaceResolver();
  assert.equal(resolver.resolve('xml:lang'), XML_NAMESPACE);
});

test('reserved xmlns prefix is always bound', () => {
  const resolver = new NamespaceResolver();
  assert.equal(resolver.resolve('xmlns:foo'), XMLNS_NAMESPACE);
});

test('rebinding the xml prefix throws', () => {
  const resolver = new NamespaceResolver();
  assert.throws(() => resolver.push({ xml: 'urn:not-xml' }), ReservedPrefixError);
});

test('rebinding the xmlns prefix throws', () => {
  const resolver = new NamespaceResolver();
  assert.throws(() => resolver.push({ xmlns: 'urn:not-xmlns' }), ReservedPrefixError);
});

test('unbound prefix throws UnboundPrefixError', () => {
  const resolver = new NamespaceResolver();
  assert.throws(() => resolver.resolve('missing:thing'), UnboundPrefixError);
});

test('resolveParts splits prefix and local part', () => {
  const resolver = new NamespaceResolver([{ svg: 'urn:svg' }]);
  assert.deepEqual(resolver.resolveParts('svg:rect'), {
    prefix: 'svg',
    local: 'rect',
    uri: 'urn:svg',
  });
});

test('resolveParts on an unprefixed name yields an empty prefix', () => {
  const resolver = new NamespaceResolver([{ '': 'urn:default' }]);
  assert.deepEqual(resolver.resolveParts('rect'), {
    prefix: '',
    local: 'rect',
    uri: 'urn:default',
  });
});

test('scope objects are copied on push', () => {
  const declarations = { p: 'urn:first' };
  const resolver = new NamespaceResolver();
  resolver.push(declarations);
  declarations.p = 'urn:second';
  assert.equal(resolver.resolve('p:thing'), 'urn:first');
});

test('popping an empty stack is a no-op', () => {
  const resolver = new NamespaceResolver();
  resolver.pop();
  assert.equal(resolver.depth, 0);
});

test('depth tracks pushed scopes', () => {
  const resolver = new NamespaceResolver();
  assert.equal(resolver.depth, 0);
  resolver.push({ a: 'urn:a' });
  resolver.push({ b: 'urn:b' });
  assert.equal(resolver.depth, 2);
  resolver.pop();
  assert.equal(resolver.depth, 1);
});

test('leading colon is rejected as an invalid qualified name', () => {
  const resolver = new NamespaceResolver();
  assert.throws(() => resolver.resolve(':rect'), TypeError);
});

test('non-string qualified names are rejected', () => {
  const resolver = new NamespaceResolver();
  assert.throws(() => resolver.resolve(42), TypeError);
});

test('non-string namespace URI is rejected on push', () => {
  const resolver = new NamespaceResolver();
  assert.throws(() => resolver.push({ p: 42 }), TypeError);
});
