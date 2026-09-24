import { Injectable } from '@nestjs/common';

@Injectable()
export class DemoResourceService {
  private revision = 0;
  private queue: Promise<void> = Promise.resolve();

  async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue;
    let release: () => void = () => undefined;
    this.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try { return await operation(); } finally { release(); }
  }

  prepareMaintain(): { value: { revision: number }; rollback: () => void } {
    const previous = this.revision;
    this.revision += 1;
    return { value: { revision: this.revision }, rollback: () => { this.revision = previous; } };
  }
  prepareExport(): { value: { filename: string; revision: number }; rollback: () => void } {
    return { value: { filename: 'resource-catalog.csv', revision: this.revision }, rollback: () => undefined };
  }
  currentRevision(): number { return this.revision; }
}
