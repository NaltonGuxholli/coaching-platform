import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '../generated/prisma/client';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import type {
  AddLessonDto,
  CreateCourseDto,
  CreateLibraryItemDto,
  CreateModuleDto,
  ProgressDto,
  RoundLogDto,
  UpdateCourseDto,
  CreateReportDto,
  CreateVideoAssetDto,
  CreateFileAssetDto,
  EngagementDto,
  TimerStateDto,
} from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  async createCourse(user: AuthenticatedUser, dto: CreateCourseDto) {
    const slug = dto.slug.trim().toLowerCase();
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, tenantId: user.tenantId },
      });
      if (!category) throw new NotFoundException('Category was not found');
    }
    const existing = await this.prisma.course.findUnique({
      where: { tenantId_slug: { tenantId: user.tenantId, slug } },
    });
    if (existing)
      throw new ConflictException('A course with this slug already exists');
    return this.prisma.course.create({
      data: {
        tenantId: user.tenantId,
        title: dto.title,
        slug,
        description: dto.description,
        categoryId: dto.categoryId,
        level: dto.level,
        language: dto.language,
        thumbnailUrl: dto.thumbnailUrl,
        price:
          dto.priceCents === undefined
            ? undefined
            : new Prisma.Decimal(dto.priceCents).div(100),
        currency: dto.currency,
        billingType: dto.billingType,
        status: 'DRAFT',
      },
    });
  }

  async updateCourse(
    user: AuthenticatedUser,
    courseId: string,
    dto: UpdateCourseDto,
  ) {
    await this.courseBuilder(user, courseId);
    if (dto.slug) {
      dto.slug = dto.slug.trim().toLowerCase();
      const duplicate = await this.prisma.course.findFirst({
        where: {
          tenantId: user.tenantId,
          slug: dto.slug,
          NOT: { id: courseId },
        },
      });
      if (duplicate)
        throw new ConflictException('A course with this slug already exists');
    }
    const { priceCents, ...data } = dto;
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        ...data,
        price:
          priceCents === undefined
            ? undefined
            : new Prisma.Decimal(priceCents).div(100),
      },
    });
  }

  listInstructorCourses(user: AuthenticatedUser) {
    return this.prisma.course.findMany({
      where: { tenantId: user.tenantId },
      include: {
        _count: { select: { modules: true, lessons: true, enrollments: true } },
        analytics: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async courseBuilder(user: AuthenticatedUser, courseId: string) {
    return this.prisma.course.findFirstOrThrow({
      where: { id: courseId, tenantId: user.tenantId },
      include: {
        modules: {
          include: {
            timerAttachments: { include: { timer: true } },
            lessons: {
              include: {
                libraryItem: true,
                tags: { include: { tag: true } },
                videos: true,
                files: { include: { file: true } },
                timers: { include: { timer: true } },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        lessons: {
          where: { moduleId: null },
          include: { libraryItem: true, timers: { include: { timer: true } } },
          orderBy: { orderIndex: 'asc' },
        },
        timerAttachments: { include: { timer: true } },
      },
    });
  }

  coursePreview(user: AuthenticatedUser, courseId: string) {
    return this.courseBuilder(user, courseId);
  }

  async publishCourse(user: AuthenticatedUser, courseId: string) {
    await this.courseBuilder(user, courseId);
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), archivedAt: null },
    });
    const learners = await this.prisma.enrollment.findMany({
      where: { courseId, status: 'ACTIVE' },
      select: {
        studentId: true,
        student: {
          select: {
            notificationPreference: { select: { contentPublished: true } },
          },
        },
      },
    });
    const optedInLearners = learners.filter(
      ({ student }) =>
        student.notificationPreference?.contentPublished !== false,
    );
    if (optedInLearners.length) {
      await this.prisma.notification.createMany({
        data: optedInLearners.map(({ studentId }) => ({
          userId: studentId,
          title: 'New content is available',
          message: `New content has been published in ${course.title}.`,
          type: 'COURSE_PUBLISHED',
        })),
      });
    }
    return course;
  }
  async archiveCourse(user: AuthenticatedUser, courseId: string) {
    await this.courseBuilder(user, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });
  }
  async unpublishCourse(user: AuthenticatedUser, courseId: string) {
    await this.courseBuilder(user, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: { status: 'DRAFT', publishedAt: null },
    });
  }
  async duplicateCourse(user: AuthenticatedUser, courseId: string) {
    const source = await this.courseBuilder(user, courseId);
    return this.prisma.$transaction(async (tx) => {
      const copy = await tx.course.create({
        data: {
          tenantId: user.tenantId,
          title: `${source.title} (copy)`,
          slug: `${source.slug}-copy-${Date.now()}`,
          description: source.description,
          thumbnailUrl: source.thumbnailUrl,
          level: source.level,
          language: source.language,
          price: source.price,
          currency: source.currency,
          billingType: source.billingType,
          status: 'DRAFT',
        },
      });
      for (const module of source.modules) {
        const newModule = await tx.module.create({
          data: {
            courseId: copy.id,
            title: module.title,
            description: module.description,
            orderIndex: module.orderIndex,
            scheduleLabel: module.scheduleLabel,
            isRestDay: module.isRestDay,
          },
        });
        for (const lesson of module.lessons)
          await tx.courseLesson.create({
            data: {
              courseId: copy.id,
              moduleId: newModule.id,
              libraryItemId: lesson.libraryItemId,
              orderIndex: lesson.orderIndex,
              isFreePreview: lesson.isFreePreview,
            },
          });
      }
      for (const lesson of source.lessons) {
        await tx.courseLesson.create({
          data: {
            courseId: copy.id,
            libraryItemId: lesson.libraryItemId,
            orderIndex: lesson.orderIndex,
            isFreePreview: lesson.isFreePreview,
          },
        });
      }
      return copy;
    });
  }

  async addModule(
    user: AuthenticatedUser,
    courseId: string,
    dto: CreateModuleDto,
  ) {
    await this.courseBuilder(user, courseId);
    return this.prisma.module.create({ data: { courseId, ...dto } });
  }
  async addLesson(
    user: AuthenticatedUser,
    courseId: string,
    dto: AddLessonDto,
  ) {
    await this.courseBuilder(user, courseId);
    const item = await this.prisma.libraryItem.findFirst({
      where: { id: dto.libraryItemId, tenantId: user.tenantId },
    });
    if (!item) throw new NotFoundException('Library item was not found');
    if (
      dto.moduleId &&
      !(await this.prisma.module.findFirst({
        where: { id: dto.moduleId, courseId },
      }))
    )
      throw new NotFoundException('Module was not found');
    return this.prisma.courseLesson.create({ data: { courseId, ...dto } });
  }

  createTimer(
    user: AuthenticatedUser,
    dto: import('./dto/workflow.dto').CreateTimerDto,
  ) {
    if (
      ['COUNTDOWN', 'INTERVAL', 'AMRAP'].includes(dto.type) &&
      dto.duration === undefined
    ) {
      throw new BadRequestException(`${dto.type} timers require a duration`);
    }
    if (dto.type === 'CIRCUIT' && dto.rounds === undefined) {
      throw new BadRequestException('Circuit timers require a round count');
    }
    return this.prisma.timerConfiguration.create({
      data: {
        tenantId: user.tenantId,
        ...dto,
        alertPointsJson: dto.alertPointsJson as
          Prisma.InputJsonValue | undefined,
      },
    });
  }

  async attachTimer(
    user: AuthenticatedUser,
    lessonId: string,
    timerId: string,
  ) {
    const [lesson, timer] = await Promise.all([
      this.prisma.courseLesson.findFirst({
        where: { id: lessonId, course: { tenantId: user.tenantId } },
      }),
      this.prisma.timerConfiguration.findFirst({
        where: { id: timerId, tenantId: user.tenantId },
      }),
    ]);
    if (!lesson || !timer)
      throw new NotFoundException('Lesson or timer was not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.lessonTimer.deleteMany({ where: { lessonId } });
      return tx.lessonTimer.create({ data: { lessonId, timerId } });
    });
  }

  async attachTimerToModule(
    user: AuthenticatedUser,
    moduleId: string,
    timerId: string,
  ) {
    const [module, timer] = await Promise.all([
      this.prisma.module.findFirst({
        where: { id: moduleId, course: { tenantId: user.tenantId } },
      }),
      this.prisma.timerConfiguration.findFirst({
        where: { id: timerId, tenantId: user.tenantId },
      }),
    ]);
    if (!module || !timer)
      throw new NotFoundException('Module or timer was not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.timerAttachment.deleteMany({ where: { moduleId } });
      return tx.timerAttachment.create({ data: { moduleId, timerId } });
    });
  }

  async attachTimerToCourse(
    user: AuthenticatedUser,
    courseId: string,
    timerId: string,
  ) {
    const [course, timer] = await Promise.all([
      this.prisma.course.findFirst({
        where: { id: courseId, tenantId: user.tenantId },
      }),
      this.prisma.timerConfiguration.findFirst({
        where: { id: timerId, tenantId: user.tenantId },
      }),
    ]);
    if (!course || !timer)
      throw new NotFoundException('Course or timer was not found');
    return this.prisma.$transaction(async (tx) => {
      await tx.timerAttachment.deleteMany({ where: { courseId } });
      return tx.timerAttachment.create({ data: { courseId, timerId } });
    });
  }

  library(
    user: AuthenticatedUser,
    search?: string,
    type?: string,
    tag?: string,
    minDuration?: string,
    maxDuration?: string,
  ) {
    const minimumDuration = minDuration ? Number(minDuration) : undefined;
    const maximumDuration = maxDuration ? Number(maxDuration) : undefined;
    if (
      (minimumDuration !== undefined && !Number.isInteger(minimumDuration)) ||
      (maximumDuration !== undefined && !Number.isInteger(maximumDuration))
    ) {
      throw new BadRequestException('Duration filters must be whole numbers');
    }
    return this.prisma.libraryItem.findMany({
      where: {
        tenantId: user.tenantId,
        ...(type ? { type } : {}),
        ...(tag ? { tagsJson: { array_contains: [tag] } } : {}),
        ...(minimumDuration !== undefined || maximumDuration !== undefined
          ? {
              duration: {
                ...(minimumDuration !== undefined
                  ? { gte: minimumDuration }
                  : {}),
                ...(maximumDuration !== undefined
                  ? { lte: maximumDuration }
                  : {}),
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { description: { contains: search } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { courseLessons: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  createLibraryItem(user: AuthenticatedUser, dto: CreateLibraryItemDto) {
    return this.prisma.libraryItem.create({
      data: {
        tenantId: user.tenantId,
        createdBy: user.id,
        title: dto.title,
        type: dto.type,
        description: dto.description,
        instructions: dto.instructions,
        difficulty: dto.difficulty,
        duration: dto.duration,
        tagsJson: dto.tags ?? [],
        metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
  }
  async updateLibraryItem(
    user: AuthenticatedUser,
    id: string,
    dto: CreateLibraryItemDto,
  ) {
    const item = await this.prisma.libraryItem.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!item) throw new NotFoundException('Library item was not found');
    return this.prisma.libraryItem.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type,
        description: dto.description,
        instructions: dto.instructions,
        difficulty: dto.difficulty,
        duration: dto.duration,
        tagsJson: dto.tags,
        metadataJson: dto.metadataJson as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async addVideo(
    user: AuthenticatedUser,
    lessonId: string,
    dto: CreateVideoAssetDto,
  ) {
    const lesson = await this.prisma.courseLesson.findFirst({
      where: { id: lessonId, course: { tenantId: user.tenantId } },
    });
    if (!lesson) throw new NotFoundException('Lesson was not found');
    if (
      !/^https?:\/\//i.test(dto.videoUrl) ||
      !/(\.m3u8|\.mpd)(\?|$)/i.test(dto.videoUrl)
    ) {
      throw new BadRequestException(
        'videoUrl must be an HLS (.m3u8) or DASH (.mpd) streaming URL',
      );
    }
    return this.prisma.videoAsset.create({
      data: {
        lessonId,
        fileName: dto.fileName,
        videoUrl: dto.videoUrl,
        thumbnailUrl: dto.thumbnailUrl,
        duration: dto.duration,
        resolution: dto.resolution,
        streamingFormat: dto.streamingFormat ?? 'HLS',
        drmEnabled: dto.drmEnabled ?? false,
        captionsUrl: dto.captionsUrl,
        transcript: dto.transcript,
        processingStatus: 'READY',
      },
    });
  }

  async addFile(
    user: AuthenticatedUser,
    lessonId: string,
    dto: CreateFileAssetDto,
  ) {
    const lesson = await this.prisma.courseLesson.findFirst({
      where: { id: lessonId, course: { tenantId: user.tenantId } },
    });
    if (!lesson) throw new NotFoundException('Lesson was not found');
    return this.prisma.$transaction(async (tx) => {
      const file = await tx.fileAsset.create({
        data: {
          tenantId: user.tenantId,
          uploadedBy: user.id,
          name: dto.name,
          url: dto.url,
          type: dto.type,
          mimeType: dto.mimeType,
          size: BigInt(dto.size),
          isProtected: dto.isProtected ?? true,
        },
      });
      await tx.lessonFile.create({ data: { lessonId, fileId: file.id } });
      return file;
    });
  }

  async createDocumentAccess(user: AuthenticatedUser, fileId: string) {
    const file = await this.prisma.fileAsset.findFirst({
      where: {
        id: fileId,
        lessons: {
          some: {
            lesson: {
              course: {
                enrollments: { some: { studentId: user.id, status: 'ACTIVE' } },
              },
            },
          },
        },
      },
    });
    if (!file) throw new NotFoundException('Enrolled document was not found');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const watermarkText = `${user.email} · ${new Date().toISOString()}`;
    await this.prisma.documentAccessToken.create({
      data: { userId: user.id, fileId, token, watermarkText, expiresAt },
    });
    return {
      token,
      expiresAt,
      watermarkText,
      viewerPath: `/learning/documents/${fileId}/viewer?token=${encodeURIComponent(token)}`,
    };
  }

  async resolveDocumentAccess(
    user: AuthenticatedUser,
    fileId: string,
    token: string,
  ) {
    const access = await this.prisma.documentAccessToken.findFirst({
      where: { fileId, token, userId: user.id, expiresAt: { gt: new Date() } },
      include: { file: { select: { url: true, name: true, mimeType: true } } },
    });
    if (!access)
      throw new NotFoundException('Document access link is invalid or expired');
    return {
      ...access.file,
      expiresAt: access.expiresAt,
      watermarkText: access.watermarkText,
      viewOnly: true,
    };
  }

  async updateProgress(
    user: AuthenticatedUser,
    lessonId: string,
    dto: ProgressDto,
  ) {
    const lesson = await this.prisma.courseLesson.findFirst({
      where: {
        id: lessonId,
        course: {
          enrollments: { some: { studentId: user.id, status: 'ACTIVE' } },
        },
      },
      select: { courseId: true },
    });
    if (!lesson) throw new NotFoundException('Enrolled lesson was not found');
    return this.prisma.$transaction(async (tx) => {
      const progress = await tx.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId: user.id, lessonId } },
        create: {
          studentId: user.id,
          lessonId,
          watchedSeconds: dto.watchedSeconds,
          completed: dto.completed,
          completedAt: dto.completed ? new Date() : null,
        },
        update: {
          watchedSeconds: dto.watchedSeconds,
          completed: dto.completed,
          completedAt: dto.completed ? new Date() : null,
        },
      });
      const [total, completed] = await Promise.all([
        tx.courseLesson.count({ where: { courseId: lesson.courseId } }),
        tx.lessonProgress.count({
          where: {
            studentId: user.id,
            completed: true,
            lesson: { courseId: lesson.courseId },
          },
        }),
      ]);
      await tx.courseProgress.upsert({
        where: {
          studentId_courseId: { studentId: user.id, courseId: lesson.courseId },
        },
        create: {
          studentId: user.id,
          courseId: lesson.courseId,
          percentage: total ? (completed / total) * 100 : 0,
          lastLessonId: lessonId,
        },
        update: {
          percentage: total ? (completed / total) * 100 : 0,
          lastLessonId: lessonId,
        },
      });
      const [watchTime, enrollmentCount] = await Promise.all([
        tx.lessonProgress.aggregate({
          where: { lesson: { courseId: lesson.courseId } },
          _avg: { watchedSeconds: true },
        }),
        tx.enrollment.count({
          where: { courseId: lesson.courseId, status: 'ACTIVE' },
        }),
      ]);
      await tx.courseAnalytics.upsert({
        where: { courseId: lesson.courseId },
        create: {
          courseId: lesson.courseId,
          enrollments: enrollmentCount,
          completionRate: total ? (completed / total) * 100 : 0,
          averageWatchTime: watchTime._avg.watchedSeconds ?? 0,
        },
        update: {
          enrollments: enrollmentCount,
          completionRate: total ? (completed / total) * 100 : 0,
          averageWatchTime: watchTime._avg.watchedSeconds ?? 0,
        },
      });
      await tx.lessonAnalytics.upsert({
        where: { lessonId },
        create: {
          lessonId,
          views: 1,
          completedViews: dto.completed ? 1 : 0,
          totalWatchSeconds: BigInt(dto.watchedSeconds),
        },
        update: {
          views: { increment: 1 },
          completedViews: dto.completed ? { increment: 1 } : undefined,
          totalWatchSeconds: { increment: BigInt(dto.watchedSeconds) },
        },
      });
      return progress;
    });
  }

  async recordEngagement(
    user: AuthenticatedUser,
    lessonId: string,
    dto: EngagementDto,
  ) {
    return this.updateProgress(user, lessonId, {
      watchedSeconds: dto.watchedSeconds ?? 0,
      completed: dto.completed ?? false,
    });
  }

  myLearning(user: AuthenticatedUser) {
    return this.prisma.enrollment.findMany({
      where: { studentId: user.id, status: 'ACTIVE' },
      include: {
        course: {
          include: {
            progressRecords: { where: { studentId: user.id } },
            _count: { select: { lessons: true } },
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }
  async learningCourse(user: AuthenticatedUser, courseId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: user.id, courseId, status: 'ACTIVE' },
      include: {
        course: {
          include: {
            modules: {
              include: {
                timerAttachments: { include: { timer: true } },
                lessons: {
                  include: {
                    libraryItem: true,
                    videos: {
                      select: {
                        id: true,
                        fileName: true,
                        thumbnailUrl: true,
                        duration: true,
                        resolution: true,
                        processingStatus: true,
                        streamingFormat: true,
                        drmEnabled: true,
                        captionsUrl: true,
                        transcript: true,
                      },
                    },
                    timers: { include: { timer: true } },
                    progress: { where: { studentId: user.id } },
                  },
                  orderBy: { orderIndex: 'asc' },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
            lessons: {
              where: { moduleId: null },
              include: {
                libraryItem: true,
                videos: {
                  select: {
                    id: true,
                    fileName: true,
                    thumbnailUrl: true,
                    duration: true,
                    resolution: true,
                    processingStatus: true,
                    streamingFormat: true,
                    drmEnabled: true,
                    captionsUrl: true,
                    transcript: true,
                  },
                },
                timers: { include: { timer: true } },
                progress: { where: { studentId: user.id } },
              },
              orderBy: { orderIndex: 'asc' },
            },
            timerAttachments: { include: { timer: true } },
          },
        },
      },
    });
    if (!enrollment)
      throw new NotFoundException('Enrolled course was not found');
    await this.prisma.courseAnalytics.upsert({
      where: { courseId },
      create: {
        courseId,
        views: 1,
        enrollments: await this.prisma.enrollment.count({
          where: { courseId, status: 'ACTIVE' },
        }),
      },
      update: { views: { increment: 1 } },
    });
    return enrollment;
  }

  async publicSite(tenantSlug: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        slug: true,
        subdomain: true,
        settings: {
          select: {
            brandName: true,
            browserTitle: true,
            logoUrl: true,
            faviconUrl: true,
            primaryColor: true,
            secondaryColor: true,
            tertiaryColor: true,
            backgroundColor: true,
            fontHeading: true,
            fontBody: true,
            logoLightUrl: true,
            logoDarkUrl: true,
            heroImageUrl: true,
            customCss: true,
            locale: true,
            baseTheme: { select: { id: true, name: true, tokenJson: true } },
            terminologyJson: true,
            pageSectionsJson: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Instructor site was not found');
    return tenant;
  }

  async publicSiteByDomain(domain: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        status: 'ACTIVE',
        domains: {
          some: { domain: domain.trim().toLowerCase(), verified: true },
        },
      },
      select: { slug: true },
    });
    if (!tenant)
      throw new NotFoundException('Verified instructor domain was not found');
    return this.publicSite(tenant.slug);
  }

  publicCatalog(tenantSlug: string) {
    return this.prisma.course.findMany({
      where: {
        status: 'PUBLISHED',
        tenant: { slug: tenantSlug, status: 'ACTIVE' },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        thumbnailUrl: true,
        level: true,
        language: true,
        price: true,
        currency: true,
        billingType: true,
        _count: { select: { lessons: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async publicCourse(tenantSlug: string, courseSlug: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        slug: courseSlug,
        status: 'PUBLISHED',
        tenant: { slug: tenantSlug, status: 'ACTIVE' },
      },
      include: {
        modules: {
          include: {
            lessons: {
              where: { isFreePreview: true },
              include: {
                libraryItem: true,
                videos: {
                  select: { id: true, thumbnailUrl: true, duration: true },
                },
              },
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
        lessons: {
          where: { moduleId: null, isFreePreview: true },
          include: {
            libraryItem: true,
            videos: {
              select: { id: true, thumbnailUrl: true, duration: true },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });
    if (!course) throw new NotFoundException('Published course was not found');
    return course;
  }

  notifications(user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async readNotification(user: AuthenticatedUser, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId: user.id },
    });
    if (!notification)
      throw new NotFoundException('Notification was not found');
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async createReport(user: AuthenticatedUser, dto: CreateReportDto) {
    const entityType = dto.entityType.trim().toUpperCase();
    const entityExists = entityType.includes('VIDEO')
      ? await this.prisma.videoAsset.findFirst({
          where: {
            id: dto.entityId,
            lesson: { course: { tenantId: user.tenantId } },
          },
        })
      : entityType.includes('LESSON')
        ? await this.prisma.courseLesson.findFirst({
            where: { id: dto.entityId, course: { tenantId: user.tenantId } },
          })
        : entityType.includes('COURSE')
          ? await this.prisma.course.findFirst({
              where: { id: dto.entityId, tenantId: user.tenantId },
            })
          : null;
    if (!entityExists) {
      throw new NotFoundException('Reportable content was not found');
    }
    return this.prisma.report.create({
      data: {
        reporterId: user.id,
        entityType,
        entityId: dto.entityId,
        reason: dto.reason,
        status: 'OPEN',
      },
    });
  }

  enrollmentReport(user: AuthenticatedUser) {
    return this.prisma.enrollment.findMany({
      where: { course: { tenantId: user.tenantId } },
      select: {
        enrolledAt: true,
        status: true,
        course: { select: { id: true, title: true, slug: true } },
        student: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    });
  }

  async analytics(user: AuthenticatedUser) {
    const courses = await this.prisma.course.findMany({
      where: { tenantId: user.tenantId },
      select: {
        id: true,
        title: true,
        status: true,
        price: true,
        currency: true,
        _count: { select: { enrollments: true, lessons: true } },
        analytics: true,
        lessons: {
          select: {
            id: true,
            orderIndex: true,
            libraryItem: { select: { title: true } },
            analytics: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { generatedAt: new Date(), courses };
  }

  async createVideoAccess(user: AuthenticatedUser, videoId: string) {
    const canPreviewTenantContent = user.roles.some((role) =>
      ['ADMIN', 'INSTRUCTOR'].includes(role),
    );
    const video = await this.prisma.videoAsset.findFirst({
      where: {
        id: videoId,
        lesson: {
          course: canPreviewTenantContent
            ? { tenantId: user.tenantId }
            : {
                enrollments: {
                  some: { studentId: user.id, status: 'ACTIVE' },
                },
              },
        },
      },
      select: { id: true, processingStatus: true },
    });
    if (!video) throw new NotFoundException('Enrolled video was not found');
    if (video.processingStatus !== 'READY') {
      throw new BadRequestException('Video processing is not complete');
    }
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const token = randomBytes(32).toString('base64url');
    const watermarkText = `${user.email} · ${new Date().toISOString()}`;
    await this.prisma.$transaction([
      this.prisma.videoAccessToken.create({
        data: { userId: user.id, videoId, token, expiresAt },
      }),
      this.prisma.watermarkSession.create({
        data: { userId: user.id, videoId, watermarkText },
      }),
    ]);
    return {
      token,
      expiresAt,
      watermarkText,
      playbackPath: `/learning/videos/${videoId}/playback?token=${encodeURIComponent(token)}`,
    };
  }

  async createPublicVideoAccess(tenantSlug: string, videoId: string) {
    const video = await this.prisma.videoAsset.findFirst({
      where: {
        id: videoId,
        lesson: {
          isFreePreview: true,
          course: {
            status: 'PUBLISHED',
            tenant: { slug: tenantSlug, status: 'ACTIVE' },
          },
        },
      },
      select: { id: true, processingStatus: true },
    });
    if (!video) throw new NotFoundException('Free preview video was not found');
    if (video.processingStatus !== 'READY') {
      throw new BadRequestException('Video processing is not complete');
    }
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const token = randomBytes(32).toString('base64url');
    await this.prisma.videoAccessToken.create({
      data: { videoId, token, expiresAt },
    });
    return {
      token,
      expiresAt,
      playbackPath: `/public/${tenantSlug}/videos/${videoId}/playback?token=${encodeURIComponent(token)}`,
    };
  }

  async resolveVideoAccess(videoId: string, token: string, userId?: string) {
    const access = await this.prisma.videoAccessToken.findFirst({
      where: {
        videoId,
        token,
        expiresAt: { gt: new Date() },
        ...(userId ? { userId } : { userId: null }),
      },
      include: { video: { select: { videoUrl: true } } },
    });
    if (!access)
      throw new NotFoundException('Video access link is invalid or expired');
    return { streamUrl: access.video.videoUrl, expiresAt: access.expiresAt };
  }

  async resolvePublicVideoAccess(
    tenantSlug: string,
    videoId: string,
    token: string,
  ) {
    const access = await this.prisma.videoAccessToken.findFirst({
      where: {
        videoId,
        token,
        userId: null,
        expiresAt: { gt: new Date() },
        video: {
          lesson: {
            isFreePreview: true,
            course: {
              status: 'PUBLISHED',
              tenant: { slug: tenantSlug, status: 'ACTIVE' },
            },
          },
        },
      },
      include: { video: { select: { videoUrl: true } } },
    });
    if (!access)
      throw new NotFoundException('Preview access link is invalid or expired');
    return { streamUrl: access.video.videoUrl, expiresAt: access.expiresAt };
  }
  async startTimer(user: AuthenticatedUser, timerId: string) {
    const timer = await this.prisma.timerConfiguration.findFirst({
      where: { id: timerId, tenantId: user.tenantId },
      include: {
        lessons: { include: { lesson: { select: { courseId: true } } } },
        attachments: true,
      },
    });
    if (!timer) throw new NotFoundException('Timer was not found');
    if (!user.roles.some((role) => ['ADMIN', 'INSTRUCTOR'].includes(role))) {
      const courseIds = [
        ...timer.lessons.map(({ lesson }) => lesson.courseId),
        ...timer.attachments.flatMap((attachment) =>
          attachment.courseId ? [attachment.courseId] : [],
        ),
      ];
      const moduleIds = timer.attachments.flatMap((attachment) =>
        attachment.moduleId ? [attachment.moduleId] : [],
      );
      const lessonIds = timer.attachments.flatMap((attachment) =>
        attachment.lessonId ? [attachment.lessonId] : [],
      );
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: user.id,
          status: 'ACTIVE',
          OR: [
            ...(courseIds.length ? [{ courseId: { in: courseIds } }] : []),
            ...(moduleIds.length
              ? [{ course: { modules: { some: { id: { in: moduleIds } } } } }]
              : []),
            ...(lessonIds.length
              ? [{ course: { lessons: { some: { id: { in: lessonIds } } } } }]
              : []),
          ],
        },
      });
      if (!enrollment)
        throw new NotFoundException(
          'This timer is not attached to an enrolled course',
        );
    }
    return this.prisma.timerSession.create({
      data: {
        userId: user.id,
        timerId,
        remainingSeconds:
          timer.type === 'COUNTDOWN' ||
          timer.type === 'INTERVAL' ||
          timer.type === 'AMRAP'
            ? timer.duration
            : null,
        lastResumedAt: new Date(),
        stateJson: { status: 'RUNNING' },
      },
      include: { timer: true, roundLogs: true },
    });
  }

  async getTimerSession(user: AuthenticatedUser, sessionId: string) {
    const session = await this.prisma.timerSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: { timer: true, roundLogs: true },
    });
    if (!session) throw new NotFoundException('Timer session was not found');
    return session;
  }
  async timerAction(
    user: AuthenticatedUser,
    sessionId: string,
    action: 'pause' | 'resume' | 'finish',
    dto: TimerStateDto = {},
  ) {
    const session = await this.prisma.timerSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!session) throw new NotFoundException('Timer session was not found');
    const elapsed = dto.elapsedSeconds ?? session.elapsedSeconds;
    const remaining = dto.remainingSeconds ?? session.remainingSeconds;
    const update = this.prisma.timerSession.update({
      where: { id: sessionId },
      data:
        action === 'pause'
          ? {
              pausedAt: new Date(),
              elapsedSeconds: elapsed,
              remainingSeconds: remaining,
              lastResumedAt: null,
              stateJson: {
                status: 'PAUSED',
                elapsedSeconds: elapsed,
                remainingSeconds: remaining,
              },
            }
          : action === 'resume'
            ? {
                pausedAt: null,
                lastResumedAt: new Date(),
                elapsedSeconds: elapsed,
                remainingSeconds: remaining,
                stateJson: {
                  status: 'RUNNING',
                  elapsedSeconds: elapsed,
                  remainingSeconds: remaining,
                },
              }
            : {
                completedAt: new Date(),
                elapsedSeconds: elapsed,
                remainingSeconds: 0,
                lastResumedAt: null,
                stateJson: {
                  status: 'COMPLETED',
                  elapsedSeconds: elapsed,
                  remainingSeconds: 0,
                },
              },
    });
    const result = await update;
    if (action === 'finish') {
      const attachment = await this.prisma.lessonTimer.findFirst({
        where: { timerId: session.timerId },
        include: { lesson: true, timer: true },
      });
      if (attachment?.timer.autoAdvance)
        await this.updateProgress(user, attachment.lessonId, {
          watchedSeconds: elapsed,
          completed: true,
        });
    }
    return result;
  }
  async logRound(user: AuthenticatedUser, sessionId: string, dto: RoundLogDto) {
    const session = await this.prisma.timerSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!session) throw new NotFoundException('Timer session was not found');
    return this.prisma.timerRoundLog.upsert({
      where: {
        sessionId_roundNumber: { sessionId, roundNumber: dto.roundNumber },
      },
      create: { sessionId, ...dto },
      update: { value: dto.value },
    });
  }
}
