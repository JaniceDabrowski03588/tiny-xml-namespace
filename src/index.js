/**
 * Public entry point for tiny-xml-namespace.
 *
 * Re-exports the resolver and its error types so consumers can import from a
 * single specifier.
 */
export {
  NamespaceResolver,
  ReservedPrefixError,
  UnboundPrefixError,
  XML_NAMESPACE,
  XMLNS_NAMESPACE,
} from './core.js';
