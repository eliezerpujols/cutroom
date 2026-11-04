# AI tool recommendations for Cutroom

Initial research, 2026-11-04. The roadmap below records the original recommendation.
Later the same day, local person cutout and face-centered camera tracking shipped
using Apple Vision on macOS. See [camera tools](../.agents/skills/cutroom/references/camera-tools.md)
for their working MCP flow and limits. Voice cleaning, background blur and
audio-based active-speaker detection remain recommendations. No footage was
uploaded or provider credits spent for the local implementation.

| Priority | Tool | Proposed first version |
| --- | --- | --- |
| 1 | Remove background / Blur background | Select a person clip, preview its mask, adjust edge softness, then remove or blur the background. Cache frame masks so preview and export agree. |
| 2 | Clean voice | Generate a separate cleaned audio asset, with an original/cleaned comparison and explicit cost estimate before processing. Keep the source audio. |
| 3 | Follow subject / Auto reframe | Track one selected subject and smooth its crop into 9:16. Allow manual correction before applying. |
| 4 | Follow speaker | For multi-person footage, use audio and face tracks to propose who gets framed. Review cuts before applying. |
| Later | Silence trimming / Caption emphasis | Propose removable pauses and emphasized words using the existing transcript; preview the resulting edit before changing timing. |

Google's [MediaPipe Image Segmenter](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter) supports person/background segmentation on images and continuous video. This makes it a candidate for the first two background tools. Segmentation quality around hair, hands, occlusion and fast movement needs testing; benchmark local processing and temporal stability rather than promising real-time output.

ElevenLabs provides a [Voice Isolator API](https://elevenlabs.io/docs/overview/capabilities/voice-isolator) for separating speech from background noise in audio/video. It is a practical candidate given Cutroom's existing ElevenLabs connection, but requires a separate integration and live pricing check. Don't promise recovery of missing or clipped speech.

Speaker tracking needs more than detecting a face. [TalkNet's active-speaker research](https://arxiv.org/abs/2107.06592) combines audio and visual information over time to identify who is speaking. My recommendation is to first ship a user-selected subject crop, then evaluate active-speaker detection on conversations, off-screen speech and overlapping voices. It is a larger engineering step than background removal.

Slides, fades, zooms, geometric masks, blur animation and text shadows already work as local visual effects. Keep them in Effects. Add AI tools only when the real processing and review flow exists, using image examples and concise labels rather than placeholder buttons.
