// Minimal chainable DOM wrapper — replaces d3-selection

class Sel {
  constructor(el) { this._el = el; }
  node() { return this._el; }
  empty() { return !this._el; }
  append(tag) {
    const child = document.createElement(tag);
    this._el.appendChild(child);
    return new Sel(child);
  }
  attr(k, v) { this._el.setAttribute(k, v); return this; }
  text(str) { this._el.textContent = str; return this; }
  html(str) { this._el.innerHTML = str; return this; }
  style(k, v) { this._el.style[k] = v; return this; }
  classed(name, bool) { this._el.classList.toggle(name, bool); return this; }
  property(k, v) {
    if (v === undefined) return this._el[k];
    this._el[k] = v;
    return this;
  }
  datum(d) {
    if (d === undefined) return this._el.__data__;
    this._el.__data__ = d;
    return this;
  }
  select(sel) { return new Sel(this._el.querySelector(sel)); }
  on(event, fn) {
    const el = this._el;
    if (!el.__handlers) el.__handlers = {};
    if (fn === undefined) return el.__handlers[event] || null;
    el.__handlers[event] = fn;
    el.addEventListener(event, fn);
    return this;
  }
}

export function select(sel) {
  const el = typeof sel === "string" ? document.querySelector(sel) : sel;
  return new Sel(el);
}
