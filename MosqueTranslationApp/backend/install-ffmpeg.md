# FFmpeg Installation Guide

FFmpeg is required for audio recording functionality. Please install it based on your operating system:

## Windows
1. Download FFmpeg from: https://ffmpeg.org/download.html#build-windows
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your system PATH
4. Restart your terminal/IDE

## macOS
```bash
# Using Homebrew
brew install ffmpeg
```

## Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

## Verify Installation
```bash
ffmpeg -version
```

## Alternative: Use Docker
If you prefer to use Docker, you can run the backend in a container with FFmpeg pre-installed.

## Note
The fluent-ffmpeg package is deprecated but still functional. For production, consider migrating to a more modern audio processing solution.
