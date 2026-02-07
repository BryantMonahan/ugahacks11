import { Controller } from "@tsed/di";
import { Get } from "@tsed/schema";

@Controller('quest')
export class QuestController {
    @Get('/quests')
    get() {
        return 'this is a quest!'
    }
}