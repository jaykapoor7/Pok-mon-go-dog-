export type ContributorOrg = {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  stateCode: string;
  focus: string[];
  summary: string;
  url: string;
  founded: number | null;
  directoryKind: "partner" | "data_source";
  animalCount: number;
  areaRecordCount: number;
  sourceCount: number;
};
