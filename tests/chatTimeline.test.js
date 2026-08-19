import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildChatTimeline } from '../src/utils/chatItemRoutes.js';

const msg = (id, createdAt, text) => ({ _id: id, createdAt, text });
const item = (itemId, addedAt, name) => ({
  itemId,
  itemType: 'Product',
  itemName: name,
  addedAt,
});

function kinds(timeline) {
  return timeline.map((entry) => {
    if (entry.type === 'item') return `item:${entry.item.itemName}`;
    return `msg:${entry.msg.text}`;
  });
}

test('one referenced product stays with its comment', () => {
  const timeline = buildChatTimeline(
    [msg('m1', '2026-08-19T10:00:05Z', 'هل هذا متوفر؟')],
    [item('A', '2026-08-19T10:00:00Z', 'Product A')],
  );
  assert.deepEqual(kinds(timeline), ['item:Product A', 'msg:هل هذا متوفر؟']);
});

test('multiple references stay with their own comments, not grouped at the top', () => {
  const timeline = buildChatTimeline(
    [
      msg('m1', '2026-08-19T10:00:05Z', 'تعليق A'),
      msg('m2', '2026-08-19T10:05:05Z', 'تعليق B'),
      msg('m3', '2026-08-19T10:08:05Z', 'تعليق C'),
    ],
    [
      item('C', '2026-08-19T10:08:00Z', 'Product C'),
      item('B', '2026-08-19T10:05:00Z', 'Product B'),
      item('A', '2026-08-19T10:00:00Z', 'Product A'),
    ],
  );
  assert.deepEqual(kinds(timeline), [
    'item:Product A',
    'msg:تعليق A',
    'item:Product B',
    'msg:تعليق B',
    'item:Product C',
    'msg:تعليق C',
  ]);
});

test('mixed normal messages stay in chronological order', () => {
  const timeline = buildChatTimeline(
    [
      msg('m1', '2026-08-19T10:00:05Z', 'تعليق A'),
      msg('m2', '2026-08-19T10:02:00Z', 'رسالة عادية 1'),
      msg('m3', '2026-08-19T10:05:05Z', 'تعليق B'),
      msg('m4', '2026-08-19T10:08:00Z', 'رسالة عادية 2'),
    ],
    [
      item('A', '2026-08-19T10:00:00Z', 'Product A'),
      item('B', '2026-08-19T10:05:00Z', 'Product B'),
    ],
  );
  assert.deepEqual(kinds(timeline), [
    'item:Product A',
    'msg:تعليق A',
    'msg:رسالة عادية 1',
    'item:Product B',
    'msg:تعليق B',
    'msg:رسالة عادية 2',
  ]);
});

test('reply messages keep their position; items do not jump to the top', () => {
  const reply = {
    ...msg('m2', '2026-08-19T10:03:00Z', 'رد المتجر'),
    replyTo: { text: 'تعليق A', senderName: 'زبون' },
  };
  const timeline = buildChatTimeline(
    [
      msg('m1', '2026-08-19T10:00:05Z', 'تعليق A'),
      reply,
      msg('m3', '2026-08-19T10:06:00Z', 'تعليق B'),
    ],
    [
      item('A', '2026-08-19T10:00:00Z', 'Product A'),
      item('B', '2026-08-19T10:05:50Z', 'Product B'),
    ],
  );
  assert.deepEqual(kinds(timeline), [
    'item:Product A',
    'msg:تعليق A',
    'msg:رد المتجر',
    'item:Product B',
    'msg:تعليق B',
  ]);
  assert.equal(timeline[2].msg.replyTo.text, 'تعليق A');
});
