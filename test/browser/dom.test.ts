// The DOM helpers from the package's dist/, as a page imports them, on test/fixtures/dom.html:
// define registers a custom element and leaves a second definition of its name a no-op, emit
// dispatches a bubbling, composed CustomEvent with its detail, and required returns the first
// match under its root or throws naming the selector.

import assert from "node:assert/strict";
import { join } from "node:path";
import { after, afterEach, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

/** The repository root, which the server serves. */
const root = join(import.meta.dirname, "../..");

const DOM = "/dist/dom.js";

let server: Server;
let browser: Browser;
const pages: Page[] = [];

before(async () => {
  server = await serve({ root });
  browser = await launch();
});
afterEach(async () => {
  for (const page of pages.splice(0)) {
    await page.close();
  }
});
after(async () => {
  await browser?.close();
  await server?.stop();
});

/** Opens a fresh test/fixtures/dom.html, so no test sees another's definitions. */
async function open(): Promise<Page> {
  const page = await browser.open(`${server.origin}/test/fixtures/dom.html`);
  pages.push(page);
  return page;
}

/** Evaluates the async body with the page's dom module bound as `dom`. */
const call = (page: Page, body: string) =>
  page.evaluate(`import(${JSON.stringify(DOM)}).then(async (dom) => { ${body} })`);

describe("define", () => {
  test("registers the element under its tag, upgrading one already in the page", async () => {
    const page = await open();
    const result = await call(
      page,
      `class Probe extends HTMLElement {
        connectedCallback() { this.dataset.version = "first"; }
      }
      const before = customElements.get("dom-probe") === undefined;
      dom.define("dom-probe", Probe);
      return {
        before,
        registered: customElements.get("dom-probe") === Probe,
        upgraded: document.querySelector("#waiting") instanceof Probe,
        version: document.querySelector("#waiting").dataset.version,
        created: document.createElement("dom-probe") instanceof Probe,
      };`,
    );
    assert.deepEqual(result, {
      before: true,
      registered: true,
      upgraded: true,
      version: "first",
      created: true,
    });
  });

  test("a second define of the same tag neither throws nor replaces the first", async () => {
    const page = await open();
    const result = await call(
      page,
      `class First extends HTMLElement {
        connectedCallback() { this.dataset.version = "first"; }
      }
      class Second extends HTMLElement {
        connectedCallback() { this.dataset.version = "second"; }
      }
      dom.define("dom-probe", First);
      let thrown = null;
      try {
        dom.define("dom-probe", Second);
      } catch (error) {
        thrown = error.name;
      }
      const added = document.body.appendChild(document.createElement("dom-probe"));
      return {
        thrown,
        registered: customElements.get("dom-probe") === First,
        version: added.dataset.version,
      };`,
    );
    assert.deepEqual(result, { thrown: null, registered: true, version: "first" });
  });

  // The platform's own second definition throws, so the test above tells define from it.
  test("the platform's customElements.define throws on the same second definition", async () => {
    const page = await open();
    const thrown = await call(
      page,
      `customElements.define("dom-probe", class extends HTMLElement {});
      try {
        customElements.define("dom-probe", class extends HTMLElement {});
        return null;
      } catch (error) {
        return error.name;
      }`,
    );
    assert.equal(thrown, "NotSupportedError");
  });
});

describe("emit", () => {
  test("dispatches a CustomEvent of the type with the detail itself", async () => {
    const page = await open();
    const result = await call(
      page,
      `const target = document.querySelector("#first");
      const detail = { id: 7, tags: ["a", "b"] };
      const seen = [];
      target.addEventListener("dom-ping", (event) => seen.push(event));
      const returned = dom.emit(target, "dom-ping", detail);
      const [event] = seen;
      return {
        count: seen.length,
        custom: event instanceof CustomEvent,
        type: event.type,
        same: event.detail === detail,
        detail: event.detail,
        returned,
      };`,
    );
    assert.deepEqual(result, {
      count: 1,
      custom: true,
      type: "dom-ping",
      same: true,
      detail: { id: 7, tags: ["a", "b"] },
      returned: true,
    });
  });

  test("bubbles to the document and crosses a shadow root, not cancelable", async () => {
    const page = await open();
    const result = await call(
      page,
      `const host = document.querySelector("#host");
      const shadow = host.attachShadow({ mode: "open" });
      const inner = shadow.appendChild(document.createElement("span"));
      const heard = [];
      document.addEventListener("dom-ping", (event) => {
        event.preventDefault();
        heard.push({
          detail: event.detail,
          bubbles: event.bubbles,
          composed: event.composed,
          cancelable: event.cancelable,
          target: event.target === host,
          prevented: event.defaultPrevented,
        });
      });
      const returned = dom.emit(inner, "dom-ping", "hello");
      return { heard, returned };`,
    );
    assert.deepEqual(result, {
      heard: [
        {
          detail: "hello",
          bubbles: true,
          composed: true,
          cancelable: false,
          target: true,
          prevented: false,
        },
      ],
      returned: true,
    });
  });
});

describe("required", () => {
  test("returns the first match under the root, a document, element, or fragment", async () => {
    const page = await open();
    const result = await call(
      page,
      `const fragment = document.createDocumentFragment();
      fragment.append(document.querySelector("#second").cloneNode(true));
      return {
        first: dom.required(document, ".item").id,
        scoped: dom.required(document.querySelector("#section"), "p").id,
        fragment: dom.required(fragment, "li").id,
      };`,
    );
    assert.deepEqual(result, { first: "first", scoped: "inner", fragment: "second" });
  });

  test("throws an Error naming the selector when nothing under the root matches", async () => {
    const page = await open();
    const result = await call(
      page,
      `const attempt = (root, selector) => {
        try {
          dom.required(root, selector);
          return null;
        } catch (error) {
          return { error: error instanceof Error, message: error.message };
        }
      };
      return {
        absent: attempt(document, ".absent"),
        outside: attempt(document.querySelector("#section"), ".item"),
      };`,
    );
    assert.deepEqual(result, {
      absent: { error: true, message: "no element matches .absent" },
      outside: { error: true, message: "no element matches .item" },
    });
  });
});
