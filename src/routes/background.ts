import { Router, Request, Response, NextFunction } from 'express';
import {
  BackgroundCheckRequestSchema,
  BackgroundCheckAccepted,
  BackgroundJobStateSchema,
  BackgroundJobState,
  BackgroundEventTypes
} from '../types/background';
import { backgroundService } from '../services/background-service';
import { backgroundJobRepository } from '../repositories/background-job-repository';
import { eventRepository } from '../repositories/event-repository';
import { AppError } from '../middleware/error';
import { ApiResponse } from '../types/global';

const router = Router();

router.post('/check', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Validate request body
    const validationResult = BackgroundCheckRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid background check request',
        400,
        'INVALID_BACKGROUND_REQUEST',
        validationResult.error.errors
      );
    }

    const { client_id, person } = validationResult.data;

    // Additional SSN4 validation
    if (person.ssn4 && person.ssn4.length !== 4) {
      throw new AppError(
        'SSN4 must be exactly 4 digits',
        422,
        'INVALID_SSN4_FORMAT'
      );
    }

    // Sanitize person data for storage (remove full SSN, etc.)
    const sanitizedPerson = {
      first: person.first,
      last: person.last,
      dob: person.dob,
      ssn4: person.ssn4, // Only last 4 digits allowed
      email: person.email,
      phone: person.phone,
      address: person.address,
    };

    // Create background job
    const job = await backgroundJobRepository.createJob({
      client_id,
      person_json: JSON.stringify(sanitizedPerson),
      status: 'queued',
    });

    // Record job started event
    await eventRepository.recordEvent({
      type: BackgroundEventTypes.BACKGROUND_STARTED,
      client_id,
      data: {
        job_id: job.id,
        person: {
          first: person.first,
          last: person.last,
          dob: person.dob.substring(0, 7) + '-XX', // Sanitized DOB for logging
        },
      },
    });

    // Start background processing asynchronously
    await backgroundService.startBackgroundJob(job.id);

    const response: ApiResponse<BackgroundCheckAccepted> = {
      success: true,
      data: {
        job_id: job.id,
      },
      timestamp: new Date().toISOString(),
    };

    // Return 202 Accepted
    res.status(202).json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/jobs/:jobId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      throw new AppError(
        'Job ID is required',
        400,
        'JOB_ID_REQUIRED'
      );
    }

    // Get job status and results
    const jobStatus = await backgroundService.getJobStatus(jobId);

    if (!jobStatus) {
      throw new AppError(
        'Background job not found',
        404,
        'JOB_NOT_FOUND'
      );
    }

    // Validate response format
    const validationResult = BackgroundJobStateSchema.safeParse(jobStatus);
    if (!validationResult.success) {
      throw new AppError(
        'Invalid job state format',
        500,
        'INVALID_JOB_STATE',
        validationResult.error.errors
      );
    }

    const response: ApiResponse<BackgroundJobState> = {
      success: true,
      data: validationResult.data,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Optional: Get all jobs for a client (for admin/debugging)
router.get('/client/:clientId/jobs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { clientId } = req.params;

    if (!clientId) {
      throw new AppError(
        'Client ID is required',
        400,
        'CLIENT_ID_REQUIRED'
      );
    }

    const jobs = await backgroundJobRepository.findJobsByClientId(clientId);

    const jobStates = jobs.map(job => {
      let result;
      if (job.result_json) {
        try {
          result = JSON.parse(job.result_json);
        } catch (error) {
          console.error('Failed to parse job result:', error);
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
    });

    const response: ApiResponse<{ jobs: typeof jobStates }> = {
      success: true,
      data: { jobs: jobStates },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Optional: Get jobs by status (for admin/monitoring)
router.get('/jobs', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status, limit } = req.query;

    let jobs;
    if (status && typeof status === 'string') {
      // Validate status
      if (!['queued', 'running', 'completed', 'failed'].includes(status)) {
        throw new AppError(
          'Invalid status filter',
          400,
          'INVALID_STATUS_FILTER'
        );
      }

      const limitNum = limit ? parseInt(String(limit), 10) : 100;
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
        throw new AppError(
          'Limit must be between 1 and 1000',
          400,
          'INVALID_LIMIT'
        );
      }

      jobs = await backgroundJobRepository.findJobsByStatus(status as any, limitNum);
    } else {
      // Get recent jobs (all statuses)
      jobs = await backgroundJobRepository.findJobsByStatus('completed', 50);
    }

    const jobStates = jobs.map(job => {
      let result;
      if (job.result_json) {
        try {
          result = JSON.parse(job.result_json);
        } catch (error) {
          console.error('Failed to parse job result:', error);
        }
      }

      return {
        job_id: job.id,
        client_id: job.client_id,
        status: job.status,
        result,
        error: job.error || undefined,
        created_at: job.created_at,
        updated_at: job.updated_at,
      };
    });

    const response: ApiResponse<{ jobs: typeof jobStates; total: number }> = {
      success: true,
      data: {
        jobs: jobStates,
        total: jobStates.length,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;