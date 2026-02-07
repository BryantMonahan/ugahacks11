import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";
import { QueryParams } from "@tsed/platform-params";
import turf from "turf"

@Controller("/places")
export class GooglePlacesController {
  private readonly apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  private readonly hazardousWasteTypes = [
    "electronics", "battery", "batteries", "hazardous", "toxic", "chemical",
    "motor oil", "paint", "ink", "fluorescent", "e-waste", "computer", 
    "phone", "tv", "monitor", "printer", "laptop"
  ];

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
  ];

  @Get('/smart-route')
  async getSmartRoute(
    @QueryParams("lat") lat: string,
    @QueryParams("lng") lng: string,
    @QueryParams("wasteType") wasteType?: string
  ) {
    if (!this.apiKey) {
      return { error: "Google Maps API key not configured", status: 500 };
    }

    try {
      const isHazardous = this.isHazardousWaste(wasteType);
      let destination;
      let route;
      let facilities = [];

      if (isHazardous) {
        // Get nearest 5 waste facilities for hazardous materials
        try {
          const query = wasteType
            ? `${wasteType} recycling center OR ${wasteType} waste center`
            : "waste disposal center OR recycling center OR waste management facility";

          const params = new URLSearchParams({
            query,
            location: `${lat},${lng}`,
            radius: "10000",
            key: this.apiKey
          });

          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`
          );

          const data = await response.json() as { results?: Array<any> };
          facilities = (data.results || []).slice(0, 5);
          
          if (facilities.length > 0) {
            const nearest = facilities[0];
            destination = {
              lat: nearest.geometry.location.lat,
              lng: nearest.geometry.location.lng,
              name: nearest.name,
              type: "waste-facility"
            };
          }
        } catch (error) {
          console.error('Failed to search waste facilities:', error);
        }
      } else {
        // Route to nearest compactor for regular waste
        destination = this.getNearestCompactor(lat, lng);
      }

      if (!destination) {
        return { error: "No suitable destination found", status: 404 };
      }

      // Get route using Google Routes API
      route = await this.getDirections(`${lat},${lng}`, `${destination.lat},${destination.lng}`);

      return {
        destination,
        route,
        facilities: isHazardous ? facilities.slice(0, 5) : [],
        isHazardous,
        wasteType: wasteType || "general"
      };
    } catch (error) {
      console.error('Smart route error:', error);
      return { error: "Failed to calculate route", status: 500 };
    }
  }

  private isHazardousWaste(wasteType?: string): boolean {
    if (!wasteType) return false;
    return this.hazardousWasteTypes.some(type => 
      wasteType.toLowerCase().includes(type.toLowerCase())
    );
  }

  private getNearestCompactor(lat: string, lng: string) {
    const from = turf.point([Number(lng), Number(lat)]);
    let nearest = null;
    let minDistance = Infinity;

    this.compactCoords.forEach((coords, index) => {
      const to = turf.point([coords[1], coords[0]]);
      const distance = turf.distance(from, to, "meters");
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = {
          lat: coords[0],
          lng: coords[1],
          name: `Compactor ${index + 1}`,
          type: "compactor",
          distance
        };
      }
    });
    
    return nearest;
  }

  private async getDirections(origin: string, destination: string) {
    const params = new URLSearchParams({
      origin,
      destination,
      key: this.apiKey || "",
      mode: "driving"
    });

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    
    return await response.json();
  }
}
