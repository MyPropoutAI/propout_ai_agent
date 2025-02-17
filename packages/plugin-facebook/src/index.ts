import { type Client, elizaLogger, type IAgentRuntime } from "@elizaos/core";
import { validateFacebookConfig, type FacebookConfig } from "./environment";
import { FacebookPostClient } from "./actions/postAction";
import { FacebookInteractionClient } from "./interactions";

class FacebookManager {
    client: FacebookPostClient;
    interaction: FacebookInteractionClient;

    constructor(runtime: IAgentRuntime, facebookConfig: FacebookConfig) {
        this.client = new FacebookPostClient(runtime, facebookConfig);
        this.interaction = new FacebookInteractionClient(runtime, facebookConfig);
    }
}

export const FacebookClientInterface: Client = {
    async start(runtime: IAgentRuntime) {
        const facebookConfig: FacebookConfig = await validateFacebookConfig(runtime);

        elizaLogger.log("Facebook client started");

        const manager = new FacebookManager(runtime, facebookConfig);

        // Initialize posting logic
        await manager.client.init();

        // Start interactions (comments, likes)
        await manager.interaction.start();

        return manager;
    },

    async stop(_runtime: IAgentRuntime) {
        elizaLogger.warn("Facebook client does not support stopping yet");
    },
};

export default FacebookClientInterface;