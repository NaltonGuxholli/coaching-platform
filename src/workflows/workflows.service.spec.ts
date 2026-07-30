import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { WorkflowsService } from './workflows.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../auth/role.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';

describe('WorkflowsService', () => {
  const instructor: AuthenticatedUser = {
    id: 'instructor-1',
    tenantId: 'tenant-1',
    email: 'instructor@example.com',
    roles: [RoleName.INSTRUCTOR],
  };
  const learner: AuthenticatedUser = {
    id: 'learner-1',
    tenantId: 'tenant-1',
    email: 'learner@example.com',
    roles: [RoleName.STUDENT],
  };

  const makePrisma = () => {
    const prisma = {
      category: { findFirst: jest.fn() },
      course: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findFirstOrThrow: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      libraryItem: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      module: { findFirst: jest.fn(), create: jest.fn() },
      courseLesson: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      timerConfiguration: { findFirst: jest.fn(), create: jest.fn() },
      lessonTimer: {
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      timerAttachment: { deleteMany: jest.fn(), create: jest.fn() },
      videoAsset: { findFirst: jest.fn(), create: jest.fn() },
      videoAccessToken: { findFirst: jest.fn(), create: jest.fn() },
      watermarkSession: { create: jest.fn() },
      fileAsset: { findFirst: jest.fn(), create: jest.fn() },
      lessonFile: { create: jest.fn() },
      documentAccessToken: { findFirst: jest.fn(), create: jest.fn() },
      enrollment: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      lessonProgress: {
        upsert: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      courseProgress: { upsert: jest.fn() },
      courseAnalytics: { upsert: jest.fn() },
      lessonAnalytics: { upsert: jest.fn() },
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
      },
      report: { create: jest.fn() },
      tenant: { findFirst: jest.fn() },
      customDomain: { findFirst: jest.fn() },
      timerSession: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      timerRoundLog: { upsert: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((operation: unknown) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      return (operation as (tx: typeof prisma) => unknown)(prisma);
    });
    return prisma;
  };

  const makeService = () => {
    const prisma = makePrisma();
    return {
      prisma,
      service: new WorkflowsService(prisma as unknown as PrismaService),
    };
  };

  it('rejects a course category owned by another tenant', async () => {
    const { prisma, service } = makeService();
    prisma.category.findFirst.mockResolvedValue(null);
    await expect(
      service.createCourse(instructor, {
        title: 'Course',
        slug: 'course',
        categoryId: 'foreign-category',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates courses with tenant scope and converts price cents to currency units', async () => {
    const { prisma, service } = makeService();
    prisma.course.findUnique.mockResolvedValue(null);
    prisma.course.create.mockResolvedValue({ id: 'course-1' });
    await service.createCourse(instructor, {
      title: 'Course',
      slug: ' My-Course ',
      priceCents: 1299,
      currency: 'EUR',
    });
    const call = prisma.course.create.mock.calls[0]?.[0];
    expect(call?.data.tenantId).toBe('tenant-1');
    expect(call?.data.slug).toBe('my-course');
    expect(call?.data.price).toEqual(new Prisma.Decimal(12.99));
  });

  it('checks duplicate course slugs after normalization', async () => {
    const { prisma, service } = makeService();
    prisma.course.findUnique.mockResolvedValue({ id: 'existing-course' });

    await expect(
      service.createCourse(instructor, {
        title: 'Course',
        slug: ' Existing-Course ',
      }),
    ).rejects.toThrow('A course with this slug already exists');
    expect(prisma.course.findUnique).toHaveBeenCalledWith({
      where: {
        tenantId_slug: { tenantId: 'tenant-1', slug: 'existing-course' },
      },
    });
    expect(prisma.course.create).not.toHaveBeenCalled();
  });

  it('updates library items without passing the DTO-only tags field to Prisma', async () => {
    const { prisma, service } = makeService();
    prisma.libraryItem.findFirst.mockResolvedValue({ id: 'library-1' });
    prisma.libraryItem.update.mockResolvedValue({ id: 'library-1' });
    await service.updateLibraryItem(instructor, 'library-1', {
      title: 'Updated',
      type: 'lesson',
      tags: ['mobility'],
    });
    const data = prisma.libraryItem.update.mock.calls[0]?.[0].data as Record<
      string,
      unknown
    >;
    expect(data.tags).toBeUndefined();
    expect(data.tagsJson).toEqual(['mobility']);
  });

  it('filters the reusable library by type, tag, and duration', async () => {
    const { prisma, service } = makeService();
    prisma.libraryItem.findMany.mockResolvedValue([]);
    await service.library(
      instructor,
      'warmup',
      'exercise',
      'mobility',
      '30',
      '90',
    );
    expect(prisma.libraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          type: 'exercise',
          tagsJson: { array_contains: ['mobility'] },
          duration: { gte: 30, lte: 90 },
        }),
      }),
    );
  });

  it('validates timer configuration and replaces a lesson timer attachment', async () => {
    const { prisma, service } = makeService();
    await expect(
      Promise.resolve().then(() =>
        service.createTimer(instructor, { type: 'COUNTDOWN' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.timerConfiguration.create.mockResolvedValue({ id: 'timer-1' });
    await service.createTimer(instructor, {
      type: 'COUNTDOWN',
      duration: 60,
    });
    expect(prisma.timerConfiguration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: 'tenant-1' }),
      }),
    );

    prisma.courseLesson.findFirst.mockResolvedValue({ id: 'lesson-1' });
    prisma.timerConfiguration.findFirst.mockResolvedValue({ id: 'timer-1' });
    prisma.lessonTimer.create.mockResolvedValue({
      lessonId: 'lesson-1',
      timerId: 'timer-1',
    });
    await service.attachTimer(instructor, 'lesson-1', 'timer-1');
    expect(prisma.lessonTimer.deleteMany).toHaveBeenCalledWith({
      where: { lessonId: 'lesson-1' },
    });
    expect(prisma.lessonTimer.create).toHaveBeenCalledWith({
      data: { lessonId: 'lesson-1', timerId: 'timer-1' },
    });
  });

  it('allows guests to create playback sessions only for published free previews', async () => {
    const { prisma, service } = makeService();
    prisma.videoAsset.findFirst.mockResolvedValue({
      id: 'video-1',
      processingStatus: 'READY',
    });
    prisma.videoAccessToken.create.mockResolvedValue({});
    const result = await service.createPublicVideoAccess(
      'ada-maths',
      'video-1',
    );
    expect(result.playbackPath).toContain(
      '/public/ada-maths/videos/video-1/playback',
    );
    expect(prisma.videoAccessToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ videoId: 'video-1' }),
      }),
    );
  });

  it('requires active enrollment for learner video playback', async () => {
    const { prisma, service } = makeService();
    prisma.videoAsset.findFirst.mockResolvedValue(null);
    await expect(
      service.createVideoAccess(learner, 'paid-video'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists progress and recalculates course analytics', async () => {
    const { prisma, service } = makeService();
    prisma.courseLesson.findFirst.mockResolvedValue({ courseId: 'course-1' });
    prisma.lessonProgress.upsert.mockResolvedValue({
      lessonId: 'lesson-1',
      completed: true,
    });
    prisma.courseLesson.count.mockResolvedValue(4);
    prisma.lessonProgress.count.mockResolvedValue(2);
    prisma.lessonProgress.aggregate.mockResolvedValue({
      _avg: { watchedSeconds: 42 },
    });
    prisma.enrollment.count.mockResolvedValue(3);
    prisma.courseProgress.upsert.mockResolvedValue({ percentage: 50 });
    prisma.courseAnalytics.upsert.mockResolvedValue({ courseId: 'course-1' });
    prisma.lessonAnalytics.upsert.mockResolvedValue({ lessonId: 'lesson-1' });

    await expect(
      service.updateProgress(learner, 'lesson-1', {
        watchedSeconds: 42,
        completed: true,
      }),
    ).resolves.toEqual({ lessonId: 'lesson-1', completed: true });
    expect(prisma.courseProgress.upsert).toHaveBeenCalled();
    expect(prisma.courseAnalytics.upsert).toHaveBeenCalled();
    expect(prisma.lessonAnalytics.upsert).toHaveBeenCalled();
  });

  it('prevents learners from starting unattached timers', async () => {
    const { prisma, service } = makeService();
    prisma.timerConfiguration.findFirst.mockResolvedValue({
      id: 'timer-1',
      type: 'COUNTDOWN',
      duration: 60,
      lessons: [{ lesson: { courseId: 'course-1' } }],
      attachments: [],
    });
    prisma.enrollment.findFirst.mockResolvedValue(null);
    await expect(service.startTimer(learner, 'timer-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('scopes reports to content owned by the current tenant', async () => {
    const { prisma, service } = makeService();
    prisma.course.findFirst.mockResolvedValue(null);
    await expect(
      service.createReport(learner, {
        entityType: 'COURSE',
        entityId: 'foreign-course',
        reason: 'Problematic content',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and lists instructor courses within the tenant', async () => {
    const { prisma, service } = makeService();
    prisma.course.findFirstOrThrow.mockResolvedValue({ id: 'course-1' });
    prisma.course.findFirst.mockResolvedValue(null);
    prisma.course.update.mockResolvedValue({
      id: 'course-1',
      slug: 'new-slug',
    });
    await expect(
      service.updateCourse(instructor, 'course-1', {
        slug: ' New-Slug ',
        priceCents: 2500,
      }),
    ).resolves.toEqual({ id: 'course-1', slug: 'new-slug' });
    prisma.course.findMany.mockResolvedValue([]);
    await service.listInstructorCourses(instructor);
    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
  });

  it('publishes, archives, and unpublishes courses and notifies opted-in learners', async () => {
    const { prisma, service } = makeService();
    const builder = {
      id: 'course-1',
      title: 'Course',
      modules: [],
      lessons: [],
    };
    prisma.course.findFirstOrThrow.mockResolvedValue(builder);
    prisma.course.update.mockResolvedValue({ ...builder, status: 'PUBLISHED' });
    prisma.enrollment.findMany.mockResolvedValue([
      { studentId: 'learner-1', student: { notificationPreference: null } },
      {
        studentId: 'learner-2',
        student: { notificationPreference: { contentPublished: false } },
      },
    ]);
    await service.publishCourse(instructor, 'course-1');
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'learner-1' })],
    });
    await service.archiveCourse(instructor, 'course-1');
    await service.unpublishCourse(instructor, 'course-1');
    expect(prisma.course.update).toHaveBeenCalledTimes(3);
  });

  it('duplicates module and root lessons without sharing course records', async () => {
    const { prisma, service } = makeService();
    prisma.course.findFirstOrThrow.mockResolvedValue({
      id: 'course-1',
      title: 'Course',
      slug: 'course',
      description: null,
      thumbnailUrl: null,
      level: null,
      language: 'en',
      price: null,
      currency: 'EUR',
      billingType: 'ONE_TIME',
      modules: [
        {
          title: 'Week 1',
          description: null,
          orderIndex: 0,
          scheduleLabel: 'Week 1',
          isRestDay: false,
          lessons: [
            { libraryItemId: 'library-1', orderIndex: 0, isFreePreview: true },
          ],
        },
      ],
      lessons: [
        { libraryItemId: 'library-2', orderIndex: 1, isFreePreview: false },
      ],
    });
    prisma.course.create.mockResolvedValue({ id: 'copy-1' });
    prisma.module.create.mockResolvedValue({ id: 'module-copy-1' });
    prisma.courseLesson.create.mockResolvedValue({ id: 'lesson-copy' });
    await service.duplicateCourse(instructor, 'course-1');
    expect(prisma.courseLesson.create).toHaveBeenCalledTimes(2);
  });

  it('adds modules and reusable lessons only when their parents belong to the tenant', async () => {
    const { prisma, service } = makeService();
    prisma.course.findFirstOrThrow.mockResolvedValue({
      id: 'course-1',
      modules: [],
      lessons: [],
    });
    prisma.module.create.mockResolvedValue({ id: 'module-1' });
    await service.addModule(instructor, 'course-1', {
      title: 'Week 1',
      orderIndex: 0,
    });
    prisma.libraryItem.findFirst.mockResolvedValue({ id: 'library-1' });
    prisma.module.findFirst.mockResolvedValue({ id: 'module-1' });
    prisma.courseLesson.create.mockResolvedValue({ id: 'lesson-1' });
    await service.addLesson(instructor, 'course-1', {
      libraryItemId: 'library-1',
      moduleId: 'module-1',
      orderIndex: 0,
    });
    expect(prisma.courseLesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ courseId: 'course-1' }),
      }),
    );
  });

  it('attaches timers at module and course scope with tenant checks', async () => {
    const { prisma, service } = makeService();
    prisma.module.findFirst.mockResolvedValue({ id: 'module-1' });
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    prisma.timerConfiguration.findFirst.mockResolvedValue({ id: 'timer-1' });
    prisma.timerAttachment.create.mockResolvedValue({ id: 'attachment-1' });
    await service.attachTimerToModule(instructor, 'module-1', 'timer-1');
    await service.attachTimerToCourse(instructor, 'course-1', 'timer-1');
    expect(prisma.timerAttachment.deleteMany).toHaveBeenCalledTimes(2);
  });

  it('creates reusable lessons and validates streaming video URLs', async () => {
    const { prisma, service } = makeService();
    prisma.libraryItem.create.mockResolvedValue({ id: 'library-1' });
    await service.createLibraryItem(instructor, {
      title: 'Warmup',
      type: 'exercise',
      tags: ['mobility'],
    });
    prisma.courseLesson.findFirst.mockResolvedValue(null);
    await expect(
      service.addVideo(instructor, 'lesson-1', {
        fileName: 'video.mp4',
        videoUrl: 'https://cdn.example.com/video.mp4',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.courseLesson.findFirst.mockResolvedValue({ id: 'lesson-1' });
    await expect(
      service.addVideo(instructor, 'lesson-1', {
        fileName: 'video.mp4',
        videoUrl: 'https://cdn.example.com/video.mp4',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    prisma.videoAsset.create.mockResolvedValue({ id: 'video-1' });
    await expect(
      service.addVideo(instructor, 'lesson-1', {
        fileName: 'video.m3u8',
        videoUrl: 'https://cdn.example.com/video.m3u8',
      }),
    ).resolves.toEqual({ id: 'video-1' });
  });

  it('creates protected lesson files and short-lived document viewer sessions', async () => {
    const { prisma, service } = makeService();
    prisma.courseLesson.findFirst.mockResolvedValue({ id: 'lesson-1' });
    prisma.fileAsset.create.mockResolvedValue({ id: 'file-1' });
    prisma.lessonFile.create.mockResolvedValue({ id: 'lesson-file-1' });
    await service.addFile(instructor, 'lesson-1', {
      name: 'handout.pdf',
      url: 'https://storage.example.com/handout.pdf',
      type: 'DOCUMENT',
      size: 100,
    });
    prisma.fileAsset.findFirst.mockResolvedValue({ id: 'file-1' });
    prisma.documentAccessToken.create.mockResolvedValue({});
    const access = await service.createDocumentAccess(learner, 'file-1');
    expect(access.viewerPath).toContain('/learning/documents/file-1/viewer');

    prisma.documentAccessToken.findFirst.mockResolvedValue({
      expiresAt: new Date(Date.now() + 10_000),
      watermarkText: 'learner@example.com',
      file: {
        url: 'https://storage.example.com/handout.pdf',
        name: 'handout.pdf',
        mimeType: 'application/pdf',
      },
    });
    await expect(
      service.resolveDocumentAccess(learner, 'file-1', 'token-1'),
    ).resolves.toEqual(expect.objectContaining({ viewOnly: true }));
  });

  it('returns learner course data and counts a course view', async () => {
    const { prisma, service } = makeService();
    prisma.enrollment.findMany.mockResolvedValue([]);
    await service.myLearning(learner);
    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { studentId: 'learner-1', status: 'ACTIVE' },
      }),
    );

    prisma.enrollment.findFirst.mockResolvedValue({
      course: { id: 'course-1' },
    });
    prisma.enrollment.count.mockResolvedValue(1);
    prisma.courseAnalytics.upsert.mockResolvedValue({});
    await service.learningCourse(learner, 'course-1');
    expect(prisma.courseAnalytics.upsert).toHaveBeenCalled();
  });

  it('serves public tenant sites, domains, catalogs, and preview lessons', async () => {
    const { prisma, service } = makeService();
    prisma.tenant.findFirst.mockResolvedValue({ slug: 'ada-maths' });
    jest
      .spyOn(service, 'publicSite')
      .mockResolvedValue({ slug: 'ada-maths' } as never);
    await expect(
      service.publicSiteByDomain(' Coach.Example.com '),
    ).resolves.toEqual({ slug: 'ada-maths' });
    prisma.course.findMany.mockResolvedValue([]);
    await service.publicCatalog('ada-maths');
    prisma.course.findFirst.mockResolvedValue({ id: 'course-1' });
    await expect(service.publicCourse('ada-maths', 'course')).resolves.toEqual({
      id: 'course-1',
    });
    expect(prisma.course.findMany).toHaveBeenCalled();
  });

  it('lists and marks owned notifications read', async () => {
    const { prisma, service } = makeService();
    prisma.notification.findMany.mockResolvedValue([]);
    await service.notifications(learner);
    prisma.notification.findFirst.mockResolvedValue({ id: 'notification-1' });
    prisma.notification.update.mockResolvedValue({
      id: 'notification-1',
      isRead: true,
    });
    await expect(
      service.readNotification(learner, 'notification-1'),
    ).resolves.toEqual({
      id: 'notification-1',
      isRead: true,
    });
  });

  it('exports tenant enrollment and engagement analytics', async () => {
    const { prisma, service } = makeService();
    prisma.enrollment.findMany.mockResolvedValue([]);
    await service.enrollmentReport(instructor);
    prisma.course.findMany.mockResolvedValue([]);
    await expect(service.analytics(instructor)).resolves.toEqual(
      expect.objectContaining({ courses: [] }),
    );
  });

  it('resolves paid and guest playback tokens with their ownership rules', async () => {
    const { prisma, service } = makeService();
    const expiresAt = new Date(Date.now() + 10_000);
    prisma.videoAccessToken.findFirst.mockResolvedValue({
      expiresAt,
      video: { videoUrl: 'https://cdn.example.com/video.m3u8' },
    });
    await expect(
      service.resolveVideoAccess('video-1', 'token-1', 'learner-1'),
    ).resolves.toEqual({
      streamUrl: 'https://cdn.example.com/video.m3u8',
      expiresAt,
    });
    await expect(
      service.resolvePublicVideoAccess('ada-maths', 'video-1', 'token-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        streamUrl: 'https://cdn.example.com/video.m3u8',
      }),
    );
  });

  it('starts, resumes, finishes, and logs persistent timer sessions', async () => {
    const { prisma, service } = makeService();
    prisma.timerConfiguration.findFirst.mockResolvedValue({
      id: 'timer-1',
      type: 'COUNTDOWN',
      duration: 60,
      lessons: [{ lesson: { courseId: 'course-1' } }],
      attachments: [],
    });
    prisma.enrollment.findFirst.mockResolvedValue({ id: 'enrollment-1' });
    prisma.timerSession.create.mockResolvedValue({ id: 'session-1' });
    await service.startTimer(learner, 'timer-1');
    prisma.timerSession.findFirst.mockResolvedValue({
      id: 'session-1',
      userId: 'learner-1',
      timerId: 'timer-1',
      elapsedSeconds: 5,
      remainingSeconds: 55,
    });
    prisma.timerSession.update.mockResolvedValue({
      id: 'session-1',
      completedAt: null,
    });
    await service.getTimerSession(learner, 'session-1');
    await service.timerAction(learner, 'session-1', 'pause', {
      elapsedSeconds: 10,
      remainingSeconds: 50,
    });
    prisma.timerRoundLog.upsert.mockResolvedValue({
      sessionId: 'session-1',
      roundNumber: 1,
    });
    await service.logRound(learner, 'session-1', {
      roundNumber: 1,
      value: '8',
    });
    expect(prisma.timerRoundLog.upsert).toHaveBeenCalled();
  });
});
