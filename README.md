# Cursor Recent Folders

A Raycast extension to quickly search and open your recent Cursor folders.

## Features

- 🔍 Search through your recently opened Cursor folders
- ⚡ Quickly open any folder with one keystroke
- 🎯 Auto-focuses Cursor when opening a folder
- 🛠️ Configurable storage path for different setups
- 🌍 Cross-platform support (macOS, Windows, Linux)

## Installation

Install from the [Raycast Store](https://raycast.com/store) install manually:

```bash
git clone https://github.com/mohamedalosaili/cursor-recent-folders.git
cd cursor-recent-folders
npm install
npm run dev
```

## Usage

1. Open Raycast (`⌘ + Space`)
2. Type "Search Recent Folders" or your custom alias
3. Search for your folder by name
4. Press `Enter` to open in Cursor

### Available Actions

- `Enter` - Open folder in Cursor
- `⌘ + Enter` - Show in Finder
- `⌘ + C` - Copy folder path
- `⌘ + K` → Configure Storage Path - Change database location

## Configuration

The extension automatically detects Cursor's database location:

- **macOS**: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`
- **Windows**: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`
- **Linux**: `~/.config/Cursor/User/globalStorage/state.vscdb`

If your Cursor installation is in a custom location, you can configure the path via `⌘ + K` → Configure Storage Path.

## Requirements

- [Cursor IDE](https://cursor.sh/) installed
- Raycast (latest version recommended)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Author

[Mohamed Alosaili](https://github.com/mohamedalosaili)

---

**Note**: This extension reads your local Cursor database and does not send any data externally. Your project history remains private.
