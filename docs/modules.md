# Why the modules are built as they are

- **Keys listen on the document.** There `event.target` is retargeted to the outermost shadow
  host, so a press's origin is its composed path's first entry, the field itself at any depth of
  open shadow roots. `compositionend` and `focusin` are composed, and the listeners capture them,
  so a listener that stops either doesn't hide it.
- **Keys find open modals through focus.** `querySelectorAll()` searches no shadow root and
  nothing lists the top layer, but `showModal()` moves focus into the dialog, so focus enters
  every modal as it opens. The copy that created the shared list tracks it, even beside an older
  copy holding the listener; a modal focus entered before keys loaded is recorded at the first
  press.
- **Keys skip WebKit's composition keydown.** WebKit sends the Enter or Escape that commits or
  cancels a composition after `compositionend`, with `isComposing` false. The first keydown within
  100ms takes the mark, so Chrome, which sends none, loses nothing.
- **A pending press is a copy** of the keydown, as an event's fields are live only while it
  dispatches. A sequence ends before its binding acts, so a throw leaves none pending.
- **The platform comes from `userAgentData`** where Chromium has it, which TypeScript's DOM types
  don't yet carry, else `navigator.platform`.
- **`formatBytes` sets one fraction digit only when neither bound is set**: a minimum above a
  default maximum would throw. `formatDateTime` drops its styles when the options set a field, as
  `Intl.DateTimeFormat` refuses to mix them. `formatDuration` gives every field the total's sign,
  as `Intl.DurationFormat` requires, and shows a zero duration's seconds, as it prints `""`
  otherwise.
- **`formatJson` walks tokens** and emits each as written, never parsing to a value and printing
  it again, so keys keep their order and duplicates, numbers their literals, and strings their
  escapes. A container deeper than `JSON_MAX_DEPTH` is kept whole, so output stays linear in the
  text's length.
- **Conformance reads computed values from probes.** A hidden host resets every token but the
  facet's root-only ones, so a scope inside it holds only what the profile sets; `getComputedStyle`
  still computes an undisplayed subtree. A color token unset or no color falls back to a sentinel
  no palette holds, `rgba(1, 2, 3, 0.004)`, and a font token to a sentinel family. The check's own
  stylesheet sets every value token to a sentinel on a scope later in the facet's layer and on one
  in the next layer, which the layer and specificity rules read. A length is read as a margin
  twice, 1px apart: an invalid token computes to 0 both times. A color's luminance is read back
  from a one-pixel canvas, so any notation reads alike. Contrast is compared unrounded and shown
  truncated, so a failing ratio never reads 4.50:1.
- **Preferences tolerate storage**: it throws when blocked or sandboxed, and holds whatever
  another page wrote. Another tab's save fires `storage` here, never in the tab that saved.
