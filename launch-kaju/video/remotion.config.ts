import { Config } from "@remotion/cli/config";
/* The headless shell that is already on this machine. Remotion must never download its own. */
Config.setBrowserExecutable(process.env.KAJU_CHROME ?? "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(96);
Config.setConcurrency(4);
