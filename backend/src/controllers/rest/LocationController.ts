import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";

@Controller('location')
export class GetLocations {
    @Get('/nearest')
    get() {
        return 'hi'
    }
}