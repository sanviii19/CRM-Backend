// src/channel-service/models/jobModel.js
// In-memory job state tracker — maps messageId → { status, campaignId, updatedAt }
// Used by GET /api/status/:messageId to return job state without hitting Redis.

const jobs = new Map();

const jobModel = {
  /**
   * Set or update a job record.
   */
  set: (messageId, data) => {
    jobs.set(messageId, { ...data, updatedAt: new Date() });
  },

  /**
   * Get a job record by messageId.
   */
  get: (messageId) => jobs.get(messageId) || null,

  /**
   * Get all jobs for a campaignId.
   */
  getByCampaign: (campaignId) =>
    Array.from(jobs.values()).filter((j) => j.campaignId === campaignId),

  /**
   * Get queue depth stats.
   */
  stats: () => {
    const statuses = {};
    for (const job of jobs.values()) {
      statuses[job.status] = (statuses[job.status] || 0) + 1;
    }
    return { total: jobs.size, byStatus: statuses };
  },

  /**
   * Clear all jobs (for testing).
   */
  clear: () => jobs.clear(),
};

module.exports = { jobModel };
