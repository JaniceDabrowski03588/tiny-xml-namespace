/**
 * Core namespace resolution logic for tiny-xml-namespace.
 *
 * This module is deliberately free of any XML parsing. It only resolves
 * qualified names against a stack of namespace declarations, which keeps it
 * usable with any parser and easy to test in isolation.
 */

/**
 * The XML namespace URI for the reserved `xml` prefix.
 *
 * The XML Namespaces specification binds this prefix implicitly, so it must
 * be resolvable even when no declaration is present on the stack.
 */
export const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';

/**
 * The XML namespace URI for the reserved `xmlns` prefix.
 *
 * This prefix is bound by the specification and must never be redeclared.
 */
export const XMLNS_NAMESPACE = 'http://www.w3.org/2000/xmlns/';

/**
 * Thrown when a namespace declaration attempts to rebind a reserved prefix.
 */
export class ReservedPrefixError extends Error {
  /**
   * @param {string} prefix The reserved prefix that was rebind attempted.
   */
  constructor(prefix) {
    super(`cannot rebind reserved prefix '${prefix}'`);
    this.name = 'ReservedPrefixError';
    this.prefix = prefix;
  }
}

/**
 * Thrown when a qualified name uses an unbound prefix.
 */
export class UnboundPrefixError extends Error {
  /**
   * @param {string} prefix The prefix that has no binding in scope.
   */
  constructor(prefix) {
    super(`prefix '${prefix}' is not bound in the current scope`);
    this.name = 'UnboundPrefixError';
    this.prefix = prefix;
  }
}

/**
 * A stack of namespace declarations from ancestor elements.
 *
 * Each scope maps a prefix to a URI. The empty string is a legal prefix and
 * represents the default namespace. The stack is ordered outermost-first;
 * the last scope is the innermost and therefore wins.
 */
export class NamespaceResolver {
  /**
   * @param {Array<Record<string, string>>} [initial] Optional initial scopes.
   */
  constructor(initial = []) {
    /** @type {Array<Record<string, string>>} */
    this._scopes = [];
    for (const scope of initial) {
      this._scopes.push({ ...scope });
    }
  }

  /**
   * Push a new scope onto the stack.
   *
   * The scope is copied so that later mutation of the caller's object cannot
   * change resolution results. This matters when a parser reuses a scratch
   * object while walking a document.
   *
   * @param {Record<string, string>} declarations Prefix to URI bindings.
   * @returns {NamespaceResolver} this, for chaining.
   */
  push(declarations) {
    const scope = {};
    for (const [prefix, uri] of Object.entries(declarations)) {
      if (prefix === 'xml') {
        throw new ReservedPrefixError('xml');
      }
      if (prefix === 'xmlns') {
        throw new ReservedPrefixError('xmlns');
      }
      if (typeof uri !== 'string') {
        throw new TypeError(`namespace URI for prefix '${prefix}' must be a string`);
      }
      scope[prefix] = uri;
    }
    this._scopes.push(scope);
    return this;
  }

  /**
   * Pop the innermost scope.
   *
   * Popping an empty stack is a no-op rather than an error: a resolver that
   * has been fully unwound is still usable, and callers that pop in a finally
   * block should not have to guard against it.
   *
   * @returns {NamespaceResolver} this, for chaining.
   */
  pop() {
    this._scopes.pop();
    return this;
  }

  /**
   * Look up the URI for a prefix in the current scope.
   *
   * @param {string} prefix The prefix to resolve, or '' for the default namespace.
   * @returns {string | undefined} The bound URI, or undefined if unbound.
   */
  lookup(prefix) {
    if (prefix === 'xml') {
      return XML_NAMESPACE;
    }
    if (prefix === 'xmlns') {
      return XMLNS_NAMESPACE;
    }
    for (let i = this._scopes.length - 1; i >= 0; i -= 1) {
      const scope = this._scopes[i];
      if (Object.prototype.hasOwnProperty.call(scope, prefix)) {
        const uri = scope[prefix];
        // The empty string is the documented way to undeclare the default
        // namespace. An empty URI for a non-empty prefix is not a valid
        // undeclaration in XML 1.0, so we treat it as unbound as well rather
        // than returning a meaningless empty URI.
        return uri === '' ? undefined : uri;
      }
    }
    return undefined;
  }

  /**
   * Resolve a qualified name to its namespace URI.
   *
   * A name with no prefix always resolves to the default namespace, which may
   * be undefined. A name with a prefix must have a binding; otherwise an
   * UnboundPrefixError is thrown, because silently dropping the namespace
   * would produce a name that looks valid but is not.
   *
   * @param {string} qname A name such as `svg:rect` or `rect`.
   * @returns {string | undefined} The namespace URI, or undefined for an
   *   unprefixed name with no default namespace.
   * @throws {UnboundPrefixError} If the prefix is not bound.
   */
  resolve(qname) {
    if (typeof qname !== 'string' || qname.length === 0) {
      throw new TypeError('qualified name must be a non-empty string');
    }
    const colon = qname.indexOf(':');
    if (colon === -1) {
      return this.lookup('');
    }
    const prefix = qname.slice(0, colon);
    if (prefix === '') {
      // A leading colon is not a valid qualified name.
      throw new TypeError(`invalid qualified name '${qname}'`);
    }
    const uri = this.lookup(prefix);
    if (uri === undefined) {
      throw new UnboundPrefixError(prefix);
    }
    return uri;
  }

  /**
   * Resolve a qualified name and return both prefix and local part.
   *
   * This is a convenience for callers that need the split parts as well as
   * the URI, so they do not have to re-parse the name.
   *
   * @param {string} qname A name such as `svg:rect` or `rect`.
   * @returns {{ prefix: string, local: string, uri: string | undefined }}
   */
  resolveParts(qname) {
    const uri = this.resolve(qname);
    const colon = qname.indexOf(':');
    if (colon === -1) {
      return { prefix: '', local: qname, uri };
    }
    return {
      prefix: qname.slice(0, colon),
      local: qname.slice(colon + 1),
      uri,
    };
  }

  /**
   * Number of scopes currently on the stack.
   *
   * @returns {number}
   */
  get depth() {
    return this._scopes.length;
  }
}
