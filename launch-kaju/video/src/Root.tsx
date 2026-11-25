import React from "react";
import { Composition, Folder, Still, staticFile, type CalculateMetadataFunction } from "remotion";
import "./theme";
import { EDITS } from "./edits";
import { Film } from "./Film";
import { Thumb } from "./Thumb";
import { FPS, buildTimeline, idOf, takesOf } from "./lib";
import type { FilmProps, TakeLog } from "./types";

/* The logs decide the film's length (and everything else), so they are read before the composition is sized. */
const withLogs: CalculateMetadataFunction<FilmProps> = async ({ props }) => {
  const logs: Record<string, TakeLog> = {};
  await Promise.all(takesOf(props.edit).map(async (take) => {
    const r = await fetch(staticFile(`takes/${take}/log.json`));
    if (!r.ok) throw new Error(`Take "${take}" is not in public/takes (HTTP ${r.status}). Run: npm run prepare:takes`);
    logs[take] = await r.json();
  }));
  return { durationInFrames: buildTimeline(props.edit, logs, FPS).total, props: { ...props, logs } };
};
const stillWithLogs: CalculateMetadataFunction<FilmProps> = async (o) => ({ props: (await withLogs(o)).props });

export function Root() {
  return (
    <>
      {EDITS.map((edit) => {
        const id = idOf(edit.slug);
        return (
          <Folder key={id} name={id}>
            <Composition id={`${id}-16x9`} component={Film} width={1920} height={1080} fps={FPS} durationInFrames={300} defaultProps={{ edit, aspect: "landscape" }} calculateMetadata={withLogs} />
            <Composition id={`${id}-9x16`} component={Film} width={1080} height={1920} fps={FPS} durationInFrames={300} defaultProps={{ edit, aspect: "vertical" }} calculateMetadata={withLogs} />
            {edit.thumb && <Still id={`Thumb-${id}-16x9`} component={Thumb} width={1920} height={1080} defaultProps={{ edit, aspect: "landscape" }} calculateMetadata={stillWithLogs} />}
            {edit.thumb && <Still id={`Thumb-${id}-4x5`} component={Thumb} width={1080} height={1350} defaultProps={{ edit, aspect: "vertical" }} calculateMetadata={stillWithLogs} />}
          </Folder>
        );
      })}
    </>
  );
}
