# Kaju — character reference

Kaju is StrayPaw's AI agent. The puppy is Kaju's mascot: one character that shows what the agent is doing. He is not a second agent.

## Canonical reference (1 November 2026)

The owner-supplied Kaju Explorer character sheet supersedes earlier breed or imaginary-creature descriptions. Preserve its honey/apricot tactile coat, cream cheeks and chest, white forehead blaze, large brown eyes, left floppy/right upright ears, rounded paws, cream-tipped bushy tail, navy collar and gold shield pendant. Do not add equipment or alternate identities.

The owner-supplied sheet remains the canonical design. Assets under `public/kaju/` are generated derivatives, not the original sheet or pixel-exact reproductions. `explorer-atlas.png` retains the previous six-pose artwork for provenance; the live character now uses `explorer-rig.png`, `explorer-torso.png` and `explorer-expressions.png`.

The existing state/controller/presence APIs and all UI placements are preserved. `src/kaju/Kaju.tsx` draws independent head, ear, tail, torso, shoulder/hip and knee joints. All 23 states use joint transforms, with four phased walking steps, diagonal trotting, knee flex, breathing, ear response, tail wag, head turns and paw gestures. Sleeping and blinking use matching fur-textured face expressions. Body posture transitions use the existing motion timing; whole-character pose images are not swapped. The earlier vector rig is retained in `src/kaju/Rig.tsx` as an implementation reference, not a second mascot.

Reduced motion, ambient-off and off-screen controls must stop loops. Visual QA must inspect actual loaded artwork across all 23 states and real placements, not infer fidelity from transform tests. This is a 2D texture rig; the original character sheet remains the standard for any further anatomy or rendering refinement. Do not claim pixel-exact reproduction or owner approval of generated derivatives.

## Earlier rig identity (retained implementation reference)
- **Breed:** an Indian indie puppy.
- **Coat:** warm biscuit and honey-brown fur, with a cream muzzle and chest and a small white chest patch.
- **Ears:** one upright, one floppy.
- **Face:** dark chocolate eyes and a charcoal nose.
- **Body:** rounded paws and a slightly curled tail.
- **Voice:** warm, observant, calm and professional, with no pet talk. For example: "I found four records missing release photos."

## Palette (`KAJU` in `src/kaju/Rig.tsx`)
| Part | Colour |
|---|---|
| Fur | #C98A3E |
| Deep fur | #A86C2B |
| Shade | #B87A33 |
| Cream | #F6E4C6 |
| White patch | #FFF9EF |
| Eyes | #3A2214 |
| Nose | #2A2528 |
| Inner ear | #E7B486 |
| Tongue | #E77F7A |
| Line | #8E5A22 |

## Retained vector rig
- **Implementation:** a single articulated SVG with a 240×200 view box.
- **Parts:** torso, head (scaled 1.2), tail and four legs. Each part is drawn around its own joint.
- **Two layers per part:**
  - the outer group holds the pose and is transitioned (560 ms), so moving between poses is real motion;
  - the inner group runs the loops: walk, trot, wag, wave, blink, breathe, ear twitch, look, hop, sparkle, think, zz.
- `KajuFace` is the head alone, for small places.

## States (`src/kaju/poses.ts`)
**Everyday:**
- sitting, lying, standing, walking, trotting
- sleeping, waking, stretching, peeking, looking
- headTilt, earTwitch, tailWag, settling

**Assistant:**
- greeting, listening, thinking, explaining
- success, insight, concerned, error, goodbye

**Sequences:**
- **wakeUp:** sleeping → waking → stretching → standing → tail wag → sitting
- **arrive:** trot in → stand → sit → head tilt
- **idle:** sitting → looking → ear twitch → settling → lying → sleeping
- **chill:** long lying and dozing holds
- **perch:** sitting, looking around, head tilt, tail wag
- **open:** greeting → listening
- **close:** goodbye → settling → lying
- **done:** success → sitting

## Agent events → pose (`useKajuMood`, `src/sp3/ai/AiPanel.tsx`)
| Agent state | Kaju |
|---|---|
| Panel opens | greeting, then listening |
| Request to /api/ai in flight | thinking |
| Answer with sources or prepared changes | success (1.6 s), then listening |
| Answer without sources | explaining, then listening |
| Error | concerned |
| Panel closes | goodbye, then lying |

He never shows a result the agent did not return.

## Where he appears
- **App sidebar nook:** the spare space above the footer. He runs the chill sequence while the agent is closed, clicking him opens Kaju, and the nook is empty while the panel is open. Hidden when the sidebar is collapsed or the screen is under 780 px tall.
- **Agent panel:** header, empty conversation, the thinking line.
- **`/assistant` workspace.**
- **Empty states:** Verification queue, Report packages (`KajuEmptyState`).
- **Landing, dark band:** he sits on the run panel's top edge, thinking while a run plays and pleased when it ends.
- **Landing demos:** Kaju's face marks every demo answer, and the nav preview.

## Rules
- Fixed anchors only. He never wanders and never sits over a button, link, map, table, form, dialog or text.
- Calm in the app, slightly livelier on marketing pages.
- **Reduced motion:** no loops or transitions; he holds the final pose.
- He pauses when off-screen (IntersectionObserver).
- `KajuAmbientToggle` lets a person keep him still on their device (localStorage `kaju.ambient`).
- Decorative instances are `aria-hidden`. Announced ones carry a label and the pose name.
