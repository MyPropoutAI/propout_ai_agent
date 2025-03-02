import { type Plugin } from "@elizaos/core";
import { FacebookPostService } from "./services/facebook-post";
import { FacebookScraperService } from "./services/facebook-scraper";
import { FacebookMatcherService } from "./services/facebook-matcher"; 
import { postAction } from "./actions/postAction";
import { interactionAction } from "./actions/interactionAction";

export const facebookPlugin: Plugin = {
    name: "facebook",
    description: "Facebook integration plugin for ElizaOS",
    actions: [postAction, interactionAction],
    services: [
        new FacebookPostService,
        new FacebookScraperService,
        new FacebookMatcherService
    ],
    evaluators: [],
    providers: []
};
