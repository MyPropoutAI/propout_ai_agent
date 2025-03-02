import { FacebookBaseService } from "./base-service";
import { type IAgentRuntime } from "@elizaos/core";

export class FacebookMatcherService extends FacebookBaseService {
    async matchRequests() {
        // const [listings, requests] = await Promise.all([
            // this.runtime?.knowledge.query({ type: 'property-listing' }),
            // this.runtime?.knowledge.query({ type: 'property-request' })
        // ]);

        // return this.findMatches(listings, requests);
        return null
    }

    private findMatches(listings: any[], requests: any[]) {
        // return this.runtime?.matching.findMatches({
        //     items: listings,
        //     requests,
        //     matchCriteria: (listing, request) => {
        //         return listing.price <= request.maxPrice && 
        //                listing.propertyType === request.propertyType;
        //     }
        // });


    }
} 