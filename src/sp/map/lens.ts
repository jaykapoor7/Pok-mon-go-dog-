/* The Map's four public lenses (decision 018). The Care lens is named for what it holds. */
export type MapLens = "animals" | "help" | "requests" | "care";
export const MAP_LENSES: MapLens[] = ["animals", "help", "requests", "care"];
export const LENS_LABEL: Record<MapLens, string> = { animals: "Animals", help: "Needs help", requests: "Open requests", care: "Sterilisation records" };
