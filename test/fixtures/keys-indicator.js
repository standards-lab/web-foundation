// From spike-html-apps-foundation (07ba39a): test/fixtures/keys-indicator.js.
// From spike-html-packages-foundation (5dd8a58): test/fixtures/keys-indicator.js.

document.addEventListener("keys-sequence", ({ detail }) => {
  const indicator = document.getElementById("indicator");
  if (!indicator) return;
  indicator.textContent = detail.state === "end" ? "" : detail.presses.join(" then ");
});
