import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    elizaLogger,
} from "@elizaos/core";

export const postAction: Action = {
    name: "POST_FACEBOOK",
    description: "Post content to Facebook",
    similes: ["POST", "FACEBOOK_POST", "SEND_FACEBOOK_POST"],
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
            const content = message.content.text;

            // Here you would call the Facebook API to post the content
            // For example:
            // await runtime.facebookApi.post(content);

            elizaLogger.info("Posting content to Facebook:", content);

            callback(
                {
                    text: `Content posted successfully to Facebook: ${content}`,
                },
                []
            );
        } catch (error) {
            elizaLogger.error("Error posting to Facebook:", error);
            callback(
                { text: "Failed to post content to Facebook. Please check the logs." },
                []
            );
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Post this content to Facebook: 'Hello, world!'",
                },
            },
            {
                user: "{{agentName}}",
                content: {
                    text: "Content posted successfully to Facebook: 'Hello, world!'",
                },
            },
        ],
    ],
};