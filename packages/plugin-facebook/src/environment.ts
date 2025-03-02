import type { IAgentRuntime } from "@elizaos/core";
import { z } from "zod";

// Define the schema for Facebook configuration
export const facebookConfigSchema = z.object({
    accessToken: z.string().describe("FACEBOOK_ACCESS_TOKEN"),
    pageId: z.string().describe("FACEBOOK_PAGE_ID"),
    username: z.string().optional().describe("FACEBOOK_USERNAME"),
    password: z.string().optional().describe("FACEBOOK_PASSWORD")
});

// Type inference for the Facebook configuration
export type FacebookConfig = z.infer<typeof facebookConfigSchema>;

// Function to validate the Facebook configuration
export async function validateFacebookConfig(
    runtime: IAgentRuntime
): Promise<FacebookConfig> {
    try {
        const config = {
            accessToken: runtime.getSetting("FACEBOOK_ACCESS_TOKEN") || process.env.FACEBOOK_ACCESS_TOKEN,
            pageId: runtime.getSetting("FACEBOOK_PAGE_ID") || process.env.FACEBOOK_PAGE_ID,
            username: runtime.getSetting("FACEBOOK_USERNAME") || process.env.FACEBOOK_USERNAME,
            password: runtime.getSetting("FACEBOOK_PASSWORD") || process.env.FACEBOOK_PASSWORD
        };

        return facebookConfigSchema.parse(config);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const errorMessages = error.errors
                .map((err) => `${err.path.join(".")}: ${err.message}`)
                .join("\n");
            throw new Error(`Facebook configuration validation failed:\n${errorMessages}`);
        }
        throw error;
    }
} 