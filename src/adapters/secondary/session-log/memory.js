export class InMemorySessionLog {
  constructor() {
    this.entries = [];
  }

  async record(entry) {
    this.entries.push(entry);
    console.log("[SESSION]", JSON.stringify(entry, null, 2));
  }
}
