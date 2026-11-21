// Adapted from spike-html-apps-foundation (07ba39a): test/browser/backdrop.test.ts, importing the tooling as @standards-lab/web-tooling.

import assert from "node:assert/strict";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { launch } from "@standards-lab/web-tooling/browser.js";
import { serve } from "@standards-lab/web-tooling/server.js";
import type { Browser, Page } from "@standards-lab/web-tooling/browser.js";
import type { Server } from "@standards-lab/web-tooling/server.js";

const root = join(import.meta.dirname, "../..");

const PALETTES = ["zen", "github", "catppuccin", "everforest"];
const SCHEMES = ["light", "dark"];
const TRANSPARENT = "rgba(0, 0, 0, 0)";
const BLACK = "rgb(0, 0, 0)";

interface Backdrops {
  bg: string;
  veil: string;
  modal: string;
  hint: string;
  auto: string;
  manual: string;
  dialogHint: string;
  modalUnderHint: string;
  fullscreen: string;
}

const READ = (palette: string, scheme: string) => `(async () => {
  const root = document.documentElement;
  root.setAttribute("data-palette", ${JSON.stringify(palette)});
  root.setAttribute("data-scheme", ${JSON.stringify(scheme)});
  const backdrop = (element) => getComputedStyle(element, "::backdrop").backgroundColor;
  const shown = (id) => {
    const popover = document.getElementById(id);
    popover.showPopover();
    const color = backdrop(popover);
    popover.hidePopover();
    return color;
  };
  const probe = document.body.appendChild(document.createElement("i"));
  probe.style.backgroundColor = "var(--bg)";
  const out = {
    bg: getComputedStyle(probe).backgroundColor,
    veil: getComputedStyle(document.getElementById("veil")).backgroundColor,
    hint: shown("hint"),
    auto: shown("auto"),
    manual: shown("manual"),
  };
  probe.remove();
  const modal = document.getElementById("modal");
  modal.showModal();
  out.modal = backdrop(modal);
  const dialogHint = document.getElementById("dialog-hint");
  dialogHint.showPopover();
  out.dialogHint = backdrop(dialogHint);
  out.modalUnderHint = backdrop(modal);
  dialogHint.hidePopover();
  modal.close();
  const fullscreen = document.getElementById("fullscreen");
  await fullscreen.requestFullscreen();
  if (document.fullscreenElement !== fullscreen) throw new Error("the element isn't fullscreen");
  out.fullscreen = backdrop(fullscreen);
  await document.exitFullscreen();
  return out;
})()`;

describe("foundation backdrop", () => {
  let server: Server;
  let browser: Browser;
  let page: Page;

  before(async () => {
    server = await serve({ root });
    browser = await launch();
    page = await browser.open(`${server.origin}/test/fixtures/backdrop.html`);
  });
  after(async () => {
    await page?.close();
    await browser?.close();
    await server?.stop();
  });

  const readings: { bg: string; veil: string }[] = [];

  for (const palette of PALETTES) {
    for (const scheme of SCHEMES) {
      test(`${palette} ${scheme}: a modal dialog's backdrop is the veil, a popover's transparent, a fullscreen element's black`, async () => {
        const { result, exceptionDetails } = await page.cdp("Runtime.evaluate", {
          expression: READ(palette, scheme),
          awaitPromise: true,
          returnByValue: true,
          userGesture: true,
        });
        assert.equal(exceptionDetails, undefined, exceptionDetails?.exception?.description);
        const read: Backdrops = result.value;
        readings.push({ bg: read.bg, veil: read.veil });
        assert.notEqual(
          read.veil,
          TRANSPARENT,
          "the veil is a color, so a transparent backdrop can't pass for it",
        );
        assert.deepEqual(read, {
          bg: read.bg,
          veil: read.veil,
          modal: read.veil,
          hint: TRANSPARENT,
          auto: TRANSPARENT,
          manual: TRANSPARENT,
          dialogHint: TRANSPARENT,
          modalUnderHint: read.veil,
          fullscreen: BLACK,
        });
      });
    }
  }

  test("each palette and scheme's --bg computes a veil of its own", () => {
    const count = (values: string[]) => new Set(values).size;
    const backgrounds = count(readings.map(({ bg }) => bg));
    assert.ok(backgrounds > SCHEMES.length, "the palettes' --bg values barely differ");
    assert.equal(count(readings.map(({ veil }) => veil)), backgrounds);
    assert.equal(count(readings.map(({ bg, veil }) => `${bg} ${veil}`)), backgrounds);
  });
});
