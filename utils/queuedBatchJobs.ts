import { QueuedBatchJob } from '../types';

export const isQueuedBatchJobSubmissionPending = (job: QueuedBatchJob) => job.submissionPending === true;

export const isQueuedBatchJobActive = (job: QueuedBatchJob) =>
    isQueuedBatchJobSubmissionPending(job) || job.state === 'JOB_STATE_PENDING' || job.state === 'JOB_STATE_RUNNING';

export const isQueuedBatchJobRefreshable = (job: QueuedBatchJob) =>
    !isQueuedBatchJobSubmissionPending(job) && (job.state === 'JOB_STATE_PENDING' || job.state === 'JOB_STATE_RUNNING');

export const isQueuedBatchJobClosedIssue = (job: QueuedBatchJob) =>
    job.state === 'JOB_STATE_FAILED' || job.state === 'JOB_STATE_CANCELLED' || job.state === 'JOB_STATE_EXPIRED';

export const isQueuedBatchJobImportReady = (job: QueuedBatchJob) =>
    job.state === 'JOB_STATE_SUCCEEDED' && job.hasImportablePayload === true;

export const getQueuedBatchJobImportDiagnostic = (job: QueuedBatchJob) => {
    if (job.importDiagnostic) {
        return job.importDiagnostic;
    }

    if (job.state === 'JOB_STATE_SUCCEEDED' && job.hasImportablePayload === false) {
        return 'no-payload';
    }

    return null;
};

export const isQueuedBatchJobNoPayload = (job: QueuedBatchJob) =>
    getQueuedBatchJobImportDiagnostic(job) === 'no-payload';

export const isQueuedBatchJobExtractionFailure = (job: QueuedBatchJob) =>
    getQueuedBatchJobImportDiagnostic(job) === 'extraction-failure';

export const isQueuedBatchJobRetryableImport = (job: QueuedBatchJob) =>
    isQueuedBatchJobImportReady(job) && isQueuedBatchJobExtractionFailure(job);

export const isQueuedBatchJobAutoImportReady = (job: QueuedBatchJob) =>
    isQueuedBatchJobImportReady(job) && !isQueuedBatchJobExtractionFailure(job);

export const isQueuedBatchJobClearableIssue = (job: QueuedBatchJob) =>
    isQueuedBatchJobClosedIssue(job) || isQueuedBatchJobNoPayload(job) || isQueuedBatchJobExtractionFailure(job);

export const shouldPersistQueuedBatchJob = (job: QueuedBatchJob) => !isQueuedBatchJobSubmissionPending(job);
