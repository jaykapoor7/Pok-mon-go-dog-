# Kaju — canonical character

The owner's **4 November 2026** companion image (`public/kaju/companion-reference.jpg`) supersedes the Explorer puppy. Kaju remains the existing StrayPaw agent; only its visual character changes.

Preserve the soft cream capsule/pear body, orange tactile floppy ears, short cream feet with beige paw pads, rounded hands, orange cord collar and metallic paw pendant. The glossy blue face screen carries yellow oval LED eyes and a curved smile, cyan rim accents, small sparkle and Wi-Fi marks. No muzzle, nose, fur, upright ear or tail. The Wi-Fi glyph is a character detail, not a connectivity indicator.

The original uploaded image is the identity reference. `companion-rig.png` contains reference-derived texture parts; SVG silhouettes isolate the joints. These are generated derivatives, not pixel-exact reproductions of the uploaded image. Older Explorer assets remain for provenance and are not rendered.

`Kaju.tsx`, `poses.ts`, the sequence controller and Presence API keep one character across every placement. Two foot joints, shoulders, elbows, head, independently moving ears and animated LED features support the existing 23 states plus `working`, `happy`, `confused` and `bored`. The legacy `tailWag` state is a playful body sway; the new character has no tail. The legacy Rig import re-exports the same character.

- **Face:** open yellow ovals at rest; happy arcs, closed sleeping arcs, half-open bored eyes, upward thinking eyes, widened confused eyes, asymmetric brows and a corresponding smile/neutral mouth. Screen details stay fixed to the head while expressions move.
- **Greeting:** a wave clear of the face, with wrist/elbow follow-through and soft ear response. The homepage's Meet Kaju placement uses the `hello` sequence.
- **Working:** an illustrated laptop prop, alternating hand/forearm movement and a focused gaze. Real assistant requests use this state while busy; thinking remains a separate pose. No animation claims an action succeeded.
- **Walk/trot:** two phased foot contacts and opposite arm swings, short body bob and ear follow-through. Entry travel has matched stance compensation.
- **Rest:** seated, reclining, sleeping, waking and stretching poses transition on the same joints. Calm ambient sequences can wait, look around or doze.
- **Result/error:** only independently verified actions trigger success. Errors retain the concerned/error states.

Ambient-off, reduced-motion, document-hidden and off-screen behavior remains. Fixed placements must not cover controls or content. Decorative instances are hidden from assistive technology; labelled instances expose their pose. Inspect rendered expressions, joints, transitions and loaded assets on desktop and phone; transform tests alone do not establish character fidelity.

# Brand logo

`public/brand/logo-reference.jpg` preserves the owner's animal wordmark. `straypaw-logo.png` is its transparent derivative. `BrandLogo` renders the full artwork on public header/footer surfaces and a compact crop in existing small brand placements, with no white image plate. Keep opaque cream/white details inside the animals. The logo is separate from the Kaju companion identity.
