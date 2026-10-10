/* ════════════════════════════════════════════════════════════════════
   The register's faces, framed.

   Resident photographs are taken in a hurry: a dog asleep in the corner
   of a doorway, a dog small in the middle of a road. Cropped blind into a
   small tile, most of them showed pavement. These are the photographed
   dogs on the register where the dog is plainly there, each with the box
   the whole dog occupies in its own picture (left, top, right, bottom as
   percentages), drawn by looking at every photograph. FramedPhoto centres
   that box in whatever card or tile shows it and zooms until the dog fills
   it. The landing deals from these; if
   the register ever holds fewer than it needs, it falls back to the
   fullest records as before. Reviewed again on 2026-10-10: no featured
   photograph shows a wound (SP-D-W08XQS was removed for that reason).
   ════════════════════════════════════════════════════════════════════ */

export type Frame = readonly [left: number, top: number, right: number, bottom: number];

export const REGISTER_FRAMES: Record<string, Frame> = {
  "SP-D-NIF7EA": [10, 18, 92, 80],
  "SP-D-1PSJE9": [17, 20, 64, 95],
  "SP-D-32BWO8": [14, 18, 66, 58],
  "SP-D-W20W2S": [9, 27, 90, 68],
  "SP-D-4BK5SQ": [14, 25, 100, 48],
  "SP-D-XYXCBQ": [12, 25, 100, 92],
  "SP-D-4UZGIP": [25, 22, 70, 55],
  "SP-D-C28SA6": [18, 26, 80, 64],
  "SP-D-8VAXYX": [0, 19, 88, 39],
  "SP-D-4ZPZT9": [25, 27, 80, 75],
  "SP-D-A0HO2O": [25, 35, 87, 64],
  "SP-D-57V788": [8, 25, 93, 45],
  "SP-D-BYCEC7": [17, 39, 68, 67],
  "SP-D-LA8EFF": [10, 34, 63, 90],
  "SP-D-D1IP1P": [22, 28, 80, 64],
  "SP-D-HV3WU1": [48, 27, 80, 45],
  "SP-D-Y8H0F9": [4, 10, 100, 92],
  "SP-D-IIKLOT": [27, 45, 78, 60],
  "SP-D-KL1E4B": [11, 36, 82, 58],
  "SP-D-M22A2O": [32, 34, 64, 52],
  "SP-D-M3POVF": [3, 44, 65, 80],
  "SP-D-NXQ3NL": [24, 18, 92, 50],
  "SP-D-NZ61DD": [5, 25, 96, 72],
  "SP-D-OW0K2E": [45, 26, 68, 55],
  "SP-D-R6S5QI": [18, 32, 70, 55],
  "SP-D-S58N2C": [0, 28, 83, 62],
  "SP-D-T4AYYH": [0, 30, 88, 64],
  "SP-D-V8ZAKM": [27, 32, 84, 66],
  "SP-D-XCDC2U": [0, 21, 64, 67],
  "SP-D-ZMRM83": [23, 61, 62, 96],
  "SP-D-X124P8": [35, 3, 90, 98],
  "SP-D-ZUYNX0": [7, 29, 96, 53],
  "SP-D-9Y5QOX": [0, 38, 73, 70],
  "SP-D-008KHA": [20, 21, 86, 60],
  "SP-D-XV8BFQ": [22, 26, 92, 60],
};
