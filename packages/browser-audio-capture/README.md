# @polerix/browser-audio-capture

Modern browser audio recording primitive using `AudioWorkletNode` for background PCM capture paired with a pure JavaScript 16-bit WAV encoder.

Extracted and hardened from [Cassetto](https://github.com/polerix/Cassetto).

## Installation

```bash
npm install @polerix/browser-audio-capture
```

## Features

- **Non-blocking Audio Thread**: `pcm-capture-processor.js` runs as an AudioWorkletProcessor, capturing Float32 PCM without causing UI stutters or audio dropouts.
- **Pure JavaScript WAV Encoder**: `encodeWavBuffer(leftChunks, rightChunks, sampleRate, isStereo)` builds standard RIFF `audio/wav` ArrayBuffers without native binary dependencies.
- **Stereo & Mono Support**: Automatically handles channel interleaving, bit clamping to [-1.0, 1.0], and block alignment.
