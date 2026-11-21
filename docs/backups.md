# The specimen's backups

Each built-in color profile has a backup in `demo/backups/`, the palette that stands in should the
profile be dropped; `demo/specimen.html` shows each beside its profile. A backup is a demo sheet,
not a profile: not under `src/`, not in the package, and not registered. Each is one
zero-specificity block in `foundation.tokens.color`, applied by its `data-palette`, declaring the
sixteen color tokens as `light-dark()` pairs. Each section below gives a backup's upstream and how
it maps onto the tokens; its table names each token's upstream swatch by the one name both variants
share.

## ayu, catppuccin's backup

Colors from ayu (MIT, Konstantin Pschera), https://github.com/ayu-theme/ayu-colors, at v6.0.0: Light
in light and Mirage in dark. The palette's src/light.ts and src/mirage.ts derive many swatches from
others with chroma-js; the values here are the resolved ones the repository's colors.svg lists at
the same tag, generated from those sources in the commit that last changed them (faa653f).

The raised surfaces are the panel and the editor's selection; the panel's border is the border, and
the active indent guide the control boundary. ayu's panel is lighter than its base in Light, pure
white, so Light's surfaces do not step toward the text. The text ladder is the foreground, the UI
gray, and the comment. Fills: ayu has no magenta, so constant, its purple, fills `--magenta`.

| Token | Upstream |
|---|---|
| `--bg` | common.bg |
| `--bg-1` | ui.panel.bg |
| `--bg-2` | editor.selection.bg |
| `--border` | ui.panel.border |
| `--border-2` | editor.guide.active |
| `--fg` | common.fg |
| `--fg-2` | common.ui |
| `--fg-3` | syntax.comment |
| `--red` | syntax.markup |
| `--orange` | syntax.keyword |
| `--yellow` | syntax.func |
| `--green` | syntax.string |
| `--cyan` | syntax.tag |
| `--blue` | syntax.entity |
| `--purple` | syntax.constant |
| `--magenta` | syntax.constant |

## nightfox, everforest's backup

Colors from Nightfox (MIT, James Simpson), https://github.com/EdenEast/nightfox.nvim, at v3.10.0:
Dayfox in light and Nightfox in dark, from lua/nightfox/palette/dayfox.lua and nightfox.lua, through
the highlight groups lua/nightfox/group/editor.lua gives them.

A hue is its shade's base. bg0, the darker status-line and float background, draws WinSeparator and
is the border; bg4, the palette's border foreground, is the control boundary. Nightfox's magenta is
a violet and its pink a magenta: magenta fills `--purple` and pink `--magenta`. Nothing else is
filled.

| Token | Upstream |
|---|---|
| `--bg` | bg1 |
| `--bg-1` | bg2 |
| `--bg-2` | bg3 |
| `--border` | bg0 |
| `--border-2` | bg4 |
| `--fg` | fg1 |
| `--fg-2` | fg2 |
| `--fg-3` | fg3 |
| `--red` | red |
| `--orange` | orange |
| `--yellow` | yellow |
| `--green` | green |
| `--cyan` | cyan |
| `--blue` | blue |
| `--purple` | magenta |
| `--magenta` | pink |

## seoulbones, zen's backup

Colors from Seoulbones, of zenbones (MIT, Michael Chris Lopez),
https://github.com/zenbones-theme/zenbones.nvim, at v4.12.0: its light and dark backgrounds, the
values its generated colors/seoulbones.vim bakes for them.

It maps as zen.css does. Each upstream name is a highlight group's color, or a palette swatch as the
file's terminal colors bake it. `--fg-2` is fg1, baked as the bright-white terminal color. Fills:
Seoulbones' comments are green, not a text step, so `--fg-3` is LineNr fg, the dimmest gray the file
draws text in; and it has six hues, not eight, so wood fills both `--orange` and `--yellow`, and
blossom both `--purple` and `--magenta`.

| Token | Upstream |
|---|---|
| `--bg` | Normal bg |
| `--bg-1` | CursorLine bg |
| `--bg-2` | NormalFloat bg |
| `--border` | StatusLine bg |
| `--border-2` | WinSeparator fg |
| `--fg` | Normal fg |
| `--fg-2` | fg1 |
| `--fg-3` | LineNr fg |
| `--red` | rose |
| `--orange` | wood |
| `--yellow` | wood |
| `--green` | leaf |
| `--cyan` | sky |
| `--blue` | water |
| `--purple` | blossom |
| `--magenta` | blossom |

## tomorrow, github's backup

Colors from Tomorrow (MIT, Chris Kempson), https://github.com/chriskempson/tomorrow-theme, at commit
ccf6666: Tomorrow in light and Tomorrow Night in dark, from the palettes its vim/colors/Tomorrow.vim
and Tomorrow-Night.vim set (the gui values, not the 256-color ones).

Tomorrow's surfaces are the editor's: the current line raises the base, and the selection raises it
again; the window color, the split and status lines, is the border, and the selection, which also
draws vim's non-text, the control boundary. Fills: Tomorrow has two text steps, not three, so
comment fills both `--fg-2` and `--fg-3`; and no magenta, so purple fills `--magenta`.

| Token | Upstream |
|---|---|
| `--bg` | background |
| `--bg-1` | line |
| `--bg-2` | selection |
| `--border` | window |
| `--border-2` | selection |
| `--fg` | foreground |
| `--fg-2` | comment |
| `--fg-3` | comment |
| `--red` | red |
| `--orange` | orange |
| `--yellow` | yellow |
| `--green` | green |
| `--cyan` | aqua |
| `--blue` | blue |
| `--purple` | purple |
| `--magenta` | purple |
