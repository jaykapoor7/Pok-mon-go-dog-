# StrayPaw reels

Instagram reels at 1080×1920, rendered from the live public record. Read [docs/MOTION.md](../../docs/MOTION.md#instagram-reels) for the motion system, scene rules and credits.

```sh
npm run reel:snapshot
npm run reel -- atlas
npm run reel -- careos
```

Each render writes `out/<scene>.mp4` and `out/<scene>-cover.jpg`. The `out/` folder is gitignored.

The render approach is adapted from [gongnyang/awesome-ai-motion](https://github.com/gongnyang/awesome-ai-motion) (MIT). DM Sans is licensed under the OFL; see `assets/fonts/OFL.txt`.
