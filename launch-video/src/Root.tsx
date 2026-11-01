import React from "react";
import { Composition } from "remotion";
import { Launch, TOTAL } from "./Launch";
export const Root = () => (
  <>
    <Composition id="KajuReel" component={Launch} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="KajuX" component={Launch} durationInFrames={TOTAL} fps={30} width={1920} height={1080} />
  </>
);
