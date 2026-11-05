# tiny-xml-namespace

Resolves XML qualified names to namespace URIs given a stack of namespace declarations from ancestor elements.

```js
import { NamespaceResolver } from 'tiny-xml-namespace';

const resolver = new NamespaceResolver([
  { '': 'urn:default', svg: 'http://www.w3.org/2000/svg' },
]);

resolver.resolve('rect');      // 'urn:default'
resolver.resolve('svg:rect');  // 'http://www.w3.org/2000/svg'

resolver.push({ svg: 'urn:inner-svg' });
resolver.resolve('svg:rect');  // 'urn:inner-svg'
resolver.pop();
resolver.resolve('svg:rect');  // 'http://www.w3.org/2000/svg'
```

## Why this exists

Namespace resolution is the part of XML processing that looks trivial until it is not. A parser walks the document, and each element can introduce bindings that shadow or undeclare the ones above it. Doing that lookup by hand means re-implementing the same stack of scopes in every consumer, and getting the shadowing wrong in a different way each time.

This library takes the declarations a parser has already collected and answers one question: what URI does this name belong to? It does not parse XML, and it does not validate names beyond rejecting the obviously malformed. That is the trade-off: a tiny, dependency-free resolver that a parser can drive, rather than a full XML stack.

## The awkward edge

Binding a prefix to the empty string is not the same as undeclaring it. In XML 1.0 the empty string undeclares the default namespace only. This library follows that rule: `push({ '': '' })` makes an unprefixed name resolve to `undefined`, while `push({ p: '' })` makes `p:thing` throw `UnboundPrefixError` instead of returning an empty URI. The reserved `xml` and `xmlns` prefixes are always bound and cannot be rebound; attempting to do so throws `ReservedPrefixError`.

## API

- `new NamespaceResolver(initial?)` — `initial` is an optional array of prefix-to-URI objects, outermost first.
- `resolver.push(declarations)` — add a scope; returns the resolver.
- `resolver.pop()` — remove the innermost scope; a no-op on an empty stack.
- `resolver.lookup(prefix)` — the URI for a prefix, or `undefined`.
- `resolver.resolve(qname)` — the URI for a qualified name; throws `UnboundPrefixError` for an unbound prefix.
- `resolver.resolveParts(qname)` — `{ prefix, local, uri }`.
- `resolver.depth` — number of scopes on the stack.
- `XML_NAMESPACE`, `XMLNS_NAMESPACE` — the reserved namespace URIs.
- `ReservedPrefixError`, `UnboundPrefixError` — thrown by `push` and `resolve` respectively.
