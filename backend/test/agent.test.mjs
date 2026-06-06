import assert from 'node:assert/strict';
import test from 'node:test';
import { buildAgentRun } from '../api/index.mjs';

test('buildAgentRun returns a complete and reasonable decision', () => {
  const run = buildAgentRun({
    prompt: '明天从上海到杭州，尽量少排队，电池安全优先',
    weights: { time: 35, cost: 25, batterySafety: 55 }
  });

  assert.match(run.runId, /^VP-\d{8}-\d{5}$/);
  assert.equal(run.steps.length, 6);
  assert.ok(run.decision.chargeMinutes > 0 && run.decision.chargeMinutes < 60);
  assert.ok(run.decision.finalSoc >= 14);
  assert.equal(run.stations.length, 4);
});
