import { NextResponse, type NextRequest } from "next/server";
import { getOrgSpatialCities, getOrgSpatialCityCells, getOrgSpatialCityDataset, getOrgSpatialViewportAnimals, getPublicSpatialCities, getPublicSpatialCityCells, getPublicSpatialCityDataset, getPublicSpatialViewportAnimals, SPATIAL_LIMITS } from "@/lib/spatial/server";

/* Public spatial contract: aggregates by default, individual animals only
 * for an explicit close-zoom viewport. There is intentionally no endpoint
 * that returns a platform- or organisation-wide SpatialDataset. */

const number = (value: string | null) => value === null ? Number.NaN : Number(value);

export async function GET(req: NextRequest) {
  const kind = req.nextUrl.searchParams.get("kind") ?? "cities";
  const scope = req.nextUrl.searchParams.get("scope") === "org" ? "org" : "public";
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (scope === "org" && !token) return NextResponse.json({ error: "Sign in to view your organisation map." }, { status: 401 });
  try {
    if (kind === "cities") {
      const cities = scope === "org" ? await getOrgSpatialCities(token) : await getPublicSpatialCities(Number(req.nextUrl.searchParams.get("limit")) || 80);
      return NextResponse.json({ cities, limits: SPATIAL_LIMITS }, { headers: { "Cache-Control": scope === "org" ? "private, no-store" : "public, s-maxage=300, stale-while-revalidate=900" } });
    }
    const city = req.nextUrl.searchParams.get("city")?.trim() ?? "";
    if (!city) return NextResponse.json({ error: "Choose a city before loading map data." }, { status: 400 });
    if (kind === "dataset") {
      const dataset = scope === "org" ? await getOrgSpatialCityDataset(token, city) : await getPublicSpatialCityDataset(city);
      if (!dataset) return NextResponse.json({ error: "No bounded records are available for that city yet." }, { status: 404 });
      return NextResponse.json(dataset, { headers: { "Cache-Control": scope === "org" ? "private, no-store" : "public, s-maxage=300, stale-while-revalidate=900" } });
    }
    if (kind === "cells") {
      const cells = scope === "org" ? await getOrgSpatialCityCells(token, city) : await getPublicSpatialCityCells(city);
      return NextResponse.json({ city, cells, limits: SPATIAL_LIMITS }, { headers: { "Cache-Control": scope === "org" ? "private, no-store" : "public, s-maxage=300, stale-while-revalidate=900" } });
    }
    if (kind === "animals") {
      const input = {
        city, west: number(req.nextUrl.searchParams.get("west")), south: number(req.nextUrl.searchParams.get("south")),
        east: number(req.nextUrl.searchParams.get("east")), north: number(req.nextUrl.searchParams.get("north")),
      };
      const animals = scope === "org" ? await getOrgSpatialViewportAnimals(token, input) : await getPublicSpatialViewportAnimals(input);
      return NextResponse.json({ city, animals, limit: SPATIAL_LIMITS.animals }, { headers: { "Cache-Control": scope === "org" ? "private, no-store" : "public, s-maxage=30, stale-while-revalidate=120" } });
    }
    return NextResponse.json({ error: "Unknown spatial query." }, { status: 400 });
  } catch (error) {
    console.error("spatial bounded query failed", error);
    return NextResponse.json({ error: "The map data is temporarily unavailable. Retry in a moment." }, { status: 503 });
  }
}
