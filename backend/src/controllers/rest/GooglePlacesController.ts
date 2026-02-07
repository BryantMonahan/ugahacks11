import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { QueryParams } from "@tsed/platform-params";
import turf from "turf"

@Controller("/places")
export class GooglePlacesController {
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY;

  @Get("/waste-centers")
  async getNearestWasteCenter(
    @QueryParams("lat") lat: string,
    @QueryParams("lng") lng: string,
    @QueryParams("radius") radius: string = "5000",
    @QueryParams("query") searchQuery?: string
  ) {
    if (!this.apiKey) {
      return { error: "Google Places API key not configured", status: 500 };
    }

    try {
      const query = searchQuery
        ? `${searchQuery} recycling center OR ${searchQuery} waste center`
        : "waste disposal center OR recycling center OR waste management facility";

      const params = new URLSearchParams({
        query,
        location: `${lat},${lng}`,
        radius,
        key: this.apiKey
      });

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
      );

      const data = await response.json() as { results?: Array<any> };
      const limitedResults = (data.results || []).slice(0, 5);
      return { results: limitedResults, count: limitedResults.length };
    } catch (error) {
      return { error: "Failed to search waste centers", status: 500 };
    }
  }

  @Get('/nearest-compactor')
  getNearest(@QueryParams("lat") lat: string,
    @QueryParams("lng") lng: string,) {
    const from = turf.point([Number(lat), Number(lng)])
    let distances: { distance: number; coords: [number, number] }[] = []
    for (const coords of this.compactCoords) {
      const to = turf.point([coords[0], coords[1]])
      const distance = turf.distance(from, to, "meters")
      distances.push({ distance, coords: [coords[0], coords[1]] })
    }
    distances = distances.sort((a, b) => a.distance - b.distance)
    return distances.map(loc => loc.distance = loc.distance * 3.28084).slice(0, 5)
  }

  @Get('/compactors')
  getAllCompactors() {
    return {
      compactors: this.compactCoords.map((coords, index) => ({
        id: index + 1,
        lat: coords[0],
        lng: coords[1],
        name: `Compactor ${index + 1}`
      })),
      count: this.compactCoords.length
    }
  }

  compactCoords = [
    [33.957694, -83.375056],
    [33.956583, -83.375028],
    [33.956583, -83.373667],
    [33.955694, -83.375417],
    [33.954722, -83.374889],
    [33.954472, -83.374194],
    [33.954583, -83.373667],
    [33.95475, -83.373111],
    [33.952972, -83.375889],
    [33.952, -83.373111],
    [33.951944, -83.372139],
    [33.951278, -83.372528],
    [33.951556, -83.373389],
    [33.948083, -83.373917],
    [33.9465, -83.376333],
    [33.942944, -83.377028],
    [33.940028, -83.3705],
    [33.93775, -83.369917],
    [33.938111, -83.368667],
  ]
}
