# Mattermost Chat Themes plugin

Instagram-style themes per conversation for Mattermost: every direct message, group
message and channel can have its own background, and everybody in it sees the same one.

- **Any member** can change the theme of a conversation. The change shows up live for
  everybody and leaves a notice in the conversation ("@alex changed the chat theme to
  «Sunset»") with a thumbnail and buttons to open it in the editor, copy its code or
  save it to the gallery.
- **Gallery**: 12 built-in themes plus the ones the team saves. A theme belongs to its
  author; system admins can edit or delete any. Deleting a gallery theme does not touch
  the conversations using it: each conversation keeps its own copy.
- **Editor** with live preview. A background is a stack of up to 8 layers:
  - color, gradient (linear, radial, conic), image or GIF/animated WebP (upload or https
    URL; fill, fit or tile), video (MP4/WebM, muted loop), SVG pattern (dots, grid,
    stripes, waves, hearts...) and particles (snow, hearts, confetti, stars, bubbles,
    fireflies or any emoji);
  - per layer: opacity, blend mode, blur, brightness, saturation, hue;
  - animations: flowing gradient, spin, rainbow cycle, breathe, slow zoom (Ken Burns),
    pan and drifting tiles, at any speed.
- **Light and dark**: a theme can have a different background for dark Mattermost themes.
- **Readability**: in *Automatic* mode the plugin measures how bright the background is
  and lays just enough of the user's own Mattermost background over it for their text
  color to reach the chosen contrast (3:1 to 7:1). There are also a fixed veil and
  translucent cards behind each message.
- **Sharing**: *Copy code* gives a `ct1:...` code to paste in *Import code* anywhere on
  the same server.
- Open it with the palette button (channel header, or the App Bar in Mattermost 10+) or
  `/tema`. `/tema poner <name>`, `/tema quitar` and `/tema lista` also work from the
  mobile apps.

Animations pause while the tab is hidden and are off for users with *reduce motion*.

## Settings

System Console → Plugins → Chat Themes:

- *Max upload size (MB)*, default 15 (1-50). Still images are shrunk to 2560 px and
  re-encoded as WebP in the browser before uploading, so this mostly limits GIFs and videos.
- *Allow external image and video URLs*, default on.

## How it works

Themes are JSON stored in the plugin KV store (`t_<id>` gallery, `c_<channel id>`
conversation). The server validates every theme before storing it (only known layer
types and values, `#rrggbb[aa]` colors, uploaded files or clean `https://` URLs), since
other members' browsers draw it. Uploads are checked by content (PNG, JPEG, GIF, WebP,
MP4, WebM; no SVG), stored in Mattermost's file store and served by the plugin only if
they were uploaded through it.

The webapp puts the layers in a box behind `#app-content` and makes the post list
transparent; the header and the message box keep Mattermost's colors.

## Limitations

- The native mobile apps do not run webapp plugins: they show no background, and the
  notice appears as plain text.
- Share codes reference uploaded files, so they only work on the same server.

## Build

```sh
./build.sh   # tests and builds dist/<id>-<version>.tar.gz (only Docker needed)
```

Pushing a `vX.Y.Z` tag equal to `version` in `plugin.json` publishes a release.
