import React from "react";
import { Composition } from "remotion";
import { Launch, TOTAL } from "./Launch";
import { Reel, REEL_TOTAL } from "./reel";
import { Film, FILM_TOTAL } from "./film";
import { DemoCut, DEMO_TOTAL } from "./democut";
export const Root = () => (
  <>
    <Composition id="KajuReel" component={Launch} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="KajuX" component={Launch} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
    <Composition id="KajuReelV2" component={Reel} durationInFrames={REEL_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="KajuFilm" component={Film} durationInFrames={FILM_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="DemoReel" component={DemoCut} durationInFrames={DEMO_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="DemoX" component={DemoCut} durationInFrames={DEMO_TOTAL} fps={30} width={1920} height={1080} />
  </>
);
