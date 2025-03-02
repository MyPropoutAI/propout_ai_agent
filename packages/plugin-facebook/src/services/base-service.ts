import { Service, type IAgentRuntime, elizaLogger, ServiceType } from "@elizaos/core";

import { EventEmitter } from "events";

export class FacebookBaseService extends Service {
    static get serviceType(): ServiceType {
        return "facebook-base" as ServiceType;
    }
    
    protected emitter = new EventEmitter();
    protected runtime: IAgentRuntime | null = null;
    
    emit(event: string | symbol, ...args: any[]): boolean {
        return this.emitter.emit(event, ...args);
    }

    on(event: string | symbol, listener: (...args: any[]) => void): this {
        this.emitter.on(event, listener);
        return this;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        this.runtime = runtime;
        await this.validateConfig();
        elizaLogger.info(`${this.constructor.name} initialized`);
    }

    private async validateConfig() {
        // const config = this.runtime.getConfig('facebook');
        // return FacebookConfigSchema.parse(config);
        return null
    }
    
    async stop(): Promise<void> {
        elizaLogger.info(`${this.constructor.name} stopped`);
    }
}