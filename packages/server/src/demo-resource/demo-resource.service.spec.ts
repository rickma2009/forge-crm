import { DemoResourceService } from './demo-resource.service';

describe('DemoResourceService operation serialization', () => {
  it('does not allow a second effect to interleave with rollback-capable authorization work', async () => {
    const service = new DemoResourceService();
    const order: string[] = [];
    let releaseFirst: () => void = () => undefined;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = service.exclusive(async () => { order.push('first-start'); await firstGate; order.push('first-end'); });
    const second = service.exclusive(async () => { order.push('second'); });
    await Promise.resolve();
    expect(order).toEqual(['first-start']);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(['first-start', 'first-end', 'second']);
  });
});
