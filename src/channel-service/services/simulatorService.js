// src/channel-service/services/simulatorService.js
// Delivery simulation logic — runs INSIDE the BullMQ worker for each message.
// Simulates: network delay → delivery/failure → engagement events (opened, clicked, converted)

const { pushCallback } = require('./dispatcherService');
const { sleep, rand } = require('../utils/retry');
const { FAILURE_RATE, DELIVERY_DELAY_MIN, DELIVERY_DELAY_MAX } = require('../config/env');

const FAILURE_REASONS = [
  "Invalid phone number",
  "User opted out",
  "Channel unavailable",
  "Network timeout"
];

const HIGH_VALUE_EVENTS = [
  { status: 'OPENED',    probability: 70 / 95, delayRange: [2500,  3500]  }, // ~3s after delivered
  { status: 'CLICKED',   probability: 35 / 70, delayRange: [5500,  6500]  }, // ~6s after delivered
  { status: 'CONVERTED', probability: 15 / 35, delayRange: [12500, 13500] }, // ~13s after delivered
];

const LOW_VALUE_EVENTS = [
  { status: 'OPENED',    probability: 20 / 95, delayRange: [2500,  3500]  },
  { status: 'CLICKED',   probability:  5 / 20, delayRange: [5500,  6500]  },
  { status: 'CONVERTED', probability:  1 /  5, delayRange: [12500, 13500] },
];

/**
 * Deterministically classify customer as High or Low value
 * so the simulation is consistent for the same customer.
 */
function isHighValueCustomer(customerId) {
  let hash = 0;
  for (let i = 0; i < customerId.length; i++) {
    hash += customerId.charCodeAt(i);
  }
  // Set roughly 70% of customers as High-value to match typical realistic funnels
  return (hash % 10) < 7;
}

/**
 * Schedule probabilistic engagement events after a message is delivered.
 * Events fire sequentially — CLICKED only fires if OPENED fired, etc.
 */
function scheduleEngagementEvents(messageId, customerId, campaignId, isHighValue) {
  let previousFired = true;
  const events = isHighValue ? HIGH_VALUE_EVENTS : LOW_VALUE_EVENTS;

  for (const event of events) {
    const shouldFire = previousFired && Math.random() < event.probability;
    if (shouldFire) {
      const delay = rand(event.delayRange[0], event.delayRange[1]);
      setTimeout(() => {
        pushCallback(messageId, customerId, campaignId, event.status);
      }, delay);
      previousFired = true;
    } else {
      previousFired = false; // chain breaks — no further events
    }
  }
}

/**
 * Core simulation function — called by the BullMQ worker for each job.
 *
 * Flow:
 *   1. Simulate network/channel latency
 *   2. Push SENT status immediately
 *   3. Randomly decide DELIVERED (95%) or FAILED (5%)
 *   4. On DELIVERED → schedule engagement events based on High/Low value
 *   5. On FAILED → throw (BullMQ handles retry with backoff)
 *
 * @param {object} jobData - { messageId, customerId, campaignId, channel, content }
 */
async function simulateDelivery(jobData) {
  const { messageId, customerId, campaignId, attemptsMade = 0 } = jobData;

  // 1. Simulate channel latency (~2 seconds)
  await sleep(rand(DELIVERY_DELAY_MIN, DELIVERY_DELAY_MAX));

  // 2. Push SENT status immediately (only on first attempt to avoid duplicates)
  if (attemptsMade === 0) {
    pushCallback(messageId, customerId, campaignId, 'SENT');
  }

  // 3. Simulate delivery outcome (90% delivery, 10% failure)
  // Use a deterministic hash based on customerId so retries fail consistently.
  let hash = 0;
  for (let i = 0; i < customerId.length; i++) {
    hash += customerId.charCodeAt(i);
  }
  const delivered = (hash % 10) < 9; // 0-8 delivered, 9 failed (10% failure rate)

  if (delivered) {
    // 4a. Delivered — push callback and schedule engagement chain
    pushCallback(messageId, customerId, campaignId, 'DELIVERED');
    const isHighValue = isHighValueCustomer(customerId);
    scheduleEngagementEvents(messageId, customerId, campaignId, isHighValue);
    console.log(`[Simulator] ✅ DELIVERED  ${messageId.slice(-8)} (${isHighValue ? 'High' : 'Low'} Value)`);
  } else {
    // 4b. Failed — throw so BullMQ retries with exponential backoff
    const reason = FAILURE_REASONS[Math.floor(Math.random() * FAILURE_REASONS.length)];
    console.warn(`[Simulator] ❌ FAILED     ${messageId.slice(-8)} (will retry) - ${reason}`);
    throw new Error(`Delivery failed for ${messageId} | Reason: ${reason}`);
  }
}

module.exports = { simulateDelivery };
