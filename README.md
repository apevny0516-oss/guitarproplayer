# TabPlayer - Guitar Pro Tab Player & Audio Sync

A web-based Guitar Pro notation player with support for syncing tabs to real audio recordings, similar to Soundslice.

## 🎸 Features

### Four Integrated Tools

| Tool | File | Description |
|------|------|-------------|
| **MIDI Player** | `player.html` | Play GP files with synthesized audio |
| **Synced Player** | `sync-player.html` | Play tabs synced with real audio |
| **Sync Editor** | `editor.html` | Create sync files by tapping to audio |
| **Embed Generator** | `embed-generator.html` | Generate embed code for Canvas LMS |
| **Embed Player** | `embed.html` | Minimal player for iframe embedding |

## 🚀 Quick Start

```bash
# Start a local server
python3 -m http.server 8080

# Or use Node.js
npx serve .
```

Then open **http://localhost:8080** in your browser.

## 📖 How It Works

### Workflow: Syncing Audio to Tabs

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Guitar Pro  │     │   Sync      │     │   Synced    │
│    File     │────▶│   Editor    │────▶│   Player    │
│   (.gp)     │     │             │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
┌─────────────┐           │
│   Audio     │───────────┘
│   File      │
│(.mp3/.wav)  │      Creates .tabsync file
└─────────────┘
```

1. **Create Sync** (in Sync Editor):
   - Load your Guitar Pro file
   - Load your audio recording (MP3, WAV, etc.)
   - Play the audio and tap `T` on each bar's downbeat
   - Export as `.tabsync` file

2. **Playback** (in Synced Player):
   - Open the `.tabsync` file
   - Load the corresponding GP and audio files
   - Play with real audio synced to the notation!

## 🎹 MIDI Player

For quick practice without needing to sync audio:

- Load any `.gp`, `.gp3`, `.gp4`, `.gp5`, or `.gpx` file
- Plays with synthesized MIDI audio
- Loop selection by clicking and dragging on notation
- Metronome enabled by default
- Tempo control (25% - 200%)

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `Esc` | Clear selection / Stop |
| `L` | Toggle Loop |
| `M` | Toggle Metronome |
| `C` | Clear loop selection |

## ✏️ Sync Editor

Create `.tabsync` files to map your tabs to audio recordings:

1. Load Guitar Pro file (Step 1)
2. Load matching audio file (Step 2)
3. Press `Space` to play audio
4. Press `T` on each bar's first beat as you hear it
5. Export when done

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause audio |
| `T` | Tap to mark current bar |
| `Ctrl+Z` | Undo last marker |
| `←` / `→` | Rewind/Forward 5s |
| `Home` / `End` | Jump to start/end |

## 🔊 Synced Player

Play back your synced tabs with real audio:

1. Open a `.tabsync` file
2. Load the referenced GP and audio files
3. Play with the real recording!

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play/Pause |
| `Esc` | Stop |
| `←` / `→` | Previous/Next bar |
| `L` | Toggle Loop |

## 🎓 Canvas LMS Embedding

Embed Guitar Pro tabs directly into Canvas LMS courses:

### Quick Steps

1. **Upload your .gp file** to Canvas Files
2. **Right-click** the file → Copy Link Address
3. **Open the Embed Generator** (`embed-generator.html`)
4. **Paste the URL** and click Generate Embed
5. **Copy the iframe code**
6. In Canvas, edit your page → click `</>` HTML editor → paste code

### Embed URL Format

```
embed.html?file=https://your-file-url.gp
```

The embed player accepts a `file` URL parameter pointing to any accessible GP file.

### Hosting Requirements

For the embed to work, you need to host `embed.html` on a web server accessible to your students (e.g., your school's server, GitHub Pages, Netlify, etc.).

## 📁 File Formats

### Supported Guitar Pro Formats
- `.gp` - Guitar Pro 7/8
- `.gpx` - Guitar Pro 6
- `.gp5` - Guitar Pro 5
- `.gp4` - Guitar Pro 4
- `.gp3` - Guitar Pro 3

### Supported Audio Formats
- `.mp3`
- `.wav`
- `.ogg`
- `.m4a`

### Sync File Format
`.tabsync` files are JSON with this structure:

```json
{
  "version": 2,
  "title": "Song Title",
  "artist": "Artist Name",
  "gpFile": "song.gp",
  "audioFile": "song.mp3",
  "totalBars": 120,
  "markers": [
    { "bar": 1, "time": 0.5 },
    { "bar": 2, "time": 2.1 },
    ...
  ]
}
```

## 🛠 Technology

- **[alphaTab](https://www.alphatab.net/)** - Guitar Pro rendering and MIDI playback
- **[WaveSurfer.js](https://wavesurfer-js.org/)** - Audio waveform visualization
- **Web Audio API** - Real audio playback with speed control

## 📱 Browser Support

- Chrome 80+
- Firefox 75+
- Safari 14+
- Edge 80+

## 📂 Project Structure

```
Guitar Pro Tab Player/
├── index.html              # Landing page
├── player.html             # MIDI Player
├── player.js
├── sync-player.html        # Synced Audio Player
├── sync-player.js
├── sync-player.css
├── editor.html             # Sync Editor
├── editor.js
├── editor.css
├── embed.html              # Embeddable player (for iframes)
├── embed-generator.html    # Generate embed codes
├── styles.css              # Shared styles
├── package.json
└── Guitar Pro Files/       # Sample files
    └── AC:DC - Back In Black.gp
```

## 📄 License

MIT
