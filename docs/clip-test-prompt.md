# Example clip workflow

Replace the paths and preferences below before using this prompt. An accurate
matching SRT/VTT can skip transcription, but its estimated individual word timing
may be less precise than a transcript with actual word timestamps.

> Use this project's configured Clipperz installation and the startup instructions
> in docs/local-setup.md. Process [ABSOLUTE VIDEO PATH], with matching transcript
> [ABSOLUTE TRANSCRIPT PATH, OR NONE]. Reuse the configured Studio instance or start
> it with scripts/local/launch.mjs after executable preflight passes.
>
> Import the matching timed transcript if supplied; otherwise transcribe locally
> with Whisper base and speaker labeling off. Propose two self-contained moments
> lasting 20–40 seconds, extending to 60 seconds when needed to finish the thought
> or visual payoff. Show timestamps, titles, opening/closing lines, and framing
> previews. Flag uncertain captions. Wait for my approval before final exports.
>
> After approval, export vertical 1080×1920 MP4s with karaoke captions. Keep the
> complete picture visible against a blurred background unless we agree on a crop.
> Check audio/video decoding, caption timing and framing. Save to the configured
> exports folder, leave originals untouched, and show me the finished clips.
