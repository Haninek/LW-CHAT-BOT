import { env } from '../lib/env';
import { database } from '../lib/db/connection';
import { backgroundJobRepository } from '../repositories/background-job-repository';
import { eventRepository } from '../repositories/event-repository';
import { clearClient } from './clear-client';
import { BackgroundFlags, Person, BackgroundEventTypes, BackgroundWebhookPayload } from '../types/background';
import { AppError } from '../middleware/error';

export class BackgroundService {
  private summarizeResults(rawResponse: any): BackgroundFlags {
    const notes: string[] = [];
    let decision: 'OK' | 'Review' | 'Decline' = 'OK';

    const records = rawResponse.records || {};
    const criminal = records.criminal || [];
    const liensJudgments = records.liens_judgments || [];
    const ofac = records.OFAC || [];
    const identity = rawResponse.identity || {};

    // OFAC/Sanctions check (highest priority - immediate decline)
    if (ofac.length > 0) {
      decision = 'Decline';
      notes.push('Potential sanctions/OFAC hit detected');
    }

    // Criminal records check
    if (criminal.length > 0) {
      if (decision !== 'Decline') {
        decision = 'Review';
      }
      notes.push(`${criminal.length} criminal record(s) found`);
    }

    // Liens and judgments check
    if (liensJudgments.length > 0) {
      if (decision !== 'Decline') {
        decision = 'Review';
      }
      notes.push(`${liensJudgments.length} lien/judgment record(s) found`);
    }

    // Identity verification check
    const nameMatch = identity.name_match;
    const dobMatch = identity.dob_match;
    const addressMatch = identity.address_match;

    if (!nameMatch || !dobMatch) {
      if (decision !== 'Decline') {
        decision = 'Review';
      }
      notes.push('Identity verification concerns');
    }

    // If no issues found
    if (notes.length === 0) {
      notes.push('No material adverse findings');
    }

    return {
      decision,
      notes,
      raw: rawResponse,
    };
  }

  async runBackgroundJob(jobId: string): Promise<void> {
    try {
      // Get job details
      const job = await backgroundJobRepository.getJob(jobId);
      if (!job) {
        console.error(`Background job not found: ${jobId}`);
        return;
      }

      // Set status to running
      await backgroundJobRepository.setStatus(jobId, 'running');

      // Parse person data
      let person: Person;
      try {
        person = JSON.parse(job.person_json);
      } catch (error) {
        await backgroundJobRepository.setStatus(jobId, 'failed', 'Invalid person data format');
        return;
      }

      // Perform background search
      const rawResponse = await clearClient.searchPerson(person);

      // Summarize results
      const flags = this.summarizeResults(rawResponse);

      // Store results
      await backgroundJobRepository.setResult(jobId, flags);

      // Record event
      await eventRepository.recordEvent({
        type: BackgroundEventTypes.BACKGROUND_COMPLETED,
        client_id: job.client_id,
        data: {
          job_id: jobId,
          decision: flags.decision,
          notes: flags.notes,
        },
      });

      // Send webhook if configured
      if (env.LENDWIZELY_WEBHOOK_URL) {
        await this.sendWebhook(job.client_id, jobId, flags);
      }

      console.log(`Background job completed: ${jobId} - Decision: ${flags.decision}`);
    } catch (error) {
      console.error(`Background job failed: ${jobId}`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await backgroundJobRepository.setStatus(jobId, 'failed', errorMessage);

      // Record failure event
      try {
        const job = await backgroundJobRepository.getJob(jobId);
        if (job) {
          await eventRepository.recordEvent({
            type: BackgroundEventTypes.BACKGROUND_FAILED,
            client_id: job.client_id,
            data: {
              job_id: jobId,
              error: errorMessage,
            },
          });
        }
      } catch (eventError) {
        console.error('Failed to record failure event:', eventError);
      }
    }
  }

  private async sendWebhook(clientId: string, jobId: string, flags: BackgroundFlags): Promise<void> {
    if (!env.LENDWIZELY_WEBHOOK_URL) {
      return;
    }

    const payload: BackgroundWebhookPayload = {
      type: 'background.completed',
      client_id: clientId,
      job_id: jobId,
      flags,
    };

    try {
      const response = await fetch(env.LENDWIZELY_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LendWizely-BackgroundService/1.0',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.warn(`Webhook failed: ${response.status} ${response.statusText}`);
      } else {
        console.log(`Webhook sent successfully for job ${jobId}`);
      }
    } catch (error) {
      // Don't fail the job if webhook fails - just log the error
      console.error('Webhook send failed:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  // Helper method to start background job processing (used by routes)
  async startBackgroundJob(jobId: string): Promise<void> {
    // Run the job asynchronously without blocking the response
    setImmediate(() => {
      this.runBackgroundJob(jobId).catch(error => {
        console.error(`Unhandled error in background job ${jobId}:`, error);
      });
    });
  }

  // Get job status and results (for polling endpoint)
  async getJobStatus(jobId: string): Promise<{
    job_id: string;
    status: string;
    result?: BackgroundFlags;
    error?: string;
    created_at?: string;
    updated_at?: string;
  } | null> {
    const job = await backgroundJobRepository.getJob(jobId);
    if (!job) {
      return null;
    }

    let result: BackgroundFlags | undefined;
    if (job.result_json) {
      try {
        result = JSON.parse(job.result_json);
      } catch (error) {
        console.error('Failed to parse job result JSON:', error);
      }
    }

    return {
      job_id: job.id,
      status: job.status,
      result,
      error: job.error || undefined,
      created_at: job.created_at,
      updated_at: job.updated_at,
    };
  }

  // Sanitize person data for logging (remove sensitive info)
  private sanitizePersonData(person: Person): Partial<Person> {
    return {
      first: person.first,
      last: person.last,
      dob: person.dob ? person.dob.substring(0, 7) + '-XX' : undefined, // Show YYYY-MM only
      // Omit ssn4, email, phone, address for security
    };
  }
}

export const backgroundService = new BackgroundService();