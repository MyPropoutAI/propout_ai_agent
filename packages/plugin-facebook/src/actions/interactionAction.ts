import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    elizaLogger,
} from "@elizaos/core";

export const interactionAction: Action = {
    name: "INTERACT_FACEBOOK",
    description: "Interact with a Facebook post",
    similes: ["INTERACT", "FACEBOOK_INTERACTION", "LIKE_FACEBOOK_POST"],
    validate: async (runtime: IAgentRuntime, _message: Memory) => {
        return !!runtime.character.settings.secrets?.FACEBOOK_ACCESS_TOKEN;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: object,
        callback: HandlerCallback
    ) => {
        try {
            const postId = message.content.postId;
            const interactionType = message.content.interactionType; // e.g., "like", "comment"

            // Here you would call the Facebook API to interact with the post
            // For example:
            // await runtime.facebookApi.interact(postId, interactionType);

            elizaLogger.info(`Interacting with post ${postId} with action: ${interactionType}`);

            callback(
                {
                    text: `Successfully interacted with post ${postId} using action: ${interactionType}`,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error interacting with Facebook post:", error);
            callback(
                { text: "Failed to interact with Facebook post. Please check the logs." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "hi i need a 3 bedroom flat",
                    postId: "123456789",
                    interactionType: "like",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Successfully interacted with post 123456789 using action: like",
                },
            },
        ],
    ],
}; 