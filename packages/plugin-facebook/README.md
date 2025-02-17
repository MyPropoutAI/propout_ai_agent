# @elizaos/plugin-facebook

A plugin for Facebook integration, providing automated post capabilities with character-aware content generation.

## Overview

This plugin provides functionality to:

- Compose context-aware posts
- Post content to Facebook
- Handle authentication and session management

## Installation

```bash
npm install @elizaos/plugin-facebook
```

## Configuration

The plugin requires the following environment variables:

```env
FACEBOOK_USERNAME=your_username
FACEBOOK_PASSWORD=your_password
FACEBOOK_PAGE_ID=your_page_id
FACEBOOK_ACCESS_TOKEN=your_access_token
```

## Usage

Import and register the plugin in your Eliza configuration:

```typescript
import { FacebookClientInterface } from "@elizaos/plugin-facebook";

export default {
    plugins: [FacebookClientInterface],
    // ... other configuration
};
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

### Development Mode

```bash
npm run dev
```

## Dependencies

- `@elizaos/core`: Core Eliza functionality
- Other standard dependencies listed in package.json

## License

This plugin is part of the Eliza project. See the main project repository for license information.