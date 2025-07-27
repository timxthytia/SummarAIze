import '@testing-library/jest-dom';

// Polyfill TextEncoder/Decoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill fetch for Jest environment
import fetch from 'cross-fetch';
global.fetch = fetch;

// Polyfill Response, Request, Headers for Jest environment
const { Response, Request, Headers } = require('node-fetch');
global.Response = Response;
global.Request = Request;
global.Headers = Headers;

// Mock Vite's import.meta.env for Jest (safe workaround)
globalThis.importMetaEnv = {
  VITE_API_URL: 'http://localhost:10000',
};

// Patch global access in code where needed (e.g., in your test file or component mock)
globalThis.import = {
  meta: {
    env: globalThis.importMetaEnv,
  },
};

// Mock ResizeObserver for tests involving React Flow or similar libraries
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};