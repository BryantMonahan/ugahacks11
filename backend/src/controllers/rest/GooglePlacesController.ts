import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { QueryParams } from "@tsed/platform-params";

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
}
