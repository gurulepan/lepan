/**
 * @typedef {Object} LlmPort
 * @property {(p: { question: string, tools: any[], wantsReview?: boolean }) => Promise<string>} complete
 */

/**
 * @typedef {Object} ToolPort
 * @property {() => Promise<any[]>} getTools
 * @property {() => Promise<void>} [close]
 */

/**
 * @typedef {Object} SessionLogPort
 * @property {(entry: object) => Promise<void>} record
 */

export {};
